import { calculateOrder } from "./catalog.js";
export function createViews(state, products, pathname = () => "/") {
  const getProduct = (id) => products.find((p) => p.id === id);
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
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
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
  function art(p, cls = "") {
    if (!p)
      return '<div class="product-art" aria-hidden="true"><span>luma / ritual</span></div>';
    return `<div class="product-art ${cls}" aria-label="${esc(pname(p))} ${t("illustration", "商品示意图")}"><div class="bottle ${p.shape}" style="--bottle:${p.color}"><div class="bottle-label"><b>luma</b><small>R I T U A L</small><em>${esc(p.name)}</em><span>${esc(p.tag)}<br>${esc(p.size)}</span></div></div></div>`;
  }
  function card(p, mini = false) {
    return `<article class="product-card" ${mini ? 'draggable="true"' : ""} data-product="${p.id}"><span class="product-badge">${esc(state.lang === "zh" ? p.badgeZh : p.badge)}</span><button class="favorite ${state.favorites.includes(p.id) ? "active" : ""}" data-action="favorite" data-id="${p.id}" aria-label="${t("Save", "收藏")} ${esc(pname(p))}" aria-pressed="${state.favorites.includes(p.id)}">${state.favorites.includes(p.id) ? "♥" : "♡"}</button><a href="/product/${p.id}" class="art-link">${art(p)}</a><div class="product-info"><div><a href="/product/${p.id}"><h3>${esc(pname(p))}</h3></a><p>${esc(state.lang === "zh" ? p.tagZh : p.tag)} · ${esc(p.size)}</p></div><span class="price">${money(p.price)}</span></div><div class="product-actions"><button class="quick-add" ${p.stock === 0 || p.active === false ? "disabled" : ""} data-action="${mini ? "routine-pick" : "add"}" data-id="${p.id}">${p.stock === 0 ? t("Out of stock", "暂时缺货") : mini ? t("Add to ritual +", "加入护理搭配 +") : t("Add to bag +", "加入购物车 +")}</button><label class="compare-check"><input type="checkbox" data-action="compare-toggle" data-id="${p.id}" ${state.compare.includes(p.id) ? "checked" : ""}> ${t("Compare", "对比")}</label></div></article>`;
  }
  function intro(eyebrow, title, text) {
    return `<div class="page-intro"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${text}</p></div>`;
  }
  const cards = (items) => items.map((p) => card(p)).join("");
  function home() {
    return `<section class="hero"><div class="hero-copy"><span class="eyebrow">${t("THE ART OF EVERYDAY CARE", "把日常，过成护理仪式")}</span><h1>${t("A little ritual.<br>A softer day.", "一点仪式感，<br>柔软每一天。")}</h1><p>${t("Thoughtful skincare for your everyday. Simple textures, quiet moments, and a little more you.", "用心设计的日常护理。简单的质地，安静的片刻，和更多属于自己的时间。")}</p><div class="btn-row"><a class="btn" href="/shop">${t("Explore the collection", "探索全部商品")} <span>↗</span></a><a class="text-link" href="/quiz">${t("Find your ritual", "找到你的护理")}</a></div><div class="hero-footnote"><span>✧ ${t("Considered ingredients", "用心挑选的成分")}</span><span>◌ ${t("Made for your everyday", "为日常而设计")}</span></div></div><div class="hero-visual"><span class="visual-note">THE EVERYDAY ESSENTIALS / 01</span><div class="hero-set">${art(products[0])}${art(products[1])}${art(products[2])}</div><div class="hero-seal">A LITTLE<b>care</b>GOES A LONG WAY</div><span class="hero-caption">LESS, BUT LOVELY. · LUMA RITUAL</span></div></section><div class="benefits"><span><i>✧</i>${t("THOUGHTFULLY FORMULATED CONCEPTS", "用心设计的护理概念")}</span><span><i>◯</i>${t("A SIMPLER DAILY RITUAL", "更简单的日常护理")}</span><span><i>↗</i>${t("FREE SHIPPING ON $75+", "满 $75 免费标准配送")}</span><span><i>♡</i>${t("A LITTLE MOMENT FOR YOU", "留给自己的一点时间")}</span></div><section class="section"><div class="section-heading"><div><span class="eyebrow">${t("GOOD DAYS START HERE", "美好一天，从这里开始")}</span><h2>${t("Meet your everyday favorites.", "遇见日常心选。")}</h2></div><a class="text-link" href="/shop">${t("Shop all essentials ↗", "探索全部商品 ↗")}</a></div><div class="product-grid">${cards(products.slice(0, 4))}</div></section><section class="ritual-banner"><div class="ritual-graphic">${[
      [t("Cleanse", "清洁"), "01"],
      [t("Treat", "精华"), "02"],
      [t("Moisturize", "保湿"), "03"],
      [t("Protect", "防护"), "04"],
    ]
      .map(
        ([n, i]) =>
          `<div class="step-orb"><span>${i}</span>${n}<span>✧</span></div>`,
      )
      .join(
        "",
      )}</div><div class="content"><span class="eyebrow">${t("YOUR SKIN. YOUR PACE.", "你的肌肤，你的节奏")}</span><h2>${t("A ritual that<br>feels like you.", "为自己，<br>搭配一份日常。")}</h2><p>${t("Build a little routine, one thoughtful step at a time. Mix, match, and make it your own.", "从一个步骤开始，组合你的早晚护理，让日常更有条理。")}</p><a class="btn" href="/routine">${t("Build your ritual", "搭配我的护理")} ↗</a></div></section><section class="section editorial"><div class="editorial-art"><div class="texture-blob cream"></div><span class="texture-watermark">TEXTURE STUDY / CREAM · DIGITAL VISUALIZATION</span></div><div><span class="eyebrow">${t("FEEL-GOOD FORMULAS", "从质地，感受护理")}</span><h2>${t("Good care begins<br>with a feeling.", "好的护理，<br>从触感开始。")}</h2><p>${t("Silky, cloud-soft, or barely there. Get closer to the textures that make each ritual a moment worth keeping.", "丝滑、绵密，或轻盈如水。走近不同质地，找到你喜欢的护理体验。")}</p><a class="text-link" href="/texture">${t("Step into the texture library ↗", "走进质地实验室 ↗")}</a></div></section><section class="quote"><span class="eyebrow">THE LUMA PHILOSOPHY</span><h2>${t("“A little less rushing.<br>A little more looking after you.”", "“少一点匆忙，<br>多一点照顾自己。”")}</h2><p>${t("OUR FICTIONAL BRAND MANIFESTO", "虚构品牌理念 · 展示内容")}</p></section><section class="section"><div class="discovery-grid"><article class="discovery-card"><span class="eyebrow">A LITTLE SOMETHING, WITH LOVE</span><h3>${t("Care, beautifully<br>wrapped.", "把关怀，<br>装进礼盒。")}</h3><p>${t("Curate a gift as thoughtful as they are.", "挑选商品、定制包装，再写下一句心意。")}</p><a href="/gift" class="text-link">${t("Visit the gifting studio ↗", "定制我的礼盒 ↗")}</a><div class="mini-art">${art(products[7])}</div></article><article class="discovery-card"><span class="eyebrow">THE EVERYDAY EDIT</span><h3>${t("At home in<br>your everyday.", "让护理，<br>融入生活。")}</h3><p>${t("Discover the essentials in their natural habitat.", "点击场景中的商品，发现你的日常搭配。")}</p><a href="/scene" class="text-link">${t("Shop the scene ↗", "探索场景好物 ↗")}</a><div class="mini-art">${art(products[4])}</div></article></div></section>`;
  }
  function shop(favorites = false) {
    let list = products.filter(
      (p) =>
        (!favorites || state.favorites.includes(p.id)) &&
        (state.category === "all" || p.category === state.category) &&
        p.price <= state.maxPrice &&
        (state.skinFilter === "all" || p.skin.includes(state.skinFilter)) &&
        (state.textureFilter === "all" || p.texture === state.textureFilter) &&
        `${p.name} ${p.zh} ${p.tag} ${p.ingredients.join(" ")} ${p.ingredientsZh.join(" ")}`
          .toLowerCase()
          .includes(state.search.toLowerCase()),
    );
    if (state.sort === "low") list.sort((a, b) => a.price - b.price);
    if (state.sort === "high") list.sort((a, b) => b.price - a.price);
    if (state.sort === "name")
      list.sort((a, b) => pname(a).localeCompare(pname(b)));
    return `${intro(t("THE COLLECTION", "日常护理系列"), favorites ? t("Your saved favorites.", "收藏你的心动。") : t("A little care, every day.", "每天，一点好好照顾。"), t("Thoughtful essentials. Find your texture, your pace, your ritual.", "发现用心设计的护理单品，找到自己的质地、节奏和日常。"))}<section class="section"><div class="shop-controls"><div class="chips">${cats()
      .map(
        ([id, n]) =>
          `<button class="chip ${state.category === id ? "active" : ""}" data-action="category" data-id="${id}">${n}</button>`,
      )
      .join(
        "",
      )}</div><div class="shop-search"><input id="search" class="search-input" type="search" placeholder="${t("Search essentials…", "搜索商品或成分…")}" value="${esc(state.search)}" aria-label="${t("Search products", "搜索商品")}"><select id="sort" class="sort-select" aria-label="${t("Sort products", "商品排序")}">${[
      ["featured", t("Featured", "推荐排序")],
      ["low", t("Price: low to high", "价格从低到高")],
      ["high", t("Price: high to low", "价格从高到低")],
      ["name", t("Name", "名称排序")],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${state.sort === v ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></div></div><div class="shop-preference-filters"><label>${t("Skin preference", "肤质偏好")}<select id="skin-filter" aria-label="${t("Filter by skin preference", "按肤质筛选")}"><option value="all">${t("All preferences", "全部偏好")}</option>${["dry", "oily", "combination", "sensitive"].map((v) => `<option value="${v}" ${state.skinFilter === v ? "selected" : ""}>${skinName(v)}</option>`).join("")}</select></label><label>${t("Texture", "质地")}<select id="texture-filter" aria-label="${t("Filter by texture", "按质地筛选")}"><option value="all">${t("All textures", "全部质地")}</option>${Object.keys(
      textures(),
    )
      .map(
        (v) =>
          `<option value="${v}" ${state.textureFilter === v ? "selected" : ""}>${textures()[v].name}</option>`,
      )
      .join(
        "",
      )}</select></label></div><label class="range-filter">${t("Maximum price", "最高价格")} <input id="max-price" type="range" min="0" max="${Math.max(50, ...products.map((p) => p.price))}" value="${state.maxPrice}"> <span>${money(state.maxPrice)}</span></label><div class="filter-result">${list.length} ${t("essentials", "件商品")} · ${t("Prices and products are illustrative", "商品及价格均为演示")}</div><div class="product-grid">${list.length ? cards(list) : empty(t("Nothing here just yet.", "暂时没有商品。"), t("Try another search or save a few favorites.", "换个关键词，或先收藏喜欢的商品。"), "/shop", t("Browse all", "浏览全部"))}</div></section>`;
  }
  function empty(title, text, href, label) {
    return `<div class="empty"><h3>${title}</h3><p>${text}</p><a class="btn secondary" href="${href}">${label}</a></div>`;
  }
  function productPage(p) {
    if (!p)
      return `${intro("404", t("A little lost?", "这个商品不在这里。"), t("Let’s get you back to the collection.", "回到商品系列继续探索。"))}<section class="section">${empty("404", "", "/shop", t("Shop all", "全部商品"))}</section>`;
    return `<section class="section"><nav class="product-breadcrumbs" aria-label="${t("Breadcrumb", "面包屑导航")}"><a href="/">LUMA</a><span>/</span><a href="/shop">${t("The collection", "商品系列")}</a><span>/</span><span>${esc(pname(p))}</span></nav><div class="detail-layout" style="margin-top:30px"><div><div data-action="rotate" data-id="${p.id}" tabindex="0" role="button" aria-label="${t("Explore 360 degree product", "查看 360 度商品模型")}">${art(p, "detail-art")}</div><div class="detail-tabs"><button class="btn secondary small" data-action="rotate" data-id="${p.id}">↻ ${t("Explore in 360°", "360° 查看")}</button><button class="btn secondary small" data-action="texture-link" data-id="${p.id}">${t("Feel the texture", "探索商品质地")} ↗</button></div></div><div class="detail-content"><span class="eyebrow">${esc(state.lang === "zh" ? p.tagZh : p.tag)}</span><h1>${esc(pname(p))}</h1><p class="description">${esc(desc(p))}</p><div class="detail-price">${money(p.price)} <small>${esc(p.size)} · ${t("Illustrative price", "演示价格")}</small></div><p class="stock-status ${p.stock === 0 || p.active === false ? "unavailable" : ""}">${p.active === false ? t("Draft preview · not published", "草稿预览 · 尚未上架") : p.stock === 0 ? t("Currently out of stock", "暂时缺货") : p.stock <= 10 ? t("Limited demo stock available", "演示库存较少") : t("Available in the demo collection", "演示商品有库存")}</p><dl class="product-facts"><div><dt>${t("Texture", "质地")}</dt><dd>${textures()[p.texture].name}</dd></div><div><dt>${t("Routine step", "护理步骤")}</dt><dd>${cats().find(([id]) => id === p.category)?.[1]}</dd></div><div><dt>${t("Concept ingredients", "示例成分")}</dt><dd>${esc((state.lang === "zh" ? p.ingredientsZh : p.ingredients).slice(0, 3).join(" · "))}</dd></div></dl><div class="skin-labels">${p.skin.map((s) => `<span>${skinName(s)}</span>`).join("")}</div><div class="field"><label for="product-size">${t("Size", "规格")}</label><select id="product-size"><option>${esc(p.size)} · ${t("Full size", "标准装")}</option></select></div><div class="detail-add"><div class="quantity"><button data-action="detail-minus" aria-label="Decrease quantity">−</button><span id="detail-qty">${state.qty}</span><button data-action="detail-plus" aria-label="Increase quantity">+</button></div><button class="btn" ${p.stock === 0 || p.active === false ? "disabled" : ""} data-action="detail-add" data-id="${p.id}">${p.stock === 0 ? t("Out of stock", "暂时缺货") : p.active === false ? t("Draft product", "未上架商品") : t("Add to bag", "加入购物车")} · ${money(p.price * state.qty)}</button></div><div class="btn-row" style="margin-top:15px"><button class="text-link" data-action="favorite" data-id="${p.id}">${state.favorites.includes(p.id) ? "♥" : "♡"} ${t("Save for later", "收藏商品")}</button><button class="text-link" data-action="compare-toggle" data-id="${p.id}">${t("Add to comparison", "加入对比")} +</button></div><p class="content-note">${t("Complimentary standard shipping on $75+. Demo store: no actual sale.", "满 $75 免费标准配送。演示商店，不进行真实销售。")}</p><div class="details-accordion"><details open><summary>${t("The ingredients edit", "成分一览")}</summary><p>${esc((state.lang === "zh" ? p.ingredientsZh : p.ingredients).join(" · "))}</p><p>${t("Illustrative formula only. Not a verified ingredient list or efficacy claim.", "仅为配方展示，不构成经验证的成分表或功效声明。")}</p></details><details><summary>${t("How it fits your ritual", "如何融入护理流程")}</summary><p>${t("Use as the " + p.category + " step in your routine. Review actual product directions before using any real skincare product.", "可作为日常护理的" + cats().find(([id]) => id === p.category)?.[1] + "步骤。使用真实护肤品前请查看实际产品说明。")}</p></details><details><summary>${t("Delivery & returns", "配送与退换货")}</summary><p>${t("Demo standard delivery: 5–8 business days. Express: 2–4 business days. These are illustrative estimates; no parcels are sent.", "标准配送演示时效：5–8 个工作日；快递：2–4 个工作日。均为示例，不实际发货。")}</p><a class="text-link" href="/help">${t("View all policies", "查看完整说明")}</a></details></div><div class="review"><span class="pill">${t("SAMPLE REVIEW · NOT A REAL CUSTOMER", "示例评价 · 非真实用户反馈")}</span><div class="stars">★★★★★</div><h3>${t("“A lovely little everyday ritual.”", "“让日常多一份小小仪式感。”")}</h3><p>${t("A fictional review demonstrating the product review layout.", "这是一条虚构评价，用于展示商品评价模块。")}</p></div></div></div><div class="product-mobile-buy"><div><strong>${esc(pname(p))}</strong><small>${money(p.price * state.qty)} · ${state.qty} ${t("item(s)", "件")}</small></div><button class="btn" data-action="detail-add" data-id="${p.id}" ${p.stock === 0 || p.active === false ? "disabled" : ""}>${p.stock === 0 ? t("Out of stock", "暂时缺货") : p.active === false ? t("Draft product", "未上架商品") : t("Add to bag", "加入购物车")} +</button></div></section><section class="section"><div class="section-heading"><h2>${t("Better, together.", "好搭档，一起选。")}</h2><a href="/routine" class="text-link">${t("Build a ritual ↗", "搭配护理 ↗")}</a></div><div class="product-grid">${cards(products.filter((x) => x.id !== p.id).slice(0, 4))}</div></section>`;
  }
  function routinePage() {
    const steps =
      state.period === "am"
        ? ["cleanse", "serum", "moisturize", "protect"]
        : ["cleanse", "serum", "moisturize"];
    const selected = steps
      .map((s) => getProduct(state.routine[s]))
      .filter(Boolean);
    return `${intro(t("THE RITUAL BUILDER", "护理搭配台"), t("Make a little time for you.", "为自己，留一点时间。"), t("Choose your steps. Drag an essential into a matching slot, or use the dropdowns.", "选择护理步骤。将商品拖入对应位置，或使用下拉框选择；手机也能轻松搭配。"))}<section class="section"><div class="workspace"><div class="workspace-heading"><h3>${t("Your everyday ritual", "你的日常护理")}</h3><div class="chips"><button class="chip ${state.period === "am" ? "active" : ""}" data-action="period" data-id="am">☀ ${t("Morning", "晨间")}</button><button class="chip ${state.period === "pm" ? "active" : ""}" data-action="period" data-id="pm">☾ ${t("Evening", "晚间")}</button></div></div><div class="routine-slots">${steps
      .map((s, i) => {
        const p = getProduct(state.routine[s]);
        return `<div class="routine-slot" data-step="${s}"><span class="slot-label">0${i + 1} / ${cats().find(([id]) => id === s)?.[1]}</span>${p ? art(p) : '<div class="placeholder">＋</div>'}<strong>${p ? esc(pname(p)) : t("Your choice", "你的选择")}</strong><select data-routine="${s}" aria-label="${s}"><option value="">${t("Choose an essential", "选择商品")}</option>${products
          .filter((p) => p.category === s)
          .map(
            (x) =>
              `<option value="${x.id}" ${x.id === p?.id ? "selected" : ""}>${esc(pname(x))} · ${money(x.price)}</option>`,
          )
          .join("")}</select></div>`;
      })
      .join(
        "",
      )}</div><div class="workspace-footer"><p>${selected.length} ${t("steps", "个步骤")} · <strong>${money(selected.reduce((n, p) => n + p.price, 0))}</strong><br><small>${t("Choose an in-stock essential for every step. Concept pairing only.", "请为每个步骤选择一件有库存的商品；搭配仅为示例。")}</small></p><button class="btn" data-action="routine-add" ${selected.length !== steps.length || selected.some((p) => p.stock === 0) ? "disabled" : ""}>${t("Add ritual to bag", "整套加入购物车")} ↗</button></div></div><div class="section-heading" style="margin-top:45px"><h2>${t("Your ritual, your choices.", "搭配，由你决定。")}</h2><a href="/quiz" class="text-link">${t("Need a little guidance? ↗", "需要一点搭配灵感？↗")}</a></div><div class="mini-catalog">${products
      .filter((p) => state.period === "am" || p.category !== "protect")
      .map((p) => card(p, true))
      .join("")}</div></section>`;
  }
  function quizPage() {
    const steps = [
      {
        title: t(
          "How does your skin usually feel?",
          "你的肌肤通常是什么状态？",
        ),
        key: "skin",
        options: [
          ["dry", t("Dry", "干性"), t("Often feels tight", "经常有紧绷感")],
          ["oily", t("Oily", "油性"), t("Often looks shiny", "容易泛油光")],
          [
            "combination",
            t("Combination", "混合性"),
            t("A little of both", "部分油，部分干"),
          ],
          [
            "sensitive",
            t("Sensitive", "敏感性"),
            t("Prefers gentle care", "更偏好温和护理"),
          ],
        ],
      },
      {
        title: t("What texture do you enjoy?", "你更喜欢哪一种质地？"),
        key: "goal",
        options: [
          [
            "light",
            t("Fresh & light", "清爽轻盈"),
            t("Barely-there layers", "喜欢轻薄的肤感"),
          ],
          [
            "rich",
            t("Soft & comforting", "柔软滋润"),
            t("A cushioned finish", "喜欢绵密包裹感"),
          ],
        ],
      },
      {
        title: t("When is your little ritual?", "想搭配哪个时段的护理？"),
        key: "time",
        options: [
          [
            "am",
            t("A fresh morning", "清新晨间"),
            t("Start the day slowly", "从容开始新的一天"),
          ],
          [
            "pm",
            t("A quiet evening", "安静晚间"),
            t("Unwind, one step at a time", "慢慢放松下来"),
          ],
        ],
      },
    ];
    if (state.quizStep >= 3) {
      const rec = quizRecommendations();
      return `${intro(t("YOUR RITUAL EDIT", "为你搭配"), t("A little routine, just for you.", "你的日常护理灵感。"), t("Based on your selected preferences. Illustrative suggestions only, not a skin diagnosis.", "根据你选择的偏好生成，仅为示例建议，不进行肤质诊断。"))}<section class="section"><div class="quiz-result"><span class="eyebrow">${skinName(state.quiz.skin)} / ${state.quiz.time === "pm" ? t("EVENING", "晚间") : t("MORNING", "晨间")}</span><h2>${state.quiz.goal === "rich" ? t("A softer kind of care.", "柔润舒适的护理。") : t("Keep it light. Keep it simple.", "清爽一些，简单一些。")}</h2><p>${t("We matched your preferred texture and routine time to these concept products. Real product compatibility depends on the actual formula and your individual needs.", "我们按质地偏好和护理时段搭配了这些概念商品。真实适用性取决于实际配方和个人情况。")}</p><div class="btn-row"><button class="btn" data-action="quiz-routine" ${!rec.length ? "disabled" : ""}>${t("Use this ritual", "使用这套搭配")} ↗</button><button class="text-link" data-action="quiz-reset">${t("Start again", "重新选择")}</button></div></div><div class="quiz-reasons">${rec.map((p, i) => `<article><span class="eyebrow">0${i + 1} / ${cats().find(([id]) => id === p.category)?.[1]}</span><h3>${esc(pname(p))}</h3><p>${t("Matches your selected product tag", "匹配你选择的商品标签")}：${skinName(state.quiz.skin)} · ${textures()[p.texture].name}</p></article>`).join("") || `<p>${t("No in-stock products match these preferences. Try another selection.", "当前没有匹配这些偏好的有库存商品，请调整选择。")}</p>`}</div><div class="product-grid">${cards(rec)}</div></section>`;
    }
    const s = steps[state.quizStep];
    return `${intro(t("FIND YOUR RITUAL", "找到你的日常护理"), t("A few questions. A little clarity.", "几个小问题，一点新灵感。"), t("Tell us your preferences. We’ll put together a simple concept routine.", "告诉我们你的护理偏好，组合一套简单的示例流程。"))}<section class="section"><div class="quiz-card"><div class="progress-dots">${steps.map((_, i) => `<i class="${i <= state.quizStep ? "active" : ""}"></i>`).join("")}</div><span class="eyebrow">0${state.quizStep + 1} / 03</span><h2>${s.title}</h2><div class="quiz-options">${s.options.map(([id, n, d]) => `<button class="quiz-option ${state.quiz[s.key] === id ? "selected" : ""}" data-action="quiz-option" data-key="${s.key}" data-id="${id}" aria-pressed="${state.quiz[s.key] === id}"><strong>${n}</strong><span>${d}</span></button>`).join("")}</div><div class="btn-row"><button class="btn" data-action="quiz-next" ${!state.quiz[s.key] ? "disabled" : ""}>${state.quizStep === 2 ? t("See my ritual", "查看我的搭配") : t("Continue", "继续")} →</button>${state.quizStep ? `<button class="text-link" data-action="quiz-back">← ${t("Back", "上一步")}</button>` : ""}</div><p class="quiz-warning">${t("No photo or health information is collected. Choices remain in this tab. This is a preference guide, not a diagnosis.", "无需上传照片或健康信息，选择仅保留在当前页面。这是偏好向导，不是肌肤诊断。")}</p></div></section>`;
  }
  function quizRecommendations() {
    const light =
      state.quiz.skin === "oily" ||
      (state.quiz.skin === "combination" && state.quiz.goal === "light");
    const ids = [
      "dew-cleanser",
      light ? "balance-serum" : "morning-serum",
      light ? "water-gel" : "cloud-cream",
      ...(state.quiz.time === "pm" ? [] : ["sun-veil"]),
    ];
    return ids
      .map((id, i) => {
        const preferred = getProduct(id);
        return preferred?.skin.includes(state.quiz.skin) &&
          preferred.stock !== 0
          ? preferred
          : products.find(
              (p) =>
                p.category ===
                  ["cleanse", "serum", "moisturize", "protect"][i] &&
                p.skin.includes(state.quiz.skin) &&
                p.stock !== 0,
            );
      })
      .filter(Boolean);
  }
  const textures = () => ({
    cream: {
      name: t("Cloud-soft cream", "绵密乳霜"),
      desc: t(
        "A soft, cushioned texture with a rich, comforting feel.",
        "柔软绵密、富有包裹感的质地。",
      ),
      rich: 90,
      light: 25,
      spread: 60,
    },
    gel: {
      name: t("Weightless gel", "轻盈凝露"),
      desc: t(
        "A cool, translucent texture with a fresh, lightweight feel.",
        "清凉通透、清新轻盈的质地。",
      ),
      rich: 25,
      light: 95,
      spread: 90,
    },
    serum: {
      name: t("Silky serum", "丝滑精华"),
      desc: t(
        "A fluid, fast-spreading texture designed for easy layering.",
        "流动易延展，适合叠加护理的质地。",
      ),
      rich: 40,
      light: 85,
      spread: 95,
    },
    oil: {
      name: t("Golden face oil", "金色精华油"),
      desc: t(
        "A glossy, fluid texture with a silky finishing feel.",
        "莹润流动、触感丝滑的护理油质地。",
      ),
      rich: 85,
      light: 40,
      spread: 90,
    },
  });
  function texturePage() {
    const tx = textures()[state.texture];
    return `${intro(t("THE TEXTURE LIBRARY", "质地实验室"), t("A feeling, before the first drop.", "在第一滴之前，感受质地。"), t("Explore a digital interpretation of our concept textures. Click to spread, or adjust the light.", "探索概念质地的数字模拟。点击涂抹，或调节光线，观察变化。"))}<section class="section"><div class="texture-layout"><div><div class="texture-stage" id="texture-stage" role="button" tabindex="0" aria-label="${t("Tap to spread texture", "点击模拟涂抹质地")}"><div class="texture-blob ${state.texture}"></div><span class="texture-watermark">DIGITAL TEXTURE STUDY · ${t("TAP TO SPREAD", "点击模拟涂抹")}</span></div><p class="content-note">${t("Illustrative animation. Texture scores below are sample visual descriptors, not laboratory measurements.", "示意动画。下方数值为展示用的感官描述，不是实验检测数据。")}</p></div><div class="texture-controls"><div class="chips">${Object.keys(
      textures(),
    )
      .map(
        (k) =>
          `<button class="chip ${state.texture === k ? "active" : ""}" data-action="texture" data-id="${k}">${{ cream: t("Cream", "乳霜"), gel: t("Gel", "凝露"), serum: t("Serum", "精华"), oil: t("Oil", "护理油") }[k]}</button>`,
      )
      .join(
        "",
      )}</div><h2 style="margin-top:35px">${tx.name}</h2><p>${tx.desc}</p><div class="texture-stats">${[
      [t("Richness", "丰润感"), tx.rich],
      [t("Lightness", "轻盈感"), tx.light],
      [t("Spread", "延展感"), tx.spread],
    ]
      .map(([n, v]) => `<div>${n}<i><b style="width:${v}%"></b></i></div>`)
      .join(
        "",
      )}</div><label for="texture-light">${t("Studio light", "调节光线")}</label><input id="texture-light" type="range" min="75" max="125" value="100"><div class="btn-row" style="margin-top:25px"><button class="btn secondary" data-action="spread">${t("Try a swipe", "模拟涂抹")} ↗</button><button class="text-link" data-action="reset-texture">${t("Reset", "重置")}</button></div></div></div><div class="section-heading" style="margin-top:50px"><h2>${t("Find it in your ritual.", "把这份触感，加入日常。")}</h2></div><div class="product-grid">${cards(products.filter((p) => p.texture === state.texture))}</div></section>`;
  }
  function giftPage() {
    const choices = state.gift.ids.map(getProduct).filter(Boolean);
    return `${intro(t("THE GIFTING STUDIO", "礼盒定制工作室"), t("A little care, beautifully wrapped.", "把心意，好好装起来。"), t("Choose up to three essentials, pick a box, and write a little note.", "选择 1～3 件商品，挑选包装颜色，再写下一句心意。"))}<section class="section"><div class="gift-layout"><div class="gift-preview"><span class="eyebrow">YOUR LITTLE GIFT / LIVE PREVIEW</span><div class="gift-box" style="--gift-color:${state.gift.color}">${[0, 1, 2].map((i) => (choices[i] ? art(choices[i]) : '<div class="placeholder">＋</div>')).join("")}</div><div class="gift-card-preview" id="gift-card-preview">${esc(state.gift.note || t("A little something, just for you.", "一点小心意，送给特别的你。"))}</div></div><div><h3>${t("01. Pick your essentials", "01. 挑选礼盒商品")}</h3><p><small>${choices.length}/3 ${t("selected · $6 gift packaging", "已选 · 礼盒包装费 $6")}</small></p><div class="gift-list">${products.map((p) => `<button class="gift-choice ${state.gift.ids.includes(p.id) ? "selected" : ""}" data-action="gift-pick" data-id="${p.id}" ${p.stock === 0 && !state.gift.ids.includes(p.id) ? "disabled" : ""} aria-pressed="${state.gift.ids.includes(p.id)}">${art(p)}<span><strong>${esc(pname(p))}</strong><small>${money(p.price)} ${state.gift.ids.includes(p.id) ? "✓" : "＋"}</small></span></button>`).join("")}</div><h3 style="margin-top:30px">${t("02. Choose a little color", "02. 选择包装颜色")}</h3><div class="swatches">${[
      ["#ddd5c5", t("Oat", "燕麦")],
      ["#b9c7ad", t("Sage", "鼠尾草")],
      ["#d8b6ac", t("Rose", "玫瑰")],
    ]
      .map(
        ([c, n]) =>
          `<button class="swatch ${state.gift.color === c ? "active" : ""}" style="--swatch:${c}" data-action="gift-color" data-id="${c}" aria-label="${n}" title="${n}" aria-pressed="${state.gift.color === c}"></button>`,
      )
      .join(
        "",
      )}</div><h3>${t("03. Make it personal", "03. 写一句心意")}</h3><label class="field" for="gift-note">${t("Gift message (120 characters)", "礼物留言（最多 120 字）")}<textarea class="gift-note" id="gift-note" rows="3" maxlength="120" placeholder="${t("A little note…", "写下一句祝福…")}">${esc(state.gift.note)}</textarea></label><div class="workspace-footer"><strong>${money(choices.reduce((n, p) => n + p.price, 0) + (choices.length ? 6 : 0))}</strong><button class="btn" data-action="gift-add" ${!choices.length || choices.some((p) => p.stock === 0) ? "disabled" : ""}>${t("Add gift to bag", "礼盒加入购物车")} ↗</button></div><p class="content-note">${t("One gift box per order. Your selected packaging and note travel with the cart.", "每单支持一个礼盒，包装和留言会保存在购物车中。")}</p></div></div></section>`;
  }
  function scenePage() {
    return `${intro(t("THE EVERYDAY EDIT", "生活场景选购"), t("At home in your everyday.", "护理，就在日常里。"), t("A quiet corner, a few good essentials. Tap a + to explore and shop the scene.", "一个安静角落，几件心选好物。点击 + 查看场景商品并加购。"))}<section class="section"><div class="scene-stage"><span class="scene-label">THE SLOW MORNING / 01</span><div class="scene-mirror"></div><div class="scene-shelf"></div><div class="scene-vase"></div><div class="scene-branch"></div>${[
      [products[0], "12%", "8%"],
      [products[1], "35%", "30%"],
      [products[2], "52%", "51%"],
    ]
      .filter(([p]) => p)
      .map(
        ([p, x, m]) =>
          `<div class="scene-product" style="--x:${x};--mobile-x:${m}">${art(p)}<button class="hotspot" data-action="scene-product" data-id="${p.id}" aria-label="${t("Explore", "查看")} ${esc(pname(p))}">+</button></div>`,
      )
      .join(
        "",
      )}<span class="scene-caption">${t("The art of a slower morning.", "慢一点，开始美好早晨。")}</span></div><p class="content-note">${t("Digitally illustrated shopping scene. Concept products shown.", "数字绘制的购物场景，商品均为概念展示。")}</p><div class="section-heading" style="margin-top:35px"><h2>${t("In this little corner.", "这个角落里的好物。")}</h2><button class="text-link" data-action="scene-add-all">${t("Add the scene to bag +", "场景商品一键加购 +")}</button></div><div class="product-grid">${cards(products.slice(0, 3))}</div></section>`;
  }
  function comparePage() {
    const list = state.compare.map(getProduct).filter(Boolean);
    const row = (name, fn) =>
      `<tr><th scope="row">${name}</th>${list.map((p) => `<td>${fn(p)}</td>`).join("")}</tr>`;
    return `${intro(t("SIDE BY SIDE", "商品对比台"), t("A little clarity, side by side.", "并排看看，选得更清楚。"), t("Compare up to three essentials. Select products from the collection to build your edit.", "最多对比 3 件商品。在商品列表勾选「对比」，找到适合自己的选择。"))}<section class="section"><div class="btn-row" style="margin-bottom:25px"><a class="btn secondary" href="/shop">${t("Choose products", "挑选对比商品")} +</a>${list.length ? `<button class="text-link" data-action="compare-clear">${t("Clear comparison", "清空对比")}</button>` : ""}</div>${list.length ? `<div class="comparison-wrap"><table class="comparison"><thead><tr><th>${t("Your essentials", "你的心选")}</th>${list.map((p) => `<th>${art(p)}<h3>${esc(pname(p))}</h3><button class="text-link" data-action="compare-toggle" data-id="${p.id}">${t("Remove", "移除")} ×</button></th>`).join("")}</tr></thead><tbody>${row(t("Price", "价格"), (p) => money(p.price))}${row(t("Size", "容量"), (p) => p.size)}${row(t("Texture", "质地"), (p) => textures()[p.texture].name)}${row(t("Step", "护理步骤"), (p) => cats().find(([id]) => id === p.category)?.[1])}${row(t("Skin preference", "肤质偏好"), (p) => p.skin.map(skinName).join(" / "))}${row(t("Concept ingredients", "示例成分"), (p) => esc((state.lang === "zh" ? p.ingredientsZh : p.ingredients).join(" · ")))}${row("", (p) => `<button class="btn small" data-action="add" data-id="${p.id}">${t("Add to bag", "加入购物车")} +</button>`)}</tbody></table></div>` : empty(t("Room for a little comparison.", "给心选商品，一点对比空间。"), t("Pick two or three products to see their details side by side.", "选取 2～3 件商品，并排查看详情。"), "/shop", t("Explore the collection", "探索全部商品"))}</section>`;
  }
  function cartOrder() {
    return state.cart.length
      ? calculateOrder(
          state.cart,
          state.code,
          state.shipping,
          !!state.giftInCart,
          products,
        )
      : null;
  }
  function summaryLines(o) {
    return `<div class="summary-line"><span>${t("Subtotal", "商品小计")}</span><span>${money(o.subtotal)}</span></div>${o.discount ? `<div class="summary-line"><span>LUMA10 · ${t("10% off", "九折优惠")}</span><span>−${money(o.discount)}</span></div>` : ""}<div class="summary-line"><span>${t("Delivery", "运费")}</span><span>${o.delivery ? money(o.delivery) : t("Complimentary", "免费")}</span></div>${o.packaging ? `<div class="summary-line"><span>${t("Gift packaging", "礼盒包装")}</span><span>${money(o.packaging)}</span></div>` : ""}<div class="summary-line"><span>${t("Tax (demo)", "税费（演示）")}</span><span>${money(0)}</span></div><div class="summary-line total"><span>${t("Total", "合计")}</span><strong>${money(o.total)}</strong></div>`;
  }
  function orderLine(i) {
    const p = i.product ||
      getProduct(i.id) || {
        id: i.id,
        name: i.name,
        zh: i.name,
        price: i.price,
        size: "",
        color: "#ddd5c5",
        shape: "jar",
        tag: "DEMO",
      };
    if (!p) return "";
    return `<div class="order-line">${art(p)}<div class="line-text"><h3>${esc(pname(p))}</h3><p>${esc(p.size)} · ${t("Quantity", "数量")} ${i.qty}</p></div><span>${money((i.price ?? p.price) * i.qty)}</span></div>`;
  }
  function checkoutPage() {
    const o = cartOrder();
    if (!o)
      return `<section class="section">${empty(t("Your bag is waiting.", "购物车还在等你。"), t("Add a little care before checking out.", "先选几件好物，再来结账吧。"), "/shop", t("Explore essentials", "挑选商品"))}</section>`;
    return `${intro(t("A LITTLE CARE, ON ITS WAY", "心选好物，即将出发"), t("The final little step.", "最后一步，小小仪式。"), t("This is a simulated checkout. No card details, charge, or shipment.", "这是模拟结账，不填写真实银行卡信息，不收款，不实际发货。"))}<section class="section"><div class="checkout-layout"><form class="checkout-form" id="checkout-form"><div class="demo-notice">${t("Use fictional contact and address details. They stay in your browser and are not sent to our server.", "请使用虚构联系信息和地址。它们仅保存在当前浏览器，不发送至服务端。")}</div><h3>${t("Contact", "联系信息")}</h3><label class="field">${t("Email", "电子邮箱")}<input type="email" name="email" required placeholder="demo@example.com" autocomplete="off" maxlength="100"></label><h3>${t("Delivery details", "配送信息")}</h3><div class="form-row"><label class="field">${t("First name", "名字")}<input name="firstName" required maxlength="50" placeholder="Alex" autocomplete="off"></label><label class="field">${t("Last name", "姓氏")}<input name="lastName" required maxlength="50" placeholder="Demo" autocomplete="off"></label></div><label class="field">${t("Country / region", "国家 / 地区")}<select name="country" required><option value="">${t("Choose a country", "选择国家")}</option>${["United States", "United Kingdom", "Germany", "France", "Canada", "Australia", "China", "Japan", "Singapore"].map((n) => `<option>${n}</option>`).join("")}</select></label><label class="field">${t("Address", "详细地址")}<input name="address" required maxlength="120" placeholder="123 Demo Street" autocomplete="off"></label><div class="form-row"><label class="field">${t("City", "城市")}<input name="city" required maxlength="60" placeholder="Demo City" autocomplete="off"></label><label class="field">${t("ZIP / postal code", "邮政编码")}<input name="zip" required maxlength="20" placeholder="10001" autocomplete="off"></label></div><h3>${t("Delivery method", "配送方式")}</h3><label class="shipping-option"><input type="radio" name="shipping" value="standard" ${state.shipping === "standard" ? "checked" : ""}>${t("Standard · 5–8 business days", "标准配送 · 5–8 个工作日")}<small>${o.subtotal - o.discount >= 75 ? t("Free", "免费") : money(8)}</small></label><label class="shipping-option"><input type="radio" name="shipping" value="express" ${state.shipping === "express" ? "checked" : ""}>${t("Express · 2–4 business days", "快递配送 · 2–4 个工作日")}<small>${money(15)}</small></label><p class="content-note">${t("Illustrative delivery times. Tax and duty are $0 in this demo; real checkout must calculate them by destination.", "配送时效为示例。演示税费与关税为 $0；真实销售需按目的地计算。")}</p><h3>${t("Payment", "支付方式")}</h3><div class="demo-notice">◈ ${t("Demo payment — always simulated. No card number required.", "演示支付 — 全程模拟，无需卡号。")}</div><label class="check-label"><input type="checkbox" name="terms" required><span>${t("I understand this is a demo, no payment will be taken, and no goods will be shipped.", "我了解这是演示订单，不产生真实扣款，也不实际发货。")}</span></label><p id="checkout-error" class="error-message" role="alert"></p><button type="submit" class="btn" id="pay-button" style="width:100%">${t("Place demo order", "提交模拟订单")} · ${money(o.total)}</button><p class="cart-demo-note">${t("Base currency is USD. Other currencies are indicative display conversions.", "以 USD 作为订单基准币种，其他币种仅作示例换算。")}</p></form><div class="checkout-summary"><h3>${t("Your little collection", "订单商品")}</h3>${state.cart.map(orderLine).join("")}${state.giftInCart ? `<div class="demo-notice">${t("Gift box included", "包含礼盒包装")} · ${esc(state.giftInCart.note || t("With care", "一份心意"))}</div>` : ""}<div class="coupon-row"><input id="coupon" value="${esc(state.code)}" placeholder="${t("Try LUMA10", "试试 LUMA10")}" aria-label="${t("Discount code", "优惠码")}"><button type="button" class="btn secondary small" data-action="coupon">${t("Apply", "应用")}</button></div><div id="checkout-totals">${summaryLines(o)}</div><a class="text-link" href="/shop">← ${t("Keep exploring", "继续选购")}</a></div></div></section>`;
  }
  function ordersPage() {
    return `${intro(t("YOUR DEMO ORDERS", "我的演示订单"), t("A little history of care.", "你的心选记录。"), t("Orders are saved in this browser. All payments and tracking are simulated.", "订单记录保存在当前浏览器，付款与物流状态均为演示。"))}<section class="section">${state.orders.length ? state.orders.map((o) => `<article class="order-card"><div class="order-card-head"><div><h3>${esc(o.id)}</h3><small>${new Date(o.created_at).toLocaleString(state.lang === "zh" ? "zh-CN" : "en-US")}</small></div><span class="status-pill">${{ confirmed: t("Confirmed · demo", "已确认 · 演示"), processing: t("Packing · demo", "备货中 · 演示"), shipped: t("Shipped · demo", "已模拟发货"), completed: t("Completed · demo", "演示完成"), cancelled: t("Cancelled · demo", "已取消 · 演示") }[o.status] || t("Legacy demo", "历史演示")}</span></div>${o.lines.map(orderLine).join("")}<div class="summary-line total"><span>${t("Demo total", "演示金额")}</span><strong>${money(o.total)}</strong></div>${o.gift ? `<p class="content-note">${t("Gift message", "礼盒留言")}: ${esc(o.gift.note || "—")}</p>` : ""}<div class="tracking-steps"><span class="active">${t("Demo confirmed", "演示确认")}</span><span>${t("Packing (simulated)", "待打包（模拟）")}</span><span>${t("Demo fulfillment only", "仅模拟履约")}</span></div><div class="btn-row"><button class="text-link" data-action="reorder" data-id="${esc(o.id)}">${t("Shop these again", "再次购买")}</button>${(!o.status || ["confirmed", "processing"].includes(o.status)) && !o.cancelled ? `<button class="text-link" data-action="cancel-order" data-id="${esc(o.id)}">${t("Cancel demo order", "取消演示订单")}</button>` : ""}<button class="text-link" data-action="receipt" data-id="${esc(o.id)}">${t("Download demo receipt", "下载演示收据")}</button></div></article>`).join("") : empty(t("Your first little ritual awaits.", "第一份心选，等你开启。"), t("Complete a demo checkout to see an order here.", "完成一次模拟结账，这里就会显示订单。"), "/shop", t("Explore the collection", "探索全部商品"))}</section>`;
  }
  function successPage() {
    const id = pathname().split("/")[2];
    const o = state.orders.find((x) => x.id === id);
    if (!o) return ordersPage();
    return `<section class="section success-panel"><div class="success-icon">✓</div><span class="eyebrow">DEMO ORDER CONFIRMED</span><h1>${t("A little thank you.", "谢谢你，<br>这份小小心意。")}</h1><p>${t("Your demo order is confirmed. No money was charged and no shipment will be made.", "你的演示订单已确认，没有扣取任何费用，也不会实际发货。")}</p><div class="demo-notice">${esc(o.id)} · ${money(o.total)}</div>${o.lines.map(orderLine).join("")}<div class="btn-row" style="justify-content:center;margin-top:30px"><a class="btn" href="/orders">${t("View demo order", "查看演示订单")} ↗</a><a class="text-link" href="/shop">${t("Keep exploring", "继续探索")}</a></div></section>`;
  }
  function infoPage(kind) {
    const copy = {
      about: {
        title: t("A little less. A little lovelier.", "少一点，多一份美好。"),
        body: t(
          `<h2>A fictional brand, a complete experience.</h2><p>LUMA Ritual is an interactive skincare commerce demo. We imagine everyday care as a moment to slow down, with simple products and considered design.</p><h2>Explore at your own pace.</h2><p>Build a routine, discover digital textures, rotate packaging, compare essentials, shop an illustrated scene, or curate a gift. Everything leads to the same demo shopping bag.</p><h2>Clear about what’s real.</h2><p>Products, formulas, prices, skin suggestions, reviews and logistics are illustrative. We do not sell skincare, diagnose skin, process card payments, or dispatch goods.</p>`,
          `<h2>一个虚构品牌，一份完整体验。</h2><p>LUMA Ritual 是互动护肤商城演示。我们用简单商品和用心设计，想象一种更从容的日常护理。</p><h2>按自己的节奏探索。</h2><p>搭配护理、探索数字质地、旋转包装模型、对比商品、逛场景、定制礼盒。所有体验都连接同一个演示购物车。</p><h2>清楚说明演示边界。</h2><p>商品、配方、价格、肤质建议、评价和物流都是示例。不真实销售护肤品、不诊断肌肤、不处理银行卡付款、不实际发货。</p>`,
        ),
      },
      help: {
        title: t("A little help, right here.", "一点帮助，就在这里。"),
        body:
          t(
            `<h2>Delivery</h2><p>Demo standard shipping is $8, free when the discounted product subtotal reaches $75. Demo express shipping is $15. Standard estimates are 5–8 business days; express estimates are 2–4. These are illustrations. No order is actually dispatched.</p><h2>Returns & refunds</h2><p>No money is collected, so no financial refunds are issued. You can cancel an order in My demo orders; cancellation changes its local demo status. The historical analytics order count remains unchanged. For a real store, return windows, exceptions, shipping costs and local consumer rules must be defined before launch.</p><h2>Payments & pricing</h2><p>Checkout only simulates payment. Use fictional details. USD is the base currency. EUR, GBP and CNY use fixed sample conversion rates, not live exchange rates. Tax and duty are $0 in this demo. Try LUMA10 for 10% off products.</p><h2>Contact</h2><p>This fictional brand has no staffed support inbox. For the demo, use the contact form below to generate a local support reference. Nothing is emailed or submitted to a third party.</p>`,
            `<h2>配送说明</h2><p>演示标准运费 $8，商品优惠后小计满 $75 免标准运费；快递运费 $15。演示标准时效 5–8 个工作日，快递 2–4 个工作日。均为示例，不会真正发货。</p><h2>退换货与退款</h2><p>演示不收款，因此没有真实退款。可在「我的演示订单」取消订单，新订单会同步至后台并返还演示库存；历史订单记录仅在本地取消。真实商店上线前需另行确定退货期限、例外商品、运费承担及所在地消费者规则。</p><h2>付款与价格</h2><p>结账仅模拟支付，请填写虚构信息。USD 为基准币种，EUR、GBP、CNY 使用固定示例汇率，不是实时汇率。演示税费与关税为 $0。使用 LUMA10 可享商品九折。</p><h2>联系我们</h2><p>虚构品牌没有实际客服邮箱。下方表单可生成本地演示工单，不发送邮件，也不提交至第三方。</p>`,
          ) +
          `<form id="support-form"><label class="field">${t("Topic", "问题类型")}<select required name="topic"><option>${t("Order question", "订单问题")}</option><option>${t("Product question", "商品问题")}</option><option>${t("Demo feedback", "演示反馈")}</option></select></label><label class="field">${t("Message (fictional details only)", "留言（请勿填写真实个人信息）")}<textarea name="message" required minlength="5" maxlength="1000" rows="4"></textarea></label><button class="btn" type="submit">${t("Create demo support reference", "生成演示工单编号")}</button><p id="support-result" role="status"></p></form>`,
      },
      privacy: {
        title: t("Clear, simple, considered.", "清楚，简单，用心。"),
        body: t(
          `<h2>Local storage</h2><p>Your language, display currency, shopping bag, favorites, comparison list, gift design, consent choice and demo order history are stored in this browser. Checkout contact and address details stay in browser memory; they are not sent to our server.</p><h2>Optional anonymous analytics</h2><p>Only after you allow analytics, we send page views and interactions (product views, bag additions, checkout starts, and activity completions) with a random tab-session ID, coarse device class and country to this site. We do not store IP addresses or fingerprint your browser. Events are retained for up to 90 days and purged on subsequent event writes. Rejecting analytics does not disable shopping.</p><h2>Demo orders</h2><p>The server stores an order reference, selected product IDs, quantities, USD demo total and timestamp to make checkout and aggregated reporting work. An anonymous session is attached only when analytics is allowed. We do not collect card details, real payment data, names, addresses or emails. Order records are retained for the lifetime of this demo unless removed by the owner.</p><h2>Owner dashboard</h2><p>Aggregated reporting is password protected. A successful owner login sets an HttpOnly session cookie for one hour. Visitors cannot access the dashboard without the owner password.</p><h2>Demo terms</h2><p>This site is a fictional shopping demonstration. No purchase contract, efficacy guarantee, payment or fulfillment is created. Product suggestions and scores are illustrative. Do not rely on them to treat a skin condition.</p>`,
          `<h2>浏览器本地存储</h2><p>语言、显示币种、购物车、收藏、对比清单、礼盒设计、统计偏好及演示订单记录保存在当前浏览器。结账表单中的联系信息与地址仅存在浏览器内存，不发送至服务端。</p><h2>可选匿名统计</h2><p>仅在同意后，向本站发送浏览及互动事件（查看商品、加购、开始结账、完成互动等），附随机的标签页会话标识、粗略设备类型和国家。不保存 IP，不做浏览器指纹。事件最多保留 90 天，后续事件写入时清理过期记录。拒绝统计不影响购物。</p><h2>演示订单</h2><p>服务端保存订单编号、商品 ID、数量、USD 演示金额及时间，用于结账和汇总报表。仅在允许统计时关联匿名会话。不采集卡号、真实付款数据、姓名、地址或邮箱。订单记录在演示站存续期间保留，或由站长移除。</p><h2>站长后台</h2><p>汇总统计通过密码保护。登录成功设置有效期 1 小时的 HttpOnly 会话 Cookie。访客没有站长密码无法访问统计数据。</p><h2>演示条款</h2><p>本站为虚构购物演示，不形成购买合同、功效保证、真实付款或履约。产品建议与质地评分仅为示例，不能用于处理皮肤疾病。</p>`,
        ),
      },
    };
    const c = copy[kind] || copy.about;
    return `${intro("LUMA / WITH CARE", c.title, "")}<section class="section prose">${c.body}<p><a href="/shop">${t("Back to the collection ↗", "返回商品系列 ↗")}</a></p></section>`;
  }

  const fns = {
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
  };
  return Object.fromEntries(
    Object.entries(fns).map(([name, fn]) => [
      name,
      (...args) => {
        const result = fn(...args);
        return typeof result === "string" && state.lang === "zh"
          ? result.replace(/href="(\/[^"?]*)"/g, 'href="$1?lang=zh"')
          : result;
      },
    ]),
  );
}
