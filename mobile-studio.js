const MOBILE_QUERY = "(max-width: 760px), (pointer: coarse) and (max-height: 560px)";
const media = window.matchMedia(MOBILE_QUERY);
const state = {
  initialized: false,
  active: false,
  mode: "edit",
  scrollY: 0,
  previousFocus: null,
  archiveIndex: 0,
  pendingOpen: null,
  pendingScrollY: null,
  earlyBound: false
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

start();

function start() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleSetup, { once: true });
  } else {
    scheduleSetup();
  }

  media.addEventListener?.("change", handleViewportChange);
  document.addEventListener("where-it-happened:wizard-step", updateLaunchSummary);
}

function scheduleSetup() {
  if (!media.matches) return;
  bindEarlyNavigation();
  setupArchivePager();
  if (setup()) return;

  const observer = new MutationObserver(() => {
    if (!media.matches) return;
    if (!setup()) return;
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.setTimeout(() => observer.disconnect(), 12000);
}

function setup() {
  if (state.initialized) return true;
  const creator = $("#creator");
  const workspace = $(".creator-workspace", creator);
  const controlPanel = $(".control-panel", workspace);
  const previewPanel = $(".preview-panel", workspace);
  const wizard = $(".studio-wizard", workspace);
  if (!creator || !workspace || !controlPanel || !previewPanel || !wizard) return false;

  state.initialized = true;
  workspace.dataset.mobileStudioReady = "true";
  workspace.tabIndex = -1;

  const launch = buildLaunchCard();
  const heading = $(".creator-heading", creator);
  heading?.insertAdjacentElement("afterend", launch);

  const bar = buildStudioBar();
  workspace.prepend(bar);

  const dock = buildPreviewDock();
  previewPanel.append(dock);

  bindStudioEvents({ creator, workspace, launch, bar, dock, controlPanel, previewPanel });
  setupArchivePager();
  updateLaunchSummary();
  if (state.pendingOpen) {
    const pendingMode = state.pendingOpen;
    state.pendingOpen = null;
    window.setTimeout(() => openStudio(pendingMode), 0);
  }
  return true;
}

function bindEarlyNavigation() {
  if (state.earlyBound) return;
  state.earlyBound = true;

  document.addEventListener(
    "click",
    (event) => {
      if (!media.matches) return;
      const creatorLink = event.target.closest('a[href="#creator"], #cartReturnToCreator');
      if (creatorLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        $("#cartDialog")?.close?.();
        requestStudio("edit");
        return;
      }

      if (event.target.closest("[data-example]")) {
        if (state.pendingScrollY === null) state.pendingScrollY = window.scrollY;
        window.setTimeout(() => requestStudio("edit"), 0);
      }
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (!media.matches || event.target?.id !== "heroPlaceSearchForm") return;
      if (state.pendingScrollY === null) state.pendingScrollY = window.scrollY;
      window.setTimeout(() => requestStudio("edit"), 0);
    },
    true
  );
}

function requestStudio(mode = "edit") {
  if (!state.active && state.pendingScrollY === null) state.pendingScrollY = window.scrollY;
  state.pendingOpen = mode;
  if (state.initialized) {
    state.pendingOpen = null;
    openStudio(mode);
    return;
  }

  $("#creator")?.scrollIntoView({ behavior: "auto", block: "start" });
  scheduleSetup();
}

function buildLaunchCard() {
  const section = document.createElement("section");
  section.className = "mobile-studio-launch";
  section.setAttribute("aria-label", "Mobile map studio");
  section.innerHTML = `
    <div class="mobile-studio-launch-copy">
      <p>Mobile studio</p>
      <h3>Seven fitted screens. One decision at a time.</h3>
      <p>Build without wrestling with a long form. Switch to the artwork whenever you need to check it.</p>
    </div>
    <div class="mobile-studio-launch-summary">
      <span>Current design</span>
      <strong data-mobile-design-summary>London · Midnight · Portrait</strong>
    </div>
    <div class="mobile-studio-launch-actions">
      <button class="button button-primary" type="button" data-mobile-studio-open="edit">Open the studio</button>
      <button class="button button-outline" type="button" data-mobile-studio-open="preview">Preview artwork</button>
    </div>`;
  return section;
}

function buildStudioBar() {
  const bar = document.createElement("header");
  bar.className = "mobile-studio-bar";
  bar.innerHTML = `
    <button class="mobile-studio-close" type="button" aria-label="Close the full-screen studio">×</button>
    <strong>Map studio</strong>
    <div class="mobile-studio-mode" role="tablist" aria-label="Studio view">
      <button type="button" role="tab" data-mobile-studio-mode="edit" aria-selected="true">Build</button>
      <button type="button" role="tab" data-mobile-studio-mode="preview" aria-selected="false">Preview</button>
    </div>`;
  return bar;
}

function buildPreviewDock() {
  const dock = document.createElement("nav");
  dock.className = "mobile-preview-dock";
  dock.setAttribute("aria-label", "Artwork actions");
  dock.innerHTML = `
    <button type="button" data-mobile-preview-action="edit"><span aria-hidden="true">←</span><strong>Build</strong></button>
    <button type="button" data-mobile-preview-action="png"><span aria-hidden="true">↓</span><strong>PNG</strong></button>
    <button type="button" data-mobile-preview-action="print"><span aria-hidden="true">▣</span><strong>PDF</strong></button>
    <button type="button" data-mobile-preview-action="share"><span aria-hidden="true">↗</span><strong>Share</strong></button>
    <button type="button" data-mobile-preview-action="cart"><span aria-hidden="true">＋</span><strong>Cart</strong></button>`;
  return dock;
}

function bindStudioEvents({ creator, workspace, launch, bar, dock, controlPanel, previewPanel }) {
  launch.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-mobile-studio-open]");
    if (opener) openStudio(opener.dataset.mobileStudioOpen || "edit");
  });

  bar.addEventListener("click", (event) => {
    if (event.target.closest(".mobile-studio-close")) {
      closeStudio();
      return;
    }
    const mode = event.target.closest("[data-mobile-studio-mode]")?.dataset.mobileStudioMode;
    if (mode) setMode(mode);
  });

  dock.addEventListener("click", (event) => {
    const action = event.target.closest("[data-mobile-preview-action]")?.dataset.mobilePreviewAction;
    if (!action) return;
    if (action === "edit") setMode("edit");
    if (action === "png") $("#downloadPng")?.click();
    if (action === "print") $("#printPdf")?.click();
    if (action === "share") $("#shareDesign")?.click();
    if (action === "cart") {
      $("#addCurrentDesignToCart")?.click();
      window.setTimeout(() => {
        closeStudio({ restoreFocus: false });
        $("#cartOpenButton")?.click();
      }, 80);
    }
  });

  // Convert existing preview actions into a view switch instead of a long page jump.
  document.addEventListener(
    "click",
    (event) => {
      if (!media.matches) return;
      const previewTrigger = event.target.closest(".wizard-preview-button, [data-wizard-review-action='preview']");
      if (previewTrigger && workspace.contains(previewTrigger)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMode("preview");
        return;
      }

    },
    true
  );


  document.addEventListener("keydown", (event) => {
    if (!state.active) return;
    if (event.key === "Escape" && !$("dialog[open]")) {
      event.preventDefault();
      closeStudio();
      return;
    }
    if (event.key === "Tab") trapFocus(event, workspace);
  });

  // Let the map and fitted layout react to browser chrome and keyboard changes
  // without throwing the user back to the top of the current step.
  window.addEventListener("resize", () => {
    if (!state.active) return;
    window.dispatchEvent(new Event("where-it-happened:mobile-studio-resize"));
  }, { passive: true });
}

