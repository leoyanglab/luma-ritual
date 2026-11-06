import { H3 } from "h3";
import { apiFetch } from "./api.js";
import { ssrFetch } from "./ssr.js";
export default {
  async fetch(req, env) {
    const app = new H3({ silent: true });
    app.all("/api/**", (event) => apiFetch(event.req, env));
    app.all("/**", (event) => ssrFetch(event.req, env));
    let res;
    try {
      res = await app.fetch(req);
    } catch {
      res = new Response("Service temporarily unavailable", { status: 503 });
    }
    const headers = new Headers(res.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    return new Response(res.body, { status: res.status, headers });
  },
};
