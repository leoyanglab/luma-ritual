import { pageTitles as titleMap } from "../public/seo.js";
import { h, Fragment } from "preact";
import renderToString from "preact-render-to-string";
import { createViews } from "../public/views.js";
import { catalog } from "./store.js";
export const origin = "https://glow.bool.win";
export const publicPages = [
  "/",
  "/shop",
  "/routine",
  "/quiz",
  "/texture",
  "/gift",
  "/scene",
  "/compare",
  "/about",
  "/help",
  "/privacy",
];

export function defaultState(lang = "en") {
  return {
    lang,
    currency: "USD",
    cart: [],
    favorites: [],
    compare: [],
    orders: [],
    routine: {
      cleanse: "dew-cleanser",
      serum: "morning-serum",
      moisturize: "cloud-cream",
      protect: "sun-veil",
    },
    period: "am",
    gift: { ids: [], color: "#ddd5c5", note: "" },
    giftInCart: null,
    category: "all",
    search: "",
    sort: "featured",
    maxPrice: 10000,
    skinFilter: "all",
    textureFilter: "all",
    texture: "cream",
    quizStep: 0,
    quiz: { skin: "", goal: "", time: "" },
    qty: 1,
    code: "",
    shipping: "standard",
  };
}
const jsonSafe = (v) =>
  JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
