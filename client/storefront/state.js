import { signal } from "@preact/signals";
import { getProduct } from "../../public/catalog.js";

const reactiveState = (obj) => {
  const cells = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, signal(v)]),
  );
  return new Proxy(obj, {
    get: (_, k) => cells[k]?.value,
    set: (_, k, v) => {
      (cells[k] ??= signal(v)).value = v;
      return true;
    },
  });
};
export const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem("luma-" + key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export function createState(products, bootstrap) {
  const state = reactiveState({
    lang:
      new URLSearchParams(location.search).get("lang") ||
      read("lang", bootstrap.lang || "en"),
    currency: read("currency", "USD"),
    cart: read("cart", []).filter(
      (i) =>
        getProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20,
    ),
    favorites: read("favorites", []).filter((id) => getProduct(id)),
    compare: read("compare", [])
      .filter((id) => getProduct(id))
      .slice(0, 3),
    orders: read("orders", []),
    routine: read("routine", {
      cleanse: "dew-cleanser",
      serum: "morning-serum",
      moisturize: "cloud-cream",
      protect: "sun-veil",
    }),
    period: "am",
    gift: read("gift", { ids: [], color: "#ddd5c5", note: "" }),
    giftInCart: read("giftInCart", null),
    consent: read("consent", null),
    category: "all",
    search: "",
    sort: "featured",
    maxPrice: Math.max(50, ...products.map((p) => p.price)),
    skinFilter: "all",
    textureFilter: "all",
    texture: "cream",
    quizStep: 0,
    quiz: { skin: "", goal: "", time: "" },
    qty: 1,
    code: read("code", ""),
    shipping: "standard",
  });
  return state;
}
