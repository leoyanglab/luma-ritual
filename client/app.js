import { products, getProduct, calculateOrder } from "../public/catalog.js";
import { createViews } from "../public/views.js";
import { signal } from "@preact/signals";
import { pageTitles } from "../public/seo.js";
import { mountAdmin } from "./admin.jsx";
const bootstrap = JSON.parse(
  document.getElementById("bootstrap")?.textContent || "{}",
);
if (Array.isArray(bootstrap.products))
  products.splice(0, products.length, ...bootstrap.products);
const reactiveState = (obj) => {
  const cells = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, signal(v)]),
  );
  return new Proxy(obj, {
    get: (_, k) => cells[k]?.value,
    set: (_, k, v) => {
      (cells[k] ??= signal(v)).value = v;
      return true;
    },
  });
};
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem("luma-" + key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const state = reactiveState({
  lang:
    new URLSearchParams(location.search).get("lang") ||
    read("lang", bootstrap.lang || "en"),
  currency: read("currency", "USD"),
  cart: read("cart", []).filter(
    (i) =>
      getProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20,
  ),
  favorites: read("favorites", []).filter((id) => getProduct(id)),
  compare: read("compare", [])
    .filter((id) => getProduct(id))
    .slice(0, 3),
  orders: read("orders", []),
  routine: read("routine", {
    cleanse: "dew-cleanser",
    serum: "morning-serum",
    moisturize: "cloud-cream",
    protect: "sun-veil",
  }),
  period: "am",
  gift: read("gift", { ids: [], color: "#ddd5c5", note: "" }),
  giftInCart: read("giftInCart", null),
  consent: read("consent", null),
  category: "all",
  search: "",
  sort: "featured",
  maxPrice: Math.max(50, ...products.map((p) => p.price)),
  skinFilter: "all",
  textureFilter: "all",
  texture: "cream",
  quizStep: 0,
  quiz: { skin: "", goal: "", time: "" },
  qty: 1,
  code: read("code", ""),
  shipping: "standard",
});
const persist = (key, value) => {
  try {
    localStorage.setItem("luma-" + key, JSON.stringify(value));
  } catch {
    toast(
      t(
        "Storage is unavailable. Keep this tab open.",
        "浏览器存储不可用，请保持页面开启。",
      ),
    );
  }
};
let session;
try {
  session = sessionStorage.getItem("luma-session");
  if (!session) {
    session = crypto.randomUUID();
    sessionStorage.setItem("luma-session", session);
  }
} catch {
  session = crypto.randomUUID();
}
const t = (en, zh) => (state.lang === "zh" ? zh : en);
const pname = (p) => (state.lang === "zh" ? p.zh : p.name);
const desc = (p) => (state.lang === "zh" ? p.descZh : p.desc);
const money = (n) =>
  new Intl.NumberFormat(state.lang === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: state.currency,
    maximumFractionDigits: 2,
  }).format(
    n * ({ USD: 1, EUR: 0.92, GBP: 0.78, CNY: 7.2 }[state.currency] || 1),
  );
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cats = () => [
  ["all", t("All essentials", "全部商品")],
  ["cleanse", t("Cleanse", "清洁")],
  ["serum", t("Treat", "精华")],
  ["moisturize", t("Moisturize", "保湿")],
  ["protect", t("Protect", "防护")],
];
const skinName = (s) =>
  ({
    dry: t("Dry", "干性"),
    oily: t("Oily", "油性"),
    combination: t("Combination", "混合性"),
    sensitive: t("Sensitive", "敏感性"),
  })[s] || s;