function openStudio(mode = "edit") {
  if (!media.matches || !state.initialized) return;
  const workspace = $(".creator-workspace");
  if (!workspace) return;

  if (!state.active) {
    state.active = true;
    state.scrollY = state.pendingScrollY ?? window.scrollY;
    state.pendingScrollY = null;
    state.previousFocus = document.activeElement;
    document.documentElement.style.setProperty("--mobile-page-scroll", `${state.scrollY}px`);
    document.body.classList.add("mobile-studio-active");
    workspace.classList.add("is-mobile-studio-active");
    workspace.setAttribute("role", "dialog");
    workspace.setAttribute("aria-modal", "true");
    workspace.setAttribute("aria-label", "Full-screen personalized map studio");
  }

  setMode(mode);
  window.requestAnimationFrame(() => workspace.focus({ preventScroll: true }));
}

function closeStudio({ restoreFocus = true } = {}) {
  if (!state.active) return;
  const workspace = $(".creator-workspace");
  state.active = false;
  workspace?.classList.remove("is-mobile-studio-active", "is-mobile-preview");
  workspace?.removeAttribute("role");
  workspace?.removeAttribute("aria-modal");
  workspace?.removeAttribute("aria-label");
  document.body.classList.remove("mobile-studio-active");
  if (restoreFocus) state.previousFocus?.focus?.({ preventScroll: true });
  window.scrollTo({ top: state.scrollY, left: 0, behavior: "auto" });
}

