import { signal } from "@preact/signals";

export function createAdminController() {
  const tab = location.pathname.split("/")[2] || "overview";

  const auth = signal(null),
    busy = signal(false),
    error = signal(""),
    notice = signal(""),
    data = signal(null),
    allProducts = signal([]),
    draft = signal(null),
    newProduct = signal(false),
    filter = signal(""),
    search = signal(""),
    page = signal(1),
    selectedOrder = signal(null);

  const productName = (id) =>
    allProducts.value.find((p) => p.id === id)?.zh || id;

  async function api(path, options = {}) {
    const r = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const b = await r.json();
    if (r.status === 401) {
      auth.value = false;
      throw new Error("请登录后继续");
    }
    if (!r.ok) throw new Error(b.error || "请求失败");
    auth.value = true;
    return b;
  }

  async function load() {
    busy.value = true;
    error.value = "";
    try {
      const products = await api("/api/admin/products");
      allProducts.value = products.products;
      if (tab === "products") data.value = products;
      else if (tab === "inventory")
        data.value = await api("/api/admin/inventory");
      else if (tab === "orders")
        data.value = await api(
          "/api/admin/orders?" +
            new URLSearchParams({
              page: page.value,
              status: filter.value,
              q: search.value,
            }),
        );
      else if (tab === "audit") data.value = await api("/api/admin/audit");
      else data.value = await api("/api/admin/overview");
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    busy.value = true;
    error.value = "";
    try {
      await api(
        "/api/admin/products" + (newProduct.value ? "" : "/" + draft.value.id),
        {
          method: newProduct.value ? "POST" : "PUT",
          body: JSON.stringify(draft.value),
        },
      );
      draft.value = null;
      notice.value = "商品已保存，商城内容会在重新打开页面时同步。";
      await load();
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  async function toggle(p) {
    busy.value = true;
    error.value = "";
    try {
      await api("/api/admin/products/" + p.id, {
        method: "PUT",
        body: JSON.stringify({ ...p, active: !p.active }),
      });
      notice.value = p.active ? "商品已下架，历史订单仍保留。" : "商品已上架。";
      await load();
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  async function saveOrder(e) {
    e.preventDefault();
    busy.value = true;
    error.value = "";
    try {
      await api("/api/admin/orders/" + selectedOrder.value.id, {
        method: "PUT",
        body: JSON.stringify(selectedOrder.value),
      });
      selectedOrder.value = null;
      notice.value = "演示订单状态已更新。取消订单会自动返还库存。";
      await load();
    } catch (e) {
      error.value = e.message;
    } finally {
      busy.value = false;
    }
  }

  const set = (key, value) => (draft.value = { ...draft.value, [key]: value });
  return {
    tab,
    auth,
    busy,
    error,
    notice,
    data,
    allProducts,
    draft,
    newProduct,
    filter,
    search,
    page,
    selectedOrder,
    productName,
    api,
    load,
    saveProduct,
    toggle,
    saveOrder,
    set,
  };
}
