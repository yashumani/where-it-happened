const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactQuery = window.matchMedia("(max-width: 980px), (pointer: coarse)");
const body = document.body;

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

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const isCompactViewport = () => compactQuery.matches;
const visibleSections = new WeakSet();
const geometry = new WeakMap();
const previousStyles = new WeakMap();

let progressFill = null;
let frame = 0;
let geometryReady = false;
let lastActiveArchive = -1;
let lastActiveStep = -1;

function setStyle(element, property, value) {
  if (!element) return;
  let cache = previousStyles.get(element);
  if (!cache) {
    cache = new Map();
    previousStyles.set(element, cache);
  }
  if (cache.get(property) === value) return;
  cache.set(property, value);
  element.style.setProperty(property, value);
}

function measureSection(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  geometry.set(element, {
    top: rect.top + window.scrollY,
    distance: Math.max(element.offsetHeight - window.innerHeight, 1)
  });
}

function measureAll() {
  [hero, statement, examples, shop, how, closing].forEach(measureSection);
  geometryReady = true;
}

function progressWithin(element) {
  if (!element) return 0;
  const values = geometry.get(element);
  if (!values) return 0;
  return clamp((window.scrollY - values.top) / values.distance);
}

function createProgressIndicator() {
  let progress = document.querySelector(".scroll-story-progress");
  if (!progress) {
    progress = document.createElement("div");
    progress.className = "scroll-story-progress";
    progress.setAttribute("aria-hidden", "true");
    progress.append(document.createElement("span"));
    document.body.append(progress);
  }
  progressFill = progress.querySelector("span");
}

function createHeroCue() {
  if (!hero || hero.querySelector(".scroll-story-cue")) return;
  const cue = document.createElement("div");
  cue.className = "scroll-story-cue";
  cue.setAttribute("aria-hidden", "true");
  cue.innerHTML = "<span></span><small>Scroll through the archive</small>";
  hero.append(cue);
}

function prepareSections() {
  exampleCards.forEach((card, index) => {
    setStyle(card, "--archive-index", String(index));
    card.dataset.archiveNumber = String(index + 1).padStart(2, "0");
  });
  examples?.classList.add("scroll-archive");

  productCards.forEach((card, index) => {
    setStyle(card, "--product-index", String(index));
    card.dataset.editionNumber = String(index + 1).padStart(2, "0");
  });
  shop?.classList.add("scroll-editions");

  processSteps.forEach((step, index) => setStyle(step, "--story-step-index", String(index)));
  how?.classList.add("scroll-process");
  statement?.classList.add("scroll-manifesto");
  closing?.classList.add("scroll-closing");
}

function updateArchive(progress) {
  if (!examples || !exampleGrid || isCompactViewport() || reducedMotion) return;
  const sideInset = Math.max(36, window.innerWidth * 0.065);
  const maxShift = Math.max(0, exampleGrid.scrollWidth - window.innerWidth + sideInset * 2);
  setStyle(exampleGrid, "--archive-x", `${(-progress * maxShift).toFixed(2)}px`);
  setStyle(examples, "--archive-progress", progress.toFixed(4));

  const active = Math.round(progress * Math.max(exampleCards.length - 1, 0));
  if (active === lastActiveArchive) return;
  lastActiveArchive = active;
  exampleCards.forEach((card, index) => card.classList.toggle("is-scroll-active", index === active));
}

function updateProcess(progress) {
  if (!how || !processSteps.length) return;
  if (reducedMotion || isCompactViewport()) {
    processSteps.forEach((step) => step.removeAttribute("aria-hidden"));
    return;
  }
  setStyle(how, "--process-progress", progress.toFixed(4));
  const active = Math.min(processSteps.length - 1, Math.floor(progress * processSteps.length));
  if (active === lastActiveStep) return;
  lastActiveStep = active;
  processSteps.forEach((step, index) => {
    const isActive = index === active;
    step.classList.toggle("is-scroll-active", isActive);
    step.classList.toggle("is-scroll-complete", index < active);
    step.setAttribute("aria-hidden", String(!isActive && !isCompactViewport()));
  });
}

function updateProductStack() {
  if (!shop || isCompactViewport() || reducedMotion) return;
  const start = window.innerHeight * 0.82;
  const end = window.innerHeight * 0.18;
  const divisor = Math.max(start - end, 1);
  const progresses = productCards.map((card) => clamp((start - card.getBoundingClientRect().top) / divisor));
  productCards.forEach((card, index) => {
    setStyle(card, "--edition-progress", progresses[index].toFixed(4));
  });
}

function update() {
  frame = 0;
  if (!geometryReady) measureAll();

  const documentHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const pageProgress = clamp(window.scrollY / documentHeight);
  if (progressFill) progressFill.style.transform = `scaleX(${pageProgress})`;

  if (!reducedMotion && visibleSections.has(hero)) setStyle(hero, "--hero-scroll", progressWithin(hero).toFixed(4));
  if (!reducedMotion && visibleSections.has(statement)) setStyle(statement, "--manifesto-progress", progressWithin(statement).toFixed(4));
  if (visibleSections.has(examples)) updateArchive(progressWithin(examples));
  if (visibleSections.has(shop)) {
    setStyle(shop, "--shop-progress", progressWithin(shop).toFixed(4));
    updateProductStack();
  }
  if (visibleSections.has(how)) updateProcess(progressWithin(how));
  if (!reducedMotion && visibleSections.has(closing)) setStyle(closing, "--closing-progress", progressWithin(closing).toFixed(4));
}

function scheduleUpdate() {
  if (frame) return;
  frame = window.requestAnimationFrame(update);
}

function handleGeometryChange() {
  geometryReady = false;
  lastActiveArchive = -1;
  lastActiveStep = -1;
  if (isCompactViewport() || reducedMotion) {
    processSteps.forEach((step) => step.removeAttribute("aria-hidden"));
    exampleGrid?.style.removeProperty("--archive-x");
    previousStyles.get(exampleGrid)?.delete("--archive-x");
  }
  scheduleUpdate();
}

function observeSections() {
  const sections = [hero, statement, examples, shop, how, closing].filter(Boolean);
  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => visibleSections.add(section));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-in-view", entry.isIntersecting);
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      scheduleUpdate();
    },
    { rootMargin: "80% 0px", threshold: 0 }
  );
  sections.forEach((section) => observer.observe(section));
}

function startGeometryTracking() {
  measureAll();
  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(handleGeometryChange);
    [document.documentElement, hero, statement, examples, exampleGrid, shop, how, closing]
      .filter(Boolean)
      .forEach((element) => resizeObserver.observe(element));
  }
  scheduleUpdate();
}

body.classList.add("scroll-story-theme");
createProgressIndicator();
createHeroCue();
prepareSections();
observeSections();

window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", handleGeometryChange, { passive: true });
compactQuery.addEventListener?.("change", handleGeometryChange);
window.addEventListener("load", handleGeometryChange, { once: true });
document.fonts?.ready?.then(handleGeometryChange).catch(() => {});

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(startGeometryTracking, { timeout: 1000 });
} else {
  window.setTimeout(startGeometryTracking, 140);
}

body.classList.add("scroll-story-ready");
