import { calculateOrder } from "../public/catalog.js";
export class StoreError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const productRow = (r) => ({
  ...JSON.parse(r.data),
  stock: r.stock,
  active: !!r.active,
  version: r.version,
  updatedAt: r.updated_at,
});
export async function catalog(db, all = false) {
  const r = await db
    .prepare(
      "SELECT * FROM products " +
        (all ? "" : "WHERE active=1 ") +
        "ORDER BY rowid",
    )
    .all();
  return r.results.map(productRow);
}
const text = (v, n = 160) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= n;
export function validateProduct(input) {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.id !== "string" ||
    !/^([a-z0-9]+-)*[a-z0-9]+$/.test(input.id) ||
    input.id.length > 64
  )
    throw new StoreError("商品 ID 只能包含小写英文、数字与连字符");
  const keys = [
    "name",
    "zh",
    "tag",
    "tagZh",
    "size",
    "desc",
    "descZh",
    "badge",
    "badgeZh",
  ];
  const out = { id: input.id };
  for (const key of keys) {
    if (!text(input[key], key.startsWith("desc") ? 1000 : 160))
      throw new StoreError("请完整填写商品中英文信息");
    out[key] = input[key].trim();
  }
  if (
    !["cleanse", "serum", "moisturize", "protect"].includes(input.category) ||
    !["pump", "dropper", "jar", "tube"].includes(input.shape) ||
    !["cream", "gel", "serum", "oil"].includes(input.texture)
  )
    throw new StoreError("无效的商品分类或包装");
  if (
    typeof input.price !== "number" ||
    !Number.isFinite(input.price) ||
    input.price < 0.01 ||
    input.price > 10000 ||
    Math.abs(input.price * 100 - Math.round(input.price * 100)) > 0.00001
  )
    throw new StoreError("价格应为 0.01～10000，最多两位小数");
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color))
    throw new StoreError("无效的包装颜色");
  for (const key of ["ingredients", "ingredientsZh", "skin"])
    if (
      !Array.isArray(input[key]) ||
      !input[key].length ||
      input[key].length > 20 ||
      input[key].some((v) => !text(v, 80))
    )
      throw new StoreError("请填写成分与肤质偏好");
  if (
    input.skin.some(
      (v) => !["dry", "oily", "combination", "sensitive"].includes(v),
    )
  )
    throw new StoreError("无效的肤质偏好");
  Object.assign(out, {
    category: input.category,
    shape: input.shape,
    texture: input.texture,
    price: input.price,
    color: input.color,
    ingredients: input.ingredients,
    ingredientsZh: input.ingredientsZh,
    skin: [...new Set(input.skin)],
  });
  return out;
}
export function stockValue(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1000000)
    throw new StoreError("库存应为 0～1000000 的整数");
  return n;
}
export const transitions = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};
export async function getOrder(db, id) {
  const row = await db
    .prepare("SELECT * FROM orders WHERE id=?")
    .bind(id)
    .first();
  if (!row) return null;
  return {
    id: row.id,
    lines: JSON.parse(row.lines),
    total: row.total,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    revision: row.revision,
    notes: row.notes,
    tracking: row.tracking,
    receiptToken: row.receipt_token,
    details: JSON.parse(row.details || "{}"),
    demo: true,
    currency: "USD",
  };
}
export async function placeOrder(db, b) {
  if (
    typeof b.requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{12,80}$/.test(b.requestId)
  )
    throw new StoreError("Invalid request");
  const previous = await db
    .prepare("SELECT id FROM orders WHERE request_id=?")
    .bind(b.requestId)
    .first();
  if (previous)
    return { order: await getOrder(db, previous.id), created: false };
  const list = await catalog(db);
  const order = calculateOrder(
    b.items,
    b.code || "",
    b.shipping || "standard",
    b.gift ?? false,
    list,
  );
  const lines = order.lines.map((i) => ({
    ...i,
    product: list.find((p) => p.id === i.id),
  }));
  let giftDetails = null;
  if (b.giftDetails && b.gift) {
    const g = b.giftDetails;
    if (
      typeof g.note !== "string" ||
      g.note.length > 120 ||
      !/^#[0-9a-fA-F]{6}$/.test(g.color) ||
      !Array.isArray(g.ids) ||
      g.ids.length > 3 ||
      g.ids.some((id) => !lines.some((i) => i.id === id))
    )
      throw new StoreError("礼盒信息无效");
    giftDetails = { note: g.note, color: g.color, ids: g.ids };
  }
  const details = {
    subtotal: order.subtotal,
    discount: order.discount,
    delivery: order.delivery,
    packaging: order.packaging,
    shipping: b.shipping || "standard",
    gift: giftDetails,
  };
  const id = "LM-" + crypto.randomUUID().slice(0, 12).toUpperCase(),
    at = Date.now(),
    receipt = crypto.randomUUID() + crypto.randomUUID();
  const queries = [
    db
      .prepare(
        "INSERT OR IGNORE INTO orders(id,request_id,session_id,lines,total,created_at,updated_at,receipt_token,details) VALUES(?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        b.requestId,
        /^[a-zA-Z0-9_-]{12,80}$/.test(b.session || "") ? b.session : null,
        JSON.stringify(lines),
        order.total,
        at,
        at,
        receipt,
        JSON.stringify(details),
      ),
  ];
  for (const i of lines)
    queries.push(
      db
        .prepare(
          "INSERT INTO order_items(order_id,product_id,qty,unit_price,snapshot) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND request_id=?)",
        )
        .bind(
          id,
          i.id,
          i.qty,
          i.price,
          JSON.stringify(i.product),
          id,
          b.requestId,
        ),
    );
  try {
    await db.batch(queries);
  } catch (e) {
    if (/stock|unavailable|CHECK constraint/i.test(e.message))
      throw new StoreError("商品库存不足或已下架，请刷新后重试", 409);
    throw e;
  }
  const saved = await db
    .prepare("SELECT id FROM orders WHERE request_id=?")
    .bind(b.requestId)
    .first();
  return {
    order: { ...order, ...(await getOrder(db, saved.id)) },
    created: saved.id === id,
  };
}
export async function updateOrder(db, id, b, actor = "owner") {
  const o = await getOrder(db, id);
  if (!o) throw new StoreError("订单不存在", 404);
  if (!Number.isInteger(b.revision) || b.revision !== o.revision)
    throw new StoreError("订单已被更新，请刷新", 409);
  const status = b.status || o.status;
  if (status !== o.status && !transitions[o.status]?.includes(status))
    throw new StoreError("不允许此订单状态变更", 409);
  const notes = b.notes ?? o.notes,
    tracking = b.tracking ?? o.tracking;
  if (
    typeof notes !== "string" ||
    notes.length > 1000 ||
    typeof tracking !== "string" ||
    tracking.length > 160
  )
    throw new StoreError("备注或物流信息过长");
  const at = Date.now();
  const result = await db.batch([
    db
      .prepare(
        "UPDATE orders SET status=?,notes=?,tracking=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      )
      .bind(status, notes, tracking, at, id, b.revision),
    db
      .prepare(
        "INSERT INTO audit_log(action,target,detail,created_at) SELECT ?,?,?,? WHERE changes()>0",
      )
      .bind(
        "order.update",
        id,
        JSON.stringify({ actor, from: o.status, to: status }),
        at,
      ),
  ]);
  if (!result[0].meta.changes)
    throw new StoreError("订单已被更新，请刷新", 409);
  return getOrder(db, id);
}
export async function adminApi(req, env, url) {
  const path = url.pathname,
    db = env.DB,
    method = req.method;
  if (path === "/api/admin/overview" && method === "GET") {
    const [p, o, l] = await Promise.all([
      db
        .prepare(
          "SELECT COUNT(*) AS total,SUM(active) AS active,SUM(CASE WHEN active=1 AND stock<=10 THEN 1 ELSE 0 END) AS lowStock FROM products",
        )
        .first(),
      db
        .prepare(
          "SELECT COUNT(*) AS total,SUM(CASE WHEN status!='cancelled' THEN total ELSE 0 END) AS value,SUM(CASE WHEN status IN('confirmed','processing') THEN 1 ELSE 0 END) AS pending FROM orders",
        )
        .first(),
      db
        .prepare(
          "SELECT id,action,target,created_at FROM audit_log ORDER BY id DESC LIMIT 8",
        )
        .all(),
    ]);
    return { products: p, orders: o, recent: l.results };
  }
  if (path === "/api/admin/products" && method === "GET")
    return { products: await catalog(db, true) };
  if (path === "/api/admin/products" && method === "POST") {
    const b = await req.json(),
      p = validateProduct(b);
    const stock = stockValue(b.stock),
      at = Date.now();
    if (typeof b.active !== "boolean") throw new StoreError("请选择上架状态");
    if (
      await db.prepare("SELECT id FROM products WHERE id=?").bind(p.id).first()
    )
      throw new StoreError("商品 ID 已存在", 409);
    await db.batch([
      db
        .prepare(
          "INSERT INTO products(id,data,stock,active,updated_at) VALUES(?,?,?,?,?)",
        )
        .bind(p.id, JSON.stringify(p), stock, b.active ? 1 : 0, at),
      db
        .prepare(
          "INSERT INTO audit_log(action,target,detail,created_at) VALUES(?,?,?,?)",
        )
        .bind(
          "product.create",
          p.id,
          JSON.stringify({ stock, active: b.active }),
          at,
        ),
      db
        .prepare(
          "INSERT INTO stock_movements(product_id,delta,reason,created_at) VALUES(?,?,?,?)",
        )
        .bind(p.id, stock, "initial", at),
    ]);
    return {
      product: productRow(
        await db
          .prepare("SELECT * FROM products WHERE id=?")
          .bind(p.id)
          .first(),
      ),
    };
  }
  const productMatch = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)$/);
  if (productMatch && method === "PUT") {
    const b = await req.json(),
      id = productMatch[1],
      row = await db
        .prepare("SELECT * FROM products WHERE id=?")
        .bind(id)
        .first();
    if (!row) throw new StoreError("商品不存在", 404);
    if (
      b.id !== id ||
      !Number.isInteger(b.version) ||
      b.version !== row.version
    )
      throw new StoreError("商品已被更新，请刷新", 409);
    const p = validateProduct(b),
      stock = stockValue(b.stock),
      at = Date.now();
    if (typeof b.active !== "boolean") throw new StoreError("请选择上架状态");
    const result = await db.batch([
      db
        .prepare(
          "UPDATE products SET data=?,stock=?,active=?,version=version+1,updated_at=? WHERE id=? AND version=?",
        )
        .bind(JSON.stringify(p), stock, b.active ? 1 : 0, at, id, b.version),
      db
        .prepare(
          "INSERT INTO audit_log(action,target,detail,created_at) SELECT ?,?,?,? WHERE changes()>0",
        )
        .bind(
          "product.update",
          id,
          JSON.stringify({
            fromStock: row.stock,
            toStock: stock,
            active: b.active,
          }),
          at,
        ),
      db
        .prepare(
          "INSERT INTO stock_movements(product_id,delta,reason,created_at) SELECT ?,?,?,? WHERE changes()>0 AND ?!=0",
        )
        .bind(id, stock - row.stock, "admin adjustment", at, stock - row.stock),
    ]);
    if (!result[0].meta.changes)
      throw new StoreError("商品已被更新，请刷新", 409);
    return {
      product: productRow(
        await db.prepare("SELECT * FROM products WHERE id=?").bind(id).first(),
      ),
    };
  }
  if (path === "/api/admin/orders" && method === "GET") {
    const page = Math.max(
        1,
        Math.min(10000, Number(url.searchParams.get("page")) || 1),
      ),
      status = url.searchParams.get("status"),
      search = (url.searchParams.get("q") || "").slice(0, 80);
    const params = [],
      clauses = [];
    if (status) {
      if (!(status in transitions)) throw new StoreError("无效状态");
      clauses.push("status=?");
      params.push(status);
    }
    if (search) {
      clauses.push("id LIKE ?");
      params.push("%" + search + "%");
    }
    const where = clauses.length ? " WHERE " + clauses.join(" AND ") : "";
    const [count, rows] = await Promise.all([
      db
        .prepare("SELECT COUNT(*) AS count FROM orders" + where)
        .bind(...params)
        .first(),
      db
        .prepare(
          "SELECT id,lines,total,status,revision,notes,tracking,created_at,updated_at,details FROM orders" +
            where +
            " ORDER BY created_at DESC LIMIT 20 OFFSET ?",
        )
        .bind(...params, (page - 1) * 20)
        .all(),
    ]);
    return {
      total: count.count,
      page,
      orders: rows.results.map((r) => ({
        ...r,
        lines: JSON.parse(r.lines),
        details: JSON.parse(r.details || "{}"),
      })),
    };
  }
  const om = path.match(/^\/api\/admin\/orders\/(LM-[A-Z0-9-]+)$/);
  if (om && method === "PUT") {
    const o = await updateOrder(db, om[1], await req.json());
    const { receiptToken, ...safe } = o;
    return { order: safe };
  }
  if (path === "/api/admin/inventory" && method === "GET") {
    const rows = await db
      .prepare("SELECT * FROM stock_movements ORDER BY id DESC LIMIT 100")
      .all();
    return { movements: rows.results };
  }
  if (path === "/api/admin/audit" && method === "GET") {
    const rows = await db
      .prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100")
      .all();
    return { logs: rows.results };
  }
  throw new StoreError("Not found", 404);
}
