import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateOrder } from "../public/catalog.js";
test("server reprices cart from product catalog and applies discount before shipping threshold", () => {
  const o = calculateOrder([{ id: "morning-serum", qty: 2 }], "LUMA10");
  assert.equal(o.subtotal, 76);
  assert.equal(o.discount, 7.6);
  assert.equal(o.delivery, 8);
  assert.equal(o.total, 76.4);
  assert.equal(o.demo, true);
});
test("gift packaging and express shipping are additive", () => {
  const o = calculateOrder(
    [{ id: "cloud-cream", qty: 2 }],
    "",
    "express",
    true,
  );
  assert.equal(o.delivery, 15);
  assert.equal(o.packaging, 6);
  assert.equal(o.total, 105);
});
test("qualifying orders get free standard shipping", () =>
  assert.equal(calculateOrder([{ id: "cloud-cream", qty: 2 }]).delivery, 0));
test("reject unknown products, duplicate lines, and out of range quantities", () => {
  for (const items of [
    [],
    [{ id: "fake", qty: 1 }],
    [{ id: "morning-serum", qty: 0 }],
    [{ id: "morning-serum", qty: 21 }],
    [{ id: "morning-serum", qty: 1.2 }],
    [
      { id: "morning-serum", qty: 1 },
      { id: "morning-serum", qty: 1 },
    ],
  ])
    assert.throws(() => calculateOrder(items));
});
