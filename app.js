import { CITIES, CITY_BY_ID } from "./cities.js";
import { STORE_CONFIG, PRODUCT_BY_ID, isPayhipProductConfigured } from "./store-config.js";

const STORAGE_KEY = "where-it-happened.design.v1";
const CART_STORAGE_KEY = "where-it-happened.cart.v1";
const SEARCH_CACHE_KEY = "where-it-happened.search-cache.v1";
const SELECTED_PRODUCT_KEY = "where-it-happened.selected-product.v1";
const SHARED_HASH_PREFIX = "#design=";
const MAP_STYLE_BASE = "https://tiles.openfreemap.org/styles/";
const NOMINATIM_SEARCH_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const SEARCH_REQUEST_GAP_MS = 1100;
const MAX_CART_ITEMS = 6;

const THEMES = {
  paper: {
    label: "Paper",
    style: `${MAP_STYLE_BASE}positron`,
    background: "#eee7d9",
    text: "#24231f",
    overlayText: "#fff8ec",
    line: "rgba(36, 35, 31, 0.22)",
    marker: "#9d5f3b",
    markerHalo: "rgba(157, 95, 59, 0.22)",
    frame: "#e8dfcf"
  },
  editorial: {
    label: "Editorial",
    style: `${MAP_STYLE_BASE}bright`,
    background: "#fbfaf6",
    text: "#1b1c1c",
    overlayText: "#ffffff",
    line: "rgba(27, 28, 28, 0.2)",
    marker: "#111111",
    markerHalo: "rgba(17, 17, 17, 0.18)",
    frame: "#efebe3"
  },
  heritage: {
    label: "Heritage",
    style: `${MAP_STYLE_BASE}liberty`,
    background: "#3a281f",
    text: "#e7c99d",
    overlayText: "#f4dfc2",
    line: "rgba(231, 201, 157, 0.26)",
    marker: "#e7c99d",
    markerHalo: "rgba(231, 201, 157, 0.22)",
    frame: "#dfd3c2"
  },
  midnight: {
    label: "Midnight",
    style: `${MAP_STYLE_BASE}dark`,
    background: "#0a1120",
    text: "#e6cc91",
    overlayText: "#f1daaa",
    line: "rgba(226, 199, 137, 0.24)",
    marker: "#f0d394",
    markerHalo: "rgba(240, 211, 148, 0.22)",
    frame: "#e8dfd0"
  },
  fjord: {
    label: "Fjord",
    style: `${MAP_STYLE_BASE}fiord`,
    background: "#2a4348",
    text: "#e8efea",
    overlayText: "#f0f6f2",
    line: "rgba(232, 239, 234, 0.25)",
    marker: "#eef5f1",
    markerHalo: "rgba(238, 245, 241, 0.22)",
    frame: "#e2e7e2"
  }
};

const FORMAT_LABELS = {
  portrait: "Portrait",
  square: "Square",
  wallpaper: "Phone Wallpaper"
};

const EXPORT_SIZES = {
  portrait: { width: 1600, height: 2000 },
  square: { width: 1800, height: 1800 },
  wallpaper: { width: 1440, height: 2560 }
};

const FREE_EXPORT_SIZES = {
  portrait: { width: 900, height: 1125 },
  square: { width: 1000, height: 1000 },
  wallpaper: { width: 720, height: 1280 }
};

const OCCASION_COPY = {
  met: {
    kicker: "OUR STORY",
    title: "WHERE WE BEGAN",
    dedication: "Every road since then has felt like home."
  },
  home: {
    kicker: "THE FIRST CHAPTER",
    title: "OUR FIRST HOME",
    dedication: "The rooms were small. The memories never were."
  },
  wedding: {
    kicker: "THE DAY WE CHOSE FOREVER",
    title: "OUR WEDDING CITY",
    dedication: "One place, one promise, a lifetime from here."
  },
  hometown: {
    kicker: "ROOTED HERE",
    title: "HOME IS HERE",
    dedication: "The streets that taught us where we belong."
  },
  travel: {
    kicker: "A JOURNEY REMEMBERED",
    title: "WE FOUND THIS PLACE",
    dedication: "A small point on the map. A permanent part of us."
  },
  graduation: {
    kicker: "THE BEGINNING OF WHAT CAME NEXT",
    title: "GRADUATION DAY",
    dedication: "The place where hard work became a new horizon."
  },
  custom: null
};

const EXAMPLE_PRESETS = {
  met: { occasion: "met", cityId: "paris", theme: "paper", layout: "classic", date: "18 MAY 2021" },
  home: { occasion: "home", cityId: "toronto", theme: "heritage", layout: "minimal", date: "01 SEPTEMBER 2020" },
  wedding: { occasion: "wedding", cityId: "rome", theme: "editorial", layout: "classic", date: "22 JUNE 2024" },
  hometown: { occasion: "hometown", cityId: "vancouver", theme: "fjord", layout: "full", date: "HOME, ALWAYS" },
  travel: { occasion: "travel", cityId: "tokyo", theme: "midnight", layout: "full", date: "AUTUMN 2025" },
  graduation: { occasion: "graduation", cityId: "boston", theme: "paper", layout: "minimal", date: "CLASS OF 2026" }
};

const DEFAULT_STATE = Object.freeze({
  version: 1,
  occasion: "met",
  locationId: "london",
  city: "London",
  country: "United Kingdom",
  lat: 51.5074,
  lng: -0.1278,
  centerLat: 51.5074,
  centerLng: -0.1278,
  zoom: 10.5,
  title: "WHERE WE BEGAN",
  subtitle: "LONDON · UNITED KINGDOM",
  date: "14 JUNE 2022",
  kicker: "OUR STORY",
  dedication: "Every road since then has felt like home.",
  theme: "midnight",
  layout: "classic",
  format: "portrait",
  marker: true,
  labels: true
});

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

let state = loadInitialState();
let map = null;
let mapIsUsable = false;
let mapFailureTimer = null;
let activeLocationIndex = -1;
let locationResults = [];
let saveTimer = null;
let hasEditedSharedState = false;
let suppressMapStateUpdate = false;
let cart = loadCart();
let selectedProductId = loadSelectedProduct();
let heroLocationResults = [];
let lastSearchRequestAt = 0;
let checkoutOrderRef = "";
let cartReturnFocus = null;

const elements = {
  form: $("#posterForm"),
  poster: $("#poster"),
  posterFrame: $("#posterFrame"),
  mapFallback: $("#mapFallback"),
  titleInput: $("#posterTitleInput"),
  subtitleInput: $("#posterSubtitleInput"),
  dateInput: $("#posterDateInput"),
  kickerInput: $("#posterKickerInput"),
  dedicationInput: $("#posterDedicationInput"),
  posterTitle: $("#posterTitle"),
  posterSubtitle: $("#posterSubtitle"),
  posterDate: $("#posterDate"),
  posterKicker: $("#posterKicker"),
  posterDedication: $("#posterDedication"),
  locationSearch: $("#locationSearch"),
  locationOptions: $("#locationOptions"),
  selectedLocationText: $("#selectedLocationText"),
  clearLocation: $("#clearLocation"),
  latitude: $("#latitude"),
  longitude: $("#longitude"),
  applyCoordinates: $("#applyCoordinates"),
  zoomRange: $("#zoomRange"),
  zoomOutput: $("#zoomOutput"),
  markerToggle: $("#markerToggle"),
  labelsToggle: $("#labelsToggle"),
  recenterMap: $("#recenterMap"),
  previewDescriptor: $("#previewDescriptor"),
  autosaveStatus: $("#autosaveStatus"),
  downloadPng: $("#downloadPng"),
  printPdf: $("#printPdf"),
  shareDesign: $("#shareDesign"),
  resetDesign: $("#resetDesign"),
  resetDialog: $("#resetDialog"),
  toastRegion: $("#toastRegion"),
  openSearch: $("#openSearch"),
  heroSearchForm: $("#heroSearchForm"),
  heroLocationSearch: $("#heroLocationSearch"),
  heroSearchSubmit: $("#heroSearchSubmit"),
  heroSearchResults: $("#heroSearchResults"),
  heroSearchStatus: $("#heroSearchStatus"),
  useMyLocationHero: $("#useMyLocationHero"),
  searchWorldwide: $("#searchWorldwide"),
  useMyLocation: $("#useMyLocation"),
  locationSearchStatus: $("#locationSearchStatus"),
  productChoices: $("#productChoices"),
  selectedProductName: $("#selectedProductName"),
  selectedProductDescription: $("#selectedProductDescription"),
  selectedProductPrice: $("#selectedProductPrice"),
  addCurrentDesignToCart: $("#addCurrentDesignToCart"),
  openCart: $("#openCart"),
  cartCount: $("#cartCount"),
  cartShell: $("#cartShell"),
  cartBackdrop: $("#cartBackdrop"),
  cartDrawer: $("#cartDrawer"),
  closeCart: $("#closeCart"),
  cartStartDesign: $("#cartStartDesign"),
  cartEmpty: $("#cartEmpty"),
  cartItems: $("#cartItems"),
  cartFooter: $("#cartFooter"),
  cartSubtotal: $("#cartSubtotal"),
  checkoutCart: $("#checkoutCart"),
  checkoutAvailability: $("#checkoutAvailability"),
  checkoutDialog: $("#checkoutDialog"),
  checkoutDialogTitle: $("#checkoutDialogTitle"),
  checkoutDialogIntro: $("#checkoutDialogIntro"),
  checkoutOrderPreview: $("#checkoutOrderPreview"),
  checkoutPacket: $("#checkoutPacket"),
  checkoutInstruction: $("#checkoutInstruction"),
  checkoutReadyActions: $("#checkoutReadyActions"),
  checkoutSetupNote: $("#checkoutSetupNote"),
  copyAndCheckout: $("#copyAndCheckout"),
  copyCheckoutPacket: $("#copyCheckoutPacket"),
  copySetupOrder: $("#copySetupOrder")
};

boot();

