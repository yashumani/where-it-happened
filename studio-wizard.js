const STEP_STORAGE_KEY = "where-it-happened.creator-step.v1";

const STEP_DEFINITIONS = [
  {
    label: "Story",
    title: "What are you remembering?",
    description: "Choose the meaning first. We’ll use it to prepare thoughtful wording that you can change at any time."
  },
  {
    label: "Place",
    title: "Where did it happen?",
    description: "Search for a city or landmark, use your location, or open exact coordinates when precision matters."
  },
  {
    label: "Words",
    title: "What should the artwork say?",
    description: "Write the title, place line, date, and optional dedication while the live preview updates beside you."
  },
  {
    label: "Mood",
    title: "How should the map feel?",
    description: "Choose one visual atmosphere. Every mood changes the map, typography, and overall emotional tone."
  },
  {
    label: "Shape",
    title: "How should the piece live?",
    description: "Select a composition and format for a frame, a square post, or a phone wallpaper."
  },
  {
    label: "Details",
    title: "Polish the exact map view.",
    description: "Fine-tune zoom, labels, and the memory marker. You can also drag the map directly in the preview."
  },
  {
    label: "Review",
    title: "Everything is ready to keep.",
    description: "Check the essentials, choose an edition, then add this exact design to your cart or save a free preview."
  }
];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

initGuidedCreator();

function initGuidedCreator() {
  const form = $("#posterForm");
  const controlPanel = form?.closest(".control-panel");
  const workspace = form?.closest(".creator-workspace");
  if (!form || !controlPanel || !workspace || form.dataset.guidedCreator === "true") {
    document.body.classList.remove("wizard-loading");
    return;
  }

  const sourceSteps = $$(':scope > .control-group', form);
  if (sourceSteps.length < 6) {
    document.body.classList.remove("wizard-loading");
    return;
  }

  form.dataset.guidedCreator = "true";
  form.classList.add("studio-wizard-form");

  const creatorTitle = $("#creator-title");
  const creatorLead = $(".creator-heading > p");
  const editorLabel = $(".control-panel-header strong");
  if (creatorTitle) creatorTitle.textContent = "Build it like a studio, not a long form.";
  if (creatorLead) creatorLead.textContent = "Seven focused steps keep the studio calm while the complete artwork updates live beside you.";
  if (editorLabel) editorLabel.textContent = "Map object studio";
  controlPanel.classList.add("is-guided");
  workspace.classList.add("wizard-enabled");

  const shell = element("div", "studio-wizard");
  const progress = buildProgress(sourceSteps.length + 1);
  const stage = element("div", "wizard-stage");
  stage.id = "creatorWizardStage";
  const footer = buildFooter();

  const stepElements = sourceSteps.map((fieldset, index) => prepareSourceStep(fieldset, index));
  const reviewStep = buildReviewStep();
  stepElements.push(reviewStep);
  stepElements.forEach((step) => stage.append(step));

  shell.append(progress.root, stage, footer.root);
  form.append(shell);

  const state = {
    current: loadSavedStep(stepElements.length),
    completed: new Set(),
    steps: stepElements,
    progressButtons: progress.buttons,
    progressMeter: progress.meter,
    progressKicker: progress.kicker,
    progressTitle: progress.title,
    progressDescription: progress.description,
    backButton: footer.back,
    nextButton: footer.next,
    footerHint: footer.hint,
    reviewStep
  };

  bindWizardEvents(state, progress.previewButton);
  goToStep(state, state.current, { focus: false, persist: false, scroll: false });

  document.body.classList.remove("wizard-loading");
  document.body.classList.add("wizard-ready");
}

