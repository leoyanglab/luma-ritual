import { documentHTML } from "./ssr.js";
import {
  catalog,
  placeOrder,
  getOrder,
  updateOrder,
  adminApi,
  StoreError,
} from "./store.js";
const names = new Set([
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "quiz_complete",
  "routine_add",
  "gift_add",
  "compare",
  "texture_view",
  "scene_click",
  "rotate_product",
]);
const json = (v, status = 200, extra = {}) =>
  Response.json(v, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
const validId = (v) =>
  typeof v === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(v);
async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
async function authorized(req, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const c = req.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)luma_admin=([0-9]+)\.([a-f0-9]{64})/);
  return (
    !!c &&
    Number(c[1]) > Date.now() &&
    c[2] === (await sign(env.ADMIN_PASSWORD, c[1]))
  );
}
export async function apiFetch(req, env) {
  const originalCF = req.cf;
  const u = new URL(req.url);
  try {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.headers.get("Origin") !== u.origin
    )
      return json({ error: "Origin rejected" }, 403);
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
      let length = 0;
      const chunks = [];
      const reader = req.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 16384) {
          await reader.cancel();
          return json({ error: "Request too large" }, 413);
        }
        chunks.push(value);
      }
      const body = new Uint8Array(length);
      let at = 0;
      for (const chunk of chunks) {
        body.set(chunk, at);
        at += chunk.length;
      }
      req = new Request(req, { body });
    }
    if (u.pathname === "/api/health")
      return json({ ok: true, database: !!env.DB, demo: true });
    if (u.pathname === "/api/admin/login" && req.method === "POST") {
      if (!env.ADMIN_PASSWORD)
        return json({ error: "Store admin not configured" }, 503);
      if (
        env.AUTH_LIMITER &&
        !(
          await env.AUTH_LIMITER.limit({
            key: req.headers.get("CF-Connecting-IP") || "local",
          })
        ).success
      )
        return json(
          { error: "Too many attempts. Try again in a minute." },
          429,
        );
      const b = await req.json();
      if (
        typeof b.password !== "string" ||
        b.password.length > 200 ||
        (await sign(env.ADMIN_PASSWORD, b.password)) !==
          (await sign(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD))
      )
        return json({ error: "Incorrect password" }, 401);
      const exp = String(Date.now() + 3600000);
      return json({ ok: true }, 200, {
        "Set-Cookie": `luma_admin=${exp}.${await sign(env.ADMIN_PASSWORD, exp)}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=3600`,
      });
    }
    if (u.pathname === "/api/admin/logout" && req.method === "POST")
      return json({ ok: true }, 200, {
        "Set-Cookie":
          "luma_admin=; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=0",
      });
    if (!env.DB) return json({ error: "Database unavailable" }, 503);
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      env.WRITE_LIMITER &&
      !(
        await env.WRITE_LIMITER.limit({
          key: req.headers.get("CF-Connecting-IP") || "local",
        })
      ).success
    )
      return json({ error: "Too many requests" }, 429);
    if (u.pathname === "/api/catalog" && req.method === "GET")
      return json({ products: await catalog(env.DB) });
    if (u.pathname.startsWith("/api/admin/")) {
      if (!(await authorized(req, env)))
        return json({ error: "Unauthorized" }, 401);
      const preview = u.pathname.match(/^\/api\/admin\/preview\/([a-z0-9-]+)$/);
      if (preview && req.method === "GET") {
        const list = await catalog(env.DB, true);
        if (!list.some((p) => p.id === preview[1]))
          return json({ error: "商品不存在" }, 404);
        const template = await env.ASSETS.fetch(
          new Request(new URL("/index.html", u)),
        );
        const page = documentHTML(
          await template.text(),
          new URL("/product/" + preview[1] + "?preview=1", u),
          list,
        );
        return new Response(page.html, {
          status: page.status,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      }
      return json(await adminApi(req, env, u));
    }
    if (u.pathname === "/api/events" && req.method === "POST") {
      const b = await req.json();
      if (!validId(b.id) || !validId(b.session) || !names.has(b.name))
        return json({ error: "Invalid event" }, 400);
      const product =
        typeof b.product === "string" && /^[a-z0-9-]{1,64}$/.test(b.product)
          ? b.product
          : null;
      const route = [
        "home",
        "shop",
        "routine",
        "quiz",
        "texture",
        "gift",
        "scene",
        "compare",
        "checkout",
        "orders",
        "about",
        "help",
        "favorites",
        "product",
      ].includes(b.route)
        ? b.route
        : "home";
      await env.DB.batch([
        env.DB.prepare(
          "INSERT OR IGNORE INTO events(id,session_id,name,product_id,route,country,device,created_at) VALUES(?,?,?,?,?,?,?,?)",
        ).bind(
          b.id,
          b.session,
          b.name,
          product,
          route,
          originalCF?.country || "Unknown",
          b.device === "mobile" ? "mobile" : "desktop",
          Date.now(),
        ),
        env.DB.prepare("DELETE FROM events WHERE created_at < ?").bind(
          Date.now() - 90 * 86400000,
        ),
      ]);
      return json({ ok: true });
    }
    if (u.pathname === "/api/orders" && req.method === "POST") {
      const result = await placeOrder(env.DB, await req.json());
      return json(result.order, result.created ? 201 : 200);
    }
    const receipt = u.pathname.match(
      /^\/api\/orders\/(LM-[A-Z0-9-]+)(\/cancel)?$/,
    );
    if (receipt) {
      const order = await getOrder(env.DB, receipt[1]);
      if (
        !order ||
        !order.receiptToken ||
        req.headers.get("X-Order-Token") !== order.receiptToken
      )
        return json({ error: "Order not found" }, 404);
      if (receipt[2] && req.method === "POST") {
        if (!["confirmed", "processing", "cancelled"].includes(order.status))
          return json({ error: "订单已进入模拟发货流程，无法取消" }, 409);
        if (order.status !== "cancelled")
          await updateOrder(
            env.DB,
            order.id,
            { status: "cancelled", revision: order.revision },
            "customer",
          );
      } else if (req.method !== "GET") return json({ error: "Not found" }, 404);
      const { notes, ...safe } = await getOrder(env.DB, order.id);
      return json(safe);
    }
    if (u.pathname === "/api/stats" && req.method === "GET") {
      if (!(await authorized(req, env)))
        return json({ error: "Unauthorized" }, 401);
      const days = [7, 30, 90].includes(Number(u.searchParams.get("days")))
        ? Number(u.searchParams.get("days"))
        : 7;
      const since = Date.now() - days * 86400000;
      const q = (sql, ...args) =>
        env.DB.prepare(sql)
          .bind(...args)
          .all();
      const [events, daily, products, countries, devices, orders, funnel] =
        await Promise.all([
          q(
            "SELECT name,COUNT(*) AS count,COUNT(DISTINCT session_id) AS sessions FROM events WHERE created_at>=? GROUP BY name",
            since,
          ),
          q(
            "SELECT strftime('%Y-%m-%d',created_at/1000,'unixepoch') AS day,COUNT(*) AS views,COUNT(DISTINCT session_id) AS sessions FROM events WHERE created_at>=? AND name='page_view' GROUP BY day ORDER BY day",
            since,
          ),
          q(
            "SELECT product_id,name,COUNT(*) AS count FROM events WHERE created_at>=? AND product_id IS NOT NULL GROUP BY product_id,name",
            since,
          ),
          q(
            "SELECT country,COUNT(DISTINCT session_id) AS count FROM events WHERE created_at>=? GROUP BY country ORDER BY count DESC LIMIT 10",
            since,
          ),
          q(
            "SELECT device,COUNT(DISTINCT session_id) AS count FROM events WHERE created_at>=? GROUP BY device",
            since,
          ),
          env.DB.prepare(
            "SELECT COUNT(*) AS count,COALESCE(SUM(total),0) AS revenue FROM orders WHERE created_at>=?",
          )
            .bind(since)
            .first(),
          env.DB.prepare(
            `WITH sessions AS (SELECT session_id,MIN(CASE WHEN name='page_view' THEN created_at END) AS visit,MIN(CASE WHEN name='view_item' THEN created_at END) AS view,MIN(CASE WHEN name='add_to_cart' THEN created_at END) AS cart,MIN(CASE WHEN name='begin_checkout' THEN created_at END) AS checkout FROM events WHERE created_at>=? GROUP BY session_id) SELECT COUNT(*) AS visits, SUM(CASE WHEN view>=visit THEN 1 ELSE 0 END) AS viewed, SUM(CASE WHEN view>=visit AND cart>=view THEN 1 ELSE 0 END) AS added, SUM(CASE WHEN view>=visit AND cart>=view AND checkout>=cart THEN 1 ELSE 0 END) AS checked, SUM(CASE WHEN view>=visit AND cart>=view AND checkout>=cart AND EXISTS(SELECT 1 FROM orders o WHERE o.session_id=s.session_id AND o.created_at>=s.checkout) THEN 1 ELSE 0 END) AS purchased FROM sessions s WHERE visit IS NOT NULL`,
          )
            .bind(since)
            .first(),
        ]);
      return json({
        days,
        events: events.results,
        daily: daily.results,
        products: products.results,
        countries: countries.results,
        devices: devices.results,
        orders,
        funnel,
        updatedAt: Date.now(),
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    const known =
      e instanceof StoreError ||
      ["Invalid cart", "Invalid item"].includes(e.message);
    return json(
      {
        error: known
          ? e.message
          : e instanceof SyntaxError
            ? "Invalid JSON"
            : "Request could not be completed",
      },
      e.status || (known || e instanceof SyntaxError ? 400 : 500),
    );
  }
}