function boot() {
  hydrateControlsFromState();
  bindEvents();
  renderAll({ updateMap: false });
  renderProductSelection();
  renderCart();
  initializeMap();

  if (window.location.hash.startsWith(SHARED_HASH_PREFIX)) {
    window.setTimeout(() => {
      showToast("Shared design opened", "This version is now saved as your local draft.");
    }, 650);
  }
}

function bindEvents() {
  const textBindings = [
    [elements.titleInput, "title"],
    [elements.subtitleInput, "subtitle"],
    [elements.dateInput, "date"],
    [elements.kickerInput, "kicker"],
    [elements.dedicationInput, "dedication"]
  ];

  textBindings.forEach(([input, key]) => {
    input.addEventListener("input", () => {
      state[key] = input.value;
      markAsEdited();
      renderPosterText();
      updateCharacterCounts();
      scheduleSave();
    });
  });

  $$("[data-occasion]").forEach((button) => {
    button.addEventListener("click", () => applyOccasion(button.dataset.occasion));
  });

  $$("[data-theme]").forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.theme));
  });

  $$("[data-layout]").forEach((button) => {
    button.addEventListener("click", () => {
      state.layout = button.dataset.layout;
      markAsEdited();
      renderPosterClasses();
      renderSelections();
      scheduleMapResize();
      scheduleSave();
    });
  });

  $$("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      state.format = button.dataset.format;
      markAsEdited();
      renderPosterClasses();
      renderSelections();
      scheduleMapResize();
      scheduleSave();
    });
  });

  $$("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      applyExample(button.dataset.example);
      $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  elements.openSearch?.addEventListener("click", () => {
    $("#top").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => elements.heroLocationSearch?.focus(), reducedMotion ? 0 : 420);
  });

  elements.heroSearchForm?.addEventListener("submit", handleHeroSearch);
  elements.heroSearchResults?.addEventListener("click", (event) => {
    const option = event.target.closest("[data-hero-result-index]");
    if (!option) return;
    const result = heroLocationResults[Number(option.dataset.heroResultIndex)];
    if (result) chooseHeroSearchResult(result);
  });
  elements.useMyLocationHero?.addEventListener("click", () => useBrowserLocation({ fromHero: true }));

  elements.searchWorldwide?.addEventListener("click", searchWorldwideFromCreator);
  elements.useMyLocation?.addEventListener("click", () => useBrowserLocation({ fromHero: false }));

  $$('[data-shop-product]').forEach((button) => {
    button.addEventListener("click", () => {
      selectProduct(button.dataset.shopProduct);
      $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => elements.addCurrentDesignToCart?.focus(), reducedMotion ? 0 : 550);
    });
  });

  $$('[data-product-id]').forEach((button) => {
    button.addEventListener("click", () => selectProduct(button.dataset.productId));
  });

  elements.addCurrentDesignToCart?.addEventListener("click", addCurrentDesignToCart);
  elements.openCart?.addEventListener("click", openCartDrawer);
  elements.closeCart?.addEventListener("click", closeCartDrawer);
  elements.cartBackdrop?.addEventListener("click", closeCartDrawer);
  elements.cartStartDesign?.addEventListener("click", () => {
    closeCartDrawer();
    $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
  elements.cartItems?.addEventListener("click", handleCartAction);
  elements.checkoutCart?.addEventListener("click", openCheckoutDialog);
  elements.copyAndCheckout?.addEventListener("click", copyOrderAndOpenCheckout);
  elements.copyCheckoutPacket?.addEventListener("click", copyCurrentCheckoutPacket);
  elements.copySetupOrder?.addEventListener("click", copyCurrentCheckoutPacket);

  elements.locationSearch.addEventListener("focus", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("input", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("keydown", handleLocationKeydown);
  elements.locationSearch.addEventListener("blur", () => {
    window.setTimeout(closeLocationOptions, 130);
  });

  elements.locationOptions.addEventListener("mousedown", (event) => event.preventDefault());
  elements.locationOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-location-index]");
    if (!option) return;
    const result = locationResults[Number(option.dataset.locationIndex)];
    if (result) selectLocationResult(result);
  });

  elements.clearLocation.addEventListener("click", () => {
    elements.locationSearch.value = "";
    elements.locationSearch.focus();
    renderLocationOptions("");
  });

  elements.applyCoordinates.addEventListener("click", applyManualCoordinates);

  elements.zoomRange.addEventListener("input", () => {
    const zoom = Number(elements.zoomRange.value);
    state.zoom = zoom;
    elements.zoomOutput.value = zoom.toFixed(1);
    elements.zoomOutput.textContent = zoom.toFixed(1);
    markAsEdited();
    if (map) map.setZoom(zoom);
    scheduleSave();
  });

  elements.markerToggle.addEventListener("change", () => {
    state.marker = elements.markerToggle.checked;
    markAsEdited();
    applyMarkerVisibility();
    scheduleSave();
  });

  elements.labelsToggle.addEventListener("change", () => {
    state.labels = elements.labelsToggle.checked;
    markAsEdited();
    applyLabelVisibility();
    scheduleSave();
  });

  elements.recenterMap.addEventListener("click", () => {
    state.centerLat = state.lat;
    state.centerLng = state.lng;
    suppressMapStateUpdate = true;
    map?.easeTo({
      center: [state.lng, state.lat],
      zoom: state.zoom,
      duration: reducedMotion ? 0 : 700
    });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, reducedMotion ? 20 : 750);
    scheduleSave();
    showToast("Map recentered", `${state.city || "Your coordinate"} is back in focus.`);
  });

  elements.downloadPng.addEventListener("click", handleDownload);
  elements.printPdf.addEventListener("click", handlePrint);
  elements.shareDesign.addEventListener("click", handleShare);
  elements.resetDesign.addEventListener("click", openResetDialog);

  elements.resetDialog?.addEventListener("close", () => {
    if (elements.resetDialog.returnValue === "confirm") resetToDefault();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".combobox-wrap")) closeLocationOptions();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.cartShell?.hidden) closeCartDrawer();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === CART_STORAGE_KEY) {
      cart = loadCart();
      renderCart();
    }
  });
  window.addEventListener("resize", debounce(() => map?.resize(), 150));
  window.addEventListener("beforeunload", () => {
    saveDraft();
    saveCart();
  });
}

function loadInitialState() {
  const shared = parseSharedState(window.location.hash);
  if (shared) return sanitizeState(shared);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return sanitizeState(JSON.parse(stored));
  } catch (error) {
    console.warn("Could not read the local draft.", error);
  }

  return cloneDefaultState();
}

function sanitizeState(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  const knownTheme = Object.hasOwn(THEMES, source.theme) ? source.theme : DEFAULT_STATE.theme;
  const knownLayout = ["classic", "full", "minimal"].includes(source.layout) ? source.layout : DEFAULT_STATE.layout;
  const knownFormat = Object.hasOwn(FORMAT_LABELS, source.format) ? source.format : DEFAULT_STATE.format;
  const knownOccasion = Object.hasOwn(OCCASION_COPY, source.occasion) ? source.occasion : "custom";
  const locationFromId = source.locationId ? CITY_BY_ID[source.locationId] : null;

  const lat = validNumber(source.lat, locationFromId?.lat ?? DEFAULT_STATE.lat, -90, 90);
  const lng = validNumber(source.lng, locationFromId?.lng ?? DEFAULT_STATE.lng, -180, 180);
  const centerLat = validNumber(source.centerLat, lat, -90, 90);
  const centerLng = validNumber(source.centerLng, lng, -180, 180);

  return {
    version: 1,
    occasion: knownOccasion,
    locationId: typeof source.locationId === "string" ? source.locationId : locationFromId?.id ?? "custom",
    city: safeText(source.city, locationFromId?.city ?? "Custom location", 80),
    country: safeText(source.country, locationFromId?.country ?? "Exact coordinates", 80),
    lat,
    lng,
    centerLat,
    centerLng,
    zoom: validNumber(source.zoom, DEFAULT_STATE.zoom, 4, 16),
    title: safeText(source.title, DEFAULT_STATE.title, 48),
    subtitle: safeText(source.subtitle, DEFAULT_STATE.subtitle, 72),
    date: safeText(source.date, DEFAULT_STATE.date, 32),
    kicker: safeText(source.kicker, DEFAULT_STATE.kicker, 32),
    dedication: safeText(source.dedication, DEFAULT_STATE.dedication, 120),
    theme: knownTheme,
    layout: knownLayout,
    format: knownFormat,
    marker: source.marker !== false,
    labels: source.labels !== false
  };
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function safeText(value, fallback, maxLength) {
  if (typeof value !== "string") return fallback;
  return value.slice(0, maxLength);
}

function validNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

function hydrateControlsFromState() {
  elements.titleInput.value = state.title;
  elements.subtitleInput.value = state.subtitle;
  elements.dateInput.value = state.date;
  elements.kickerInput.value = state.kicker;
  elements.dedicationInput.value = state.dedication;
  elements.locationSearch.value = locationDisplayName();
  elements.latitude.value = state.lat.toFixed(4);
  elements.longitude.value = state.lng.toFixed(4);
  elements.zoomRange.value = String(state.zoom);
  elements.zoomOutput.value = state.zoom.toFixed(1);
  elements.zoomOutput.textContent = state.zoom.toFixed(1);
  elements.markerToggle.checked = state.marker;
  elements.labelsToggle.checked = state.labels;
  updateCharacterCounts();
}

function renderAll({ updateMap = true } = {}) {
  renderPosterText();
  renderPosterClasses();
  renderSelections();
  renderLocationSummary();
  updateCharacterCounts();

  if (updateMap && map) {
    suppressMapStateUpdate = true;
    map.jumpTo({ center: [state.centerLng, state.centerLat], zoom: state.zoom });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, 20);
    updateMarkerData();
    applyLabelVisibility();
    applyMarkerVisibility();
    scheduleMapResize();
  }
}

