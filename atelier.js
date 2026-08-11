const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
const header = document.querySelector(".site-header");
const hero = document.querySelector(".hero");
const heroArt = document.querySelector(".hero-art");
const creator = document.querySelector("#creator");

let headerFrame = 0;
let pointerFrame = 0;
let pointerEnabled = false;
let wizardPromise = null;

function updateHeader() {
  headerFrame = 0;
  header?.classList.toggle("is-scrolled", window.scrollY > 26);
}

function scheduleHeaderUpdate() {
  if (headerFrame) return;
  headerFrame = window.requestAnimationFrame(updateHeader);
}

function revealEditorialElements() {
  const selectors = [
    ".hero-copy",
    ".hero-art",
    ".section-heading",
    ".example-card",
    ".product-card",
    ".steps li",
    ".creator-heading",
    ".closing > *"
  ];
  const items = [...document.querySelectorAll(selectors.join(","))];
  if (!items.length) return;

  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8%", threshold: 0.05 }
  );
  items.forEach((item) => observer.observe(item));
}

function loadWizard() {
  if (wizardPromise) return wizardPromise;
  wizardPromise = import("./studio-wizard.js").catch((error) => {
    console.error("The guided creator could not load.", error);
    document.body.classList.remove("wizard-loading");
    return null;
  });
  return wizardPromise;
}

function scheduleWizard() {
  if (!creator) {
    document.body.classList.remove("wizard-loading");
    return;
  }

  const prewarm = () => void loadWizard();
  document.querySelectorAll('a[href="#creator"], [data-example], #heroPlaceSearchForm').forEach((element) => {
    element.addEventListener("pointerenter", prewarm, { once: true, passive: true });
    element.addEventListener("focusin", prewarm, { once: true });
    element.addEventListener("click", prewarm, { once: true });
  });

  if (!("IntersectionObserver" in window)) {
    window.setTimeout(prewarm, 500);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      prewarm();
    },
    { rootMargin: "1600px 0px", threshold: 0 }
  );
  observer.observe(creator);
}

function scheduleScrollStory() {
  const load = () => {
    import("./scroll-story.js").catch((error) => {
      console.error("The scroll-story design layer could not load.", error);
    });
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(load, { timeout: 900 });
  } else {
    window.setTimeout(load, 120);
  }
}

function enablePointerDepth() {
  if (reducedMotion || !heroArt || !window.matchMedia?.("(pointer: fine)")?.matches) return;

  if (hero && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        pointerEnabled = Boolean(entry?.isIntersecting);
      },
      { rootMargin: "120px 0px", threshold: 0 }
    );
    observer.observe(hero);
  } else {
    pointerEnabled = true;
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!pointerEnabled || pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
        const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
        heroArt.style.setProperty("--pointer-x", x.toFixed(3));
        heroArt.style.setProperty("--pointer-y", y.toFixed(3));
      });
    },
    { passive: true }
  );
}

document.body.classList.add("atelier-motion");
updateHeader();
window.addEventListener("scroll", scheduleHeaderUpdate, { passive: true });
revealEditorialElements();
scheduleWizard();
scheduleScrollStory();
enablePointerDepth();

window.requestAnimationFrame(() => {
  document.querySelector(".hero-copy")?.classList.add("is-revealed");
  window.setTimeout(() => document.querySelector(".hero-art")?.classList.add("is-revealed"), 120);
});
