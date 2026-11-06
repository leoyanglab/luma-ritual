import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { documentHTML, publicPages } from "../src/ssr.js";
import { products } from "../public/catalog.js";
import { validateProduct } from "../src/store.js";
const template = readFileSync("public/index.html", "utf8");
test("server HTML contains visible products, crawlable links and product metadata without JavaScript", () => {
  const r = documentHTML(
    template,
    new URL("https://glow.bool.win/product/morning-serum"),
    products,
  );
  assert.equal(r.status, 200);
  assert.match(r.html, /<h1>Morning Dew<\/h1>/);
  assert.match(r.html, /name="description"/);
  assert.match(
    r.html,
    /rel="canonical" href="https:\/\/glow.bool.win\/product\/morning-serum"/,
  );
  assert.match(r.html, /application\/ld\+json/);
  assert.match(r.html, /BreadcrumbList/);
  assert.doesNotMatch(r.html, /aggregateRating/);
  assert.match(r.html, /href="\/shop"/);
  assert.doesNotMatch(r.html, /href="#(?:shop|product)/);
});
test("Chinese pages have language-specific metadata, alternates and navigation", () => {
  const r = documentHTML(
    template,
    new URL("https://glow.bool.win/product/morning-serum?lang=zh"),
    products,
  );
  assert.match(r.html, /<html lang="zh-CN">/);
  assert.match(r.html, /<h1>晨露保湿精华<\/h1>/);
  assert.match(r.html, /hrefLang="en"|hreflang="en"/);
  assert.match(r.html, /href="\/shop\?lang=zh"/);
  assert.match(r.canonical, /\?lang=zh$/);
});
test("all public pages render, while missing products and paths return real 404s", () => {
  for (const path of publicPages) {
    const r = documentHTML(
      template,
      new URL("https://glow.bool.win" + path),
      products,
    );
    assert.equal(r.status, 200, path);
    assert.match(r.html, /<h1>/, path);
  }
  assert.equal(
    documentHTML(
      template,
      new URL("https://glow.bool.win/product/missing"),
      products,
    ).status,
    404,
  );
  assert.equal(
    documentHTML(
      template,
      new URL("https://glow.bool.win/no-such-page"),
      products,
    ).status,
    404,
  );
});
test("empty catalogs do not crash editorial pages and admin pages are noindex", () => {
  for (const path of ["/", "/shop", "/scene", "/routine", "/gift"])
    assert.equal(
      documentHTML(template, new URL("https://glow.bool.win" + path), [])
        .status,
      200,
    );
  for (const path of [
    "/admin",
    "/admin/products",
    "/analytics",
    "/checkout",
    "/orders",
  ])
    assert.match(
      documentHTML(template, new URL("https://glow.bool.win" + path), products)
        .html,
      /noindex, nofollow/,
    );
});
test("product fields are escaped in SSR and unsafe identifiers are rejected", () => {
  const p = {
    ...products[1],
    size: "<img src=x onerror=alert(1)>",
    name: "<script>alert(1)</script>",
  };
  const r = documentHTML(
    template,
    new URL("https://glow.bool.win/product/morning-serum"),
    [p],
  );
  assert.doesNotMatch(r.html, /<img src=x onerror=/);
  assert.doesNotMatch(r.html, /<script>alert/);
  assert.throws(() => validateProduct({ ...products[1], id: "../evil" }));
  assert.throws(() =>
    validateProduct({ ...products[1], color: "red;display:none" }),
  );
});