function renderPosterText() {
  elements.posterTitle.textContent = state.title.trim() || "YOUR MEMORY";
  elements.posterSubtitle.textContent = state.subtitle.trim() || coordinatesLabel();
  elements.posterDate.textContent = state.date.trim();
  elements.posterKicker.textContent = state.kicker.trim();
  elements.posterDedication.textContent = state.dedication.trim();
  elements.posterDate.hidden = !state.date.trim();
  elements.posterKicker.hidden = !state.kicker.trim();
  elements.posterDedication.hidden = !state.dedication.trim();
}

function renderPosterClasses() {
  elements.poster.className = `poster poster-theme-${state.theme} layout-${state.layout}`;
  elements.posterFrame.className = `poster-frame format-${state.format}`;
  elements.previewDescriptor.textContent = `${state.city || "Custom location"} · ${THEMES[state.theme].label} · ${FORMAT_LABELS[state.format]}`;
}

function renderSelections() {
  updatePressedGroup("[data-occasion]", "occasion", state.occasion);
  updatePressedGroup("[data-theme]", "theme", state.theme);
  updatePressedGroup("[data-layout]", "layout", state.layout);
  updatePressedGroup("[data-format]", "format", state.format);
}

function updatePressedGroup(selector, dataName, selectedValue) {
  $$(selector).forEach((button) => {
    const selected = button.dataset[dataName] === selectedValue;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function renderLocationSummary() {
  elements.selectedLocationText.textContent = state.locationId === "custom"
    ? `Selected: ${state.lat.toFixed(4)}, ${state.lng.toFixed(4)}`
    : `Selected: ${state.city}, ${state.country}`;
  elements.latitude.value = state.lat.toFixed(4);
  elements.longitude.value = state.lng.toFixed(4);
}

function updateCharacterCounts() {
  $$('[data-count-for]').forEach((counter) => {
    const input = document.getElementById(counter.dataset.countFor);
    counter.textContent = `${input.value.length} / ${input.maxLength}`;
  });
}

function applyOccasion(occasion, { preserveDate = true } = {}) {
  if (!Object.hasOwn(OCCASION_COPY, occasion)) return;
  state.occasion = occasion;
  const copy = OCCASION_COPY[occasion];

  if (copy) {
    state.kicker = copy.kicker;
    state.title = copy.title;
    state.dedication = copy.dedication;
  }

  if (!preserveDate && !state.date) state.date = DEFAULT_STATE.date;
  markAsEdited();
  hydrateControlsFromState();
  renderAll({ updateMap: false });
  scheduleSave();
}

function applyExample(exampleName) {
  const preset = EXAMPLE_PRESETS[exampleName];
  if (!preset) return;

  const city = CITY_BY_ID[preset.cityId];
  const copy = OCCASION_COPY[preset.occasion];

  state = sanitizeState({
    ...state,
    occasion: preset.occasion,
    locationId: city.id,
    city: city.city,
    country: city.country,
    lat: city.lat,
    lng: city.lng,
    centerLat: city.lat,
    centerLng: city.lng,
    zoom: defaultZoomForCity(city.id),
    title: copy.title,
    subtitle: formatSubtitle(city.city, city.country),
    date: preset.date,
    kicker: copy.kicker,
    dedication: copy.dedication,
    theme: preset.theme,
    layout: preset.layout,
    format: "portrait"
  });

  markAsEdited();
  hydrateControlsFromState();
  renderAll({ updateMap: false });
  setMapStyle(state.theme, { jumpToLocation: true });
  scheduleSave();
  showToast("Example loaded", `${copy.title} is ready to personalize.`);
}

function setTheme(theme) {
  if (!Object.hasOwn(THEMES, theme) || state.theme === theme) return;
  state.theme = theme;
  markAsEdited();
  renderPosterClasses();
  renderSelections();
  setMapStyle(theme);
  scheduleSave();
}

function setMapStyle(theme, { jumpToLocation = false } = {}) {
  if (!map) return;
  mapIsUsable = false;
  map.setStyle(THEMES[theme].style, { diff: false });
  if (jumpToLocation) {
    suppressMapStateUpdate = true;
    map.jumpTo({ center: [state.centerLng, state.centerLat], zoom: state.zoom });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, 30);
  }
}

function renderLocationOptions(query = "") {
  const normalized = normalizeSearch(query);
  locationResults = CITIES.filter((city) => {
    if (!normalized) return true;
    const haystack = normalizeSearch(`${city.city} ${city.country} ${city.countryCode}`);
    return haystack.includes(normalized);
  })
    .slice(0, 10)
    .map((city) => ({ ...city, source: "built-in", label: `${city.city}, ${city.country}` }));

  renderLocationResultList(locationResults, {
    emptyMessage: "No popular city matched. Use Search worldwide or enter exact coordinates."
  });
}

function renderLocationResultList(results, { emptyMessage = "No place matched." } = {}) {
  activeLocationIndex = results.length ? 0 : -1;
  elements.locationOptions.replaceChildren();

  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "empty-option";
    empty.textContent = emptyMessage;
    elements.locationOptions.append(empty);
  } else {
    results.forEach((result, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = `combobox-option${index === activeLocationIndex ? " is-active" : ""}`;
      option.id = `location-option-${index}`;
      option.dataset.locationIndex = String(index);
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(result.id === state.locationId));

      const text = document.createElement("span");
      const placeName = document.createElement("strong");
      const placeContext = document.createElement("small");
      placeName.textContent = result.city || result.name || "Selected place";
      placeContext.textContent = result.context || result.country || result.displayName || "";
      text.append(placeName, placeContext);

      const code = document.createElement("span");
      code.textContent = result.source === "built-in" ? result.countryCode : result.typeLabel || "MAP";
      option.append(text, code);
      elements.locationOptions.append(option);
    });
  }

  elements.locationOptions.hidden = false;
  elements.locationSearch.setAttribute("aria-expanded", "true");
  updateActiveLocationDescendant();
}

function handleLocationKeydown(event) {
  const isOpen = !elements.locationOptions.hidden;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (!isOpen) renderLocationOptions(elements.locationSearch.value);
    else if (locationResults.length) activeLocationIndex = (activeLocationIndex + 1) % locationResults.length;
    refreshActiveOption();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    if (!isOpen) renderLocationOptions(elements.locationSearch.value);
    else if (locationResults.length) activeLocationIndex = (activeLocationIndex - 1 + locationResults.length) % locationResults.length;
    refreshActiveOption();
  } else if (event.key === "Enter" && isOpen && activeLocationIndex >= 0) {
    event.preventDefault();
    selectLocationResult(locationResults[activeLocationIndex]);
  } else if (event.key === "Enter" && elements.locationSearch.value.trim().length >= 2) {
    event.preventDefault();
    searchWorldwideFromCreator();
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeLocationOptions();
  }
}

function refreshActiveOption() {
  $$(".combobox-option", elements.locationOptions).forEach((option, index) => {
    option.classList.toggle("is-active", index === activeLocationIndex);
  });
  updateActiveLocationDescendant();
  const active = $(".combobox-option.is-active", elements.locationOptions);
  active?.scrollIntoView({ block: "nearest" });
}

function updateActiveLocationDescendant() {
  if (activeLocationIndex >= 0 && locationResults[activeLocationIndex]) {
    elements.locationSearch.setAttribute("aria-activedescendant", `location-option-${activeLocationIndex}`);
  } else {
    elements.locationSearch.removeAttribute("aria-activedescendant");
  }
}

function closeLocationOptions() {
  elements.locationOptions.hidden = true;
  elements.locationSearch.setAttribute("aria-expanded", "false");
  elements.locationSearch.removeAttribute("aria-activedescendant");
}

function selectLocationResult(result) {
  if (!result) return;
  if (result.source === "built-in") selectCity(result.id);
  else selectExternalLocation(result);
}

function selectCity(cityId) {
  const city = CITY_BY_ID[cityId];
  if (!city) return;

  state.locationId = city.id;
  state.city = city.city;
  state.country = city.country;
  state.lat = city.lat;
  state.lng = city.lng;
  state.centerLat = city.lat;
  state.centerLng = city.lng;
  state.zoom = defaultZoomForCity(city.id);
  state.subtitle = formatSubtitle(city.city, city.country);
  elements.locationSearch.value = `${city.city}, ${city.country}`;
  elements.subtitleInput.value = state.subtitle;
  elements.zoomRange.value = String(state.zoom);
  elements.zoomOutput.value = state.zoom.toFixed(1);
  elements.zoomOutput.textContent = state.zoom.toFixed(1);
  closeLocationOptions();
  markAsEdited();
  renderPosterText();
  renderLocationSummary();
  renderPosterClasses();
  updateMarkerData();

  if (map) {
    suppressMapStateUpdate = true;
    map.flyTo({
      center: [city.lng, city.lat],
      zoom: state.zoom,
      duration: reducedMotion ? 0 : 900,
      essential: true
    });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, reducedMotion ? 20 : 950);
  }

  scheduleSave();
  showToast("Place selected", `${city.city}, ${city.country}`);
}


function selectExternalLocation(result) {
  const lat = validNumber(result.lat, state.lat, -90, 90);
  const lng = validNumber(result.lng, state.lng, -180, 180);
  const city = safeText(result.city || result.name, "Selected place", 80);
  const country = safeText(result.country || result.context, "Mapped location", 80);
  const zoom = validNumber(result.zoom, 12, 4, 16);

  state.locationId = safeText(result.id, "custom", 120);
  state.city = city;
  state.country = country;
  state.lat = lat;
  state.lng = lng;
  state.centerLat = lat;
  state.centerLng = lng;
  state.zoom = zoom;
  state.subtitle = formatSubtitle(city, country);

  elements.locationSearch.value = result.label || `${city}, ${country}`;
  elements.subtitleInput.value = state.subtitle;
  elements.zoomRange.value = String(state.zoom);
  elements.zoomOutput.value = state.zoom.toFixed(1);
  elements.zoomOutput.textContent = state.zoom.toFixed(1);
  elements.locationSearchStatus.textContent = `Selected from worldwide search · ${city}, ${country}`;
  closeLocationOptions();
  markAsEdited();
  renderPosterText();
  renderLocationSummary();
  renderPosterClasses();
  updateMarkerData();

  if (map) {
    suppressMapStateUpdate = true;
    map.flyTo({
      center: [lng, lat],
      zoom: state.zoom,
      duration: reducedMotion ? 0 : 900,
      essential: true
    });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, reducedMotion ? 20 : 950);
  }

  scheduleSave();
  showToast("Place selected", `${city}, ${country}`);
}

