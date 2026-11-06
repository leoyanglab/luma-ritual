import { h, Fragment } from "preact";
import {
  statuses,
  categories,
  date,
  usd,
  download,
  csv,
  blank,
} from "./utils.js";

export function createDashboard(controller) {
  const {
    busy,
    data,
    allProducts,
    draft,
    newProduct,
    filter,
    search,
    page,
    selectedOrder,
    productName,
    load,
    toggle,
  } = controller;
  function Overview() {
    const d = data.value;
    return (
      <>
        <div class="metric-grid">
          {[
            [
              "商品总数 / 已上架",
              (d.products.total || 0) + " / " + (d.products.active || 0),
            ],
            ["低库存商品", d.products.lowStock || 0],
            ["待处理订单", d.orders.pending || 0],
            ["有效演示订单金额", usd(d.orders.value)],
          ].map(([n, v]) => (
            <article class="metric">
              <span>{n}</span>
              <strong>{v}</strong>
            </article>
          ))}
        </div>
        <div class="admin-quick-grid">
          {[
            ["products", "商品管理", "编辑中英文内容、价格、包装与上架状态。"],
            ["inventory", "库存管理", "检查可售库存和每一次库存变化。"],
            ["orders", "演示订单", "查看下单明细，处理状态与模拟物流。"],
            ["/analytics", "访问统计", "查看匿名访问、转化漏斗与商品热度。"],
          ].map(([path, n, d]) => (
            <a
              class="admin-quick"
              href={path.startsWith("/") ? path : "/admin/" + path}
            >
              <h3>{n} ↗</h3>
              <p>{d}</p>
            </a>
          ))}
        </div>
        <h3 style="margin-top:35px">最近操作</h3>
        <AuditTable rows={d.recent} />
      </>
    );
  }

  function ProductTable() {
    const list = allProducts.value.filter((p) =>
      (p.name + p.zh + p.id).toLowerCase().includes(search.value.toLowerCase()),
    );
    return (
      <>
        <div class="admin-toolbar">
          <input
            class="search-input"
            value={search.value}
            onInput={(e) => (search.value = e.currentTarget.value)}
            placeholder="搜索商品名称 / ID"
            aria-label="搜索商品"
          />
          <div class="btn-row">
            <button
              class="btn secondary small"
              onClick={() =>
                download(
                  "luma-products.json",
                  JSON.stringify(allProducts.value, null, 2),
                  "application/json",
                )
              }
            >
              导出商品 JSON
            </button>
            <button
              class="btn small"
              onClick={() => {
                newProduct.value = true;
                draft.value = blank();
              }}
            >
              新增商品 ＋
            </button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>分类</th>
                <th>USD 价格</th>
                <th>库存</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr>
                  <td>
                    <strong>{p.zh}</strong>
                    <small>
                      {p.name}
                      <br />
                      {p.id}
                    </small>
                  </td>
                  <td>{categories[p.category]}</td>
                  <td>{usd(p.price)}</td>
                  <td>
                    <span class={p.stock <= 10 ? "admin-low" : ""}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <span class={"status-pill " + (!p.active ? "muted" : "")}>
                      {p.active ? "已上架" : "已下架"}
                    </span>
                  </td>
                  <td>
                    <div class="btn-row">
                      <button
                        class="text-link"
                        onClick={() => {
                          newProduct.value = false;
                          draft.value = structuredClone(p);
                        }}
                      >
                        编辑
                      </button>
                      <button
                        class="text-link"
                        disabled={busy.value}
                        onClick={() => toggle(p)}
                      >
                        {p.active ? "下架" : "上架"}
                      </button>
                      <a
                        class="text-link"
                        href={
                          p.active
                            ? "/product/" + p.id
                            : "/api/admin/preview/" + p.id
                        }
                        target="_blank"
                        rel="noopener"
                      >
                        预览 ↗
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <p class="admin-note">没有匹配的商品。</p>}
      </>
    );
  }

  function Inventory() {
    return (
      <>
        <p class="admin-note">
          下单自动扣减，取消自动返还。库存编辑通过版本校验，订单与库存更新在同一事务内完成。
        </p>
        <div class="admin-inventory-grid">
          {allProducts.value.map((p) => (
            <article class="admin-stock-card">
              <span>{p.zh}</span>
              <strong class={p.stock <= 10 ? "admin-low" : ""}>
                {p.stock}
              </strong>
              <small>
                {p.active ? "上架中" : "已下架"} ·{" "}
                {p.stock <= 10 ? "低库存" : "库存正常"}
              </small>
              <button
                class="text-link"
                onClick={() => {
                  newProduct.value = false;
                  draft.value = structuredClone(p);
                }}
              >
                调整库存 ↗
              </button>
            </article>
          ))}
        </div>
        <h3>最近 100 条库存流水</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>商品</th>
                <th>变动</th>
                <th>原因</th>
                <th>订单</th>
              </tr>
            </thead>
            <tbody>
              {data.value.movements.map((m) => (
                <tr>
                  <td>{date(m.created_at)}</td>
                  <td>{productName(m.product_id)}</td>
                  <td>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </td>
                  <td>
                    {{
                      purchase: "下单扣减",
                      cancelled: "取消返还",
                      initial: "初始库存",
                      "admin adjustment": "后台调整",
                    }[m.reason] || m.reason}
                  </td>
                  <td>{m.order_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.value.movements.length && (
          <p class="admin-note">暂无库存流水。</p>
        )}
      </>
    );
  }

  function Orders() {
    const d = data.value;
    return (
      <>
        <form
          class="admin-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            page.value = 1;
            load();
          }}
        >
          <div class="btn-row">
            <input
              class="search-input"
              placeholder="按订单编号搜索"
              aria-label="搜索订单"
              value={search.value}
              onInput={(e) => (search.value = e.currentTarget.value)}
            />
            <select
              class="sort-select"
              aria-label="订单状态筛选"
              value={filter.value}
              onChange={(e) => (filter.value = e.currentTarget.value)}
            >
              <option value="">全部状态</option>
              {Object.entries(statuses).map(([v, n]) => (
                <option value={v}>{n}</option>
              ))}
            </select>
            <button class="btn secondary small">筛选</button>
          </div>
          <button
            type="button"
            class="btn secondary small"
            onClick={() =>
              download(
                "luma-demo-orders-page-" + page.value + ".csv",
                csv([
                  ["订单", "时间", "状态", "演示金额 USD", "商品"],
                  ...d.orders.map((o) => [
                    o.id,
                    date(o.created_at),
                    statuses[o.status],
                    o.total,
                    o.lines.map((i) => i.name + " × " + i.qty).join(" / "),
                  ]),
                ]),
                "text/csv;charset=utf-8",
              )
            }
          >
            导出当前页 CSV
          </button>
        </form>
        <div class="demo-notice">
          所有订单均为模拟支付，不产生真实收入、不实际发货。历史订单总数{" "}
          {d.total}。
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>订单 / 时间</th>
                <th>商品</th>
                <th>演示金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {d.orders.map((o) => (
                <tr>
                  <td>
                    <strong>{o.id}</strong>
                    <small>{date(o.created_at)}</small>
                  </td>
                  <td>
                    {o.lines.map((i) => (
                      <div>
                        {i.product?.zh || i.name} × {i.qty}
                      </div>
                    ))}
                  </td>
                  <td>{usd(o.total)}</td>
                  <td>
                    <span class="status-pill">
                      {statuses[o.status] || o.status}
                    </span>
                  </td>
                  <td>
                    <button
                      class="text-link"
                      onClick={() =>
                        (selectedOrder.value = {
                          ...structuredClone(o),
                          originalStatus: o.status,
                        })
                      }
                    >
                      查看 / 处理
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!d.orders.length && <p class="admin-note">没有匹配的订单。</p>}
        <div class="admin-toolbar">
          <span>
            第 {page.value} 页 / 共 {Math.max(1, Math.ceil(d.total / 20))} 页
          </span>
          <div class="btn-row">
            <button
              class="btn secondary small"
              disabled={page.value <= 1 || busy.value}
              onClick={() => {
                page.value--;
                load();
              }}
            >
              上一页
            </button>
            <button
              class="btn secondary small"
              disabled={page.value * 20 >= d.total || busy.value}
              onClick={() => {
                page.value++;
                load();
              }}
            >
              下一页
            </button>
          </div>
        </div>
      </>
    );
  }

  function AuditTable({ rows }) {
    return (
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作</th>
              <th>对象</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr>
                <td>{date(r.created_at)}</td>
                <td>
                  {{
                    "product.create": "新增商品",
                    "product.update": "编辑商品 / 库存",
                    "order.update": "处理订单",
                  }[r.action] || r.action}
                </td>
                <td>{r.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p class="admin-note">暂无操作记录。</p>}
      </div>
    );
  }
  return { Overview, ProductTable, Inventory, Orders, AuditTable };
}
