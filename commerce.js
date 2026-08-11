import { PRODUCT_LIST, STORE_CONFIG } from "./store-config.js";

const CART_KEY = "where-it-happened.cart.v2";
const LEGACY_CART_KEY = "where-it-happened.cart.v1";
const ORDER_DETAILS_KEY = "where-it-happened.order-details.v1";
const SELECTED_PRODUCT_KEY = "where-it-happened.selected-product.v1";
const CART_VERSION = 2;
const MAX_CART_ITEMS = 12;
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

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
    copyOrderBrief: $("#copyOrderBriefButton"),
    orderName: $("#orderName"),
    orderEmail: $("#orderEmail"),
    orderGiftRecipient: $("#orderGiftRecipient"),
    orderNote: $("#orderNote"),
    orderTerms: $("#orderTerms"),
    downloadCart: $("#downloadCartButton"),
    restoreCartInput: $("#restoreCartInput"),
    resumeBanner: $("#cartResumeBanner"),
    resumeOpen: $("#cartResumeOpen"),
    storeStatus: $("#storeStatusBanner"),
    comparison: $("#productComparisonRows")
  };

  if (!elements.cartOpen || !elements.productSelect || !elements.addCurrentDesign) return;

  let selectedProductId = loadSelectedProduct();
  let cart = loadCart();
  let orderDetails = loadOrderDetails();

  populateProductSelect();
  hydrateOrderDetails();
  bindEvents();
  selectProduct(selectedProductId, { announce: false, scroll: false });
  renderProductComparison();
  renderStoreStatus();
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

  function hydrateOrderDetails() {
    if (elements.orderName) elements.orderName.value = orderDetails.name;
    if (elements.orderEmail) elements.orderEmail.value = orderDetails.email;
    if (elements.orderGiftRecipient) elements.orderGiftRecipient.value = orderDetails.giftRecipient;
    if (elements.orderNote) elements.orderNote.value = orderDetails.note;
  }

  function bindEvents() {
    elements.cartOpen.addEventListener("click", openCart);
    elements.resumeOpen?.addEventListener("click", openCart);
    elements.closingCart?.addEventListener("click", openCart);
    elements.cartReturnToCreator?.addEventListener("click", () => {
      closeDialog(elements.cartDialog);
      scrollToCreator();
    });
    elements.cartClose?.addEventListener("click", () => closeDialog(elements.cartDialog));
    elements.cartDialog?.addEventListener("click", closeDialogFromBackdrop);
    elements.checkoutClose?.addEventListener("click", () => closeDialog(elements.checkoutDialog));
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
        closeDialog(elements.cartDialog);
        scrollToCreator();
        showToast("Design loaded", "The cart version is back in the editor.");
        return;
      }

      const openButton = event.target.closest("[data-open-design-link]");
      if (openButton) {
        const item = cart.items.find((candidate) => candidate.id === openButton.dataset.openDesignLink);
        if (item?.designUrl) window.open(item.designUrl, "_blank", "noopener,noreferrer");
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
      if (!window.confirm("Clear every saved design from this browser cart?")) return;
      cart.items = [];
      saveCart();
      renderCart();
      showToast("Cart cleared", "Your current editor draft is still saved.");
    });

    elements.cartCheckout.addEventListener("click", openCheckout);
    elements.checkoutPrimary.addEventListener("click", handlePrimaryCheckout);
    elements.copyOrderBrief.addEventListener("click", copyOrderBrief);
    elements.downloadCart?.addEventListener("click", downloadCartBackup);
    elements.restoreCartInput?.addEventListener("change", restoreCartBackup);

    [elements.orderName, elements.orderEmail, elements.orderGiftRecipient, elements.orderNote]
      .filter(Boolean)
      .forEach((field) => field.addEventListener("input", saveOrderDetailsFromForm));

    elements.orderTerms?.addEventListener("change", updateCheckoutButtonState);
  }

  function closeDialogFromBackdrop(event) {
    if (event.target === event.currentTarget) closeDialog(event.currentTarget);
  }

  function selectProduct(productId, { announce = false, scroll = false } = {}) {
    const product = getProduct(productId) || PRODUCT_LIST[0];
    if (!product) return;
    selectedProductId = product.id;
    saveSelectedProduct(product.id);
    elements.productSelect.value = product.id;
    elements.selectedName.textContent = product.name;
    elements.selectedPrice.textContent = formatMoney(product.price);
    elements.selectedDelivery.textContent = `${product.delivery} · ${product.turnaround}`;

    $$('[data-select-product]').forEach((button) => {
      const buttonProduct = getProduct(button.dataset.selectProduct) || product;
      const selected = buttonProduct.id === product.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      if (selected) button.textContent = `${buttonProduct.shortName} selected`;
      else button.textContent = `Choose ${buttonProduct.shortName}`;
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
    openDialog(elements.cartDialog);
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
    if (elements.downloadCart) elements.downloadCart.disabled = cart.items.length === 0;
    renderResumeBanner();
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
    place.textContent = `${item.design.city || "Custom place"} · ${formatLabel(item.design.format)} · ${capitalize(item.design.theme)}`;
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

    const metadata = document.createElement("div");
    metadata.className = "cart-item-metadata";
    metadata.innerHTML = `<span>${escapeHtml(product.delivery)}</span><span>${escapeHtml(product.turnaround)}</span>`;

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.editCartItem = item.id;
    edit.textContent = "Edit design";
    const open = document.createElement("button");
    open.type = "button";
    open.dataset.openDesignLink = item.id;
    open.textContent = "Open saved link";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeCartItem = item.id;
    remove.textContent = "Remove";
    actions.append(edit, open, remove);

    content.append(headingRow, label, metadata, actions);
    article.append(mini, content);
    return article;
  }

  function openCheckout() {
    if (!cart.items.length) return;
    renderCheckout();
    closeDialog(elements.cartDialog);
    openDialog(elements.checkoutDialog);
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
    elements.checkoutStatus.classList.toggle("is-pending", readiness.mode !== "hosted");
    elements.checkoutStatus.classList.toggle("is-ready", readiness.mode === "hosted");
    elements.checkoutStatus.innerHTML = `<strong>${escapeHtml(readiness.heading)}</strong><span>${escapeHtml(readiness.detail)}</span>`;

    if (readiness.mode === "hosted") {
      elements.checkoutPrimary.textContent = `Copy brief & continue to ${STORE_CONFIG.checkoutProvider}`;
    } else if (readiness.mode === "request") {
      elements.checkoutPrimary.textContent = "Download order request";
    } else {
      elements.checkoutPrimary.textContent = "Checkout unavailable";
    }

    updateCheckoutButtonState();
  }

  function updateCheckoutButtonState() {
    const readiness = getCheckoutReadiness();
    const consentRequired = readiness.mode === "hosted";
    const consentGiven = Boolean(elements.orderTerms?.checked);
    elements.checkoutPrimary.disabled = !readiness.ready || (consentRequired && !consentGiven);
  }

  async function handlePrimaryCheckout() {
    const readiness = getCheckoutReadiness();
    if (!readiness.ready) return;

    if (readiness.mode === "request") {
      const orderId = createOrderId();
      downloadText(buildOrderBrief(orderId, { paymentStatus: "NOT COLLECTED — ORDER REQUEST ONLY" }), `${orderId.toLowerCase()}-order-request.txt`);
      showToast("Order request saved", "No payment was collected. Keep the file until hosted checkout is connected.");
      return;
    }

    if (!elements.orderTerms?.checked) {
      elements.orderTerms?.focus();
      showToast("Agreement needed", "Review and accept the store terms before continuing.", true);
      return;
    }

    if (orderDetails.email && !isValidEmail(orderDetails.email)) {
      elements.orderEmail?.focus();
      showToast("Check the email address", "Use a valid email or leave the optional field empty.", true);
      return;
    }

    const orderId = createOrderId();
    const checkoutUrl = buildHostedCheckoutUrl(orderId);
    if (!checkoutUrl) return;

    try {
      await copyText(buildOrderBrief(orderId, { paymentStatus: "CONTINUING TO HOSTED CHECKOUT" }));
      showToast("Order brief copied", "Paste it into the required Design details field at checkout.");
    } catch (error) {
      console.warn("Could not copy the order brief before checkout.", error);
      showToast("Checkout opening", "Copy your design links from the cart if checkout asks for them.", true);
    }

    try {
      window.localStorage.setItem(
        "where-it-happened.pending-order.v2",
        JSON.stringify({
          orderId,
          createdAt: new Date().toISOString(),
          items: cart.items,
          orderDetails,
          policyVersion: STORE_CONFIG.policyVersion
        })
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
      downloadText(brief, "where-it-happened-order-brief.txt");
      showToast("Order brief downloaded", "Clipboard access was unavailable, so a text file was saved instead.");
    }
  }

  function buildOrderBrief(orderId = createOrderId(), { paymentStatus = "NOT YET PAID" } = {}) {
    const lines = [
      "WHERE IT HAPPENED — ORDER BRIEF",
      `Order reference: ${orderId}`,
      `Created: ${new Date().toLocaleString()}`,
      `Payment status: ${paymentStatus}`,
      `Policy version: ${STORE_CONFIG.policyVersion}`,
      ""
    ];

    if (orderDetails.name) lines.push(`Customer name: ${orderDetails.name}`);
    if (orderDetails.email) lines.push(`Contact email: ${orderDetails.email}`);
    if (orderDetails.giftRecipient) lines.push(`Gift recipient: ${orderDetails.giftRecipient}`);
    if (orderDetails.note) lines.push(`Order note: ${orderDetails.note}`);
    if (orderDetails.name || orderDetails.email || orderDetails.giftRecipient || orderDetails.note) lines.push("");

    cart.items.forEach((item, index) => {
      const product = getProduct(item.productId);
      lines.push(
        `${index + 1}. ${product?.name || "Memory map"} — ${formatMoney(product?.price || 0)}`,
        `   Title: ${item.design.title || "Personalized memory map"}`,
        `   Place: ${item.design.city || "Custom place"}${item.design.country ? `, ${item.design.country}` : ""}`,
        `   Coordinates: ${item.design.lat.toFixed(5)}, ${item.design.lng.toFixed(5)}`,
        `   Format: ${formatLabel(item.design.format)}`,
        `   Theme: ${capitalize(item.design.theme)}`,
        `   Layout: ${capitalize(item.design.layout)}`,
        `   Date line: ${item.design.date || "Not supplied"}`,
        `   Delivery: ${product?.delivery || "Digital files"}`,
        `   Design link: ${item.designUrl}`,
        ""
      );
    });

    lines.push(
      `TOTAL: ${formatMoney(cartTotal())}`,
      `Estimated delivery: ${STORE_CONFIG.standardDeliveryWindow}`,
      `Privacy: ${absolutePolicyUrl(STORE_CONFIG.policies.privacy)}`,
      `Terms: ${absolutePolicyUrl(STORE_CONFIG.policies.terms)}`,
      `Refunds: ${absolutePolicyUrl(STORE_CONFIG.policies.refunds)}`,
      `Delivery: ${absolutePolicyUrl(STORE_CONFIG.policies.delivery)}`
    );
    return lines.join("\n");
  }

  function getCheckoutReadiness() {
    if (!cart.items.length) {
      return {
        ready: false,
        mode: "blocked",
        heading: "Your cart is empty",
        detail: "Add a finished design before continuing."
      };
    }

    const products = cart.items.map((item) => getProduct(item.productId));
    const missingLinks = products.some((product) => !product?.checkoutUrl);
    if (missingLinks) {
      return {
        ready: Boolean(STORE_CONFIG.orderRequestEnabled),
        mode: STORE_CONFIG.orderRequestEnabled ? "request" : "blocked",
        heading: "Secure payment is not connected yet",
        detail: STORE_CONFIG.orderRequestEnabled
          ? "You can download a complete order request now. No payment will be collected."
          : "Your cart and exact design links remain saved in this browser."
      };
    }

    if (String(STORE_CONFIG.checkoutProvider || "").toLowerCase() === "payhip") {
      const keys = products.map((product) => extractPayhipProductKey(product.checkoutUrl));
      if (keys.some((key) => !key)) {
        return {
          ready: false,
          mode: "blocked",
          heading: "A Payhip link needs attention",
          detail: "Use a Payhip product page or direct checkout URL for every product in store-config.js."
        };
      }

      if (new Set(keys).size !== keys.length) {
        return {
          ready: false,
          mode: "blocked",
          heading: "Split duplicate product designs into separate orders",
          detail: "Payhip can combine different products, but repeated personalized copies of one product need separate checkouts in this MVP."
        };
      }
    } else if (cart.items.length > 1) {
      return {
        ready: false,
        mode: "blocked",
        heading: "This checkout provider supports one custom design at a time",
        detail: "Purchase one design, then return for the next."
      };
    }

    return {
      ready: true,
      mode: "hosted",
      heading: "Secure hosted checkout is ready",
      detail: `Your order brief will be copied before you continue to ${STORE_CONFIG.checkoutProvider}.`
    };
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
    cart.version = CART_VERSION;
    cart.updatedAt = new Date().toISOString();
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.localStorage.removeItem(LEGACY_CART_KEY);
    } catch (error) {
      console.warn("Could not save the cart.", error);
    }
  }

  function loadCart() {
    const candidates = [CART_KEY, LEGACY_CART_KEY];
    for (const key of candidates) {
      try {
        const raw = JSON.parse(window.localStorage.getItem(key));
        if (!raw || !Array.isArray(raw.items)) continue;
        return {
          version: CART_VERSION,
          updatedAt: raw.updatedAt || new Date().toISOString(),
          items: raw.items
            .map(sanitizeStoredCartItem)
            .filter(Boolean)
            .slice(-MAX_CART_ITEMS)
        };
      } catch {
        // Try the next storage key.
      }
    }
    return { version: CART_VERSION, updatedAt: new Date().toISOString(), items: [] };
  }

  function saveOrderDetailsFromForm() {
    orderDetails = {
      name: String(elements.orderName?.value || "").trim().slice(0, 80),
      email: String(elements.orderEmail?.value || "").trim().slice(0, 120),
      giftRecipient: String(elements.orderGiftRecipient?.value || "").trim().slice(0, 80),
      note: String(elements.orderNote?.value || "").trim().slice(0, 500)
    };
    try {
      window.localStorage.setItem(ORDER_DETAILS_KEY, JSON.stringify(orderDetails));
    } catch (error) {
      console.warn("Could not save order details.", error);
    }
  }

  function loadOrderDetails() {
    try {
      const raw = JSON.parse(window.localStorage.getItem(ORDER_DETAILS_KEY));
      return {
        name: String(raw?.name || "").slice(0, 80),
        email: String(raw?.email || "").slice(0, 120),
        giftRecipient: String(raw?.giftRecipient || "").slice(0, 80),
        note: String(raw?.note || "").slice(0, 500)
      };
    } catch {
      return { name: "", email: "", giftRecipient: "", note: "" };
    }
  }

  function downloadCartBackup() {
    if (!cart.items.length) return;
    const payload = {
      app: "where-it-happened",
      version: CART_VERSION,
      exportedAt: new Date().toISOString(),
      cart,
      orderDetails
    };
    downloadText(JSON.stringify(payload, null, 2), `where-it-happened-cart-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
    showToast("Cart backup downloaded", "Keep the JSON file private; it contains your design links and order notes.");
  }

  async function restoreCartBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("The backup file is too large");
      const payload = JSON.parse(await file.text());
      if (payload?.app !== "where-it-happened" || !Array.isArray(payload?.cart?.items)) {
        throw new Error("Unknown backup format");
      }
      const restoredItems = payload.cart.items
        .map(sanitizeStoredCartItem)
        .filter(Boolean)
        .slice(-MAX_CART_ITEMS);

      if (!restoredItems.length) throw new Error("The backup contains no usable designs");
      if (cart.items.length && !window.confirm("Replace the current browser cart with this backup?")) return;

      cart = { version: CART_VERSION, updatedAt: new Date().toISOString(), items: restoredItems };
      if (payload.orderDetails) {
        orderDetails = {
          name: String(payload.orderDetails.name || "").slice(0, 80),
          email: String(payload.orderDetails.email || "").slice(0, 120),
          giftRecipient: String(payload.orderDetails.giftRecipient || "").slice(0, 80),
          note: String(payload.orderDetails.note || "").slice(0, 500)
        };
        hydrateOrderDetails();
        saveOrderDetailsFromForm();
      }
      saveCart();
      renderCart();
      showToast("Cart restored", `${restoredItems.length} design${restoredItems.length === 1 ? "" : "s"} loaded from the backup.`);
    } catch (error) {
      console.error("Cart restore failed.", error);
      showToast("Backup could not be restored", "Choose a cart JSON file exported by this website.", true);
    }
  }

  function sanitizeStoredCartItem(item) {
    if (!item || !getProduct(item.productId) || !item.design) return null;
    const designUrl = normalizeDesignUrl(item.designUrl);
    if (!designUrl) return null;
    const now = new Date().toISOString();
    return {
      id: String(item.id || createId()).slice(0, 120),
      productId: String(item.productId),
      design: sanitizeDesignSnapshot(item.design),
      designUrl,
      addedAt: String(item.addedAt || now).slice(0, 40),
      updatedAt: String(item.updatedAt || item.addedAt || now).slice(0, 40)
    };
  }

  function normalizeDesignUrl(value) {
    try {
      const imported = new URL(String(value || ""), window.location.href);
      if (!imported.hash.startsWith("#design=")) return "";
      const local = new URL(window.location.href);
      local.hash = imported.hash;
      return local.toString();
    } catch {
      return "";
    }
  }

  function renderResumeBanner() {
    if (!elements.resumeBanner) return;
    elements.resumeBanner.hidden = cart.items.length === 0;
    const count = $("[data-resume-count]", elements.resumeBanner);
    const total = $("[data-resume-total]", elements.resumeBanner);
    if (count) count.textContent = `${cart.items.length} saved design${cart.items.length === 1 ? "" : "s"}`;
    if (total) total.textContent = formatMoney(cartTotal());
  }

  function renderStoreStatus() {
    if (!elements.storeStatus) return;
    const configured = PRODUCT_LIST.filter((product) => Boolean(product.checkoutUrl)).length;
    const allConfigured = configured === PRODUCT_LIST.length;
    const icon = $("[data-store-status-icon]", elements.storeStatus);
    const heading = $("[data-store-status-heading]", elements.storeStatus);
    const detail = $("[data-store-status-detail]", elements.storeStatus);

    elements.storeStatus.classList.toggle("is-live", allConfigured);
    if (icon) icon.textContent = allConfigured ? "✓" : "○";
    if (heading) heading.textContent = allConfigured ? "Secure checkout connected" : "Public preview storefront";
    if (detail) {
      detail.textContent = allConfigured
        ? `All products continue to ${STORE_CONFIG.checkoutProvider} for payment.`
        : "Design, search, products, and cart are live. Payment remains disabled until seller-owned checkout links are added.";
    }
  }

  function renderProductComparison() {
    if (!elements.comparison) return;
    elements.comparison.replaceChildren();
    PRODUCT_LIST.forEach((product) => {
      const article = document.createElement("article");
      article.className = "comparison-product";
      article.innerHTML = `
        <div><span>${escapeHtml(product.badge)}</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.bestFor)}</small></div>
        <p><strong>${formatMoney(product.price)}</strong><span>one time</span></p>
        <ul>${product.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
        <div class="comparison-product-meta"><span>${escapeHtml(product.delivery)}</span><span>${escapeHtml(product.turnaround)}</span></div>
        <button type="button" class="button button-outline button-full" data-comparison-select="${escapeHtml(product.id)}">Choose ${escapeHtml(product.shortName)}</button>
      `;
      elements.comparison.append(article);
    });

    $$('[data-comparison-select]', elements.comparison).forEach((button) => {
      button.addEventListener("click", () => selectProduct(button.dataset.comparisonSelect, { announce: true, scroll: true }));
    });
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

function loadSelectedProduct() {
  try {
    const saved = window.localStorage.getItem(SELECTED_PRODUCT_KEY);
    return STORE_CONFIG.products[saved] ? saved : "printPack";
  } catch {
    return "printPack";
  }
}

function saveSelectedProduct(productId) {
  try {
    window.localStorage.setItem(SELECTED_PRODUCT_KEY, productId);
  } catch {
    // Product selection can remain session-only when storage is unavailable.
  }
}

function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
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

function formatLabel(value) {
  return { portrait: "Portrait", square: "Square", wallpaper: "Phone wallpaper" }[value] || capitalize(value);
}

function capitalize(value) {
  const text = String(value || "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
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

function absolutePolicyUrl(value) {
  try {
    return new URL(value, window.location.href).toString();
  } catch {
    return value;
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
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

function downloadText(text, filename, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 3000);
}