async function handleHeroSearch(event) {
  event.preventDefault();
  const query = elements.heroLocationSearch.value.trim();
  if (query.length < 2) {
    elements.heroSearchStatus.textContent = "Enter at least two characters to search.";
    elements.heroLocationSearch.focus();
    return;
  }

  setButtonBusy(elements.heroSearchSubmit, true, "Searching…");
  elements.heroSearchStatus.textContent = `Searching for “${query}”…`;
  elements.heroSearchResults.hidden = true;

  try {
    heroLocationResults = await searchPlaces(query);
    renderHeroSearchResults(heroLocationResults);
    elements.heroSearchStatus.textContent = heroLocationResults.length
      ? `${heroLocationResults.length} place${heroLocationResults.length === 1 ? "" : "s"} found. Search data © OpenStreetMap contributors.`
      : "No place matched. Try a nearby city, landmark, postcode, or exact address.";
  } catch (error) {
    console.error("Worldwide search failed.", error);
    heroLocationResults = [];
    renderHeroSearchResults([]);
    elements.heroSearchStatus.textContent = "Worldwide search is temporarily unavailable. The built-in city list still works in the editor.";
    showToast("Search could not connect", "Try again or choose a popular city in the editor.", true);
  } finally {
    setButtonBusy(elements.heroSearchSubmit, false);
  }
}

function renderHeroSearchResults(results) {
  elements.heroSearchResults.replaceChildren();
  if (!results.length) {
    elements.heroSearchResults.hidden = true;
    return;
  }

  results.forEach((result, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.heroResultIndex = String(index);

    const pin = document.createElement("span");
    pin.className = "hero-result-pin";
    pin.textContent = result.source === "built-in" ? "●" : "⌖";

    const copy = document.createElement("span");
    const strong = document.createElement("strong");
    const small = document.createElement("small");
    strong.textContent = result.city || result.name;
    small.textContent = result.context || result.country || result.displayName;
    copy.append(strong, small);

    const action = document.createElement("b");
    action.textContent = "Use";
    button.append(pin, copy, action);
    elements.heroSearchResults.append(button);
  });

  elements.heroSearchResults.hidden = false;
}

function chooseHeroSearchResult(result) {
  selectLocationResult(result);
  elements.heroSearchResults.hidden = true;
  elements.heroLocationSearch.value = result.label || `${result.city}, ${result.country}`;
  $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => elements.locationSearch?.focus(), reducedMotion ? 0 : 550);
}

async function searchWorldwideFromCreator() {
  const query = elements.locationSearch.value.trim();
  if (query.length < 2) {
    elements.locationSearchStatus.textContent = "Enter at least two characters, then choose Search worldwide.";
    elements.locationSearch.focus();
    return;
  }

  setButtonBusy(elements.searchWorldwide, true, "Searching…");
  elements.locationSearchStatus.textContent = `Searching worldwide for “${query}”…`;

  try {
    locationResults = await searchPlaces(query);
    renderLocationResultList(locationResults, {
      emptyMessage: "No place matched. Try a nearby landmark, postcode, or exact address."
    });
    elements.locationSearchStatus.textContent = locationResults.length
      ? `${locationResults.length} place${locationResults.length === 1 ? "" : "s"} found · Search data © OpenStreetMap contributors.`
      : "No worldwide result matched. Exact coordinates remain available below.";
  } catch (error) {
    console.error("Worldwide search failed.", error);
    elements.locationSearchStatus.textContent = "Worldwide search is temporarily unavailable. Popular-city search still works.";
    showToast("Search could not connect", "Try again or use exact coordinates.", true);
  } finally {
    setButtonBusy(elements.searchWorldwide, false);
  }
}

async function searchPlaces(query) {
  const normalized = normalizeSearch(query);
  const local = CITIES.filter((city) => {
    const haystack = normalizeSearch(`${city.city} ${city.country} ${city.countryCode}`);
    return haystack.includes(normalized);
  })
    .slice(0, 4)
    .map((city) => ({
      ...city,
      source: "built-in",
      label: `${city.city}, ${city.country}`,
      context: city.country,
      zoom: defaultZoomForCity(city.id),
      typeLabel: city.countryCode
    }));

  const remote = await searchNominatim(query);
  const combined = [...local];

  remote.forEach((candidate) => {
    const duplicate = combined.some((existing) => {
      const latGap = Math.abs(Number(existing.lat) - Number(candidate.lat));
      const lngGap = Math.abs(Number(existing.lng) - Number(candidate.lng));
      return latGap < 0.04 && lngGap < 0.04;
    });
    if (!duplicate) combined.push(candidate);
  });

  return combined.slice(0, 8);
}

async function searchNominatim(query) {
  const cacheKey = normalizeSearch(query);
  const cached = readSearchCache(cacheKey);
  if (cached) return cached;

  const elapsed = Date.now() - lastSearchRequestAt;
  if (elapsed < SEARCH_REQUEST_GAP_MS) await delay(SEARCH_REQUEST_GAP_MS - elapsed);
  lastSearchRequestAt = Date.now();

  const url = new URL(NOMINATIM_SEARCH_ENDPOINT);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "6");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("accept-language", navigator.language || "en");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      referrerPolicy: "strict-origin-when-cross-origin"
    });
    if (!response.ok) throw new Error(`Search returned ${response.status}`);
    const data = await response.json();
    const results = Array.isArray(data) ? data.map(normalizeNominatimResult).filter(Boolean) : [];
    writeSearchCache(cacheKey, results);
    return results;
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeNominatimResult(item) {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const address = item.address ?? {};
  const firstDisplayPart = String(item.display_name || "").split(",")[0].trim();
  const name = item.name || firstDisplayPart || address.road || address.neighbourhood || "Selected place";
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.hamlet ||
    address.county ||
    name;
  const country = address.country || address.country_code?.toUpperCase() || "Mapped location";
  const region = address.state || address.county || address.city_district || address.suburb || "";
  const context = [region, country].filter((value, index, values) => value && values.indexOf(value) === index).join(", ");
  const type = String(item.type || item.addresstype || "place").replaceAll("_", " ");

  return {
    id: `osm-${item.osm_type || "place"}-${item.osm_id || item.place_id || `${lat}-${lng}`}`,
    source: "nominatim",
    city: safeText(name || locality, locality, 80),
    country: safeText(country, "Mapped location", 80),
    context: safeText(context || item.display_name, country, 150),
    displayName: safeText(item.display_name, `${name}, ${country}`, 220),
    label: safeText(item.display_name, `${name}, ${country}`, 180),
    typeLabel: type.slice(0, 12).toUpperCase(),
    lat,
    lng,
    zoom: zoomForPlaceType(item.addresstype || item.type)
  };
}

function zoomForPlaceType(type = "") {
  const normalized = String(type).toLowerCase();
  if (["house", "building", "amenity", "tourism", "shop", "office"].includes(normalized)) return 16;
  if (["road", "street", "pedestrian", "neighbourhood", "suburb"].includes(normalized)) return 14;
  if (["city", "town", "village", "municipality", "borough"].includes(normalized)) return 11.5;
  if (["county", "state", "province", "region"].includes(normalized)) return 7.5;
  if (["country"].includes(normalized)) return 5;
  return 12.5;
}

function readSearchCache(key) {
  try {
    const cache = JSON.parse(window.localStorage.getItem(SEARCH_CACHE_KEY) || "{}");
    const entry = cache[key];
    if (!entry || !Array.isArray(entry.results)) return null;
    if (Date.now() - Number(entry.savedAt || 0) > 30 * 24 * 60 * 60 * 1000) return null;
    return entry.results;
  } catch {
    return null;
  }
}

function writeSearchCache(key, results) {
  try {
    const cache = JSON.parse(window.localStorage.getItem(SEARCH_CACHE_KEY) || "{}");
    cache[key] = { savedAt: Date.now(), results };
    const entries = Object.entries(cache)
      .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
      .slice(0, 30);
    window.localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Search still works when local cache is unavailable.
  }
}

function useBrowserLocation({ fromHero = false } = {}) {
  if (!navigator.geolocation) {
    showToast("Location unavailable", "This browser does not provide location access.", true);
    return;
  }

  const trigger = fromHero ? elements.useMyLocationHero : elements.useMyLocation;
  setButtonBusy(trigger, true, "Locating…");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      selectExternalLocation({
        id: "device-location",
        source: "device",
        city: "Current location",
        country: "Your device",
        context: coordinatesLabel(lat, lng),
        label: "Current location",
        typeLabel: "HERE",
        lat,
        lng,
        zoom: 14
      });
      setButtonBusy(trigger, false);
      if (fromHero) {
        elements.heroLocationSearch.value = "Current location";
        $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      }
    },
    (error) => {
      setButtonBusy(trigger, false);
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was declined. Search for the place instead."
        : "Your location could not be read. Search for the place instead.";
      showToast("Location not selected", message, true);
    },
    { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 }
  );
}

