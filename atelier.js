const atelierStyleSheets = ["atelier-1.css", "atelier-2.css", "atelier-3.css", "atelier-4.css", "studio-wizard.css"];

for (const file of atelierStyleSheets) {
  if (document.head.querySelector(`link[data-atelier-style="${file}"]`)) continue;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `./${file}`;
  link.dataset.atelierStyle = file;
  document.head.append(link);
}

document.body.classList.add("atelier-theme", "wizard-loading");
document.title = "Where It Happened — Cartographic Memory Atelier";

const themeColor = document.querySelector('meta[name="theme-color"]');
if (themeColor) themeColor.content = "#071722";
const description = document.querySelector('meta[name="description"]');
if (description) {
  description.content = "Turn a meaningful city, street, or landmark into an editorial memory-map artwork made to keep, print, or give.";
}
const openGraphTitle = document.querySelector('meta[property="og:title"]');
if (openGraphTitle) openGraphTitle.content = "Where It Happened — Cartographic Memory Atelier";
const openGraphDescription = document.querySelector('meta[property="og:description"]');
if (openGraphDescription) {
  openGraphDescription.content = "Find the place that changed your story and compose its coordinates as a personal map artwork.";
}

const setText = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
};
const setEyebrow = (selector, value) => {
  const element = document.querySelector(selector);
  if (element) element.innerHTML = `<span aria-hidden="true"></span> ${value}`;
};

setEyebrow(".hero .eyebrow", "A place is never just a place");
setText("#hero-title", "Some places");
setText(
  ".hero-lede",
  "Find the street, city, or landmark that changed your story. Turn its coordinates into a personal artwork made to keep, print, or give."
);
setText('label[for="heroPlaceSearch"]', "Enter a place that matters");

const statementLines = document.querySelectorAll(".statement-strip p");
if (statementLines[0]) statementLines[0].textContent = "WHERE IT";
if (statementLines[1]) statementLines[1].textContent = "HAPPENED";

setText("#examples-title", "An archive of beginnings, homes, promises, and returns.");
setText("#shop-title", "Choose how the memory should live.");
setText("#how-title", "From remembered place to finished piece.");
setText("#creator-title", "Compose the place exactly as you remember it.");
setText("#closing-title", "Leave the pin.");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const body = document.body;
const header = document.querySelector(".site-header");
const heroArt = document.querySelector(".hero-art");

body.classList.add("atelier-motion");

const revealGroups = [
  ".hero-copy",
  ".hero-art",
  ".section-heading",
  ".example-card",
  ".product-card",
  ".steps li",
  ".creator-heading",
  ".closing > *"
];
const revealItems = [...document.querySelectorAll(revealGroups.join(","))];

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-revealed"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8%", threshold: 0.06 }
  );
  revealItems.forEach((item) => observer.observe(item));
}

const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 26);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

if (!reducedMotion && heroArt && window.matchMedia("(pointer: fine)").matches) {
  let x = 0;
  let y = 0;
  let frame = 0;
  const draw = () => {
    frame = 0;
    heroArt.style.setProperty("--pointer-x", x.toFixed(3));
    heroArt.style.setProperty("--pointer-y", y.toFixed(3));
  };
  window.addEventListener(
    "pointermove",
    (event) => {
      x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      if (!frame) frame = requestAnimationFrame(draw);
    },
    { passive: true }
  );
}

requestAnimationFrame(() => {
  document.querySelector(".hero-copy")?.classList.add("is-revealed");
  window.setTimeout(() => document.querySelector(".hero-art")?.classList.add("is-revealed"), 130);
});

import("./studio-wizard.js").catch((error) => {
  console.error("The guided creator could not load.", error);
  document.body.classList.remove("wizard-loading");
});