function setMode(mode) {
  const workspace = $(".creator-workspace");
  if (!workspace) return;
  state.mode = mode === "preview" ? "preview" : "edit";
  workspace.classList.toggle("is-mobile-preview", state.mode === "preview");
  $$("[data-mobile-studio-mode]", workspace).forEach((button) => {
    const selected = button.dataset.mobileStudioMode === state.mode;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  const target = state.mode === "preview" ? $(".preview-panel", workspace) : $(".control-panel", workspace);
  target?.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
}

function updateLaunchSummary() {
  const summary = $("[data-mobile-design-summary]");
  const descriptor = $("#previewDescriptor")?.textContent?.trim();
  if (summary && descriptor) summary.textContent = descriptor;
}

function setupArchivePager() {
  const archive = $("#examples");
  const grid = $(".example-grid", archive);
  const cards = $$(".example-card", grid);
  if (!archive || !grid || cards.length < 2) return;
  archive.classList.add("mobile-archive-ready");

  const existingPager = $(".mobile-archive-pager", archive);
  if (existingPager) {
    renderArchive(cards, existingPager);
    return;
  }

  const pager = document.createElement("div");
  pager.className = "mobile-archive-pager";
  pager.innerHTML = `
    <button type="button" data-mobile-archive="prev" aria-label="Previous memory-map example">←</button>
    <p><strong data-mobile-archive-current>01</strong><span>/ ${String(cards.length).padStart(2, "0")}</span></p>
    <button type="button" data-mobile-archive="next" aria-label="Next memory-map example">→</button>`;
  grid.insertAdjacentElement("afterend", pager);

  const render = () => renderArchive(cards, pager);

  pager.addEventListener("click", (event) => {
    const direction = event.target.closest("[data-mobile-archive]")?.dataset.mobileArchive;
    if (!direction) return;
    state.archiveIndex += direction === "next" ? 1 : -1;
    render();
  });

  let startX = 0;
  grid.addEventListener("touchstart", (event) => { startX = event.touches[0]?.clientX || 0; }, { passive: true });
  grid.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0]?.clientX || 0;
    const delta = endX - startX;
    if (Math.abs(delta) < 45) return;
    state.archiveIndex += delta < 0 ? 1 : -1;
    render();
  }, { passive: true });

  render();
}

function renderArchive(cards, pager) {
  const index = Math.max(0, Math.min(state.archiveIndex, cards.length - 1));
  state.archiveIndex = index;
  cards.forEach((card, cardIndex) => {
    const active = cardIndex === index;
    card.classList.toggle("is-mobile-archive-active", active);
    if (media.matches) {
      card.setAttribute("aria-hidden", String(!active));
      card.tabIndex = active ? 0 : -1;
    } else {
      card.removeAttribute("aria-hidden");
      card.removeAttribute("tabindex");
    }
  });
  $("[data-mobile-archive-current]", pager).textContent = String(index + 1).padStart(2, "0");
  $("[data-mobile-archive='prev']", pager).disabled = index === 0;
  $("[data-mobile-archive='next']", pager).disabled = index === cards.length - 1;
}

function trapFocus(event, container) {
  const focusable = $$(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    container
  ).filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleViewportChange(event) {
  if (event.matches) scheduleSetup();
  else {
    closeStudio({ restoreFocus: false });
    $("#examples")?.classList.remove("mobile-archive-ready");
    $$(".example-card").forEach((card) => {
      card.classList.remove("is-mobile-archive-active");
      card.removeAttribute("aria-hidden");
      card.removeAttribute("tabindex");
    });
  }
}
