import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL;
const request = (path, body, headers = {}) =>
  fetch(base + path, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
test(
  "API rejects foreign origins, protects reports, reprices orders and deduplicates retries",
  { skip: !base },
  async () => {
    const denied = await fetch(base + "/api/orders", {
      method: "POST",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(denied.status, 403);
    const report = await fetch(base + "/api/stats");
    assert.equal(report.status, 401);
    const invalid = await request("/api/orders", {
      requestId: randomUUID(),
      items: [{ id: "fake", qty: 1 }],
    });
    assert.equal(invalid.status, 400);
    const data = {
      requestId: randomUUID(),
      items: [{ id: "morning-serum", qty: 2, price: 0 }],
      code: "LUMA10",
      shipping: "express",
      gift: true,
    };
    const a = await request("/api/orders", data),
      first = await a.json();
    assert.equal(a.status, 201);
    assert.equal(first.total, 89.4);
    const b = await request("/api/orders", data),
      second = await b.json();
    assert.equal(b.status, 200);
    assert.equal(first.id, second.id);
    const password = readFileSync(".dev.vars", "utf8").trim().split("=")[1];
    const login = await request("/api/admin/login", { password });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const stats = await fetch(base + "/api/stats", {
      headers: { Cookie: cookie },
    });
    assert.equal(stats.status, 200);
    const d = await stats.json();
    assert.ok(d.orders.count >= 1);
    assert.ok(Array.isArray(d.events));
    assert.ok(d.funnel.visits >= d.funnel.purchased);
    const logout = await request("/api/admin/logout", {}, { Cookie: cookie });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  },
);
