import "./atelier.js";
import { CITIES, CITY_BY_ID } from "./cities.js";
import { initCommerce } from "./commerce.js";

const STORAGE_KEY = "where-it-happened.design.v1";
const SHARED_HASH_PREFIX = "#design=";
const MAP_STYLE_BASE = "https://tiles.openfreemap.org/styles/";
const MAPLIBRE_VERSION = "5.24.0";
const MAPLIBRE_SCRIPT_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
const MAPLIBRE_STYLE_URL = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const MAPLIBRE_LOAD_TIMEOUT_MS = 12000;
const WIKIPEDIA_SEARCH_ENDPOINT = "https://en.wikipedia.org/w/api.php";

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
  portrait: { width: 2400, height: 3000 },
  square: { width: 2800, height: 2800 },
  wallpaper: { width: 2160, height: 3840 }
};

const PREVIEW_EXPORT_SIZES = {
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
let mapLibraryPromise = null;
let mapReadyPromise = null;
let mapReadyResolve = null;
let mapInitializationObserver = null;
let activeLocationIndex = -1;
let locationResults = [];
let globalSearchTimer = null;
let globalSearchController = null;
let locationSearchSequence = 0;
const globalLocationCache = new Map();
let saveTimer = null;
let hasEditedSharedState = false;
let suppressMapStateUpdate = false;

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
  locationSearchStatus: $("#locationSearchStatus"),
  useMyLocation: $("#useMyLocation"),
  heroPlaceSearchForm: $("#heroPlaceSearchForm"),
  heroPlaceSearch: $("#heroPlaceSearch"),
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
  toastRegion: $("#toastRegion")
};

boot();

function boot() {
  hydrateControlsFromState();
  bindEvents();
  renderAll({ updateMap: false });
  scheduleMapInitialization();
  initCommerce({
    getDesignState: () => JSON.parse(JSON.stringify(state)),
    getDesignUrl: buildShareUrl,
    loadDesignState: restoreDesignFromCart,
    showToast,
    scrollToCreator: () => scrollToElement($("#creator"))
  });

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
      void ensureMapInitialized();
      scrollToElement($("#creator"));
    });
  });

  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const id = anchor.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      scrollToElement(target, { forceInstant: anchor.classList.contains("skip-link") });
      if (anchor.classList.contains("skip-link")) {
        target.tabIndex = -1;
        window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
      }
    });
  });

  elements.locationSearch.addEventListener("focus", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("input", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("keydown", handleLocationKeydown);
  elements.locationSearch.addEventListener("blur", () => {
    window.setTimeout(closeLocationOptions, 130);
  });

  elements.locationOptions.addEventListener("mousedown", (event) => event.preventDefault());
  elements.locationOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-location-key]");
    if (option) selectLocationResult(option.dataset.locationKey);
  });

  elements.clearLocation.addEventListener("click", () => {
    elements.locationSearch.value = "";
    elements.locationSearch.focus();
    renderLocationOptions("");
  });

  elements.heroPlaceSearchForm?.addEventListener("submit", handleHeroPlaceSearch);
  elements.useMyLocation?.addEventListener("click", useBrowserLocation);
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

  window.addEventListener("resize", debounce(() => map?.resize(), 150));
  window.addEventListener("beforeunload", saveDraft);
}

