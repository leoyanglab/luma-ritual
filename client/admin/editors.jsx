import { h, Fragment } from "preact";
import { useEffect, useRef } from "preact/hooks";

import { statuses, next, categories, date, usd } from "./utils.js";

export function createEditors(controller) {
  const {
    busy,
    error,
    draft,
    newProduct,
    selectedOrder,
    saveProduct,
    saveOrder,
    set,
  } = controller;
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
  return { ProductEditor, OrderEditor };
}
