import { bindStorefrontEvents } from "./storefront/events.js";
import { createAnalytics } from "./storefront/analytics.js";
import { products, getProduct, calculateOrder } from "../public/catalog.js";
import { createViews } from "../public/views.js";
import { createState, read } from "./storefront/state.js";
import { pageTitles } from "../public/seo.js";
import { mountAdmin } from "./admin.jsx";
const bootstrap = JSON.parse(
  document.getElementById("bootstrap")?.textContent || "{}",
);
if (Array.isArray(bootstrap.products))
  products.splice(0, products.length, ...bootstrap.products);
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const state = createState(products, bootstrap);
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
const { analyticsPage } = createAnalytics({
  $,
  products,
  t,
  pname,
  esc,
  route,
  translateStatic,
  intro,
});
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
bindStorefrontEvents({
  $,
  $$,
  products,
  getProduct,
  read,
  state,
  persist,
  t,
  route,
  saveCart,
  updateCartCount,
  toast,
  track,
  quizRecommendations,
  analyticsPage,
  render,
  updateCompareDock,
  addItems,
  openCart,
  closeCart,
  renderCart,
  toggleCompare,
  showProductModal,
  showRotate,
  showConsent,
  resetCheckoutKey: () => {
    checkoutKey = null;
  },
  checkoutDraft,
  submitCheckout,
  refreshCheckoutTotals,
  download,
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