function restoreDesignFromCart(snapshot) {
  state = sanitizeState(snapshot);
  hasEditedSharedState = true;
  history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  hydrateControlsFromState();
  renderAll({ updateMap: false });
  setMapStyle(state.theme, { jumpToLocation: true });
  scheduleSave();
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
    locationId: typeof source.locationId === "string" ? source.locationId.slice(0, 120) : locationFromId?.id ?? "custom",
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
  if (state.locationId === "custom" || state.locationId === "browser-location") {
    elements.selectedLocationText.textContent = `Selected: ${state.city} · ${state.lat.toFixed(4)}, ${state.lng.toFixed(4)}`;
  } else if (state.locationId?.startsWith("wiki:")) {
    elements.selectedLocationText.textContent = `Selected: ${state.city} · Wikipedia place`;
  } else {
    elements.selectedLocationText.textContent = `Selected: ${state.city}, ${state.country}`;
  }
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
  if (!map) {
    void ensureMapInitialized();
    return;
  }
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

function handleHeroPlaceSearch(event) {
  event.preventDefault();
  const query = elements.heroPlaceSearch?.value.trim() || "";
  if (query.length < 2) {
    showToast("Enter a place", "Try a city, country, neighborhood, or landmark.", true);
    elements.heroPlaceSearch?.focus();
    return;
  }

  void ensureMapInitialized();
  scrollToElement($("#creator"));
  elements.locationSearch.value = query;
  window.setTimeout(() => {
    elements.locationSearch.focus();
    renderLocationOptions(query);
  }, reducedMotion ? 20 : 520);
}

function renderLocationOptions(query = "") {
  const rawQuery = String(query).trim();
  const normalized = normalizeSearch(rawQuery);
  const localResults = CITIES.filter((city) => {
    if (!normalized) return true;
    const haystack = normalizeSearch(`${city.city} ${city.country} ${city.countryCode}`);
    return haystack.includes(normalized);
  })
    .slice(0, normalized ? 8 : 10)
    .map((city) => ({
      key: `city:${city.id}`,
      source: "built-in",
      id: city.id,
      city: city.city,
      detail: city.country,
      countryCode: city.countryCode,
      lat: city.lat,
      lng: city.lng
    }));

  locationResults = localResults;
  activeLocationIndex = locationResults.length ? 0 : -1;
  const shouldSearchGlobally = normalized.length >= 3;
  renderLocationResultList({ loading: shouldSearchGlobally });

  elements.locationOptions.hidden = false;
  elements.locationSearch.setAttribute("aria-expanded", "true");
  updateActiveLocationDescendant();

  window.clearTimeout(globalSearchTimer);
  globalSearchController?.abort();
  const searchSequence = ++locationSearchSequence;

  if (!shouldSearchGlobally) {
    elements.locationSearchStatus.textContent = "Built-in cities are instant. Type at least three characters for global landmark search.";
    return;
  }

  const cached = globalLocationCache.get(normalized);
  if (cached) {
    mergeGlobalLocationResults(cached, searchSequence, normalized);
    return;
  }

  elements.locationSearchStatus.textContent = "Searching notable places worldwide…";
  globalSearchTimer = window.setTimeout(() => searchGlobalLocations(rawQuery, normalized, searchSequence), 360);
}

function renderLocationResultList({ loading = false, failed = false } = {}) {
  elements.locationOptions.replaceChildren();

  if (!locationResults.length && !loading) {
    const empty = document.createElement("p");
    empty.className = "empty-option";
    empty.textContent = failed
      ? "Global search is temporarily unavailable. Try a built-in city or exact coordinates."
      : "No place matched. Try a broader spelling or open Advanced location for exact coordinates.";
    elements.locationOptions.append(empty);
  }

  locationResults.forEach((result, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `combobox-option${index === activeLocationIndex ? " is-active" : ""}`;
    option.id = locationOptionId(result.key);
    option.dataset.locationKey = result.key;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(result.key === currentLocationKey()));

    const text = document.createElement("span");
    const placeName = document.createElement("strong");
    const detail = document.createElement("small");
    placeName.textContent = result.city;
    detail.textContent = result.detail;
    text.append(placeName, detail);

    const source = document.createElement("span");
    source.className = "location-source";
    source.textContent = result.source === "wikipedia" ? "Wiki" : result.countryCode;
    option.append(text, source);
    elements.locationOptions.append(option);
  });

  if (loading) {
    const loadingMessage = document.createElement("p");
    loadingMessage.className = "searching-option";
    loadingMessage.textContent = "Looking for landmarks and places beyond the built-in city list…";
    elements.locationOptions.append(loadingMessage);
  } else if (locationResults.some((result) => result.source === "wikipedia")) {
    const sourceNote = document.createElement("p");
    sourceNote.className = "location-source-note";
    sourceNote.textContent = "Global place results are provided by Wikipedia and may represent cities, neighborhoods, or landmarks.";
    elements.locationOptions.append(sourceNote);
  }
}

