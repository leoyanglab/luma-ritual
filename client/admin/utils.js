export const statuses = {
  confirmed: "待处理",
  processing: "备货中",
  shipped: "已模拟发货",
  completed: "演示完成",
  cancelled: "已取消",
};

export const next = {
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export const categories = {
  cleanse: "清洁",
  serum: "精华",
  moisturize: "保湿",
  protect: "防护",
};

export const date = (n) => (n ? new Date(n).toLocaleString("zh-CN") : "—");

export const usd = (n) => "$" + Number(n || 0).toFixed(2);

export const download = (name, data, type) => {
  const u = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};

export const csv = (rows) =>
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

export const blank = () => ({
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
