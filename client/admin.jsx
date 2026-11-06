import { h, render, Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { signal } from "@preact/signals";
const statuses = {
  confirmed: "待处理",
  processing: "备货中",
  shipped: "已模拟发货",
  completed: "演示完成",
  cancelled: "已取消",
};
const next = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};
const categories = {
  cleanse: "清洁",
  serum: "精华",
  moisturize: "保湿",
  protect: "防护",
};
const date = (n) => (n ? new Date(n).toLocaleString("zh-CN") : "—");
const usd = (n) => "$" + Number(n || 0).toFixed(2);
const download = (name, data, type) => {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};
const csv = (rows) =>
  "\uFEFF" +
  rows
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(v ?? "")
              .replace(/^[=+@\-\t\r]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\n");
const blank = () => ({
  id: "",
  name: "",
  zh: "",
  tag: "SKINCARE ESSENTIAL",
  tagZh: "日常护理",
  category: "serum",
  price: 30,
  size: "30 ml",
  color: "#b4c6a9",
  shape: "dropper",
  texture: "serum",
  skin: ["combination"],
  ingredients: ["Glycerin"],
  ingredientsZh: ["甘油"],
  desc: "A concept skincare essential for your daily ritual.",
  descZh: "融入日常护理的概念护肤单品。",
  badge: "New essential",
  badgeZh: "新品",
  stock: 100,
  active: false,
});
export function mountAdmin(root) {
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
  function Field({ label, name, type = "text", maxLength = 160 }) {
    const p = draft.value;
    return (
      <label class="field">
        {label}
        <input
          name={name}
          type={type}
          value={p[name]}
          required
          maxLength={maxLength}
          min={type === "number" ? 0 : undefined}
          max={
            name === "price" ? 10000 : name === "stock" ? 1000000 : undefined
          }
          step={name === "price" ? "0.01" : name === "stock" ? "1" : undefined}
          disabled={name === "id" && !newProduct.value}
          onInput={(e) =>
            set(
              name,
              type === "number"
                ? Number(e.currentTarget.value)
                : e.currentTarget.value,
            )
          }
        />
      </label>
    );
  }
  function Modal({ title, onClose, children }) {
    const ref = useRef();
    useEffect(() => {
      const before = document.activeElement;
      document.body.style.overflow = "hidden";
      ref.current?.querySelector("input,select,textarea,button")?.focus();
      return () => {
        document.body.style.overflow = "";
        before?.focus();
      };
    }, []);
    return (
      <div class="admin-modal-overlay">
        <section
          class="admin-modal"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          ref={ref}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Tab") {
              const els = [
                ...ref.current.querySelectorAll(
                  "input,select,textarea,button,a",
                ),
              ].filter((x) => !x.disabled);
              if (e.shiftKey && document.activeElement === els[0]) {
                e.preventDefault();
                els.at(-1)?.focus();
              } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
                e.preventDefault();
                els[0]?.focus();
              }
            }
          }}
        >
          <div class="workspace-heading">
            <h2>{title}</h2>
            <button class="icon-button" onClick={onClose} aria-label="关闭编辑">
              ×
            </button>
          </div>
          {children}
        </section>
      </div>
    );
  }
  function ProductEditor() {
    const p = draft.value;
    return (
      <Modal
        title={newProduct.value ? "新增商品" : "编辑商品 · " + p.zh}
        onClose={() => (draft.value = null)}
      >
        <form onSubmit={saveProduct}>
          <p class="admin-note">
            商品 ID 创建后不变。库存与版本在服务端校验，避免多人编辑覆盖。
          </p>
          <div class="admin-form-grid">
            <Field label="商品 ID（小写英文、数字、连字符）" name="id" />
            <Field label="库存数量" name="stock" type="number" />
            <Field label="英文名称" name="name" />
            <Field label="中文名称" name="zh" />
            <Field label="基准价格（USD）" name="price" type="number" />
            <Field label="规格容量" name="size" />
            <Field label="英文副标题" name="tag" />
            <Field label="中文副标题" name="tagZh" />
            <Field label="英文标签" name="badge" />
            <Field label="中文标签" name="badgeZh" />
            <label class="field">
              分类
              <select
                value={p.category}
                onChange={(e) => set("category", e.currentTarget.value)}
              >
                {Object.entries(categories).map(([v, n]) => (
                  <option value={v}>{n}</option>
                ))}
              </select>
            </label>
            <label class="field">
              包装形状
              <select
                value={p.shape}
                onChange={(e) => set("shape", e.currentTarget.value)}
              >
                {[
                  ["dropper", "滴管瓶"],
                  ["pump", "泵瓶"],
                  ["jar", "面霜罐"],
                  ["tube", "软管"],
                ].map(([v, n]) => (
                  <option value={v}>{n}</option>
                ))}
              </select>
            </label>
            <label class="field">
              质地
              <select
                value={p.texture}
                onChange={(e) => set("texture", e.currentTarget.value)}
              >
                {[
                  ["serum", "精华"],
                  ["cream", "乳霜"],
                  ["gel", "凝露"],
                  ["oil", "护理油"],
                ].map(([v, n]) => (
                  <option value={v}>{n}</option>
                ))}
              </select>
            </label>
            <Field label="包装颜色" name="color" type="color" />
          </div>
          <div class="admin-form-grid">
            <label class="field">
              英文描述
              <textarea
                required
                maxLength="1000"
                rows="3"
                value={p.desc}
                onInput={(e) => set("desc", e.currentTarget.value)}
              />
            </label>
            <label class="field">
              中文描述
              <textarea
                required
                maxLength="1000"
                rows="3"
                value={p.descZh}
                onInput={(e) => set("descZh", e.currentTarget.value)}
              />
            </label>
            <label class="field">
              英文成分（逗号分隔）
              <input
                required
                value={p.ingredients.join(", ")}
                onChange={(e) =>
                  set(
                    "ingredients",
                    e.currentTarget.value
                      .split(/[,，]/)
                      .map((v) => v.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
            <label class="field">
              中文成分（逗号分隔）
              <input
                required
                value={p.ingredientsZh.join("，")}
                onChange={(e) =>
                  set(
                    "ingredientsZh",
                    e.currentTarget.value
                      .split(/[,，]/)
                      .map((v) => v.trim())
                      .filter(Boolean),
                  )
                }
              />
            </label>
          </div>
          <fieldset class="admin-fieldset">
            <legend>肤质偏好（示例商品标签）</legend>
            {[
              ["dry", "干性"],
              ["oily", "油性"],
              ["combination", "混合性"],
              ["sensitive", "敏感性"],
            ].map(([v, n]) => (
              <label>
                <input
                  type="checkbox"
                  checked={p.skin.includes(v)}
                  onChange={(e) =>
                    set(
                      "skin",
                      e.currentTarget.checked
                        ? [...p.skin, v]
                        : p.skin.filter((s) => s !== v),
                    )
                  }
                />{" "}
                {n}
              </label>
            ))}
          </fieldset>
          <label class="check-label">
            <input
              type="checkbox"
              checked={p.active}
              onChange={(e) => set("active", e.currentTarget.checked)}
            />
            上架展示（关闭后前台隐藏，历史订单保留）
          </label>
          {error.value && (
            <p class="error-message" role="alert">
              {error.value}
            </p>
          )}
          <div class="btn-row">
            <button class="btn" type="submit" disabled={busy.value}>
              {busy.value ? "保存中…" : "保存商品"}
            </button>
            <button
              type="button"
              class="btn secondary"
              onClick={() => (draft.value = null)}
            >
              取消
            </button>
          </div>
        </form>
      </Modal>
    );
  }
  function OrderEditor() {
    const o = selectedOrder.value;
    return (
      <Modal
        title={"演示订单 · " + o.id}
        onClose={() => (selectedOrder.value = null)}
      >
        <form onSubmit={saveOrder}>
          <div class="admin-order-items">
            {o.lines.map((i) => (
              <p>
                {i.product?.zh || i.name} × {i.qty}{" "}
                <strong>{usd(i.price * i.qty)}</strong>
              </p>
            ))}
          </div>
          <div class="admin-note">
            配送：
            {o.details?.shipping === "express" ? "模拟快递" : "模拟标准配送"} ·
            运费 {usd(o.details?.delivery)} · 优惠 {usd(o.details?.discount)}
            {o.details?.gift && (
              <p>
                礼盒留言：{o.details.gift.note || "未填写"} · 包装费{" "}
                {usd(o.details.packaging)}
              </p>
            )}
          </div>
          <p>
            <strong>演示总额 {usd(o.total)}</strong> · {date(o.created_at)}
          </p>
          <label class="field">
            订单状态
            <select
              value={o.status}
              onChange={(e) =>
                (selectedOrder.value = {
                  ...selectedOrder.value,
                  status: e.currentTarget.value,
                })
              }
            >
              {[o.originalStatus, ...next[o.originalStatus]].map((v) => (
                <option value={v}>{statuses[v]}</option>
              ))}
            </select>
          </label>
          <label class="field">
            模拟物流信息
            <input
              maxLength="160"
              value={o.tracking}
              placeholder="示例：Demo Express / DEMO-123"
              onInput={(e) =>
                (selectedOrder.value = {
                  ...selectedOrder.value,
                  tracking: e.currentTarget.value,
                })
              }
            />
          </label>
          <label class="field">
            内部备注
            <textarea
              maxLength="1000"
              rows="4"
              value={o.notes}
              onInput={(e) =>
                (selectedOrder.value = {
                  ...selectedOrder.value,
                  notes: e.currentTarget.value,
                })
              }
            />
          </label>
          <div class="demo-notice">
            发货和履约均为演示，不会通知真实物流。取消后会自动返还已扣减库存，且不可再次转为处理中。
          </div>
          {error.value && (
            <p class="error-message" role="alert">
              {error.value}
            </p>
          )}
          <button class="btn" disabled={busy.value}>
            保存订单
          </button>
        </form>
      </Modal>
    );
  }
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
