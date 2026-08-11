const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactQuery = window.matchMedia("(max-width: 760px), (pointer: coarse)");
const isCompactViewport = () => compactQuery.matches;
const body = document.body;

body.classList.add("scroll-story-theme");

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const progressWithin = (element) => {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const distance = Math.max(element.offsetHeight - window.innerHeight, 1);
  return clamp(-rect.top / distance);
};

function createProgressIndicator() {
  if (document.querySelector(".scroll-story-progress")) return;
  const progress = document.createElement("div");
  progress.className = "scroll-story-progress";
  progress.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  progress.append(fill);
  document.body.append(progress);
}

function createHeroCue() {
  const hero = document.querySelector(".hero");
  if (!hero || hero.querySelector(".scroll-story-cue")) return;
  const cue = document.createElement("div");
  cue.className = "scroll-story-cue";
  cue.setAttribute("aria-hidden", "true");
  cue.innerHTML = "<span></span><small>Scroll through the archive</small>";
  hero.append(cue);
}

function prepareSections() {
  const examples = document.querySelector("#examples");
  const cards = [...document.querySelectorAll("#examples .example-card")];
  cards.forEach((card, index) => {
    card.style.setProperty("--archive-index", String(index));
    card.dataset.archiveNumber = String(index + 1).padStart(2, "0");
  });
  examples?.classList.add("scroll-archive");

  const products = [...document.querySelectorAll("#shop .product-card")];
  products.forEach((card, index) => {
    card.style.setProperty("--product-index", String(index));
    card.dataset.editionNumber = String(index + 1).padStart(2, "0");
  });
  document.querySelector("#shop")?.classList.add("scroll-editions");

  const steps = [...document.querySelectorAll("#how-it-works .steps > li")];
  steps.forEach((step, index) => {
    step.style.setProperty("--story-step-index", String(index));
  });
  document.querySelector("#how-it-works")?.classList.add("scroll-process");

  document.querySelector(".statement-strip")?.classList.add("scroll-manifesto");
  document.querySelector(".closing")?.classList.add("scroll-closing");
}

createProgressIndicator();
createHeroCue();
prepareSections();

const progressFill = document.querySelector(".scroll-story-progress > span");
const hero = document.querySelector(".hero");
const statement = document.querySelector(".statement-strip");
const examples = document.querySelector("#examples");
const exampleGrid = document.querySelector("#examples .example-grid");
const exampleCards = [...document.querySelectorAll("#examples .example-card")];
const shop = document.querySelector("#shop");
const productCards = [...document.querySelectorAll("#shop .product-card")];
const how = document.querySelector("#how-it-works");
const processSteps = [...document.querySelectorAll("#how-it-works .steps > li")];
const closing = document.querySelector(".closing");

let frame = 0;
let lastActiveArchive = -1;
let lastActiveStep = -1;

function updateArchive(progress) {
  if (!examples || !exampleGrid || isCompactViewport() || reducedMotion) return;

  const sideInset = Math.max(36, window.innerWidth * 0.065);
  const maxShift = Math.max(0, exampleGrid.scrollWidth - window.innerWidth + sideInset * 2);
  exampleGrid.style.setProperty("--archive-x", `${(-progress * maxShift).toFixed(2)}px`);
  examples.style.setProperty("--archive-progress", progress.toFixed(4));

  const active = Math.round(progress * Math.max(exampleCards.length - 1, 0));
  if (active === lastActiveArchive) return;
  lastActiveArchive = active;
  exampleCards.forEach((card, index) => card.classList.toggle("is-scroll-active", index === active));
}

function updateProcess(progress) {
  if (!how || !processSteps.length) return;
  how.style.setProperty("--process-progress", progress.toFixed(4));
  const active = Math.min(processSteps.length - 1, Math.floor(progress * processSteps.length));
  if (active === lastActiveStep) return;
  lastActiveStep = active;
  processSteps.forEach((step, index) => {
    step.classList.toggle("is-scroll-active", index === active);
    step.classList.toggle("is-scroll-complete", index < active);
  });
}

function updateProductStack() {
  if (!shop || isCompactViewport() || reducedMotion) return;
  productCards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const start = window.innerHeight * 0.82;
    const end = window.innerHeight * 0.18;
    const local = clamp((start - rect.top) / Math.max(start - end, 1));
    card.style.setProperty("--edition-progress", local.toFixed(4));
  });
}

function update() {
  frame = 0;
  const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pageProgress = clamp(window.scrollY / documentHeight);
  if (progressFill) progressFill.style.transform = `scaleX(${pageProgress})`;

  const heroProgress = progressWithin(hero);
  hero?.style.setProperty("--hero-scroll", heroProgress.toFixed(4));

  const statementProgress = progressWithin(statement);
  statement?.style.setProperty("--manifesto-progress", statementProgress.toFixed(4));

  const archiveProgress = progressWithin(examples);
  updateArchive(archiveProgress);

  const shopProgress = progressWithin(shop);
  shop?.style.setProperty("--shop-progress", shopProgress.toFixed(4));
  updateProductStack();

  const processProgress = progressWithin(how);
  updateProcess(processProgress);

  const closingProgress = progressWithin(closing);
  closing?.style.setProperty("--closing-progress", closingProgress.toFixed(4));
}

function scheduleUpdate() {
  if (frame) return;
  frame = window.requestAnimationFrame(update);
}

window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", scheduleUpdate, { passive: true });
compactQuery.addEventListener?.("change", scheduleUpdate);
window.addEventListener("load", scheduleUpdate, { once: true });
document.fonts?.ready?.then(scheduleUpdate).catch(() => {});

if (!reducedMotion && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-in-view", entry.isIntersecting));
    },
    { threshold: 0.18, rootMargin: "-6% 0px -6%" }
  );
  document
    .querySelectorAll(".scroll-archive, .scroll-editions, .scroll-process, .scroll-closing")
    .forEach((section) => observer.observe(section));
}

scheduleUpdate();
body.classList.add("scroll-story-ready");