const route = () => location.pathname.split("/")[1] || "home";
const saveCart = () => {
  persist("cart", state.cart);
  persist("giftInCart", state.giftInCart);
  updateCartCount();
};
const totalQty = () => state.cart.reduce((n, i) => n + i.qty, 0);
function updateCartCount() {
  $("#cart-count").textContent = totalQty();
}
function translateStatic() {
  $$('a[href^="/"]').forEach((a) => {
    const u = new URL(a.getAttribute("href"), location.origin);
    if (state.lang === "zh") u.searchParams.set("lang", "zh");
    else u.searchParams.delete("lang");
    a.setAttribute("href", u.pathname + u.search + u.hash);
  });
  $$("[data-en]").forEach(
    (el) => (el.textContent = el.dataset[state.lang] || el.dataset.en),
  );
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  $("#language").value = state.lang;
  $("#currency").value = state.currency;
  updateCartCount();
}
let toastTimer;
function toast(msg) {
  $("#toast").textContent = msg;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3200);
}
function track(name, product) {
  if (state.consent !== true || ["analytics", "admin", "api"].includes(route()))
    return;
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      session,
      name,
      product,
      route: route(),
      device: innerWidth < 761 ? "mobile" : "desktop",
    }),
    keepalive: true,
  }).catch(() => {});
}
const {
  art,
  card,
  intro,
  cards,
  empty,
  home,
  shop,
  productPage,
  routinePage,
  quizPage,
  quizRecommendations,
  texturePage,
  textures,
  giftPage,
  scenePage,
  comparePage,
  cartOrder,
  summaryLines,
  orderLine,
  checkoutPage,
  ordersPage,
  successPage,
  infoPage,
} = createViews(state, products, () => location.pathname);
async function analyticsPage(days = 7) {
  $("#main").innerHTML =
    intro(
      "OWNER ANALYTICS",
      t("A little insight. A clearer picture.", "看见数据，了解体验。"),
      t(
        "Anonymous traffic and demo commerce. Real payments are never processed.",
        "匿名访问与演示交易统计，不包含真实支付。",
      ),
    ) +
    '<section class="section" id="analytics-content"><div class="loading">' +
    t("Loading analytics…", "正在读取统计…") +
    "</div></section>";
  translateStatic();
  try {
    const res = await fetch("/api/stats?days=" + days);
    if (res.status === 401) {
      $("#analytics-content").innerHTML =
        `<form class="analytics-login" id="analytics-login"><h3>${t("For the store owner", "站长登录")}</h3><label class="field">${t("Analytics password", "统计后台密码")}<input type="password" name="password" required autocomplete="current-password"></label><p class="error-message" id="login-error" role="alert"></p><button class="btn" type="submit">${t("Open dashboard", "进入统计后台")} →</button></form>`;
      return;
    }
    if (!res.ok)
      throw new Error(
        t("Statistics are temporarily unavailable.", "统计暂时不可用。"),
      );
    const d = await res.json();
    if (route() !== "analytics") return;
    renderStats(d);
  } catch (e) {
    if (route() === "analytics")
      $("#analytics-content").innerHTML =
        `<p class="error-message">${esc(e.message)}</p><button class="btn secondary" data-action="analytics-refresh">${t("Try again", "重试")}</button>`;
  }
}
function renderStats(d) {
  const page = d.events.find((x) => x.name === "page_view") || {
    count: 0,
    sessions: 0,
  };
  const count = (n) => d.events.find((x) => x.name === n)?.count || 0;
  const funnel = d.funnel || {};
  const max = funnel.visits || 1;
  const chartDays = Array.from({ length: d.days }, (_, i) => {
    const date = new Date(Date.now() - (d.days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return { day: date, ...d.daily.find((x) => x.day === date) };
  });
  const top = Math.max(1, ...chartDays.map((x) => x.views || 0));
  const bars = chartDays
    .map((v, i) => {
      const w = 560 / chartDays.length;
      const h = ((v.views || 0) / top) * 145;
      return `<rect x="${20 + i * w}" y="${170 - h}" width="${Math.max(2, w - 5)}" height="${h}" rx="2" fill="#8d9f7b"><title>${v.day}: ${v.views || 0} ${t("views", "浏览")}</title></rect>${i === 0 || i === chartDays.length - 1 || i === Math.floor(chartDays.length / 2) ? `<text x="${20 + i * w}" y="195" fill="#79816f" font-size="10">${v.day.slice(5)}</text>` : ""}`;
    })
    .join("");
  $("#analytics-content").innerHTML =
    `<div class="workspace-heading"><div class="chips">${[7, 30, 90].map((n) => `<button class="chip ${d.days === n ? "active" : ""}" data-action="analytics-days" data-id="${n}">${n} ${t("days", "天")}</button>`).join("")}</div><div class="btn-row"><button class="text-link" data-action="analytics-export">${t("Export CSV", "导出 CSV")}</button><button class="text-link" data-action="analytics-refresh">${t("Refresh", "刷新")}</button><button class="text-link" data-action="analytics-logout">${t("Log out", "退出")}</button></div></div><p class="analytics-note">${t("UTC date buckets · consented traffic only · session means one browser tab · demo order totals include orders without analytics consent.", "按 UTC 日期汇总 · 仅统计同意后的访问 · 会话指一个浏览器标签页 · 演示订单汇总包含未同意统计的订单。")}</p><div class="metric-grid">${[
      [t("Page views", "页面浏览 PV"), page.count],
      [t("Anonymous sessions", "匿名会话"), page.sessions],
      [t("Demo orders", "演示订单"), d.orders.count],
      [
        t("Demo order value (USD)", "演示订单金额（USD）"),
        "$" + Number(d.orders.revenue).toFixed(2),
      ],
    ]
      .map(
        ([n, v]) =>
          `<div class="metric"><span>${n}</span><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="chart-grid"><div class="chart-panel"><h3>${t("Daily visits", "每日访问趋势")}</h3><svg viewBox="0 0 620 220" role="img" aria-label="${t("Daily page views chart", "每日页面浏览图")}"><line x1="20" x2="600" y1="170" y2="170" stroke="#d0d5c6"/><text x="20" y="15" font-size="10" fill="#79816f">${t("Peak", "峰值")}: ${top} PV</text>${bars}</svg>${!page.count ? `<p class="analytics-note">${t("No consented visits in this period yet.", "所选时段暂无同意统计的访问。")}</p>` : ""}</div><div class="chart-panel"><h3>${t("Shopping journey", "购物转化漏斗")}</h3>${[
      [t("Visited", "访问"), funnel.visits],
      [t("Viewed a product", "查看商品"), funnel.viewed],
      [t("Added to bag", "加入购物车"), funnel.added],
      [t("Started checkout", "开始结账"), funnel.checked],
      [t("Placed demo order", "完成演示订单"), funnel.purchased],
    ]
      .map(
        ([n, v]) =>
          `<div class="funnel-row"><div class="summary-line"><span>${n}</span><span>${v || 0} · ${Math.round(((v || 0) / max) * 100)}%</span></div><div class="bar-track"><i style="width:${((v || 0) / max) * 100}%"></i></div></div>`,
      )
      .join(
        "",
      )}<p class="analytics-note">${t("Ordered steps in the same anonymous session; percentages are relative to visits.", "按同一匿名会话中的先后步骤去重，百分比以访问会话为基准。")}</p></div></div><div class="chart-grid"><div class="chart-panel"><h3>${t("Product interest", "商品热度")}</h3><table class="data-table"><thead><tr><th>${t("Product", "商品")}</th><th>${t("Views", "查看")}</th><th>${t("Bag adds", "加购")}</th></tr></thead><tbody>${products.map((p) => `<tr><td>${esc(pname(p))}</td><td>${d.products.find((x) => x.product_id === p.id && x.name === "view_item")?.count || 0}</td><td>${d.products.find((x) => x.product_id === p.id && x.name === "add_to_cart")?.count || 0}</td></tr>`).join("")}</tbody></table></div><div class="chart-panel"><h3>${t("Explore & interact", "互动功能使用")}</h3><table class="data-table"><tbody>${[
      ["quiz_complete", t("Preference guide completed", "完成偏好向导")],
      ["routine_add", t("Rituals added", "搭配加购")],
      ["gift_add", t("Gifts added", "礼盒加购")],
      ["compare", t("Comparisons opened", "打开商品对比")],
      ["texture_view", t("Textures explored", "探索质地")],
      ["scene_click", t("Scene hotspots", "场景热点点击")],
      ["rotate_product", t("360° models opened", "打开 360° 模型")],
    ]
      .map(([n, label]) => `<tr><td>${label}</td><td>${count(n)}</td></tr>`)
      .join(
        "",
      )}</tbody></table></div></div><div class="chart-grid"><div class="chart-panel"><h3>${t("Countries", "访问国家")}</h3><table class="data-table"><tbody>${d.countries.length ? d.countries.map((x) => `<tr><td>${esc(x.country)}</td><td>${x.count} ${t("sessions", "会话")}</td></tr>`).join("") : `<tr><td>${t("No data yet", "暂无数据")}</td></tr>`}</tbody></table></div><div class="chart-panel"><h3>${t("Devices", "设备分布")}</h3><table class="data-table"><tbody>${d.devices.length ? d.devices.map((x) => `<tr><td>${x.device === "mobile" ? t("Mobile", "移动端") : t("Desktop", "桌面端")}</td><td>${x.count} ${t("sessions", "会话")}</td></tr>`).join("") : `<tr><td>${t("No data yet", "暂无数据")}</td></tr>`}</tbody></table></div></div><p class="analytics-note">${t("Updated", "更新于")}: ${new Date(d.updatedAt).toLocaleString()} · ${t("Gross simulated order value includes cancelled orders; it is not real revenue.", "历史演示下单金额包含已取消订单，不代表真实收入。")}</p>`;
  window.lumaStats = d;
}
function render({ scroll = true, tracking = true } = {}) {
  const r = route();
  if (r !== "api") document.body.dataset.route = r;
  const p = getProduct(location.pathname.split("/")[2]);
  if (r === "admin") {
    $(".compare-dock")?.remove();
    document.title = "商城管理 · LUMA";
    mountAdmin($("#main"));
    return;
  }
  if (r === "analytics") {
    analyticsPage();
    return;
  }
  const pages = {
    home,
    shop: () => shop(),
    favorites: () => shop(true),
    product: () => productPage(p),
    routine: routinePage,
    quiz: quizPage,
    texture: texturePage,
    gift: giftPage,
    scene: scenePage,
    compare: comparePage,
    checkout: checkoutPage,
    orders: ordersPage,
    success: successPage,
    about: () => infoPage("about"),
    help: () => infoPage("help"),
    privacy: () => infoPage("privacy"),
  };
  if (!pages[r]) return;
  $("#main").innerHTML = pages[r]();
  translateStatic();
  if (r === "checkout")
    for (const [key, value] of Object.entries(checkoutDraft)) {
      const input = $('#checkout-form [name="' + key + '"]');
      if (input) {
        if (input.type === "checkbox") input.checked = value;
        else input.value = value;
      }
    }
  updateCompareDock();
  if (scroll) window.scrollTo(0, 0);
  document.title =
    (r === "product"
      ? p
        ? pname(p)
        : "404"
      : pageTitles[r]?.[state.lang === "zh" ? 1 : 0] ||
        t("Store management", "商城管理")) + " · LUMA Ritual";
  if (tracking) {
    track("page_view");
    if (r === "product" && p) track("view_item", p.id);
    if (r === "checkout" && state.cart.length) track("begin_checkout");
    if (r === "compare") track("compare");
    if (r === "texture") track("texture_view");
  }
}
function updateCompareDock() {
  $(".compare-dock")?.remove();
  if (
    state.compare.length &&
    route() !== "compare" &&
    route() !== "checkout" &&
    route() !== "analytics"
  ) {
    const a = document.createElement("a");
    a.href = "/compare";
    a.className = "compare-dock";
    a.textContent =
      t("Compare your edit", "对比心选商品") +
      " (" +
      state.compare.length +
      "/3) ↗";
    document.body.append(a);
  }
}
function addItems(ids, quantity = 1) {
  checkoutKey = null;
  for (const id of ids) {
    if (!getProduct(id) || getProduct(id).stock === 0) {
      toast(t("This essential is unavailable.", "商品暂时无货。"));
      continue;
    }
    const i = state.cart.find((x) => x.id === id);
    if (i) i.qty = Math.min(20, getProduct(id).stock ?? 20, i.qty + quantity);
    else
      state.cart.push({
        id,
        qty: Math.min(20, getProduct(id).stock ?? 20, quantity),
      });
    track("add_to_cart", id);
  }
  saveCart();
  toast(t("A little care, added to your bag.", "心选好物，已加入购物车。"));
  if (!$("#cart").hidden) renderCart();
}
let lastFocus;
function openCart() {
  lastFocus = document.activeElement;
  renderCart();
  $("#cart").hidden = false;
  $("#cart-overlay").hidden = false;
  document.body.style.overflow = "hidden";
  $("#cart").focus();
}
function closeCart() {
  $("#cart").hidden = true;
  $("#cart-overlay").hidden = true;
  document.body.style.overflow = "";
  lastFocus?.focus();
}
function renderCart() {
  const o = cartOrder();
  const amount = o ? o.subtotal - o.discount : 0;
  $("#cart-body").innerHTML = o
    ? `<div class="shipping-progress">${amount >= 75 ? t("Your bag qualifies for complimentary standard shipping.", "你的购物车已享免费标准配送。") : t("You’re " + money(75 - amount) + " away from complimentary standard shipping.", "再选 " + money(75 - amount) + " 即可享免费标准配送。")}<div class="bar-track"><i style="width:${Math.min(100, (amount / 75) * 100)}%"></i></div></div>${state.cart
        .map((i) => {
          const p = getProduct(i.id);
          return `<div class="cart-line">${art(p)}<div class="cart-item-content"><h3><a href="/product/${p.id}" data-close-cart>${esc(pname(p))}</a></h3><small>${esc(p.size)} · ${money(p.price)}</small><div style="display:flex;justify-content:space-between;align-items:end"><div class="quantity"><button data-action="cart-minus" data-id="i:${p.id}" aria-label="Decrease ${esc(pname(p))}">−</button><span>${i.qty}</span><button data-action="cart-plus" data-id="i:${p.id}" aria-label="Increase ${esc(pname(p))}">+</button></div><strong>${money(p.price * i.qty)}</strong></div><button class="remove-item" data-action="cart-remove" data-id="i:${p.id}">${t("Remove", "移除")}</button></div></div>`;
        })
        .join(
          "",
        )}${state.giftInCart ? `<div class="demo-notice">${t("Gift packaging", "礼盒包装")} · ${money(6)}<br>${esc(state.giftInCart.note || t("With care", "一份心意"))}<br><button class="text-link" data-action="gift-remove">${t("Remove packaging", "移除包装")}</button></div>` : ""}<div class="cart-summary">${summaryLines(o)}<a href="/checkout" class="btn" data-close-cart>${t("Demo checkout", "模拟结账")} ↗</a><p class="cart-demo-note">${t("No real payment. No real shipment.", "不真实收款，不实际发货。")}</p></div>`
    : empty(
        t("Room for a little care.", "给关怀，留一点位置。"),
        t("Your shopping bag is empty.", "你的购物车还是空的。"),
        "/shop",
        t("Explore essentials", "探索心选"),
      );
}
function toggleCompare(id) {
  if (state.compare.includes(id))
    state.compare = state.compare.filter((x) => x !== id);
  else if (state.compare.length < 3) state.compare.push(id);
  else {
    toast(t("Compare up to three essentials.", "最多同时对比 3 件商品。"));
    return false;
  }
  persist("compare", state.compare);
  return true;
}
function showProductModal(p) {
  $("#modal-content").innerHTML =
    `<div class="modal-content-grid">${art(p)}<div><span class="eyebrow">${esc(state.lang === "zh" ? p.tagZh : p.tag)}</span><h2>${esc(pname(p))}</h2><p>${esc(desc(p))}</p><p>${money(p.price)} · ${esc(p.size)}</p><div class="btn-row"><button class="btn" data-action="modal-add" data-id="${p.id}">${t("Add to bag", "加入购物车")} +</button><a class="text-link" href="/product/${p.id}" data-close-modal>${t("View details", "查看详情")} ↗</a></div></div></div>`;
  $("#modal").showModal();
}
function showRotate(p) {
  track("rotate_product", p.id);
  $("#modal-content").innerHTML =
    `<span class="eyebrow">THE PACKAGING STUDY / 360°</span><h2>${esc(pname(p))}</h2><div class="rotate-stage" id="rotate-stage"><div class="model-3d" id="model-3d" style="--bottle:${p.color};--rotation:25deg"><div class="model-cap"></div><div class="model-face model-front"><div class="bottle-label"><b>luma</b><small>R I T U A L</small><em>${esc(p.name)}</em><span>${esc(p.tag)}<br>${esc(p.size)}</span></div></div><div class="model-face model-back">LUMA RITUAL<br><br>${esc(p.ingredients.join(" · "))}<br><br>CONCEPT PACKAGING<br>DEMO ONLY<br><br>▥▥▥▥▥▥▥</div><div class="model-face model-left"></div><div class="model-face model-right"></div><div class="model-face model-top"></div><div class="model-face model-bottom"></div></div></div><label class="rotate-instructions" for="rotation">${t("Drag to rotate, or use the slider / arrow keys. This is an interactive concept packaging model.", "拖动旋转，或使用滑块及方向键。这是可交互的概念包装模型。")}</label><input class="rotation-slider" id="rotation" aria-label="${t("Product rotation angle", "商品旋转角度")}" type="range" min="0" max="360" value="25"><div class="btn-row"><button class="btn secondary small" data-action="rotate-reset">${t("Reset angle", "重置角度")}</button><button class="btn small" data-action="modal-add" data-id="${p.id}">${t("Add to bag", "加入购物车")} +</button></div>`;
  $("#modal").showModal();
  let start = 0,
    base = 25;
  const stage = $("#rotate-stage");
  stage.addEventListener("pointerdown", (e) => {
    start = e.clientX;
    base = Number($("#rotation").value);
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!stage.hasPointerCapture(e.pointerId)) return;
    const v = (((base + (e.clientX - start) * 1.4) % 360) + 360) % 360;
    $("#rotation").value = v;
    $("#model-3d").style.setProperty("--rotation", v + "deg");
  });
}
function showConsent(force = false) {
  if (state.consent !== null && !force) {
    $("#consent").hidden = true;
    return;
  }
  $("#consent").hidden = false;
  $("#consent").innerHTML =
    `<div class="consent-banner"><p><strong>${t("A little insight, with your permission.", "得到你的允许，再了解一点。")}</strong><br>${t("Allow anonymous visit and shopping interaction statistics? No IP addresses or contact details are stored.", "允许收集匿名访问和购物互动统计吗？不保存 IP 或联系信息。")} <a href="/privacy" class="text-link">${t("Details", "详情")}</a></p><div class="btn-row"><button class="btn small" data-action="consent-allow">${t("Allow analytics", "允许匿名统计")}</button><button class="btn secondary small" data-action="consent-reject">${t("Essential only", "仅必要功能")}</button></div></div>`;
}
let checkoutKey = null;
let checkoutBusy = false;
const checkoutDraft = {};
async function submitCheckout(form) {
  const error = $("#checkout-error");
  const button = $("#pay-button");
  if (checkoutBusy || !form.reportValidity()) return;
  checkoutBusy = true;
  button.disabled = true;
  button.textContent = t("Confirming demo order…", "正在确认演示订单…");
  error.textContent = "";
  checkoutKey ||= crypto.randomUUID();
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: checkoutKey,
        items: state.cart,
        code: state.code,
        shipping: state.shipping,
        gift: !!state.giftInCart,
        giftDetails: state.giftInCart,
        session: state.consent === true ? session : null,
      }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Order failed");
    const o = {
      ...result,
      lines: result.lines || cartOrder().lines,
      gift: state.giftInCart,
    };
    state.orders.unshift(o);
    persist("orders", state.orders);
    state.cart = [];
    state.giftInCart = null;
    state.code = "";
    persist("code", "");
    saveCart();
    checkoutKey = null;
    location.href = "/success/" + o.id;
  } catch (e) {
    error.textContent =
      e.message ||
      t(
        "Could not confirm the order. Your bag is saved. Please retry.",
        "订单未能确认，购物车已保留，请重试。",
      );
    button.disabled = false;
    button.textContent = t("Retry demo order", "重试模拟下单");
  } finally {
    checkoutBusy = false;
  }
}
function refreshCheckoutTotals() {
  const o = cartOrder();
  if (!o) return;
  $("#checkout-totals").innerHTML = summaryLines(o);
  $("#pay-button").textContent =
    t("Place demo order", "提交模拟订单") + " · " + money(o.total);
}
function download(filename, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.addEventListener("click", async (e) => {
  const closeLink = e.target.closest("[data-close-cart]");
  if (closeLink) closeCart();
  if (e.target.closest("[data-close-modal]")) $("#modal").close();
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action,
    id = el.dataset.id,
    p = getProduct(id);
  if (el.disabled) return;
  if (a === "add" || a === "detail-add" || a === "modal-add") {
    addItems([id], a === "detail-add" ? state.qty : 1);
    if (a === "modal-add") $("#modal").close();
    openCart();
  } else if (a === "favorite") {
    state.favorites = state.favorites.includes(id)
      ? state.favorites.filter((x) => x !== id)
      : [...state.favorites, id];
    persist("favorites", state.favorites);
    render({ scroll: false, tracking: false });
  } else if (a === "compare-toggle") {
    if (el.type === "checkbox") return;
    if (toggleCompare(id)) render({ scroll: false, tracking: false });
  } else if (a === "category") {
    state.category = id;
    render({ scroll: false, tracking: false });
  } else if (a === "detail-minus" || a === "detail-plus") {
    state.qty = Math.max(
      1,
      Math.min(20, state.qty + (a === "detail-plus" ? 1 : -1)),
    );
    render({ scroll: false, tracking: false });
  } else if (a === "rotate") showRotate(p);
  else if (a === "texture-link") {
    state.texture = p.texture;
    location.href = "/texture";
  } else if (a === "texture") {
    state.texture = id;
    render({ scroll: false, tracking: false });
    track("texture_view");
  } else if (a === "spread") $("#texture-stage")?.classList.toggle("spread");
  else if (a === "reset-texture") {
    $("#texture-stage").classList.remove("spread");
    $("#texture-stage").style.filter = "";
    $("#texture-light").value = 100;
  } else if (a === "period") {
    state.period = id;
    render({ scroll: false, tracking: false });
  } else if (a === "routine-pick") {
    state.routine[p.category] = p.id;
    persist("routine", state.routine);
    render({ scroll: false, tracking: false });
    toast(t("Added to your ritual.", "已加入护理搭配。"));
  } else if (a === "routine-add") {
    const steps =
      state.period === "am"
        ? ["cleanse", "serum", "moisturize", "protect"]
        : ["cleanse", "serum", "moisturize"];
    addItems(steps.map((s) => state.routine[s]).filter((x) => getProduct(x)));
    track("routine_add");
    openCart();
  } else if (a === "quiz-option") {
    state.quiz[el.dataset.key] = id;
    render({ scroll: false, tracking: false });
  } else if (a === "quiz-next") {
    state.quizStep++;
    if (state.quizStep === 3) track("quiz_complete");
    render({ scroll: false, tracking: false });
  } else if (a === "quiz-back") {
    state.quizStep--;
    render({ scroll: false, tracking: false });
  } else if (a === "quiz-reset") {
    state.quizStep = 0;
    state.quiz = { skin: "", goal: "", time: "" };
    render({ scroll: false, tracking: false });
  } else if (a === "quiz-routine") {
    const rec = quizRecommendations();
    state.routine = {};
    rec.forEach((p) => (state.routine[p.category] = p.id));
    state.period = state.quiz.time || "am";
    persist("routine", state.routine);
    location.href = "/routine";
  } else if (a === "gift-pick") {
    if (state.gift.ids.includes(id))
      state.gift.ids = state.gift.ids.filter((x) => x !== id);
    else if (state.gift.ids.length < 3) state.gift.ids.push(id);
    else {
      toast(
        t(
          "A little box fits up to three essentials.",
          "一个礼盒最多选择 3 件商品。",
        ),
      );
      return;
    }
    persist("gift", state.gift);
    render({ scroll: false, tracking: false });
  } else if (a === "gift-color") {
    state.gift.color = id;
    persist("gift", state.gift);
    render({ scroll: false, tracking: false });
  } else if (a === "gift-add") {
    if (state.giftInCart) {
      toast(
        t(
          "Your bag already has a gift box. Remove its packaging first to create a new one.",
          "购物车已有礼盒，请先移除原包装再添加新礼盒。",
        ),
      );
      openCart();
      return;
    }
    state.giftInCart = structuredClone(state.gift);
    addItems(state.gift.ids);
    track("gift_add");
    saveCart();
    openCart();
  } else if (a === "gift-remove") {
    state.giftInCart = null;
    saveCart();
    renderCart();
    if (route() === "checkout") render({ scroll: false, tracking: false });
  } else if (a === "scene-product") {
    track("scene_click", id);
    track("view_item", id);
    showProductModal(p);
  } else if (a === "scene-add-all") {
    addItems(products.slice(0, 3).map((p) => p.id));
    openCart();
  } else if (a === "compare-clear") {
    state.compare = [];
    persist("compare", []);
    render({ scroll: false, tracking: false });
  } else if (a.startsWith("cart-")) {
    const pid = id.slice(2);
    const item = state.cart.find((x) => x.id === pid);
    if (!item) return;
    checkoutKey = null;
    if (a === "cart-plus") item.qty = Math.min(20, item.qty + 1);
    if (a === "cart-minus") item.qty--;
    if (a === "cart-remove") item.qty = 0;
    state.cart = state.cart.filter((i) => i.qty > 0);
    if (
      state.giftInCart?.ids.includes(pid) &&
      !state.cart.some((i) => i.id === pid)
    ) {
      state.giftInCart.ids = state.giftInCart.ids.filter((x) => x !== pid);
      if (!state.giftInCart.ids.length) state.giftInCart = null;
    }
    saveCart();
    renderCart();
    if (route() === "checkout") render({ scroll: false, tracking: false });
  } else if (a === "coupon") {
    const code = $("#coupon").value.trim().toUpperCase();
    if (code && code !== "LUMA10") {
      toast(t("Try LUMA10 for 10% off.", "请输入 LUMA10 享九折。"));
      return;
    }
    state.code = code;
    persist("code", code);
    checkoutKey = null;
    refreshCheckoutTotals();
    toast(t("Your bag has been updated.", "订单金额已更新。"));
  } else if (a === "reorder") {
    const o = state.orders.find((x) => x.id === id);
    o?.lines.forEach((i) => addItems([i.id], i.qty));
    openCart();
  } else if (a === "cancel-order") {
    const o = state.orders.find((x) => x.id === id);
    if (o) {
      if (o.receiptToken) {
        try {
          const r = await fetch(
            "/api/orders/" + encodeURIComponent(id) + "/cancel",
            { method: "POST", headers: { "X-Order-Token": o.receiptToken } },
          );
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          Object.assign(o, data);
        } catch (e) {
          toast(e.message);
          return;
        }
      }
      o.cancelled = true;
      o.status = "cancelled";
      persist("orders", state.orders);
      render({ scroll: false, tracking: false });
      toast(
        t(
          "Demo order cancelled. No payment was taken.",
          "演示订单已取消，没有真实扣款。",
        ),
      );
    }
  } else if (a === "receipt") {
    const o = state.orders.find((x) => x.id === id);
    if (o)
      download(
        o.id + "-DEMO.txt",
        `LUMA RITUAL — DEMO RECEIPT\nNo payment collected / No shipment\n${o.id}\n${new Date(o.created_at).toISOString()}\n\n${o.lines.map((i) => `${i.name} × ${i.qty} — USD ${(i.price * i.qty).toFixed(2)}`).join("\n")}\n\nDemo total: USD ${o.total.toFixed(2)}\n`,
      );
  } else if (a === "rotate-reset") {
    $("#rotation").value = 25;
    $("#model-3d").style.setProperty("--rotation", "25deg");
  } else if (a === "consent-settings") showConsent(true);
  else if (a === "consent-allow" || a === "consent-reject") {
    state.consent = a === "consent-allow";
    persist("consent", state.consent);
    showConsent();
    if (state.consent) {
      track("page_view");
      const p = getProduct(location.pathname.split("/")[2]);
      if (route() === "product" && p) track("view_item", p.id);
    }
  } else if (a === "analytics-days") analyticsPage(Number(id));
  else if (a === "analytics-refresh")
    analyticsPage(window.lumaStats?.days || 7);
  else if (a === "analytics-logout") {
    await fetch("/api/admin/logout", { method: "POST" });
    window.lumaStats = null;
    analyticsPage();
  } else if (a === "analytics-export") {
    const d = window.lumaStats;
    if (d) {
      const rows = [
        ["Metric", "Value"],
        ["Period days", d.days],
        ["Demo orders", d.orders.count],
        ["Demo order value USD", d.orders.revenue],
        ...d.events.map((e) => ["Event: " + e.name, e.count]),
        [],
        ["UTC date", "Page views", "Sessions"],
        ...d.daily.map((x) => [x.day, x.views, x.sessions]),
      ];
      download(
        "luma-analytics.csv",
        "\uFEFF" +
          rows
            .map((r) =>
              r
                .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
                .join(","),
            )
            .join("\n"),
        "text/csv;charset=utf-8",
      );
    }
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.closest("#checkout-form") && el.name && el.name !== "shipping")
    checkoutDraft[el.name] = el.type === "checkbox" ? el.checked : el.value;
  if (el.id === "search") {
    const pos = el.selectionStart;
    state.search = el.value;
    render({ scroll: false, tracking: false });
    $("#search").focus();
    try {
      $("#search").setSelectionRange(pos, pos);
    } catch {}
  }
  if (el.id === "max-price") {
    state.maxPrice = Number(el.value);
    const focused = document.activeElement === el;
    render({ scroll: false, tracking: false });
    if (focused) $("#max-price").focus();
  }
  if (el.id === "gift-note") {
    state.gift.note = el.value;
    persist("gift", state.gift);
    $("#gift-card-preview").textContent =
      el.value ||
      t("A little something, just for you.", "一点小心意，送给特别的你。");
  }
  if (el.id === "texture-light")
    $("#texture-stage").style.filter = `brightness(${el.value}%)`;
  if (el.id === "rotation")
    $("#model-3d").style.setProperty("--rotation", el.value + "deg");
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.closest("#checkout-form") && el.name && el.name !== "shipping")
    checkoutDraft[el.name] = el.type === "checkbox" ? el.checked : el.value;
  if (el.id === "language") {
    state.lang = el.value;
    persist("lang", state.lang);
    const u = new URL(location.href);
    if (state.lang === "zh") u.searchParams.set("lang", "zh");
    else u.searchParams.delete("lang");
    history.replaceState(null, "", u);
    render({ scroll: false, tracking: false });
    if (!$("#cart").hidden) renderCart();
    showConsent();
  }
  if (el.id === "currency") {
    state.currency = el.value;
    persist("currency", state.currency);
    render({ scroll: false, tracking: false });
    if (!$("#cart").hidden) renderCart();
  }
  if (el.id === "skin-filter") {
    state.skinFilter = el.value;
    render({ scroll: false, tracking: false });
  }
  if (el.id === "texture-filter") {
    state.textureFilter = el.value;
    render({ scroll: false, tracking: false });
  }
  if (el.id === "sort") {
    state.sort = el.value;
    render({ scroll: false, tracking: false });
  }
  if (el.dataset.action === "compare-toggle") {
    if (!toggleCompare(el.dataset.id)) el.checked = false;
    updateCompareDock();
    if (route() === "compare") render({ scroll: false, tracking: false });
  }
  if (el.dataset.routine) {
    state.routine[el.dataset.routine] = el.value;
    persist("routine", state.routine);
    render({ scroll: false, tracking: false });
  }
  if (el.name === "shipping") {
    state.shipping = el.value;
    checkoutKey = null;
    refreshCheckoutTotals();
  }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id === "checkout-form") {
    e.preventDefault();
    submitCheckout(e.target);
  }
  if (e.target.id === "analytics-login") {
    e.preventDefault();
    const button = $("button", e.target);
    button.disabled = true;
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: new FormData(e.target).get("password"),
        }),
      });
      if (!res.ok) throw new Error();
      analyticsPage();
    } catch {
      $("#login-error").textContent = t(
        "Could not sign in. Check your password and try again.",
        "无法登录，请检查密码后重试。",
      );
      button.disabled = false;
    }
  }
  if (e.target.id === "support-form") {
    e.preventDefault();
    $("#support-result").textContent =
      t("Local demo reference: ", "本地演示工单：") +
      "HELP-" +
      crypto.randomUUID().slice(0, 8).toUpperCase() +
      t(" · No message was sent.", " · 未发送任何消息。");
    e.target.reset();
  }
});
document.addEventListener("dragstart", (e) => {
  const card = e.target.closest("[draggable][data-product]");
  if (card) e.dataTransfer.setData("text/plain", card.dataset.product);
});
document.addEventListener("dragover", (e) => {
  const slot = e.target.closest("[data-step]");
  if (slot) {
    e.preventDefault();
    slot.classList.add("drag-over");
  }
});
document.addEventListener("dragleave", (e) =>
  e.target.closest("[data-step]")?.classList.remove("drag-over"),
);
document.addEventListener("drop", (e) => {
  const slot = e.target.closest("[data-step]");
  if (!slot) return;
  e.preventDefault();
  const p = getProduct(e.dataTransfer.getData("text/plain"));
  if (p?.category === slot.dataset.step) {
    state.routine[p.category] = p.id;
    persist("routine", state.routine);
    render({ scroll: false, tracking: false });
    toast(t("A little change, made.", "搭配已更新。"));
  } else {
    slot.classList.remove("drag-over");
    toast(
      t(
        "Choose an essential for this matching step.",
        "请选择与此护理步骤对应的商品。",
      ),
    );
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#cart").hidden) closeCart();
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches('[data-action="rotate"]')
  ) {
    e.preventDefault();
    showRotate(getProduct(e.target.dataset.id));
  }
  if ((e.key === "Enter" || e.key === " ") && e.target.id === "texture-stage") {
    e.preventDefault();
    e.target.classList.toggle("spread");
  }
  if (e.key === "Tab" && !$("#cart").hidden) {
    const focusables = $$(
      'a,button,input,select,[tabindex="0"]',
      $("#cart"),
    ).filter((x) => !x.disabled);
    const first = focusables[0],
      last = focusables.at(-1);
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === $("#cart"))
    ) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
$("#cart-open").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
$("#cart-overlay").addEventListener("click", closeCart);
$(".modal-close").addEventListener("click", () => $("#modal").close());
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) {
    const r = $("#modal").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      $("#modal").close();
  }
});
$("#mobile-menu").addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  $("#mobile-menu").setAttribute("aria-expanded", open);
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#texture-stage"))
    $("#texture-stage").classList.toggle("spread");
});
window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#")) {
    const target = location.hash.slice(1);
    location.replace(
      (target === "home" ? "/" : "/" + target) + location.search,
    );
  }
});
window.addEventListener("storage", (e) => {
  if (e.key === "luma-cart") {
    state.cart = read("cart", []);
    updateCartCount();
    if (!$("#cart").hidden) renderCart();
  }
});
if (location.hash) {
  const target = location.hash.slice(1);
  location.replace((target === "home" ? "/" : "/" + target) + location.search);
} else {
  translateStatic();
  render({ tracking: true });
  showConsent();
  if (route() === "orders")
    Promise.all(
      state.orders
        .filter((o) => o.receiptToken)
        .slice(0, 20)
        .map(async (o) => {
          try {
            const r = await fetch("/api/orders/" + encodeURIComponent(o.id), {
              headers: { "X-Order-Token": o.receiptToken },
            });
            if (r.ok) Object.assign(o, await r.json());
          } catch {}
        }),
    ).then(() => {
      persist("orders", state.orders);
      render({ scroll: false, tracking: false });
    });
}
