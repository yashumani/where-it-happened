import { access, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const htmlFiles = [
  "index.html",
  "privacy.html",
  "terms.html",
  "refunds.html",
  "delivery.html",
  "thank-you.html",
  "404.html"
];
const javascriptFiles = [
  "app.js",
  "atelier.js",
  "cities.js",
  "commerce.js",
  "scroll-story.js",
  "store-config.js",
  "studio-wizard.js",
  "thank-you.js",
  "build-site-css.mjs",
  "validate-site.mjs"
];
const requiredIndexIds = [
  "heroPlaceSearchForm",
  "creator",
  "posterForm",
  "map",
  "poster",
  "downloadPng",
  "shareDesign",
  "purchaseProductSelect",
  "addCurrentDesignToCart",
  "cartDialog",
  "checkoutDialog"
];

const failures = [];
const report = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const file of javascriptFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  report(result.status === 0, `${file} failed syntax validation: ${result.stderr.trim()}`);
}

try {
  JSON.parse(await readFile("site.webmanifest", "utf8"));
} catch (error) {
  failures.push(`site.webmanifest is not valid JSON: ${error.message}`);
}

const productionCss = await readFile("site.css", "utf8").catch(() => "");
report(productionCss.length > 100_000, "site.css was not built or is unexpectedly small");
report(productionCss.includes("site-polish.css"), "site.css is missing the final production-polish section");

const initialJavascriptFiles = ["app.js", "atelier.js", "cities.js", "commerce.js", "store-config.js"];
const initialJavascriptGzip = (
  await Promise.all(initialJavascriptFiles.map(async (file) => gzipSync(await readFile(file)).length))
).reduce((sum, size) => sum + size, 0);
const cssGzip = gzipSync(productionCss).length;
report(initialJavascriptGzip <= 55 * 1024, `Initial JavaScript exceeds the 55 KiB gzip budget: ${initialJavascriptGzip} bytes`);
report(cssGzip <= 40 * 1024, `Production CSS exceeds the 40 KiB gzip budget: ${cssGzip} bytes`);

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8").catch(() => "");
  report(Boolean(html), `${file} is missing or empty`);
  if (!html) continue;

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  report(duplicateIds.length === 0, `${file} contains duplicate IDs: ${duplicateIds.join(", ")}`);

  if (file !== "404.html") {
    report(html.includes('href="./site.css"'), `${file} does not load the production stylesheet`);
  }

  for (const match of html.matchAll(/\b(?:href|src)=["'](\.\/[^"'#?]+)(?:[?#][^"']*)?["']/g)) {
    const reference = match[1].slice(2);
    try {
      await access(reference);
    } catch {
      failures.push(`${file} references missing local file: ${reference}`);
    }
  }
}

const index = await readFile("index.html", "utf8");
const head = index.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || "";
report(!/maplibre/i.test(head), "MapLibre is loaded eagerly in index.html instead of on demand");
const atelierSource = await readFile("atelier.js", "utf8");
report(atelierSource.includes('import("./studio-wizard.js")'), "The guided studio is no longer deferred");
report(atelierSource.includes('import("./scroll-story.js")'), "Scroll storytelling is no longer deferred");
report(index.includes('<link rel="stylesheet" href="./site.css"'), "index.html does not use the CSS bundle");
report(index.includes('<h1 id="hero-title"><span>Some places</span><em>become part of us.</em></h1>'), "The semantic hero headline is missing");
for (const id of requiredIndexIds) {
  report(new RegExp(`\\bid=["']${id}["']`).test(index), `index.html is missing required interface ID: ${id}`);
}

for (const file of javascriptFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:import\s+(?:[^"']+?\s+from\s+)?|import\s*\()["'](\.\/[^"']+)["']/g)) {
    const reference = match[1].slice(2);
    try {
      await access(reference);
    } catch {
      failures.push(`${file} imports missing local module: ${reference}`);
    }
  }
}

const commerce = await readFile("commerce.js", "utf8");
report(commerce.includes("MAX_BACKUP_BYTES"), "Cart backup size validation is missing");
report(commerce.includes("normalizeDesignUrl"), "Restored design URLs are not normalized");

const thankYou = await readFile("thank-you.js", "utf8");
report(thankYou.includes("pending-order.v2"), "Checkout return does not support the current pending-order shape");
report(thankYou.includes("payment-provider receipt"), "Checkout return does not clearly identify the payment receipt as authoritative");

if (failures.length) {
  console.error("Static application validation failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const cssSize = (await stat("site.css")).size;
console.log(`Static application validation passed (${htmlFiles.length} HTML pages, ${javascriptFiles.length} scripts, ${cssSize} bytes CSS / ${cssGzip} bytes gzip, ${initialJavascriptGzip} bytes initial JS gzip).`);
