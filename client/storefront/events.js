export function bindStorefrontEvents({
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
  resetCheckoutKey,
  checkoutDraft,
  submitCheckout,
  refreshCheckoutTotals,
  download,
}) {
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
      resetCheckoutKey();
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
      resetCheckoutKey();
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
      resetCheckoutKey();
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
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.id === "texture-stage"
    ) {
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
}
