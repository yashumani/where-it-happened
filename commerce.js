import { PRODUCT_LIST, STORE_CONFIG } from "./store-config.js";

const CART_KEY = "where-it-happened.cart.v1";
const CART_VERSION = 1;
const MAX_CART_ITEMS = 8;

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function initCommerce({
  getDesignState,
  getDesignUrl,
  loadDesignState,
  showToast,
  scrollToCreator
}) {
  const elements = {
    cartOpen: $("#cartOpenButton"),
    cartCount: $("#cartCount"),
    cartDialog: $("#cartDialog"),
    cartClose: $("#cartCloseButton"),
    cartItems: $("#cartItems"),
    cartEmpty: $("#cartEmpty"),
    cartSubtotal: $("#cartSubtotal"),
    cartCheckout: $("#cartCheckoutButton"),
    cartClear: $("#cartClearButton"),
    cartReturnToCreator: $("#cartReturnToCreator"),
    closingCart: $("#closingCartButton"),
    productSelect: $("#purchaseProductSelect"),
    selectedName: $("#purchaseProductName"),
    selectedPrice: $("#purchaseProductPrice"),
    selectedDelivery: $("#purchaseProductDelivery"),
    addCurrentDesign: $("#addCurrentDesignToCart"),
    checkoutDialog: $("#checkoutDialog"),
    checkoutClose: $("#checkoutCloseButton"),
    checkoutItems: $("#checkoutItems"),
    checkoutTotal: $("#checkoutTotal"),
    checkoutStatus: $("#checkoutStatus"),
    checkoutPrimary: $("#checkoutPrimaryButton"),
    copyOrderBrief: $("#copyOrderBriefButton")
  };

  if (!elements.cartOpen || !elements.productSelect || !elements.addCurrentDesign) return;

  let selectedProductId = "printPack";
  let cart = loadCart();

  populateProductSelect();
  bindEvents();
  selectProduct(selectedProductId, { announce: false, scroll: false });
  renderCart();

  function populateProductSelect() {
    elements.productSelect.replaceChildren();
    PRODUCT_LIST.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = `${product.name} — ${formatMoney(product.price)}`;
      elements.productSelect.append(option);
    });
    elements.productSelect.value = selectedProductId;
  }

  function bindEvents() {
    elements.cartOpen.addEventListener("click", openCart);
    elements.closingCart?.addEventListener("click", openCart);
    elements.cartReturnToCreator?.addEventListener("click", () => {
      elements.cartDialog.close();
      scrollToCreator();
    });
    elements.cartClose?.addEventListener("click", () => elements.cartDialog.close());
    elements.cartDialog?.addEventListener("click", closeDialogFromBackdrop);
    elements.checkoutClose?.addEventListener("click", () => elements.checkoutDialog.close());
    elements.checkoutDialog?.addEventListener("click", closeDialogFromBackdrop);

    elements.productSelect.addEventListener("change", () => {
      selectProduct(elements.productSelect.value, { announce: false, scroll: false });
    });

    elements.addCurrentDesign.addEventListener("click", addCurrentDesign);

    $$('[data-select-product]').forEach((button) => {
      button.addEventListener("click", () => {
        selectProduct(button.dataset.selectProduct, { announce: true, scroll: true });
      });
    });

    elements.cartItems.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-cart-item]");
      if (removeButton) {
        removeCartItem(removeButton.dataset.removeCartItem);
        return;
      }

      const editButton = event.target.closest("[data-edit-cart-item]");
      if (editButton) {
        const item = cart.items.find((candidate) => candidate.id === editButton.dataset.editCartItem);
        if (!item) return;
        loadDesignState(item.design);
        elements.cartDialog.close();
        scrollToCreator();
        showToast("Design loaded", "The cart version is back in the editor.");
      }
    });

    elements.cartItems.addEventListener("change", (event) => {
      const productSelect = event.target.closest("[data-cart-product]");
      if (!productSelect) return;
      const item = cart.items.find((candidate) => candidate.id === productSelect.dataset.cartProduct);
      if (!item || !getProduct(productSelect.value)) return;
      item.productId = productSelect.value;
      item.updatedAt = new Date().toISOString();
      saveCart();
      renderCart();
    });

    elements.cartClear.addEventListener("click", () => {
      if (!cart.items.length) return;
      cart.items = [];
      saveCart();
      renderCart();
      showToast("Cart cleared", "Your current editor draft is still saved.");
    });

    elements.cartCheckout.addEventListener("click", openCheckout);
    elements.checkoutPrimary.addEventListener("click", handlePrimaryCheckout);
    elements.copyOrderBrief.addEventListener("click", copyOrderBrief);
  }

  function closeDialogFromBackdrop(event) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  function selectProduct(productId, { announce = false, scroll = false } = {}) {
    const product = getProduct(productId);
    if (!product) return;
    selectedProductId = product.id;
    elements.productSelect.value = product.id;
    elements.selectedName.textContent = product.name;
    elements.selectedPrice.textContent = formatMoney(product.price);
    elements.selectedDelivery.textContent = product.delivery;

    $$('[data-select-product]').forEach((button) => {
      const selected = button.dataset.selectProduct === product.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    if (scroll) scrollToCreator();
    if (announce) showToast("Product selected", `${product.name} is ready for your current design.`);
  }

  function addCurrentDesign() {
    const product = getProduct(selectedProductId);
    if (!product) return;

    const design = sanitizeDesignSnapshot(getDesignState());
    const fingerprint = designFingerprint(design);
    const existing = cart.items.find(
      (item) => item.productId === product.id && designFingerprint(item.design) === fingerprint
    );

    if (existing) {
      existing.design = design;
      existing.designUrl = getDesignUrl();
      existing.updatedAt = new Date().toISOString();
    } else {
      cart.items.push({
        id: createId(),
        productId: product.id,
        design,
        designUrl: getDesignUrl(),
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (cart.items.length > MAX_CART_ITEMS) cart.items.shift();
    }

    saveCart();
    renderCart();
    openCart();
    showToast(
      existing ? "Cart design updated" : "Added to cart",
      `${product.name} · ${design.city || "Custom place"}`
    );
  }

  function removeCartItem(itemId) {
    const item = cart.items.find((candidate) => candidate.id === itemId);
    cart.items = cart.items.filter((candidate) => candidate.id !== itemId);
    saveCart();
    renderCart();
    if (item) showToast("Removed from cart", item.design.title || item.design.city || "Memory map");
  }

  function openCart() {
    renderCart();
    if (elements.cartDialog.showModal) elements.cartDialog.showModal();
    else elements.cartDialog.setAttribute("open", "");
  }

  function renderCart() {
    elements.cartItems.replaceChildren();
    elements.cartEmpty.hidden = cart.items.length > 0;
    elements.cartItems.hidden = cart.items.length === 0;
    elements.cartCount.textContent = String(cart.items.length);
    elements.cartCount.hidden = cart.items.length === 0;
    elements.cartOpen.setAttribute(
      "aria-label",
      cart.items.length ? `Open cart with ${cart.items.length} item${cart.items.length === 1 ? "" : "s"}` : "Open empty cart"
    );

    cart.items.forEach((item) => elements.cartItems.append(createCartItemElement(item)));

    const total = cartTotal();
    elements.cartSubtotal.textContent = formatMoney(total);
    elements.cartCheckout.disabled = cart.items.length === 0;
    elements.cartClear.disabled = cart.items.length === 0;
  }

  function createCartItemElement(item) {
    const product = getProduct(item.productId) || PRODUCT_LIST[0];
    const article = document.createElement("article");
    article.className = "cart-item";

    const mini = document.createElement("div");
    mini.className = `cart-mini-poster cart-mini-${safeTheme(item.design.theme)}`;
    mini.setAttribute("aria-hidden", "true");
    const miniMap = document.createElement("span");
    miniMap.className = "cart-mini-map";
    const miniCopy = document.createElement("span");
    miniCopy.className = "cart-mini-copy";
    const miniTitle = document.createElement("strong");
    miniTitle.textContent = item.design.title || "YOUR MEMORY";
    const miniPlace = document.createElement("small");
    miniPlace.textContent = item.design.city || "Custom place";
    miniCopy.append(miniTitle, miniPlace);
    mini.append(miniMap, miniCopy);

    const content = document.createElement("div");
    content.className = "cart-item-content";
    const headingRow = document.createElement("div");
    headingRow.className = "cart-item-heading";
    const heading = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = item.design.title || "Personalized memory map";
    const place = document.createElement("small");
    place.textContent = `${item.design.city || "Custom place"} · ${item.design.format || "portrait"}`;
    heading.append(title, place);
    const price = document.createElement("strong");
    price.className = "cart-item-price";
    price.textContent = formatMoney(product.price);
    headingRow.append(heading, price);

    const label = document.createElement("label");
    label.className = "cart-product-label";
    const labelText = document.createElement("span");
    labelText.textContent = "Product";
    const select = document.createElement("select");
    select.dataset.cartProduct = item.id;
    PRODUCT_LIST.forEach((candidate) => {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = `${candidate.shortName} — ${formatMoney(candidate.price)}`;
      option.selected = candidate.id === product.id;
      select.append(option);
    });
    label.append(labelText, select);

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.editCartItem = item.id;
    edit.textContent = "Edit design";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeCartItem = item.id;
    remove.textContent = "Remove";
    actions.append(edit, remove);

    content.append(headingRow, label, actions);
    article.append(mini, content);
    return article;
  }

  function openCheckout() {
    if (!cart.items.length) return;
    renderCheckout();
    elements.cartDialog.close();
    if (elements.checkoutDialog.showModal) elements.checkoutDialog.showModal();
    else elements.checkoutDialog.setAttribute("open", "");
  }

  function renderCheckout() {
    elements.checkoutItems.replaceChildren();
    cart.items.forEach((item) => {
      const product = getProduct(item.productId);
      const row = document.createElement("div");
      row.className = "checkout-line";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = product?.name || "Memory map";
      const detail = document.createElement("small");
      detail.textContent = `${item.design.city || "Custom place"} · ${item.design.title || "Personalized design"}`;
      copy.append(name, detail);
      const price = document.createElement("strong");
      price.textContent = formatMoney(product?.price || 0);
      row.append(copy, price);
      elements.checkoutItems.append(row);
    });

    elements.checkoutTotal.textContent = formatMoney(cartTotal());
    const readiness = getCheckoutReadiness();

    if (readiness.ready) {
      elements.checkoutStatus.classList.remove("is-pending");
      elements.checkoutStatus.innerHTML = `<strong>Secure checkout ready</strong><span>Your order brief will be copied, then you will continue to ${escapeHtml(STORE_CONFIG.checkoutProvider)} to pay.</span>`;
      elements.checkoutPrimary.disabled = false;
      elements.checkoutPrimary.textContent = `Copy brief & continue to ${STORE_CONFIG.checkoutProvider}`;
    } else {
      elements.checkoutStatus.classList.add("is-pending");
      elements.checkoutStatus.innerHTML = `<strong>${escapeHtml(readiness.heading)}</strong><span>${escapeHtml(readiness.detail)}</span>`;
      elements.checkoutPrimary.disabled = true;
      elements.checkoutPrimary.textContent = "Secure checkout coming next";
    }
  }

  async function handlePrimaryCheckout() {
    const readiness = getCheckoutReadiness();
    if (!readiness.ready) return;

    const orderId = createOrderId();
    const checkoutUrl = buildHostedCheckoutUrl(orderId);
    if (!checkoutUrl) return;

    try {
      await copyText(buildOrderBrief(orderId));
      showToast("Order brief copied", "Paste it into the required Design details field at checkout.");
    } catch (error) {
      console.warn("Could not copy the order brief before checkout.", error);
      showToast("Checkout opening", "Copy your design links from the cart if the checkout asks for them.", true);
    }

    try {
      window.localStorage.setItem(
        "where-it-happened.pending-order.v1",
        JSON.stringify({ orderId, createdAt: new Date().toISOString(), items: cart.items })
      );
    } catch (error) {
      console.warn("Could not save the pending order.", error);
    }

    window.location.href = checkoutUrl;
  }

  async function copyOrderBrief() {
    const brief = buildOrderBrief();
    try {
      await copyText(brief);
      showToast("Order brief copied", "It includes every product and restorable design link.");
    } catch (error) {
      console.error("Could not copy order brief.", error);
      showToast("Copy failed", "Select and copy the design links from the cart instead.", true);
    }
  }

  function buildOrderBrief(orderId = createOrderId()) {
    const lines = [
      "WHERE IT HAPPENED — ORDER BRIEF",
      `Order: ${orderId}`,
      `Created: ${new Date().toLocaleString()}`,
      ""
    ];
    cart.items.forEach((item, index) => {
      const product = getProduct(item.productId);
      lines.push(
        `${index + 1}. ${product?.name || "Memory map"} — ${formatMoney(product?.price || 0)}`,
        `   Title: ${item.design.title || "Personalized memory map"}`,
        `   Place: ${item.design.city || "Custom place"}`,
        `   Format: ${item.design.format || "portrait"}`,
        `   Design link: ${item.designUrl}`,
        ""
      );
    });
    lines.push(`TOTAL: ${formatMoney(cartTotal())}`);
    return lines.join("\n");
  }


  function getCheckoutReadiness() {
    if (!cart.items.length) {
      return {
        ready: false,
        heading: "Your cart is empty",
        detail: "Add a finished design before continuing to checkout."
      };
    }

    const products = cart.items.map((item) => getProduct(item.productId));
    const missingLinks = products.some((product) => !product?.checkoutUrl);
    if (missingLinks) {
      return {
        ready: false,
        heading: "Payment connection is being finalized",
        detail: "Your cart and exact design links are saved. Public hosted checkout links are the only remaining store configuration."
      };
    }

    if (String(STORE_CONFIG.checkoutProvider || "").toLowerCase() === "payhip") {
      const keys = products.map((product) => extractPayhipProductKey(product.checkoutUrl));
      if (keys.some((key) => !key)) {
        return {
          ready: false,
          heading: "A Payhip link needs attention",
          detail: "Use a Payhip product page or direct checkout URL for every product in store-config.js."
        };
      }

      if (new Set(keys).size !== keys.length) {
        return {
          ready: false,
          heading: "Split duplicate product designs into separate orders",
          detail: "Payhip can combine different products, but repeated personalized copies of the same product need separate checkouts in this MVP."
        };
      }
    } else if (cart.items.length > 1) {
      return {
        ready: false,
        heading: "This checkout provider supports one custom design at a time",
        detail: "Remove the other cart items, complete the first purchase, then return for the next design."
      };
    }

    return { ready: true, heading: "Secure checkout ready", detail: "" };
  }

  function buildHostedCheckoutUrl(orderId) {
    const provider = String(STORE_CONFIG.checkoutProvider || "").toLowerCase();
    if (provider !== "payhip") {
      return cart.items.length === 1 ? getProduct(cart.items[0].productId)?.checkoutUrl || "" : "";
    }

    const keys = cart.items.map((item) => extractPayhipProductKey(getProduct(item.productId)?.checkoutUrl));
    if (keys.some((key) => !key)) return "";

    const checkoutUrl = new URL("buy", STORE_CONFIG.checkoutProviderUrl || "https://payhip.com/");
    if (keys.length === 1) checkoutUrl.searchParams.set("link", keys[0]);
    else keys.forEach((key) => checkoutUrl.searchParams.append("cart_links[]", key));

    checkoutUrl.searchParams.set("metadata[order_ref]", orderId);
    checkoutUrl.searchParams.set("metadata[item_count]", String(cart.items.length));
    checkoutUrl.searchParams.set("metadata[source]", "where-it-happened");
    return checkoutUrl.toString();
  }

  function cartTotal() {
    return cart.items.reduce((sum, item) => sum + (getProduct(item.productId)?.price || 0), 0);
  }

  function saveCart() {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.warn("Could not save the cart.", error);
    }
  }

  function loadCart() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(CART_KEY));
      if (raw?.version !== CART_VERSION || !Array.isArray(raw.items)) throw new Error("Unknown cart version");
      return {
        version: CART_VERSION,
        items: raw.items
          .filter((item) => item && getProduct(item.productId) && item.design && typeof item.designUrl === "string")
          .slice(-MAX_CART_ITEMS)
      };
    } catch {
      return { version: CART_VERSION, items: [] };
    }
  }

  function getProduct(productId) {
    return STORE_CONFIG.products[productId] || null;
  }

  function formatMoney(value) {
    return new Intl.NumberFormat(STORE_CONFIG.locale, {
      style: "currency",
      currency: STORE_CONFIG.currency,
      maximumFractionDigits: 0
    }).format(value);
  }
}

