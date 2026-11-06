export function createAnalytics({
  $,
  products,
  t,
  pname,
  esc,
  route,
  translateStatic,
  intro,
}) {
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

  return { analyticsPage };
}