async function searchGlobalLocations(rawQuery, normalized, searchSequence) {
  globalSearchController = new AbortController();
  const parameters = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: rawQuery,
    gsrlimit: "15",
    gsrnamespace: "0",
    prop: "coordinates|extracts",
    colimit: "max",
    exintro: "1",
    explaintext: "1",
    exsentences: "1",
    exlimit: "max",
    redirects: "1"
  });

  try {
    const response = await fetch(`${WIKIPEDIA_SEARCH_ENDPOINT}?${parameters}`, {
      signal: globalSearchController.signal,
      headers: {
        "Api-User-Agent": "WhereItHappened/1.1 (https://github.com/yashumani/where-it-happened)"
      }
    });
    if (!response.ok) throw new Error(`Wikipedia search returned ${response.status}`);
    const payload = await response.json();
    const pages = Object.values(payload?.query?.pages || {});
    const globalResults = pages
      .map((page) => {
        const coordinate = page.coordinates?.[0];
        if (!coordinate || !Number.isFinite(Number(coordinate.lat)) || !Number.isFinite(Number(coordinate.lon))) return null;
        return {
          key: `wiki:${page.pageid}`,
          source: "wikipedia",
          id: String(page.pageid),
          city: String(page.title || rawQuery).slice(0, 80),
          detail: summarizeWikipediaExtract(page.extract),
          countryCode: "Wiki",
          lat: Number(coordinate.lat),
          lng: Number(coordinate.lon)
        };
      })
      .filter(Boolean)
      .slice(0, 8);

    globalLocationCache.set(normalized, globalResults);
    mergeGlobalLocationResults(globalResults, searchSequence, normalized);
  } catch (error) {
    if (error?.name === "AbortError") return;
    console.warn("Global place search could not load.", error);
    if (searchSequence !== locationSearchSequence || normalizeSearch(elements.locationSearch.value) !== normalized) return;
    renderLocationResultList({ failed: true });
    elements.locationSearchStatus.textContent = "Global search is offline; built-in city search and exact coordinates still work.";
  }
}

function mergeGlobalLocationResults(globalResults, searchSequence, normalized) {
  if (searchSequence !== locationSearchSequence || normalizeSearch(elements.locationSearch.value) !== normalized) return;
  const localResults = locationResults.filter((result) => result.source === "built-in");
  const existingNames = new Set(localResults.map((result) => normalizeSearch(result.city)));
  const uniqueGlobalResults = globalResults.filter((result) => !existingNames.has(normalizeSearch(result.city)));
  locationResults = [...localResults, ...uniqueGlobalResults].slice(0, 12);
  activeLocationIndex = locationResults.length ? 0 : -1;
  renderLocationResultList();
  updateActiveLocationDescendant();
  elements.locationSearchStatus.textContent = uniqueGlobalResults.length
    ? `Found ${locationResults.length} place option${locationResults.length === 1 ? "" : "s"}. Wikipedia supplies the global landmark results.`
    : "The closest matches are in the built-in city list.";
}

function summarizeWikipediaExtract(value) {
  const cleaned = String(value || "Notable place found through Wikipedia")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = cleaned.split(/(?<=[.!?])\s/)[0] || cleaned;
  return sentence.length > 108 ? `${sentence.slice(0, 105).trimEnd()}…` : sentence;
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
    selectLocationResult(locationResults[activeLocationIndex].key);
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
  const active = locationResults[activeLocationIndex];
  if (active) elements.locationSearch.setAttribute("aria-activedescendant", locationOptionId(active.key));
  else elements.locationSearch.removeAttribute("aria-activedescendant");
}

