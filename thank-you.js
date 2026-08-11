import { PRODUCT_BY_ID, STORE_CONFIG } from "./store-config.js";

const PENDING_ORDER_KEYS = [
  "where-it-happened.pending-order.v2",
  "where-it-happened.pending-order.v1"
];

const orderPanel = document.querySelector("#thankYouOrder");
const orderRef = document.querySelector("#thankYouOrderRef");
const itemCount = document.querySelector("#thankYouItemCount");
const subtotal = document.querySelector("#thankYouSubtotal");
const copyButton = document.querySelector("#copyOrderReference");
const title = document.querySelector("#thank-you-title");
const lede = document.querySelector(".thank-you-lede");
const statusLabel = document.querySelector("#thankYouStatusLabel");
const toastRegion = document.querySelector("#toastRegion");

const pending = readPendingOrder();
renderState(pending);

copyButton?.addEventListener("click", async () => {
  const value = orderRef?.textContent?.trim();
  if (!value || value === "—") return;
  try {
    await copyText(value);
    showToast("Order reference copied", value);
  } catch {
    showToast("Copy unavailable", "Select the reference and copy it manually.", true);
  }
});

function readPendingOrder() {
  for (const key of PENDING_ORDER_KEYS) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
      const normalized = normalizePendingOrder(parsed);
      if (normalized) return normalized;
    } catch {
      // Try the older storage shape before falling back to the neutral state.
    }
  }
  return null;
}

function normalizePendingOrder(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const orderId = String(candidate.orderId || candidate.orderRef || "").trim();
  const items = Array.isArray(candidate.items) ? candidate.items : Array.isArray(candidate.cart) ? candidate.cart : [];
  if (!orderId || !items.length) return null;
  return { orderId, items };
}

function renderState(order) {
  if (!order) {
    setStatusLabel("Checkout return");
    if (title) title.textContent = "Review the receipt from your payment provider.";
    if (lede) {
      lede.textContent = "This browser does not have a pending order reference. The payment-provider receipt is the source of truth for any completed purchase.";
    }
    return;
  }

  const validItems = order.items.filter((item) => PRODUCT_BY_ID[item?.productId]);
  const total = validItems.reduce((sum, item) => sum + PRODUCT_BY_ID[item.productId].price, 0);
  setStatusLabel("Order details recovered");
  if (title) title.textContent = "Your saved design details are ready for review.";
  if (lede) {
    lede.textContent = "Keep the payment receipt and this reference together. Personalized files are prepared only after the hosted checkout confirms payment.";
  }
  orderRef.textContent = order.orderId;
  itemCount.textContent = String(validItems.length);
  subtotal.textContent = formatMoney(total);
  orderPanel.hidden = false;
  copyButton.hidden = false;
}

function setStatusLabel(value) {
  if (!statusLabel) return;
  statusLabel.replaceChildren();
  const line = document.createElement("span");
  line.setAttribute("aria-hidden", "true");
  statusLabel.append(line, document.createTextNode(` ${value}`));
}

function formatMoney(value) {
  return new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: "currency",
    currency: STORE_CONFIG.currency,
    maximumFractionDigits: 0
  }).format(value);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Copy command failed");
}

function showToast(titleText, detail, isError = false) {
  if (!toastRegion) return;
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast-error" : ""}`;
  const strong = document.createElement("strong");
  const span = document.createElement("span");
  strong.textContent = titleText;
  span.textContent = detail;
  toast.append(strong, span);
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}
