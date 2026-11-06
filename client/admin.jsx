import { h, render, Fragment } from "preact";
import { useEffect } from "preact/hooks";

import { createAdminController } from "./admin/controller.js";
import { createEditors } from "./admin/editors.jsx";
import { createDashboard } from "./admin/dashboard.jsx";

export function mountAdmin(root) {
  const controller = createAdminController();
  const {
    tab,
    auth,
    busy,
    error,
    notice,
    data,
    draft,
    selectedOrder,
    api,
    load,
  } = controller;
  const { ProductEditor, OrderEditor } = createEditors(controller);
  const { Overview, ProductTable, Inventory, Orders, AuditTable } =
    createDashboard(controller);
  function Login() {
    return (
      <div class="analytics-login">
        <span class="eyebrow">LUMA / OWNER</span>
        <h2>商城管理后台</h2>
        <p>管理商品、库存与演示订单。使用站长密码登录。</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const password = new FormData(e.currentTarget).get("password");
            busy.value = true;
            error.value = "";
            try {
              await api("/api/admin/login", {
                method: "POST",
                body: JSON.stringify({ password }),
              });
              await load();
            } catch (e) {
              error.value = e.message;
            } finally {
              busy.value = false;
            }
          }}
        >
          <label class="field">
            管理密码
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          {error.value && (
            <p class="error-message" role="alert">
              {error.value}
            </p>
          )}
          <button class="btn" disabled={busy.value}>
            {busy.value ? "登录中…" : "登录后台"}
          </button>
        </form>
        <a
          class="text-link"
          href="/"
          style="display:inline-block;margin-top:20px"
        >
          返回商城 ↗
        </a>
      </div>
    );
  }

  function App() {
    useEffect(() => {
      load();
    }, []);
    if (auth.value === false)
      return (
        <section class="section">
          <Login />
        </section>
      );
    return (
      <section class="admin-shell">
        <aside class="admin-sidebar">
          <span class="eyebrow">LUMA / OWNER</span>
          <h2>商城管理</h2>
          <nav aria-label="后台导航">
            {[
              ["overview", "概览"],
              ["products", "商品管理"],
              ["inventory", "库存流水"],
              ["orders", "演示订单"],
              ["audit", "操作日志"],
            ].map(([v, n]) => (
              <a
                class={tab === v ? "active" : ""}
                href={"/admin" + (v === "overview" ? "" : "/" + v)}
              >
                {n}
                <span>↗</span>
              </a>
            ))}
            <a href="/analytics">访问统计 ↗</a>
            <a href="/">返回商城 ↗</a>
          </nav>
          <p>
            DEMO COMMERCE
            <br />
            模拟支付 · 不实际发货
          </p>
          <button
            class="text-link"
            onClick={async () => {
              await api("/api/admin/logout", { method: "POST" });
              auth.value = false;
              data.value = null;
            }}
          >
            退出登录
          </button>
        </aside>
        <div class="admin-main">
          <div class="workspace-heading">
            <div>
              <span class="eyebrow">STORE WORKSPACE</span>
              <h1>
                {{
                  overview: "经营概览",
                  products: "商品管理",
                  inventory: "库存与流水",
                  orders: "演示订单",
                  audit: "操作日志",
                }[tab] || "经营概览"}
              </h1>
            </div>
            <button
              class="btn secondary small"
              onClick={load}
              disabled={busy.value}
            >
              {busy.value ? "读取中…" : "刷新数据"}
            </button>
          </div>
          {notice.value && (
            <div class="admin-notice" role="status">
              {notice.value}
              <button aria-label="关闭提示" onClick={() => (notice.value = "")}>
                ×
              </button>
            </div>
          )}
          {error.value && !draft.value && !selectedOrder.value && (
            <p class="error-message" role="alert">
              {error.value}
            </p>
          )}
          {!data.value ? (
            <p class="loading">正在读取管理数据…</p>
          ) : tab === "products" ? (
            <ProductTable />
          ) : tab === "inventory" ? (
            <Inventory />
          ) : tab === "orders" ? (
            <Orders />
          ) : tab === "audit" ? (
            <>
              <p class="admin-note">
                最近 100 条后台操作，不记录管理密码或客户联系方式。
              </p>
              <AuditTable rows={data.value.logs} />
            </>
          ) : (
            <Overview />
          )}
        </div>
        {draft.value && <ProductEditor />}
        {selectedOrder.value && <OrderEditor />}
      </section>
    );
  }

  root.replaceChildren();

  render(<App />, root);
}