function sanitizeDesignSnapshot(candidate) {
  const source = candidate && typeof candidate === "object" ? candidate : {};
  return {
    version: 1,
    occasion: String(source.occasion || "custom").slice(0, 32),
    locationId: String(source.locationId || "custom").slice(0, 120),
    city: String(source.city || "Custom place").slice(0, 80),
    country: String(source.country || "").slice(0, 80),
    lat: finiteNumber(source.lat, 0),
    lng: finiteNumber(source.lng, 0),
    centerLat: finiteNumber(source.centerLat, finiteNumber(source.lat, 0)),
    centerLng: finiteNumber(source.centerLng, finiteNumber(source.lng, 0)),
    zoom: finiteNumber(source.zoom, 10.5),
    title: String(source.title || "YOUR MEMORY").slice(0, 48),
    subtitle: String(source.subtitle || "").slice(0, 72),
    date: String(source.date || "").slice(0, 32),
    kicker: String(source.kicker || "").slice(0, 32),
    dedication: String(source.dedication || "").slice(0, 120),
    theme: safeTheme(source.theme),
    layout: ["classic", "full", "minimal"].includes(source.layout) ? source.layout : "classic",
    format: ["portrait", "square", "wallpaper"].includes(source.format) ? source.format : "portrait",
    marker: source.marker !== false,
    labels: source.labels !== false
  };
}

function designFingerprint(design) {
  return JSON.stringify([
    design.locationId,
    design.lat,
    design.lng,
    design.centerLat,
    design.centerLng,
    design.zoom,
    design.title,
    design.subtitle,
    design.date,
    design.kicker,
    design.dedication,
    design.theme,
    design.layout,
    design.format,
    design.marker,
    design.labels
  ]);
}

function createId() {
  return window.crypto?.randomUUID?.() || `cart-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeTheme(value) {
  return ["paper", "editorial", "heritage", "midnight", "fjord"].includes(value) ? value : "paper";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractPayhipProductKey(value) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://payhip.com/");
    const directKey = url.searchParams.get("link");
    if (directKey) return directKey.trim();
    const parts = url.pathname.split("/").filter(Boolean);
    const productIndex = parts.findIndex((part) => part === "b");
    if (productIndex >= 0 && parts[productIndex + 1]) return parts[productIndex + 1].trim();
    return "";
  } catch {
    return "";
  }
}

function createOrderId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WIH-${stamp}-${random}`;
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
  if (!copied) throw new Error("Copy command failed");
}
