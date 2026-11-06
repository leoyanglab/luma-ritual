import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { products } from "../public/catalog.js";
const base = process.env.TEST_BASE_URL;
test(
  "management CRUD, SSR synchronization, transactional stock, idempotency and order permissions",
  { skip: !base },
  async () => {
    const send = (path, b, method = "POST", cookie = "", extra = {}) =>
      fetch(base + path, {
        method,
        headers: {
          Origin: base,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...extra,
        },
        body: b === null ? undefined : JSON.stringify(b),
      });
    const password = readFileSync(".dev.vars", "utf8").trim().split("=")[1];
    const login = await send("/api/admin/login", { password });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const id = "test-" + randomUUID().slice(0, 8);
    const p = {
      ...products[1],
      id,
      name: "Test Serum " + id,
      zh: "测试精华",
      price: 12.34,
      stock: 2,
      active: true,
    };
    assert.equal((await send("/api/admin/products", p)).status, 401);
    const created = await send("/api/admin/products", p, "POST", cookie);
    assert.equal(created.status, 200);
    let current = (await created.json()).product;
    const publicList = await fetch(base + "/api/catalog").then((r) => r.json());
    assert.ok(publicList.products.some((x) => x.id === id));
    const html = await fetch(base + "/product/" + id).then((r) => r.text());
    assert.ok(html.includes(p.name));
    assert.ok(html.includes("application/ld+json"));
    const update = await send(
      "/api/admin/products/" + id,
      { ...current, price: 13.5 },
      "PUT",
      cookie,
    );
    assert.equal(update.status, 200);
    current = (await update.json()).product;
    assert.equal(
      (
        await send(
          "/api/admin/products/" + id,
          { ...current, version: 1 },
          "PUT",
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await send("/api/admin/products/" + id, current, "PUT", cookie, {
          Origin: "https://attacker.example",
        })
      ).status,
      403,
    );
    const payload = () => ({
      requestId: randomUUID(),
      items: [{ id, qty: 2, price: 0 }],
      code: "",
      shipping: "standard",
      gift: false,
    });
    const a = payload(),
      b = payload();
    const result = await Promise.all([
      send("/api/orders", a),
      send("/api/orders", b),
    ]);
    assert.deepEqual(result.map((r) => r.status).sort(), [201, 409]);
    const winner = await result.find((r) => r.status === 201).json();
    assert.equal(winner.total, 35);
    assert.ok(winner.receiptToken);
    assert.equal(winner.lines[0].price, 13.5);
    const winningPayload = result[0].status === 201 ? a : b;
    const retry = await send("/api/orders", winningPayload);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).id, winner.id);
    let list = await fetch(base + "/api/admin/products", {
      headers: { Cookie: cookie },
    }).then((r) => r.json());
    assert.equal(list.products.find((p) => p.id === id).stock, 0);
    assert.equal((await fetch(base + "/api/orders/" + winner.id)).status, 404);
    const cancel = await send(
      "/api/orders/" + winner.id + "/cancel",
      null,
      "POST",
      "",
      { "X-Order-Token": winner.receiptToken },
    );
    assert.equal(cancel.status, 200);
    assert.equal((await cancel.json()).status, "cancelled");
    assert.equal(
      (
        await send("/api/orders/" + winner.id + "/cancel", null, "POST", "", {
          "X-Order-Token": winner.receiptToken,
        })
      ).status,
      200,
    );
    list = await fetch(base + "/api/admin/products", {
      headers: { Cookie: cookie },
    }).then((r) => r.json());
    current = list.products.find((p) => p.id === id);
    assert.equal(current.stock, 2);
    const second = await send("/api/orders", payload()).then((r) => r.json());
    let managed = await send(
      "/api/admin/orders/" + second.id,
      { revision: 1, status: "processing", notes: "Owner only" },
      "PUT",
      cookie,
    ).then((r) => r.json());
    assert.equal(managed.order.status, "processing");
    managed = await send(
      "/api/admin/orders/" + second.id,
      {
        revision: managed.order.revision,
        status: "shipped",
        tracking: "DEMO-TEST",
      },
      "PUT",
      cookie,
    ).then((r) => r.json());
    assert.equal(managed.order.status, "shipped");
    assert.equal(
      (
        await send("/api/orders/" + second.id + "/cancel", null, "POST", "", {
          "X-Order-Token": second.receiptToken,
        })
      ).status,
      409,
    );
    const receipt = await fetch(base + "/api/orders/" + second.id, {
      headers: { "X-Order-Token": second.receiptToken },
    }).then((r) => r.json());
    assert.equal(receipt.notes, undefined);
    assert.equal(receipt.tracking, "DEMO-TEST");
    list = await fetch(base + "/api/admin/products", {
      headers: { Cookie: cookie },
    }).then((r) => r.json());
    current = list.products.find((p) => p.id === id);
    assert.equal(
      (
        await send(
          "/api/admin/products/" + id,
          { ...current, active: false },
          "PUT",
          cookie,
        )
      ).status,
      200,
    );
    assert.equal((await fetch(base + "/product/" + id)).status, 404);
    assert.equal((await fetch(base + "/api/admin/preview/" + id)).status, 401);
    const preview = await fetch(base + "/api/admin/preview/" + id, {
      headers: { Cookie: cookie },
    });
    assert.equal(preview.status, 200);
    assert.match(preview.headers.get("x-robots-tag"), /noindex/);
    assert.ok((await preview.text()).includes("not published"));
    const map = await fetch(base + "/sitemap.xml").then((r) => r.text());
    assert.ok(!map.includes("/product/" + id));
    const audit = await fetch(base + "/api/admin/audit", {
      headers: { Cookie: cookie },
    }).then((r) => r.json());
    assert.ok(audit.logs.some((l) => l.target === id));
    const huge = await send(
      "/api/admin/products",
      { ...p, desc: "x".repeat(17000) },
      "POST",
      cookie,
    );
    assert.equal(huge.status, 413);
  },
);