function locationOptionId(key) {
  return `location-option-${String(key).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function currentLocationKey() {
  if (state.locationId?.startsWith("wiki:")) return state.locationId;
  if (CITY_BY_ID[state.locationId]) return `city:${state.locationId}`;
  return state.locationId;
}

function closeLocationOptions() {
  elements.locationOptions.hidden = true;
  elements.locationSearch.setAttribute("aria-expanded", "false");
  elements.locationSearch.removeAttribute("aria-activedescendant");
}

function selectLocationResult(key) {
  const result = locationResults.find((candidate) => candidate.key === key);
  if (!result) return;
  if (result.source === "built-in") {
    selectCity(result.id);
    return;
  }
  selectGlobalPlace(result);
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

function selectGlobalPlace(result) {
  state.locationId = result.key;
  state.city = result.city;
  state.country = "Wikipedia place";
  state.lat = result.lat;
  state.lng = result.lng;
  state.centerLat = result.lat;
  state.centerLng = result.lng;
  state.zoom = 13.2;
  state.subtitle = result.city.toLocaleUpperCase();
  elements.locationSearch.value = result.city;
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
      center: [result.lng, result.lat],
      zoom: state.zoom,
      duration: reducedMotion ? 0 : 900,
      essential: true
    });
    window.setTimeout(() => {
      suppressMapStateUpdate = false;
    }, reducedMotion ? 20 : 950);
  }

  scheduleSave();
  showToast("Place selected", `${result.city} · global landmark search`);
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    showToast("Location unavailable", "This browser does not provide device location. Use search or exact coordinates instead.", true);
    return;
  }

  elements.useMyLocation.disabled = true;
  elements.useMyLocation.textContent = "Finding location…";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      state.locationId = "browser-location";
      state.city = "My location";
      state.country = "Browser location";
      state.lat = lat;
      state.lng = lng;
      state.centerLat = lat;
      state.centerLng = lng;
      state.zoom = 13.4;
      state.subtitle = coordinatesLabel(lat, lng);
      elements.locationSearch.value = "My current location";
      elements.subtitleInput.value = state.subtitle;
      elements.zoomRange.value = String(state.zoom);
      elements.zoomOutput.value = state.zoom.toFixed(1);
      elements.zoomOutput.textContent = state.zoom.toFixed(1);
      markAsEdited();
      renderPosterText();
      renderLocationSummary();
      renderPosterClasses();
      updateMarkerData();
      map?.flyTo({ center: [lng, lat], zoom: state.zoom, duration: reducedMotion ? 0 : 900, essential: true });
      scheduleSave();
      showToast("Location found", "Fine-tune the map by dragging it inside the poster.");
      elements.useMyLocation.disabled = false;
      elements.useMyLocation.textContent = "Use my location";
    },
    (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location permission was not granted. Search a place or use exact coordinates instead."
        : "Your location could not be determined. Search a place or use exact coordinates instead.";
      showToast("Could not use your location", message, true);
      elements.useMyLocation.disabled = false;
      elements.useMyLocation.textContent = "Use my location";
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
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

function scheduleMapInitialization() {
  const creator = $("#creator");
  const prewarm = () => void ensureMapInitialized();

  document.querySelectorAll('a[href="#creator"], [data-example], #heroPlaceSearchForm').forEach((element) => {
    element.addEventListener("pointerenter", prewarm, { once: true, passive: true });
    element.addEventListener("focusin", prewarm, { once: true });
    element.addEventListener("click", prewarm, { once: true });
  });

  if (!creator || !("IntersectionObserver" in window)) {
    window.setTimeout(prewarm, 900);
    return;
  }

  mapInitializationObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      mapInitializationObserver?.disconnect();
      mapInitializationObserver = null;
      prewarm();
    },
    { rootMargin: "1400px 0px", threshold: 0 }
  );
  mapInitializationObserver.observe(creator);
}

async function ensureMapInitialized() {
  if (map && mapReadyPromise) return mapReadyPromise;
  if (mapLibraryPromise) return mapLibraryPromise;

  setMapFallbackState("loading");
  mapLibraryPromise = Promise.allSettled([
    loadExternalStylesheet(MAPLIBRE_STYLE_URL),
    loadExternalScript(MAPLIBRE_SCRIPT_URL)
  ])
    .then((results) => {
      const scriptResult = results[1];
      if (scriptResult.status === "rejected" || !window.maplibregl) {
        throw scriptResult.status === "rejected" ? scriptResult.reason : new Error("MapLibre did not initialize.");
      }
      if (!map && !initializeMap()) throw new Error("The live map could not be created.");
      return mapReadyPromise || true;
    })
    .catch((error) => {
      console.warn("The live map could not load; the vector fallback remains available.", error);
      mapLibraryPromise = null;
      setMapFallbackState("error");
      return false;
    });

  return mapLibraryPromise;
}

function loadExternalScript(source) {
  if (window.maplibregl) return Promise.resolve();
  const existing = document.querySelector(`script[src="${source}"]`);
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      script.dataset.loaded = "true";
      resolve();
    };
    const handleError = () => {
      cleanup();
      if (!existing) script.remove();
      reject(new Error(`Could not load ${source}`));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    timeout = window.setTimeout(handleError, MAPLIBRE_LOAD_TIMEOUT_MS);
    if (!existing) {
      script.src = source;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.append(script);
    }
  });
}

function loadExternalStylesheet(source) {
  const existing = document.querySelector(`link[rel="stylesheet"][href="${source}"]`);
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = existing || document.createElement("link");
    let timeout = 0;
    const cleanup = () => {
      window.clearTimeout(timeout);
      link.removeEventListener("load", handleLoad);
      link.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      link.dataset.loaded = "true";
      resolve();
    };
    const handleError = () => {
      cleanup();
      if (!existing) link.remove();
      reject(new Error(`Could not load ${source}`));
    };

    link.addEventListener("load", handleLoad, { once: true });
    link.addEventListener("error", handleError, { once: true });
    timeout = window.setTimeout(handleError, MAPLIBRE_LOAD_TIMEOUT_MS);
    if (!existing) {
      link.rel = "stylesheet";
      link.href = source;
      link.crossOrigin = "anonymous";
      document.head.append(link);
    }
  });
}

function initializeMap() {
  if (!window.maplibregl || map) return Boolean(map);

  mapReadyPromise = new Promise((resolve) => {
    mapReadyResolve = resolve;
  });
  const settleReady = (ready) => {
    const resolve = mapReadyResolve;
    mapReadyResolve = null;
    if (resolve) resolve(ready);
    mapReadyPromise = Promise.resolve(ready);
  };

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
      settleReady(true);
    });

    map.on("style.load", () => {
      mapIsUsable = true;
      hideMapFallback();
      installMapLayers();
      applyLabelVisibility();
      applyMarkerVisibility();
      map.resize();
      settleReady(true);
    });

    map.on("idle", () => {
      mapIsUsable = true;
      hideMapFallback();
      window.clearTimeout(mapFailureTimer);
      settleReady(true);
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
      if (mapIsUsable) return;
      setMapFallbackState("error");
      settleReady(false);
    }, 8000);
    return true;
  } catch (error) {
    console.error("The map could not initialize.", error);
    setMapFallbackState("error");
    settleReady(false);
    map = null;
    return false;
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

function setMapFallbackState(mode = "error") {
  if (!elements.mapFallback) return;
  const strong = elements.mapFallback.querySelector("strong");
  const detail = elements.mapFallback.querySelector("span");
  elements.mapFallback.dataset.state = mode;
  elements.mapFallback.hidden = false;
  if (mode === "loading") {
    if (strong) strong.textContent = "Loading the live map";
    if (detail) detail.textContent = "The editor is ready while map resources connect.";
  } else {
    if (strong) strong.textContent = "Map preview is offline";
    if (detail) detail.textContent = "Your words and layout are still ready. Reconnect to load the live map.";
  }
}

function showMapFallback() {
  setMapFallbackState("error");
}

function hideMapFallback() {
  if (!elements.mapFallback) return;
  elements.mapFallback.hidden = true;
  delete elements.mapFallback.dataset.state;
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
  setButtonBusy(elements.downloadPng, true, "Preparing PNG…");
  document.body.classList.add("is-exporting");

  try {
    await ensureMapInitialized();
    const canvas = await composePosterCanvas({ preview: true });
    const blob = await canvasToBlob(canvas, "image/png");
    const filename = `${slugify(state.city || "custom-place")}-${slugify(state.title || "memory-map")}-preview.png`;
    downloadBlob(blob, filename);
    showToast("Free preview downloaded", `${filename} includes a light preview watermark.`);
  } catch (error) {
    console.error("PNG export failed.", error);
    showToast("Export needs another try", "The map may still be loading. Wait a moment, then download again.", true);
  } finally {
    document.body.classList.remove("is-exporting");
    setButtonBusy(elements.downloadPng, false);
  }
}

async function handlePrint() {
  const mapReady = ensureMapInitialized();
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Pop-up blocked", "Allow pop-ups for this site, then try Print / PDF again.", true);
    return;
  }

  printWindow.document.write(`<!doctype html><html><head><title>Preparing memory map…</title></head><body style="font-family:system-ui;padding:40px;text-align:center">Preparing your poster…</body></html>`);
  setButtonBusy(elements.printPdf, true, "Preparing print…");

  try {
    await mapReady;
    const canvas = await composePosterCanvas({ preview: true });
    const blob = await canvasToBlob(canvas, "image/png");
    const objectUrl = URL.createObjectURL(blob);
    const pageSize = {
      portrait: "8in 10in",
      square: "10in 10in",
      wallpaper: "9in 16in"
    }[state.format] || "8in 10in";

    printWindow.document.open();
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(state.title || "Memory map")}</title>
          <style>
            @page { size: ${pageSize}; margin: 0; }
            html, body { width: 100%; height: 100%; margin: 0; background: #fff; }
            body { display: grid; place-items: center; }
            img { display: block; width: 100%; height: 100%; object-fit: contain; }
          </style>
        </head>
        <body>
          <img src="${objectUrl}" alt="${escapeHtml(state.title || "Personalized memory map")}" />
        </body>
      </html>
    `);
    printWindow.document.close();

    const image = printWindow.document.querySelector("img");
    const releaseObjectUrl = () => URL.revokeObjectURL(objectUrl);
    const openPrintDialog = () => printWindow.setTimeout(() => printWindow.print(), 180);
    if (image?.complete) openPrintDialog();
    else image?.addEventListener("load", openPrintDialog, { once: true });
    printWindow.addEventListener("afterprint", () => {
      releaseObjectUrl();
      printWindow.close();
    }, { once: true });
    window.setTimeout(releaseObjectUrl, 600000);
    showToast("Print preview opened", "Choose “Save as PDF” in your browser’s print dialog. The free version is watermarked.");
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