function applyManualCoordinates() {
  const lat = Number(elements.latitude.value);
  const lng = Number(elements.longitude.value);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    showToast("Check the coordinates", "Latitude must be −90 to 90 and longitude −180 to 180.", true);
    return;
  }

  state.locationId = "custom";
  state.city = "Custom location";
  state.country = "Exact coordinates";
  state.lat = lat;
  state.lng = lng;
  state.centerLat = lat;
  state.centerLng = lng;
  state.subtitle = coordinatesLabel(lat, lng);
  elements.subtitleInput.value = state.subtitle;
  elements.locationSearch.value = "Custom coordinates";
  markAsEdited();
  renderPosterText();
  renderLocationSummary();
  renderPosterClasses();
  updateMarkerData();

  if (map) {
    suppressMapStateUpdate = true;
    map.flyTo({ center: [lng, lat], zoom: state.zoom, duration: reducedMotion ? 0 : 900, essential: true });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, reducedMotion ? 20 : 950);
  }

  scheduleSave();
  showToast("Coordinates applied", `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
}


function loadSelectedProduct() {
  try {
    const stored = window.localStorage.getItem(SELECTED_PRODUCT_KEY);
    if (stored && PRODUCT_BY_ID[stored]) return stored;
  } catch {
    // The default remains available when local storage is blocked.
  }
  return STORE_CONFIG.defaultProductId;
}

function selectProduct(productId) {
  if (!PRODUCT_BY_ID[productId]) return;
  selectedProductId = productId;
  try {
    window.localStorage.setItem(SELECTED_PRODUCT_KEY, productId);
  } catch {
    // Product selection still works for the current page.
  }
  renderProductSelection();
}

function renderProductSelection() {
  const product = PRODUCT_BY_ID[selectedProductId] ?? STORE_CONFIG.products[0];
  selectedProductId = product.id;

  $$('[data-product-id]').forEach((button) => {
    const selected = button.dataset.productId === product.id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  $$('[data-product-card]').forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.productCard === product.id);
  });

  if (elements.selectedProductName) elements.selectedProductName.textContent = product.name;
  if (elements.selectedProductDescription) elements.selectedProductDescription.textContent = product.description;
  if (elements.selectedProductPrice) elements.selectedProductPrice.textContent = formatCurrency(product.price);
}

function loadCart() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.map(sanitizeCartItem).filter(Boolean).slice(0, MAX_CART_ITEMS);
  } catch (error) {
    console.warn("Could not read the saved cart.", error);
    return [];
  }
}

function sanitizeCartItem(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const product = PRODUCT_BY_ID[candidate.productId];
  if (!product) return null;
  const design = sanitizeState(candidate.design);
  return {
    id: typeof candidate.id === "string" ? candidate.id.slice(0, 80) : createCartId(),
    productId: product.id,
    design,
    designKey: typeof candidate.designKey === "string" ? candidate.designKey : encodeSharedState(design),
    addedAt: Number.isFinite(Number(candidate.addedAt)) ? Number(candidate.addedAt) : Date.now()
  };
}

function saveCart() {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.warn("Could not save the cart.", error);
  }
}

function createCartId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function addCurrentDesignToCart() {
  const product = PRODUCT_BY_ID[selectedProductId];
  if (!product) return;
  const design = sanitizeState(state);
  const designKey = encodeSharedState(design);
  const existing = cart.find((item) => item.productId === product.id && item.designKey === designKey);

  if (existing) {
    openCartDrawer();
    showToast("Already in your cart", `${product.name} for ${design.city} is saved there.`);
    return;
  }

  if (cart.length >= MAX_CART_ITEMS) {
    openCartDrawer();
    showToast("Cart limit reached", `This MVP keeps up to ${MAX_CART_ITEMS} custom maps in one cart.`, true);
    return;
  }

  cart.push({
    id: createCartId(),
    productId: product.id,
    design,
    designKey,
    addedAt: Date.now()
  });
  saveCart();
  renderCart();
  openCartDrawer();
  showToast("Design added to cart", `${product.name} · ${design.city}`);
}

function renderCart() {
  if (!elements.cartItems) return;
  elements.cartItems.replaceChildren();
  const count = cart.length;
  elements.cartCount.textContent = String(count);
  elements.cartCount.setAttribute("aria-label", `${count} item${count === 1 ? "" : "s"} in cart`);
  elements.openCart?.classList.toggle("has-items", count > 0);
  elements.cartEmpty.hidden = count > 0;
  elements.cartFooter.hidden = count === 0;

  cart.forEach((item) => {
    const product = PRODUCT_BY_ID[item.productId];
    if (!product) return;

    const article = document.createElement("article");
    article.className = "cart-item";
    article.dataset.cartItemId = item.id;

    const thumbnail = document.createElement("div");
    thumbnail.className = `cart-item-thumbnail cart-theme-${item.design.theme}`;
    const thumbnailMap = document.createElement("span");
    const thumbnailTitle = document.createElement("strong");
    const thumbnailPlace = document.createElement("small");
    thumbnailTitle.textContent = item.design.title || "MEMORY MAP";
    thumbnailPlace.textContent = item.design.city || "Custom place";
    thumbnail.append(thumbnailMap, thumbnailTitle, thumbnailPlace);

    const copy = document.createElement("div");
    copy.className = "cart-item-copy";
    const productName = document.createElement("p");
    productName.textContent = product.name;
    const title = document.createElement("h3");
    title.textContent = item.design.city || "Custom location";
    const details = document.createElement("span");
    details.textContent = `${THEMES[item.design.theme]?.label || "Map"} · ${FORMAT_LABELS[item.design.format] || "Format"}`;
    const actions = document.createElement("div");
    actions.className = "cart-item-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.cartAction = "edit";
    edit.dataset.cartId = item.id;
    edit.textContent = "Edit design";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.cartAction = "remove";
    remove.dataset.cartId = item.id;
    remove.textContent = "Remove";
    actions.append(edit, remove);
    copy.append(productName, title, details, actions);

    const price = document.createElement("strong");
    price.className = "cart-item-price";
    price.textContent = formatCurrency(product.price);

    article.append(thumbnail, copy, price);
    elements.cartItems.append(article);
  });

  const subtotal = cart.reduce((sum, item) => sum + (PRODUCT_BY_ID[item.productId]?.price || 0), 0);
  elements.cartSubtotal.textContent = formatCurrency(subtotal);

  const ready = isCartCheckoutConfigured();
  elements.checkoutAvailability.textContent = ready
    ? "Secure checkout is ready. Your cart remains saved until you remove it."
    : "Secure payment is being connected. Your cart remains saved on this device.";
  elements.checkoutCart.textContent = ready ? "Continue to secure checkout" : "Review order details";
}

function handleCartAction(event) {
  const button = event.target.closest("[data-cart-action]");
  if (!button) return;
  const item = cart.find((candidate) => candidate.id === button.dataset.cartId);
  if (!item) return;

  if (button.dataset.cartAction === "remove") {
    cart = cart.filter((candidate) => candidate.id !== item.id);
    saveCart();
    renderCart();
    showToast("Removed from cart", `${item.design.city || "The design"} was removed.`);
  } else if (button.dataset.cartAction === "edit") {
    state = sanitizeState(item.design);
    selectProduct(item.productId);
    hydrateControlsFromState();
    renderAll({ updateMap: false });
    setMapStyle(state.theme, { jumpToLocation: true });
    scheduleSave();
    closeCartDrawer();
    $("#creator").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    showToast("Cart design opened", "Edit it, then add the updated version to your cart.");
  }
}

function openCartDrawer() {
  if (!elements.cartShell) return;
  cartReturnFocus = document.activeElement;
  elements.cartShell.hidden = false;
  document.body.classList.add("cart-open");
  elements.openCart?.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => {
    elements.cartShell.classList.add("is-open");
    elements.cartDrawer?.focus();
  });
}

function closeCartDrawer() {
  if (!elements.cartShell || elements.cartShell.hidden) return;
  elements.cartShell.classList.remove("is-open");
  document.body.classList.remove("cart-open");
  elements.openCart?.setAttribute("aria-expanded", "false");
  window.setTimeout(() => {
    if (!elements.cartShell.classList.contains("is-open")) elements.cartShell.hidden = true;
  }, reducedMotion ? 0 : 230);
  if (cartReturnFocus instanceof HTMLElement) cartReturnFocus.focus({ preventScroll: true });
}

function isCartCheckoutConfigured() {
  return cart.length > 0 && cart.every((item) => isPayhipProductConfigured(PRODUCT_BY_ID[item.productId]));
}

function openCheckoutDialog() {
  if (!cart.length) {
    showToast("Your cart is empty", "Add a finished design before opening checkout.", true);
    return;
  }

  checkoutOrderRef = createOrderReference();
  const packet = buildOrderPacket(checkoutOrderRef);
  elements.checkoutPacket.value = packet;
  renderCheckoutOrderPreview();

  const ready = isCartCheckoutConfigured();
  elements.checkoutReadyActions.hidden = !ready;
  elements.checkoutSetupNote.hidden = ready;
  elements.checkoutInstruction.hidden = !ready;
  elements.checkoutDialogTitle.textContent = ready
    ? "Your order details are ready."
    : "Your cart is ready and saved.";
  elements.checkoutDialogIntro.textContent = ready
    ? "We will copy the design details first, then open the secure hosted checkout page."
    : "Secure checkout is being connected. Copy your saved order details now, and this cart will still be here when payment goes live.";

  closeCartDrawer();
  if (elements.checkoutDialog?.showModal) elements.checkoutDialog.showModal();
  else showToast("Checkout details ready", "Copy the order details from the cart.");
}

function renderCheckoutOrderPreview() {
  elements.checkoutOrderPreview.replaceChildren();
  cart.forEach((item, index) => {
    const product = PRODUCT_BY_ID[item.productId];
    const row = document.createElement("div");
    const copy = document.createElement("span");
    const strong = document.createElement("strong");
    const small = document.createElement("small");
    const price = document.createElement("b");
    strong.textContent = `${index + 1}. ${item.design.city || "Custom map"}`;
    small.textContent = product.name;
    price.textContent = formatCurrency(product.price);
    copy.append(strong, small);
    row.append(copy, price);
    elements.checkoutOrderPreview.append(row);
  });
}

function createOrderReference() {
  const now = new Date();
  const date = [now.getUTCFullYear().toString().slice(-2), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `WIH-${date}-${random}`;
}

function buildOrderPacket(orderRef) {
  const lines = [
    `WHERE IT HAPPENED ORDER ${orderRef}`,
    `Items: ${cart.length}`,
    ""
  ];

  cart.forEach((item, index) => {
    const product = PRODUCT_BY_ID[item.productId];
    lines.push(`${index + 1}. ${product.name} — ${formatCurrency(product.price)}`);
    lines.push(`Place: ${item.design.city}, ${item.design.country}`);
    lines.push(`Style: ${THEMES[item.design.theme]?.label || item.design.theme} · ${FORMAT_LABELS[item.design.format] || item.design.format}`);
    lines.push(`Title: ${item.design.title || "Memory map"}`);
    lines.push(`Design link: ${buildShareUrl(item.design)}`);
    lines.push("");
  });

  const subtotal = cart.reduce((sum, item) => sum + (PRODUCT_BY_ID[item.productId]?.price || 0), 0);
  lines.push(`Subtotal: ${formatCurrency(subtotal)}`);
  lines.push("Please paste this complete block into the Design details field at checkout.");
  return lines.join("\n");
}

function buildPayhipCheckoutUrl(orderRef) {
  if (!isCartCheckoutConfigured()) return null;
  const url = new URL(STORE_CONFIG.payhipCheckoutBase);

  if (cart.length === 1) {
    url.searchParams.set("link", PRODUCT_BY_ID[cart[0].productId].payhipKey);
  } else {
    cart.forEach((item) => url.searchParams.append("cart_links[]", PRODUCT_BY_ID[item.productId].payhipKey));
  }

  url.searchParams.set("metadata[order_ref]", orderRef);
  url.searchParams.set("metadata[item_count]", String(cart.length));
  url.searchParams.set("metadata[source]", "where-it-happened");
  cart.slice(0, 6).forEach((item, index) => {
    const compact = `${item.productId}|${slugify(item.design.city || "place")}|${item.design.theme}|${item.design.format}|${item.designKey.slice(0, 24)}`;
    url.searchParams.set(`metadata[item_${index + 1}]`, compact.slice(0, 500));
  });
  return url.toString();
}

async function copyCurrentCheckoutPacket() {
  try {
    await copyText(elements.checkoutPacket.value);
    showToast("Order details copied", "Keep them with the order or paste them into checkout.");
  } catch (error) {
    console.error("Could not copy order details.", error);
    showToast("Copy failed", "Select the order details and copy them manually.", true);
  }
}

async function copyOrderAndOpenCheckout() {
  const checkoutUrl = buildPayhipCheckoutUrl(checkoutOrderRef);
  if (!checkoutUrl) {
    await copyCurrentCheckoutPacket();
    return;
  }

  // Open the tab during the original click gesture so strict pop-up blockers do not
  // discard the checkout after the asynchronous clipboard operation completes.
  const checkoutWindow = window.open("about:blank", "_blank");
  if (!checkoutWindow) {
    showToast("Pop-up blocked", "Allow pop-ups for this site, then continue to checkout again.", true);
    return;
  }
  checkoutWindow.opener = null;

  try {
    await copyText(elements.checkoutPacket.value);
    try {
      window.localStorage.setItem("where-it-happened.pending-order.v1", JSON.stringify({
        orderRef: checkoutOrderRef,
        cart,
        createdAt: Date.now()
      }));
    } catch {
      // The checkout can continue without pending-order storage.
    }

    checkoutWindow.location.replace(checkoutUrl);
    showToast("Secure checkout opened", "Paste the copied design details into the required checkout field.");
  } catch (error) {
    checkoutWindow.close();
    console.error("Checkout handoff failed.", error);
    showToast("Checkout did not open", "Copy the order details and try again.", true);
  }
}

function formatCurrency(amount) {
  return new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: "currency",
    currency: STORE_CONFIG.currency,
    maximumFractionDigits: 0
  }).format(amount);
}

function initializeMap() {
  if (!window.maplibregl) {
    showMapFallback();
    console.warn("MapLibre did not load; the designed offline fallback is active.");
    return;
  }

  try {
    map = new window.maplibregl.Map({
      container: "map",
      style: THEMES[state.theme].style,
      center: [state.centerLng, state.centerLat],
      zoom: state.zoom,
      preserveDrawingBuffer: true,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      maxPitch: 0,
      minZoom: 2,
      maxZoom: 18,
      fadeDuration: reducedMotion ? 0 : 200,
      maplibreLogo: false
    });

    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      mapIsUsable = true;
      hideMapFallback();
      installMapLayers();
      applyLabelVisibility();
      applyMarkerVisibility();
      window.clearTimeout(mapFailureTimer);
    });

    map.on("style.load", () => {
      mapIsUsable = true;
      hideMapFallback();
      installMapLayers();
      applyLabelVisibility();
      applyMarkerVisibility();
      map.resize();
    });

    map.on("idle", () => {
      mapIsUsable = true;
      hideMapFallback();
      window.clearTimeout(mapFailureTimer);
    });

    map.on("zoom", () => {
      const zoom = map.getZoom();
      state.zoom = clamp(zoom, 4, 16);
      elements.zoomRange.value = String(state.zoom);
      elements.zoomOutput.value = state.zoom.toFixed(1);
      elements.zoomOutput.textContent = state.zoom.toFixed(1);
    });

    map.on("moveend", () => {
      if (suppressMapStateUpdate) return;
      const center = map.getCenter();
      state.centerLat = center.lat;
      state.centerLng = center.lng;
      state.zoom = clamp(map.getZoom(), 4, 16);
      markAsEdited();
      scheduleSave();
    });

    map.on("error", (event) => {
      console.warn("Map resource error", event?.error ?? event);
    });

    mapFailureTimer = window.setTimeout(() => {
      if (!mapIsUsable) showMapFallback();
    }, 6500);
  } catch (error) {
    console.error("The map could not initialize.", error);
    showMapFallback();
  }
}

function installMapLayers() {
  if (!map || !map.isStyleLoaded()) return;
  const geojson = markerGeoJSON();

  if (!map.getSource("memory-marker")) {
    map.addSource("memory-marker", { type: "geojson", data: geojson });
  }

  const theme = THEMES[state.theme];

  if (!map.getLayer("memory-marker-halo")) {
    map.addLayer({
      id: "memory-marker-halo",
      type: "circle",
      source: "memory-marker",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 10, 13, 16, 20],
        "circle-color": theme.markerHalo,
        "circle-stroke-width": 0
      }
    });
  }

  if (!map.getLayer("memory-marker-dot")) {
    map.addLayer({
      id: "memory-marker-dot",
      type: "circle",
      source: "memory-marker",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.5, 10, 5, 16, 7],
        "circle-color": theme.marker,
        "circle-stroke-color": theme.background,
        "circle-stroke-width": 1.4
      }
    });
  }
}

function updateMarkerData() {
  if (!map || !map.isStyleLoaded()) return;
  installMapLayers();
  const source = map.getSource("memory-marker");
  source?.setData(markerGeoJSON());
  applyMarkerVisibility();
}

function markerGeoJSON() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Point", coordinates: [state.lng, state.lat] }
      }
    ]
  };
}

function applyMarkerVisibility() {
  if (!map || !map.isStyleLoaded()) return;
  ["memory-marker-halo", "memory-marker-dot"].forEach((layerId) => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", state.marker ? "visible" : "none");
  });
}

function applyLabelVisibility() {
  if (!map || !map.isStyleLoaded()) return;
  const layers = map.getStyle()?.layers ?? [];
  layers.forEach((layer) => {
    if (layer.type !== "symbol") return;
    try {
      map.setLayoutProperty(layer.id, "visibility", state.labels ? "visible" : "none");
    } catch {
      // Some styles expose immutable or transient layers; ignoring one keeps the map usable.
    }
  });
}

function showMapFallback() {
  elements.mapFallback.hidden = false;
}

function hideMapFallback() {
  elements.mapFallback.hidden = true;
}

function scheduleMapResize() {
  window.setTimeout(() => map?.resize(), 80);
  window.setTimeout(() => map?.resize(), 320);
}

function scheduleSave() {
  elements.autosaveStatus.textContent = "Saving draft…";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveDraft, 420);
}

function saveDraft() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    elements.autosaveStatus.textContent = "Draft saved locally";
  } catch (error) {
    console.warn("Could not save the local draft.", error);
    elements.autosaveStatus.textContent = "Local saving unavailable";
  }
}

function markAsEdited() {
  if (window.location.hash.startsWith(SHARED_HASH_PREFIX) && !hasEditedSharedState) {
    hasEditedSharedState = true;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
}

function openResetDialog() {
  if (elements.resetDialog?.showModal) {
    elements.resetDialog.showModal();
  } else if (window.confirm("Reset this design to the original London poster?")) {
    resetToDefault();
  }
}

function resetToDefault() {
  state = cloneDefaultState();
  hasEditedSharedState = false;
  window.localStorage.removeItem(STORAGE_KEY);
  if (window.location.hash.startsWith(SHARED_HASH_PREFIX)) {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }
  hydrateControlsFromState();
  renderAll({ updateMap: false });
  setMapStyle(state.theme, { jumpToLocation: true });
  scheduleSave();
  showToast("Design reset", "The original London draft is back.");
}

async function handleDownload() {
  setButtonBusy(elements.downloadPng, true, "Preparing preview…");
  document.body.classList.add("is-exporting");

  try {
    const canvas = await composePosterCanvas({ sizes: FREE_EXPORT_SIZES, watermark: true });
    const blob = await canvasToBlob(canvas, "image/png");
    const filename = `${slugify(state.city || "custom-place")}-${slugify(state.title || "memory-map")}-free-preview.png`;
    downloadBlob(blob, filename);
    showToast("Free preview downloaded", "Your watermarked proof is ready. Finished cart products are watermark-free.");
  } catch (error) {
    console.error("PNG export failed.", error);
    showToast("Export needs another try", "The map may still be loading. Wait a moment, then download again.", true);
  } finally {
    document.body.classList.remove("is-exporting");
    setButtonBusy(elements.downloadPng, false);
  }
}

async function handlePrint() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Pop-up blocked", "Allow pop-ups for this site, then try Print / PDF again.", true);
    return;
  }

  printWindow.document.write(`<!doctype html><html><head><title>Preparing memory map…</title></head><body style="font-family:system-ui;padding:40px;text-align:center">Preparing your poster…</body></html>`);
  setButtonBusy(elements.printPdf, true, "Preparing print…");

  try {
    const canvas = await composePosterCanvas({ sizes: FREE_EXPORT_SIZES, watermark: true });
    const blob = await canvasToBlob(canvas, "image/png");
    const objectUrl = URL.createObjectURL(blob);
    const pageOrientation = state.format === "square" ? "portrait" : state.format === "wallpaper" ? "portrait" : "portrait";

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(state.title || "Memory map")}</title>
          <style>
            @page { size: ${pageOrientation}; margin: 0; }
            html, body { margin: 0; background: #fff; }
            body { display: grid; min-height: 100vh; place-items: center; }
            img { display: block; width: 100%; height: 100vh; object-fit: contain; }
            @media print { img { height: 100vh; } }
          </style>
        </head>
        <body>
          <img src="${objectUrl}" alt="${escapeHtml(state.title || "Personalized memory map")}" />
          <script>
            const image = document.querySelector('img');
            image.addEventListener('load', () => setTimeout(() => window.print(), 180));
            window.addEventListener('afterprint', () => window.close());
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120000);
    showToast("Preview print view opened", "This proof includes the free-preview watermark. Finished print files are available in the cart.");
  } catch (error) {
    console.error("Print preparation failed.", error);
    printWindow.close();
    showToast("Print view could not open", "Wait for the map to finish loading, then try again.", true);
  } finally {
    setButtonBusy(elements.printPdf, false);
  }
}

async function handleShare() {
  const url = buildShareUrl();
  const shareData = {
    title: `${state.title || "A memory map"} — Where It Happened`,
    text: `A personalized map of ${state.city || "a meaningful place"}.`,
    url
  };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      showToast("Design shared", "The link restores this exact version.");
      return;
    }

    await copyText(url);
    showToast("Share link copied", "Anyone with the link can restore this design in their browser.");
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.error("Share failed.", error);
    showToast("Could not copy the link", "Select the address bar and copy the page URL manually.", true);
  }
}

function buildShareUrl(source = state) {
  const url = new URL(window.location.href);
  url.hash = `design=${encodeSharedState(source)}`;
  return url.toString();
}

function encodeSharedState(source) {
  const compact = {
    v: 1,
    o: source.occasion,
    i: source.locationId,
    c: source.city,
    r: source.country,
    p: [round(source.lat, 5), round(source.lng, 5)],
    e: [round(source.centerLat, 5), round(source.centerLng, 5)],
    z: round(source.zoom, 2),
    t: source.title,
    s: source.subtitle,
    d: source.date,
    k: source.kicker,
    n: source.dedication,
    h: source.theme,
    y: source.layout,
    f: source.format,
    m: source.marker ? 1 : 0,
    a: source.labels ? 1 : 0
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function parseSharedState(hash) {
  if (!hash?.startsWith(SHARED_HASH_PREFIX)) return null;
  try {
    let encoded = hash.slice(SHARED_HASH_PREFIX.length).replaceAll("-", "+").replaceAll("_", "/");
    while (encoded.length % 4) encoded += "=";
    const binary = window.atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const compact = JSON.parse(new TextDecoder().decode(bytes));
    return {
      version: compact.v,
      occasion: compact.o,
      locationId: compact.i,
      city: compact.c,
      country: compact.r,
      lat: compact.p?.[0],
      lng: compact.p?.[1],
      centerLat: compact.e?.[0],
      centerLng: compact.e?.[1],
      zoom: compact.z,
      title: compact.t,
      subtitle: compact.s,
      date: compact.d,
      kicker: compact.k,
      dedication: compact.n,
      theme: compact.h,
      layout: compact.y,
      format: compact.f,
      marker: compact.m === 1,
      labels: compact.a === 1
    };
  } catch (error) {
    console.warn("The shared design link was not valid.", error);
    return null;
  }
}

async function composePosterCanvas({ sizes = EXPORT_SIZES, watermark = false } = {}) {
  await waitForMapFrame();

  const { width, height } = sizes[state.format] ?? sizes.portrait;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  const theme = THEMES[state.theme];

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = theme.background;
  context.fillRect(0, 0, width, height);

  const inset = Math.round(Math.min(width, height) * 0.018);
  const art = { x: inset, y: inset, width: width - inset * 2, height: height - inset * 2 };

  if (state.layout === "classic") drawClassicExport(context, art, theme);
  else if (state.layout === "full") drawFullExport(context, art, theme);
  else drawMinimalExport(context, art, theme);

  context.strokeStyle = theme.line;
  context.lineWidth = Math.max(2, Math.round(width * 0.0014));
  context.strokeRect(art.x + 1, art.y + 1, art.width - 2, art.height - 2);
  drawAttribution(context, art, theme);
  if (watermark) drawPreviewWatermark(context, width, height, theme);
  return canvas;
}


function drawPreviewWatermark(context, width, height, theme) {
  const label = "FREE PREVIEW · WHERE IT HAPPENED";
  const fontSize = Math.max(18, Math.round(Math.min(width, height) * 0.024));
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate(-Math.PI / 7);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue("--sans") || "system-ui"}`;
  context.fillStyle = theme.overlayText || "#ffffff";
  context.globalAlpha = 0.2;
  [-height * 0.28, 0, height * 0.28].forEach((offset) => {
    context.fillText(label, 0, offset, width * 0.9);
  });
  context.restore();

  const ribbonHeight = Math.max(42, Math.round(height * 0.038));
  context.save();
  context.fillStyle = "rgba(15, 15, 15, 0.82)";
  context.fillRect(0, height - ribbonHeight, width, ribbonHeight);
  context.fillStyle = "#fffdf7";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(14, Math.round(ribbonHeight * 0.34))}px system-ui, sans-serif`;
  context.fillText("FREE WATERMARKED PROOF · FINISHED FILES AVAILABLE IN CART", width / 2, height - ribbonHeight / 2, width * 0.94);
  context.restore();
}

function drawClassicExport(context, art, theme) {
  const mapHeightRatio = state.format === "square" ? 0.7 : state.format === "wallpaper" ? 0.8 : 0.76;
  const mapRect = { x: art.x, y: art.y, width: art.width, height: Math.round(art.height * mapHeightRatio) };
  const copyRect = {
    x: art.x,
    y: art.y + mapRect.height,
    width: art.width,
    height: art.height - mapRect.height
  };

  drawMapOrFallback(context, mapRect, theme);
  context.fillStyle = theme.background;
  context.fillRect(copyRect.x, copyRect.y, copyRect.width, copyRect.height);

  const fade = context.createLinearGradient(0, mapRect.y + mapRect.height - art.height * 0.05, 0, mapRect.y + mapRect.height);
  fade.addColorStop(0, hexOrRgba(theme.background, 0));
  fade.addColorStop(1, theme.background);
  context.fillStyle = fade;
  context.fillRect(mapRect.x, mapRect.y + mapRect.height - art.height * 0.055, mapRect.width, art.height * 0.06);

  drawCopyBlock(context, copyRect, theme, {
    titleScale: state.format === "wallpaper" ? 0.052 : state.format === "square" ? 0.057 : 0.061,
    overlay: false
  });
}

function drawFullExport(context, art, theme) {
  drawMapOrFallback(context, art, theme);
  const gradient = context.createLinearGradient(0, art.y + art.height * 0.42, 0, art.y + art.height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.68, "rgba(0,0,0,0.28)");
  gradient.addColorStop(1, darkenForOverlay(theme.background, 0.88));
  context.fillStyle = gradient;
  context.fillRect(art.x, art.y, art.width, art.height);

  const copyRect = {
    x: art.x + art.width * 0.07,
    y: art.y + art.height * 0.66,
    width: art.width * 0.86,
    height: art.height * 0.27
  };
  drawCopyBlock(context, copyRect, { ...theme, text: theme.overlayText }, { titleScale: 0.066, overlay: true });
}

function drawMinimalExport(context, art, theme) {
  drawMapOrFallback(context, art, theme);
  const borderWidth = Math.round(Math.min(art.width, art.height) * 0.045);
  context.strokeStyle = theme.background;
  context.lineWidth = borderWidth;
  context.strokeRect(art.x + borderWidth / 2, art.y + borderWidth / 2, art.width - borderWidth, art.height - borderWidth);
  context.strokeStyle = theme.line;
  context.lineWidth = Math.max(2, borderWidth * 0.035);
  context.strokeRect(art.x + borderWidth, art.y + borderWidth, art.width - borderWidth * 2, art.height - borderWidth * 2);

  const copyWidth = art.width * (state.format === "wallpaper" ? 0.78 : 0.76);
  const copyHeight = art.height * (state.format === "square" ? 0.2 : 0.17);
  const copyRect = {
    x: art.x + (art.width - copyWidth) / 2,
    y: art.y + art.height - copyHeight - borderWidth * 0.82,
    width: copyWidth,
    height: copyHeight
  };

  context.fillStyle = colorWithAlpha(theme.background, 0.94);
  context.fillRect(copyRect.x, copyRect.y, copyRect.width, copyRect.height);
  context.strokeStyle = theme.line;
  context.lineWidth = Math.max(2, art.width * 0.0012);
  context.strokeRect(copyRect.x, copyRect.y, copyRect.width, copyRect.height);
  drawCopyBlock(context, copyRect, theme, { titleScale: 0.045, minimal: true });
}

function drawMapOrFallback(context, rect, theme) {
  const mapCanvas = map?.getCanvas?.();
  if (mapIsUsable && mapCanvas?.width && mapCanvas?.height) {
    try {
      drawImageCover(context, mapCanvas, rect.x, rect.y, rect.width, rect.height);
      return;
    } catch (error) {
      console.warn("The live map canvas could not be copied; using the vector fallback.", error);
    }
  }
  drawFallbackMap(context, rect, theme);
}

function drawFallbackMap(context, rect, theme) {
  context.save();
  context.beginPath();
  context.rect(rect.x, rect.y, rect.width, rect.height);
  context.clip();
  context.fillStyle = theme.background;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  const roadColor = theme.text;
  context.lineCap = "round";
  const paths = [
    [[-0.08, 0.18], [0.18, 0.27], [0.36, 0.16], [0.55, 0.29], [0.82, 0.22], [1.08, 0.35]],
    [[-0.06, 0.52], [0.16, 0.42], [0.35, 0.58], [0.56, 0.47], [0.79, 0.43], [1.05, 0.57]],
    [[0.14, -0.06], [0.17, 0.2], [0.23, 0.46], [0.2, 0.72], [0.29, 1.07]],
    [[0.64, -0.04], [0.57, 0.21], [0.63, 0.42], [0.58, 0.68], [0.67, 1.06]],
    [[-0.03, 0.78], [0.22, 0.69], [0.45, 0.83], [0.68, 0.71], [1.04, 0.79]]
  ];

  paths.forEach((points, index) => {
    context.beginPath();
    points.forEach(([x, y], pointIndex) => {
      const px = rect.x + x * rect.width;
      const py = rect.y + y * rect.height;
      if (pointIndex === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.strokeStyle = colorWithAlpha(roadColor, index < 2 ? 0.44 : 0.24);
    context.lineWidth = Math.max(2, rect.width * (index < 2 ? 0.002 : 0.0013));
    context.stroke();
  });

  if (state.marker) {
    const x = rect.x + rect.width * 0.55;
    const y = rect.y + rect.height * 0.48;
    context.beginPath();
    context.fillStyle = theme.markerHalo;
    context.arc(x, y, rect.width * 0.022, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.fillStyle = theme.marker;
    context.arc(x, y, rect.width * 0.006, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawCopyBlock(context, rect, theme, options = {}) {
  const centerX = rect.x + rect.width / 2;
  const base = Math.min(rect.width, rect.height);
  const textColor = theme.text;
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = textColor;

  if (!options.minimal && state.kicker.trim()) {
    const kickerSize = Math.max(13, base * 0.045);
    context.font = `700 ${kickerSize}px Arial, sans-serif`;
    drawLetterSpacedText(context, state.kicker.toUpperCase(), centerX, rect.y + rect.height * 0.18, kickerSize * 0.34, rect.width * 0.84);
  }

  const preferredTitleSize = Math.max(34, rect.width * (options.titleScale ?? 0.06));
  const titleY = rect.y + rect.height * (options.minimal ? 0.35 : 0.42);
  const titleSpace = options.minimal ? rect.width * 0.84 : rect.width * 0.88;
  drawFittedTitle(context, (state.title.trim() || "YOUR MEMORY").toUpperCase(), centerX, titleY, titleSpace, preferredTitleSize, textColor);

  const subtitleY = rect.y + rect.height * (options.minimal ? 0.63 : 0.66);
  const subtitleSize = Math.max(12, base * 0.043);
  context.fillStyle = textColor;
  context.font = `700 ${subtitleSize}px Arial, sans-serif`;
  drawLetterSpacedText(context, (state.subtitle.trim() || coordinatesLabel()).toUpperCase(), centerX, subtitleY, subtitleSize * 0.24, rect.width * 0.84);

  if (state.date.trim()) {
    const dateSize = Math.max(10, base * 0.032);
    context.globalAlpha = 0.72;
    context.font = `500 ${dateSize}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    drawLetterSpacedText(context, state.date.toUpperCase(), centerX, rect.y + rect.height * (options.minimal ? 0.79 : 0.77), dateSize * 0.18, rect.width * 0.8);
    context.globalAlpha = 1;
  }

  if (!options.minimal && state.dedication.trim() && state.format !== "wallpaper") {
    const dedicationSize = Math.max(13, base * 0.043);
    context.globalAlpha = 0.72;
    context.font = `italic ${dedicationSize}px Georgia, serif`;
    context.fillText(ellipsizeForCanvas(context, state.dedication, rect.width * 0.78), centerX, rect.y + rect.height * 0.88);
    context.globalAlpha = 1;
  }

  context.restore();
}

