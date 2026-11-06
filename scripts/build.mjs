import { build } from "esbuild";
import { execFileSync } from "node:child_process";
for (const path of [
  "client/app.js",
  "public/catalog.js",
  "public/views.js",
  "src/worker.js",
  "src/api.js",
  "src/store.js",
  "src/ssr.js",
])
  execFileSync(process.execPath, ["--check", path], { stdio: "inherit" });
await build({
  entryPoints: ["client/app.js"],
  outfile: "public/app.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  jsxFactory: "h",
  jsxFragment: "Fragment",
  legalComments: "linked",
});
console.log("Preact + Signals client bundled; H3 SSR source checks passed.");
