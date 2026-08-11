import { readFile, writeFile } from "node:fs/promises";

const sources = [
  "styles.css",
  "storefront-v2.css",
  "atelier-1.css",
  "atelier-2.css",
  "atelier-3.css",
  "atelier-4.css",
  "studio-wizard.css",
  "scroll-story.css",
  "site-polish.css",
  "atlas-v3.css"
];

const sections = await Promise.all(
  sources.map(async (file) => `/* === ${file} === */\n${await readFile(new URL(file, import.meta.url), "utf8").then((text) => text.trim())}`)
);

await writeFile(new URL("site.css", import.meta.url), `${sections.join("\n\n")}\n`, "utf8");
console.log(`Built site.css from ${sources.length} source files.`);