function prepareSourceStep(fieldset, index) {
  const definition = STEP_DEFINITIONS[index];
  fieldset.classList.add("wizard-step");
  fieldset.dataset.wizardStep = String(index);
  fieldset.id = `creator-step-${index + 1}`;

  const legend = $("legend", fieldset);
  if (legend) {
    legend.id = `creator-step-${index + 1}-legend`;
    legend.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span> ${definition.label}`;
    fieldset.setAttribute("aria-labelledby", legend.id);
  }

  const intro = element("div", "wizard-step-heading");
  intro.tabIndex = -1;
  const eyebrow = element("p", "wizard-step-eyebrow", `Step ${index + 1} of ${STEP_DEFINITIONS.length}`);
  const heading = element("h3", "", definition.title);
  const description = element("p", "wizard-step-description", definition.description);
  intro.append(eyebrow, heading, description);
  legend?.insertAdjacentElement("afterend", intro);

  return fieldset;
}

function buildReviewStep() {
  const index = STEP_DEFINITIONS.length - 1;
  const definition = STEP_DEFINITIONS[index];
  const fieldset = element("fieldset", "control-group wizard-step wizard-review-step");
  fieldset.dataset.wizardStep = String(index);
  fieldset.id = `creator-step-${index + 1}`;
  fieldset.setAttribute("aria-labelledby", `creator-step-${index + 1}-legend`);

  const legend = element("legend");
  legend.id = `creator-step-${index + 1}-legend`;
  legend.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span> ${definition.label}`;

  const intro = element("div", "wizard-step-heading");
  intro.tabIndex = -1;
  intro.append(
    element("p", "wizard-step-eyebrow", `Step ${index + 1} of ${STEP_DEFINITIONS.length}`),
    element("h3", "", definition.title),
    element("p", "wizard-step-description", definition.description)
  );

  const summary = element("div", "wizard-review-grid");
  summary.append(
    summaryCard("Place", "wizardSummaryPlace", "London, United Kingdom", 1),
    summaryCard("Story", "wizardSummaryStory", "Where we met", 0),
    summaryCard("Mood", "wizardSummaryMood", "Midnight", 3),
    summaryCard("Composition", "wizardSummaryShape", "Classic · Portrait", 4)
  );

  const edition = element("label", "wizard-edition-picker");
  const editionCopy = element("span");
  editionCopy.innerHTML = `<strong>Choose the finished edition</strong><small>You can change this later from the cart.</small>`;
  const select = element("select");
  select.id = "wizardProductSelect";
  select.setAttribute("aria-label", "Choose the finished product edition");
  edition.append(editionCopy, select);

  const actions = element("div", "wizard-review-actions");
  actions.append(
    actionButton("View full preview", "preview"),
    actionButton("Download free preview", "download"),
    actionButton("Share design", "share")
  );

  const note = element("div", "wizard-review-note");
  note.innerHTML = `<span aria-hidden="true">✓</span><p><strong>Your exact design is preserved.</strong> The cart stores the wording, coordinates, map position, theme, layout, and format in this browser.</p>`;

  fieldset.append(legend, intro, summary, edition, actions, note);
  return fieldset;
}

function buildProgress(total) {
  const root = element("section", "wizard-progress");
  root.setAttribute("aria-label", "Creator progress");

  const top = element("div", "wizard-progress-top");
  const copy = element("div", "wizard-progress-copy");
  const kicker = element("span", "wizard-progress-kicker");
  const title = element("strong", "wizard-progress-title");
  const description = element("p", "wizard-progress-description");
  copy.append(kicker, title, description);

  const previewButton = element("button", "wizard-preview-button", "Preview artwork");
  previewButton.type = "button";
  previewButton.innerHTML = `<span aria-hidden="true">↗</span> Preview artwork`;
  top.append(copy, previewButton);

  const meterTrack = element("div", "wizard-meter-track");
  meterTrack.setAttribute("aria-hidden", "true");
  const meter = element("span", "wizard-meter");
  meterTrack.append(meter);

  const nav = element("nav", "wizard-step-nav");
  nav.setAttribute("aria-label", "Creator steps");
  const list = element("ol", "wizard-step-list");
  const buttons = [];

  STEP_DEFINITIONS.slice(0, total).forEach((definition, index) => {
    const item = element("li");
    const button = element("button", "wizard-step-tab");
    button.type = "button";
    button.dataset.goToWizardStep = String(index);
    button.setAttribute("aria-controls", `creator-step-${index + 1}`);
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${definition.label}</strong><i aria-hidden="true">✓</i>`;
    item.append(button);
    list.append(item);
    buttons.push(button);
  });

  nav.append(list);
  root.append(top, meterTrack, nav);
  return { root, buttons, meter, kicker, title, description, previewButton };
}

function buildFooter() {
  const root = element("footer", "wizard-footer");
  const back = element("button", "wizard-back-button", "Back");
  back.type = "button";
  back.innerHTML = `<span aria-hidden="true">←</span> Back`;

  const hint = element("div", "wizard-footer-hint");
  hint.innerHTML = `<span>Draft saved locally</span><small>Nothing is uploaded while you design.</small>`;

  const next = element("button", "wizard-next-button", "Continue");
  next.type = "button";
  next.innerHTML = `Continue <span aria-hidden="true">→</span>`;

  root.append(back, hint, next);
  return { root, back, next, hint };
}

function bindWizardEvents(state, previewButton) {
  state.progressButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      if (index > state.current) state.completed.add(state.current);
      goToStep(state, index);
    });
  });

  state.backButton.addEventListener("click", () => {
    if (state.current > 0) goToStep(state, state.current - 1);
  });

  state.nextButton.addEventListener("click", () => {
    if (state.current < state.steps.length - 1) {
      state.completed.add(state.current);
      goToStep(state, state.current + 1);
      return;
    }

    const addToCart = $("#addCurrentDesignToCart");
    if (addToCart) {
      addToCart.click();
      state.completed.add(state.current);
      renderProgress(state);
    }
  });

  previewButton.addEventListener("click", focusPreview);

  state.reviewStep.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit-wizard-step]");
    if (edit) {
      goToStep(state, Number(edit.dataset.editWizardStep));
      return;
    }

    const action = event.target.closest("[data-wizard-review-action]")?.dataset.wizardReviewAction;
    if (action === "preview") focusPreview();
    if (action === "download") $("#downloadPng")?.click();
    if (action === "share") $("#shareDesign")?.click();
  });

  const reviewProduct = $("#wizardProductSelect");
  const syncProductFromReview = () => {
    const source = $("#purchaseProductSelect");
    if (!source || !reviewProduct) return;
    source.value = reviewProduct.value;
    source.dispatchEvent(new Event("change", { bubbles: true }));
    window.setTimeout(() => syncReview(state), 0);
  };
  reviewProduct?.addEventListener("input", syncProductFromReview);
  reviewProduct?.addEventListener("change", syncProductFromReview);

  const form = $("#posterForm");
  form.addEventListener("input", (event) => {
    if (event.target !== reviewProduct) syncReview(state);
  });
  form.addEventListener("change", (event) => {
    if (event.target !== reviewProduct) syncReview(state);
  });
  form.addEventListener("click", (event) => {
    if (event.target.closest("button, [role='option']")) window.setTimeout(() => syncReview(state), 0);
  });

  document.addEventListener("keydown", (event) => {
    if (!$("#creator")?.contains(document.activeElement)) return;
    if (event.altKey && event.key === "ArrowRight" && state.current < state.steps.length - 1) {
      event.preventDefault();
      state.completed.add(state.current);
      goToStep(state, state.current + 1);
    }
    if (event.altKey && event.key === "ArrowLeft" && state.current > 0) {
      event.preventDefault();
      goToStep(state, state.current - 1);
    }
  });

  const sourceProduct = $("#purchaseProductSelect");
  if (sourceProduct) {
    new MutationObserver(() => syncReview(state)).observe(sourceProduct, { childList: true, subtree: true });
    sourceProduct.addEventListener("change", () => syncReview(state));
  }

  window.setTimeout(() => syncReview(state), 0);
  window.setTimeout(() => syncReview(state), 250);
}

function goToStep(state, requested, { focus = true, persist = true, scroll = true } = {}) {
  const next = Math.max(0, Math.min(requested, state.steps.length - 1));
  state.current = next;

  state.steps.forEach((step, index) => {
    const active = index === next;
    step.hidden = !active;
    step.setAttribute("aria-hidden", String(!active));
    step.classList.toggle("is-active", active);
  });

  const activeProgressButton = state.progressButtons[next];
  if (scroll && activeProgressButton && window.matchMedia("(max-width: 980px)").matches) {
    window.requestAnimationFrame(() => {
      const list = activeProgressButton.closest(".wizard-step-list");
      if (!list) return;
      const left = activeProgressButton.offsetLeft - (list.clientWidth - activeProgressButton.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    });
  }

  if (next === state.steps.length - 1) syncReview(state);
  renderProgress(state);

  if (persist) {
    try {
      window.sessionStorage.setItem(STEP_STORAGE_KEY, String(next));
    } catch {
      // Session storage is optional; the creator still works without it.
    }
  }

  if (focus) {
    const heading = $(".wizard-step-heading", state.steps[next]);
    window.requestAnimationFrame(() => heading?.focus({ preventScroll: true }));
  }

  const stage = $("#creatorWizardStage");
  if (scroll && stage) stage.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new CustomEvent("where-it-happened:wizard-step", { detail: { step: next + 1 } }));
}

function renderProgress(state) {
  const definition = STEP_DEFINITIONS[state.current];
  const total = state.steps.length;
  const percent = ((state.current + 1) / total) * 100;

  state.progressKicker.textContent = `Step ${state.current + 1} of ${total}`;
  state.progressTitle.textContent = definition.label;
  state.progressDescription.textContent = definition.title;
  state.progressMeter.style.width = `${percent}%`;

  state.progressButtons.forEach((button, index) => {
    const active = index === state.current;
    const completed = state.completed.has(index) || index < state.current;
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-complete", completed);
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });

  state.backButton.disabled = state.current === 0;
  const finalStep = state.current === total - 1;
  const reviewNext = state.current === total - 2;
  const price = $("#purchaseProductPrice")?.textContent?.trim() || "$12";

  if (finalStep) {
    state.nextButton.innerHTML = `Add to cart · ${escapeText(price)} <span aria-hidden="true">→</span>`;
    state.footerHint.innerHTML = `<span>Exact design ready</span><small>Add it to your browser cart, then review the order.</small>`;
  } else if (reviewNext) {
    state.nextButton.innerHTML = `Review design <span aria-hidden="true">→</span>`;
    state.footerHint.innerHTML = `<span>Final adjustment</span><small>The next step summarizes the complete piece.</small>`;
  } else {
    state.nextButton.innerHTML = `Continue <span aria-hidden="true">→</span>`;
    state.footerHint.innerHTML = `<span>Draft saved locally</span><small>Nothing is uploaded while you design.</small>`;
  }
}

function syncReview(state) {
  if (!state?.reviewStep) return;

  const selectedLocation = $("#selectedLocationText")?.textContent?.replace(/^Selected:\s*/i, "").trim();
  const locationSearch = $("#locationSearch")?.value?.trim();
  const place = selectedLocation || locationSearch || "Choose a place";
  const occasion = $("[data-occasion].is-selected")?.textContent?.trim() || "Custom story";
  const mood = $("[data-theme].is-selected strong")?.textContent?.trim() || $("[data-theme].is-selected")?.textContent?.trim() || "Choose a mood";
  const layout = $("[data-layout].is-selected")?.textContent?.trim() || "Classic";
  const format = $("[data-format].is-selected strong")?.textContent?.trim() || $("[data-format].is-selected")?.textContent?.trim() || "Portrait";

  setText("#wizardSummaryPlace", place);
  setText("#wizardSummaryStory", occasion);
  setText("#wizardSummaryMood", mood);
  setText("#wizardSummaryShape", `${layout} · ${format}`);

  const source = $("#purchaseProductSelect");
  const review = $("#wizardProductSelect");
  if (source && review && source.options.length) {
    const sourceOptions = [...source.options];
    const signature = sourceOptions.map((option) => `${option.value}:${option.textContent}`).join("|");
    if (review.dataset.optionSignature !== signature) {
      review.replaceChildren();
      sourceOptions.forEach((sourceOption) => {
        const option = document.createElement("option");
        option.value = sourceOption.value;
        option.textContent = sourceOption.textContent;
        review.append(option);
      });
      review.dataset.optionSignature = signature;
    }
    review.value = source.value;
  }

  if (state.current === state.steps.length - 1) renderProgress(state);
}

function focusPreview() {
  const preview = $(".preview-panel");
  if (!preview) return;
  preview.classList.add("is-preview-emphasized");
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => preview.classList.remove("is-preview-emphasized"), 1300);
}

function summaryCard(label, id, value, editStep) {
  const card = element("article", "wizard-summary-card");
  const copy = element("div");
  copy.append(element("span", "", label), element("strong", "", value));
  copy.lastElementChild.id = id;
  const edit = element("button", "", "Edit");
  edit.type = "button";
  edit.dataset.editWizardStep = String(editStep);
  edit.setAttribute("aria-label", `Edit ${label.toLowerCase()}`);
  card.append(copy, edit);
  return card;
}

function actionButton(label, action) {
  const button = element("button", "wizard-review-action", label);
  button.type = "button";
  button.dataset.wizardReviewAction = action;
  button.innerHTML = `${label}<span aria-hidden="true">↗</span>`;
  return button;
}

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

function loadSavedStep(total) {
  try {
    const value = Number(window.sessionStorage.getItem(STEP_STORAGE_KEY));
    if (Number.isInteger(value) && value >= 0 && value < total) return value;
  } catch {
    // Session storage is optional.
  }
  return 0;
}

function escapeText(value) {
  return String(value).replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