function drawFittedTitle(context, text, centerX, centerY, maxWidth, preferredSize, color) {
  let size = preferredSize;
  const spacingRatio = 0.12;
  context.fillStyle = color;

  while (size > 25) {
    context.font = `500 ${size}px Georgia, serif`;
    const measured = measureLetterSpacedText(context, text, size * spacingRatio);
    if (measured <= maxWidth) break;
    size -= 2;
  }

  if (measureLetterSpacedText(context, text, size * spacingRatio) <= maxWidth) {
    drawLetterSpacedText(context, text, centerX, centerY, size * spacingRatio, maxWidth);
    return;
  }

  const words = text.split(/\s+/);
  if (words.length < 2) {
    drawLetterSpacedText(context, ellipsizeForCanvas(context, text, maxWidth), centerX, centerY, size * 0.05, maxWidth);
    return;
  }

  let bestSplit = 1;
  let smallestMax = Infinity;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const width = Math.max(
      measureLetterSpacedText(context, first, size * 0.08),
      measureLetterSpacedText(context, second, size * 0.08)
    );
    if (width < smallestMax) {
      smallestMax = width;
      bestSplit = index;
    }
  }

  const lineOne = words.slice(0, bestSplit).join(" ");
  const lineTwo = words.slice(bestSplit).join(" ");
  while (size > 23 && smallestMax > maxWidth) {
    size -= 1;
    context.font = `500 ${size}px Georgia, serif`;
    smallestMax = Math.max(
      measureLetterSpacedText(context, lineOne, size * 0.08),
      measureLetterSpacedText(context, lineTwo, size * 0.08)
    );
  }
  const lineGap = size * 1.02;
  drawLetterSpacedText(context, lineOne, centerX, centerY - lineGap * 0.48, size * 0.08, maxWidth);
  drawLetterSpacedText(context, lineTwo, centerX, centerY + lineGap * 0.48, size * 0.08, maxWidth);
}