const esc = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function documentHTML(template, url, products) {
  const pathname = url.pathname,
    route = pathname.split("/")[1] || "home",
    lang = url.searchParams.get("lang") === "zh" ? "zh" : "en",
    zh = lang === "zh";
  const id = pathname.split("/")[2],
    p = products.find((p) => p.id === id),
    initial = defaultState(lang);
  initial.maxPrice = Math.max(50, ...products.map((p) => p.price));
  const views = createViews(initial, products, () => pathname);
  const dynamic =
    url.searchParams.get("preview") === "1" ||
    [
      "admin",
      "analytics",
      "checkout",
      "orders",
      "favorites",
      "success",
    ].includes(route);
  let status = 200,
    body;
  if (route === "product") {
    if (!p) {
      status = 404;
      body = views.productPage(null);
    } else body = views.productPage(p);
  } else if (route === "admin")
    body = views.intro(
      "LUMA / OWNER",
      zh ? "商城管理后台" : "Store management",
      zh
        ? "登录后管理商品、库存与演示订单。"
        : "Sign in to manage products, inventory and demo orders.",
    );
  else if (route === "analytics")
    body = views.intro(
      "LUMA / OWNER",
      zh ? "站长统计" : "Owner analytics",
      zh
        ? "统计数据仅限站长登录后查看。"
        : "Analytics are available after owner sign-in.",
    );
  else if (route === "success")
    body = views.intro(
      "LUMA / DEMO",
      zh ? "演示订单记录" : "Demo order record",
      zh
        ? "订单凭据仅保存在下单浏览器。"
        : "The receipt is available in the browser used for checkout.",
    );
  else if (["about", "help", "privacy"].includes(route))
    body = views.infoPage(route);
  else if (route === "shop") body = views.shop();
  else if (route === "favorites") body = views.shop(true);
  else if (route === "home") body = views.home();
  else if (views[route + "Page"]) body = views[route + "Page"]();
  else {
    status = 404;
    body =
      views.intro(
        "404",
        zh ? "页面不存在" : "Page not found",
        zh
          ? "返回商品系列继续探索。"
          : "Return to the collection to keep exploring.",
      ) +
      '<p class="section"><a href="/shop">Shop the collection / 探索商品</a></p>';
  }
  const leaf = p
      ? zh
        ? p.zh
        : p.name
      : titleMap[route]?.[zh ? 1 : 0] || (zh ? "商城管理" : "Store management"),
    title = status === 404 ? "404 · LUMA Ritual" : leaf + " · LUMA Ritual";
  const description = p
    ? (zh ? p.descZh : p.desc) +
      (zh
        ? " 概念商品，仅供购物演示，不进行真实销售。"
        : " Concept product for a shopping demo; no real sale.")
    : zh
      ? "LUMA Ritual 护肤品牌演示站：探索商品、互动质地、护理搭配、定制礼盒与模拟结账。"
      : "LUMA Ritual skincare concept store: explore essentials, interactive textures, skincare routines, custom gifts and demo checkout.";
  const canonical = origin + pathname + (zh ? "?lang=zh" : "");
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "LUMA Ritual",
    url: origin + "/",
    description: zh
      ? "虚构护肤品牌互动购物演示站"
      : "Fictional skincare brand and interactive shopping demo",
    inLanguage: zh ? "zh-CN" : "en",
  };
  const schema = p
    ? [
        baseSchema,
        {
          "@context": "https://schema.org",
          "@type": "Product",
          name: zh ? p.zh : p.name,
          description,
          sku: p.id,
          brand: { "@type": "Brand", name: "LUMA Ritual (fictional demo)" },
          image: origin + "/og.png",
          url: canonical,
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Demo only",
              value: "No real sale or fulfillment",
            },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "LUMA",
              item: origin + "/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: zh ? "商品系列" : "Collection",
              item: origin + "/shop",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: zh ? p.zh : p.name,
              item: canonical,
            },
          ],
        },
      ]
    : [baseSchema];
  const head = renderToString(
    h(
      Fragment,
      null,
      h("title", null, title),
      h("meta", { name: "description", content: description }),
      h("meta", {
        name: "robots",
        content:
          dynamic || status !== 200
            ? "noindex, nofollow"
            : "index, follow, max-image-preview:large",
      }),
      h("link", { rel: "canonical", href: canonical }),
      ...["en", "zh", "x-default"].map((l) =>
        h("link", {
          rel: "alternate",
          hrefLang: l,
          href: origin + pathname + (l === "zh" ? "?lang=zh" : ""),
        }),
      ),
      h("meta", { property: "og:type", content: p ? "product" : "website" }),
      h("meta", { property: "og:title", content: title }),
      h("meta", { property: "og:description", content: description }),
      h("meta", { property: "og:url", content: canonical }),
      h("meta", { property: "og:image", content: origin + "/og.png" }),
      h("meta", { property: "og:image:width", content: "1200" }),
      h("meta", { property: "og:image:height", content: "630" }),
      h("meta", { property: "og:image:type", content: "image/png" }),
      h("meta", { property: "og:locale", content: zh ? "zh_CN" : "en_US" }),
      h("meta", { name: "twitter:card", content: "summary_large_image" }),
      h("meta", { name: "twitter:title", content: title }),
      h("meta", { name: "twitter:description", content: description }),
      h("meta", { name: "twitter:image", content: origin + "/og.png" }),
      h("script", {
        type: "application/ld+json",
        dangerouslySetInnerHTML: { __html: jsonSafe(schema) },
      }),
    ),
  );
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\b(?=[^>]*\bname=["']description["'])[^>]*>/i, "")
    .replace('<html lang="en">', '<html lang="' + (zh ? "zh-CN" : "en") + '">')
    .replace("<body>", '<body data-route="' + route + '">')
    .replace("</head>", head + "</head>")
    .replace(
      /<main\b[^>]*\bid=["']main["'][^>]*>\s*<\/main>/,
      renderToString(
        h("main", {
          id: "main",
          tabIndex: -1,
          dangerouslySetInnerHTML: { __html: body },
        }),
      ),
    )
    .replace(
      "</body>",
      '<script type="application/json" id="bootstrap">' +
        jsonSafe({ products, lang }) +
        "</script></body>",
    );
  html = html.replace(
    /<([a-z]+)([^>]*data-en="([^"]*)"[^>]*data-zh="([^"]*)"[^>]*)>\s*<\/\1>/g,
    (_, tag, attrs, en, ch) =>
      "<" + tag + attrs + ">" + (zh ? ch : en) + "</" + tag + ">",
  );
  if (zh)
    html = html.replace(
      /href="(\/(?:product\/[a-z0-9-]+|[a-z]*)?)"/g,
      'href="$1?lang=zh"',
    );
  return { html, status, title, description, canonical };
}
export async function ssrFetch(req, env) {
  const url = new URL(req.url);
  if (url.pathname === "/index.html")
    return Response.redirect(origin + "/", 301);
  if (url.pathname === "/robots.txt")
    return new Response(
      "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /analytics\nDisallow: /api/\nDisallow: /checkout\nDisallow: /orders\nDisallow: /success/\nDisallow: /favorites\nSitemap: " +
        origin +
        "/sitemap.xml\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  if (url.pathname === "/sitemap.xml") {
    const list = await catalog(env.DB),
      paths = [...publicPages, ...list.map((p) => "/product/" + p.id)];
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        paths
          .flatMap((path) =>
            ["", "?lang=zh"].map(
              (q) => "<url><loc>" + esc(origin + path + q) + "</loc></url>",
            ),
          )
          .join("") +
        "</urlset>",
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
  if (/\.[a-z0-9]+$/i.test(url.pathname)) return env.ASSETS.fetch(req);
  if (!["GET", "HEAD"].includes(req.method))
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  if (url.pathname !== "/" && url.pathname.endsWith("/"))
    return Response.redirect(
      origin + url.pathname.replace(/\/+$/, "") + url.search,
      301,
    );
  const list = await catalog(env.DB);
  const template = await env.ASSETS.fetch(
    new Request(new URL("/index.html", url)),
  );
  const result = documentHTML(await template.text(), url, list);
  return new Response(req.method === "HEAD" ? null : result.html, {
    status: result.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Language":
        url.searchParams.get("lang") === "zh" ? "zh-CN" : "en",
      "X-Robots-Tag":
        /^\/(admin|analytics|checkout|orders|favorites|success)/.test(
          url.pathname,
        )
          ? "noindex, nofollow"
          : "all",
    },
  });
}
