import { CITIES, CITY_BY_ID } from "./cities.js";

const STORAGE_KEY = "where-it-happened.design.v1";
const SHARED_HASH_PREFIX = "#design=";
const MAP_STYLE_BASE = "https://tiles.openfreemap.org/styles/";

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
  toastRegion: $("#toastRegion")
};

boot();

function boot() {
  hydrateControlsFromState();
  bindEvents();
  renderAll({ updateMap: false });
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

  elements.locationSearch.addEventListener("focus", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("input", () => renderLocationOptions(elements.locationSearch.value));
  elements.locationSearch.addEventListener("keydown", handleLocationKeydown);
  elements.locationSearch.addEventListener("blur", () => {
    window.setTimeout(closeLocationOptions, 130);
  });

  elements.locationOptions.addEventListener("mousedown", (event) => event.preventDefault());
  elements.locationOptions.addEventListener("click", (event) => {
    const option = event.target.closest("[data-city-id]");
    if (option) selectCity(option.dataset.cityId);
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

  window.addEventListener("resize", debounce(() => map?.resize(), 150));
  window.addEventListener("beforeunload", saveDraft);
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
  }).slice(0, 10);

  activeLocationIndex = locationResults.length ? 0 : -1;
  elements.locationOptions.replaceChildren();

  if (!locationResults.length) {
    const empty = document.createElement("p");
    empty.className = "empty-option";
    empty.textContent = "No built-in city matched. Open Advanced location to enter exact coordinates.";
    elements.locationOptions.append(empty);
  } else {
    locationResults.forEach((city, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = `combobox-option${index === activeLocationIndex ? " is-active" : ""}`;
      option.id = `location-option-${city.id}`;
      option.dataset.cityId = city.id;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(city.id === state.locationId));

      const text = document.createElement("span");
      const cityName = document.createElement("strong");
      const countryName = document.createElement("small");
      cityName.textContent = city.city;
      countryName.textContent = city.country;
      text.append(cityName, countryName);

      const code = document.createElement("span");
      code.textContent = city.countryCode;
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
    selectCity(locationResults[activeLocationIndex].id);
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
  if (active) elements.locationSearch.setAttribute("aria-activedescendant", `location-option-${active.id}`);
  else elements.locationSearch.removeAttribute("aria-activedescendant");
}

function closeLocationOptions() {
  elements.locationOptions.hidden = true;
  elements.locationSearch.setAttribute("aria-expanded", "false");
  elements.locationSearch.removeAttribute("aria-activedescendant");
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
  setButtonBusy(elements.downloadPng, true, "Preparing PNG…");
  document.body.classList.add("is-exporting");

  try {
    const canvas = await composePosterCanvas();
    const blob = await canvasToBlob(canvas, "image/png");
    const filename = `${slugify(state.city || "custom-place")}-${slugify(state.title || "memory-map")}.png`;
    downloadBlob(blob, filename);
    showToast("PNG downloaded", `${filename} is ready.`);
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
    const canvas = await composePosterCanvas();
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
    showToast("Print view opened", "Choose “Save as PDF” in your browser’s print dialog.");
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

async function composePosterCanvas() {
  await waitForMapFrame();

  const { width, height } = EXPORT_SIZES[state.format];
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
  return canvas;
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

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(...args), wait);
  };
}