function buildShareUrl() {
  const url = new URL(window.location.href);
  url.hash = `design=${encodeSharedState(state)}`;
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

async function composePosterCanvas({ preview = false } = {}) {
  await waitForMapFrame();

  const { width, height } = (preview ? PREVIEW_EXPORT_SIZES : EXPORT_SIZES)[state.format];
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
  if (preview) drawPreviewWatermark(context, art, theme);
  return canvas;
}

function drawPreviewWatermark(context, art, theme) {
  context.save();
  context.translate(art.x + art.width / 2, art.y + art.height / 2);
  context.rotate(-0.24);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${Math.max(18, art.width * 0.035)}px ui-sans-serif, system-ui, sans-serif`;
  context.letterSpacing = `${Math.max(2, art.width * 0.004)}px`;
  const watermarkColor = state.theme === "paper" || state.theme === "editorial" ? theme.text : theme.overlayText;
  context.fillStyle = colorWithAlpha(watermarkColor, state.theme === "paper" || state.theme === "editorial" ? 0.18 : 0.25);
  context.fillText("PREVIEW · WHERE IT HAPPENED", 0, 0, art.width * 0.88);
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

function scrollToElement(element, { forceInstant = false } = {}) {
  if (!element) return;
  if (element.id === "top") {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousBehavior;
    });
    return;
  }
  const rect = element.getBoundingClientRect();
  const headerOffset = 90;
  const distance = Math.abs(rect.top - headerOffset);
  const shouldJump = forceInstant || reducedMotion || distance > window.innerHeight * 2.5;

  if (!shouldJump) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - headerOffset), left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousBehavior;
  });
}

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(...args), wait);
  };
}