function drawAttribution(context, art, theme) {
  context.save();
  context.fillStyle = theme.text;
  context.globalAlpha = 0.52;
  context.textAlign = "center";
  context.textBaseline = "alphabetic";
  context.font = `${Math.max(9, art.width * 0.007)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  context.fillText("OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors", art.x + art.width / 2, art.y + art.height - art.height * 0.008);
  context.restore();
}

function drawLetterSpacedText(context, text, centerX, y, spacing, maxWidth = Infinity) {
  let rendered = text;
  while (rendered.length > 1 && measureLetterSpacedText(context, rendered, spacing) > maxWidth) {
    rendered = `${rendered.slice(0, -2).trimEnd()}…`;
  }
  const width = measureLetterSpacedText(context, rendered, spacing);
  let x = centerX - width / 2;
  for (const character of rendered) {
    context.fillText(character, x, y);
    x += context.measureText(character).width + spacing;
  }
}

function measureLetterSpacedText(context, text, spacing) {
  return [...text].reduce((total, character, index) => {
    return total + context.measureText(character).width + (index < text.length - 1 ? spacing : 0);
  }, 0);
}

function ellipsizeForCanvas(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result.trimEnd()}…`;
}

function drawImageCover(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  let sourceX = 0;
  let sourceY = 0;

  if (imageRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sourceX = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sourceY = (image.height - sourceHeight) / 2;
  }

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

async function waitForMapFrame() {
  if (!map || !mapIsUsable) {
    await nextFrames(2);
    return;
  }
  map.triggerRepaint();
  await Promise.race([
    new Promise((resolve) => map.once("render", resolve)),
    new Promise((resolve) => window.setTimeout(resolve, 900))
  ]);
  await nextFrames(2);
}

function nextFrames(count = 1) {
  return new Promise((resolve) => {
    const step = () => {
      count -= 1;
      if (count <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function setButtonBusy(button, busy, label = "") {
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
  }
}

function showToast(title, message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " is-error" : ""}`;
  toast.setAttribute("role", isError ? "alert" : "status");

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = isError ? "!" : "✓";

  const copy = document.createElement("div");
  const strong = document.createElement("strong");
  const paragraph = document.createElement("p");
  strong.textContent = title;
  paragraph.textContent = message;
  copy.append(strong, paragraph);
  toast.append(icon, copy);
  elements.toastRegion.append(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 210);
  }, 4200);
}

function locationDisplayName() {
  return state.locationId === "custom" ? "Custom coordinates" : `${state.city}, ${state.country}`;
}

function coordinatesLabel(lat = state.lat, lng = state.lng) {
  const latDirection = lat >= 0 ? "N" : "S";
  const lngDirection = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${latDirection} · ${Math.abs(lng).toFixed(4)}° ${lngDirection}`;
}

function formatSubtitle(city, country) {
  return `${city} · ${country}`.toLocaleUpperCase();
}

function normalizeSearch(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function defaultZoomForCity(cityId) {
  const widerCities = new Set(["los-angeles", "new-york", "london", "tokyo", "delhi", "mumbai", "sao-paulo", "mexico-city"]);
  return widerCities.has(cityId) ? 10.1 : 10.7;
}

function slugify(value) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "memory-map";
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser did not create an image blob."));
    }, type, 0.96);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command failed.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function colorWithAlpha(color, alpha) {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
    const integer = Number.parseInt(normalized, 16);
    const red = (integer >> 16) & 255;
    const green = (integer >> 8) & 255;
    const blue = integer & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return color;
}

function hexOrRgba(color, alpha) {
  return colorWithAlpha(color, alpha);
}

function darkenForOverlay(color, alpha) {
  if (!color.startsWith("#")) return `rgba(0,0,0,${alpha})`;
  const hex = color.slice(1);
  const integer = Number.parseInt(hex, 16);
  const red = Math.round(((integer >> 16) & 255) * 0.32);
  const green = Math.round(((integer >> 8) & 255) * 0.32);
  const blue = Math.round((integer & 255) * 0.32);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(...args), wait);
  };
}
