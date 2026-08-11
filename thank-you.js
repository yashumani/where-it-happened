import { PRODUCT_BY_ID, STORE_CONFIG } from "./store-config.js";

const PENDING_ORDER_KEY = "where-it-happened.pending-order.v1";
const orderPanel = document.querySelector("#thankYouOrder");
const orderRef = document.querySelector("#thankYouOrderRef");
const itemCount = document.querySelector("#thankYouItemCount");
const subtotal = document.querySelector("#thankYouSubtotal");
const copyButton = document.querySelector("#copyOrderReference");
const toastRegion = document.querySelector("#toastRegion");

const pending = readPendingOrder();
if (pending) renderPendingOrder(pending);

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
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PENDING_ORDER_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.cart)) return null;
    if (typeof parsed.orderRef !== "string" || !parsed.orderRef) return null;
    return parsed;
  } catch {
    return null;
  }
}

function renderPendingOrder(order) {
  const validItems = order.cart.filter((item) => PRODUCT_BY_ID[item?.productId]);
  const total = validItems.reduce((sum, item) => sum + PRODUCT_BY_ID[item.productId].price, 0);
  orderRef.textContent = order.orderRef;
  itemCount.textContent = String(validItems.length);
  subtotal.textContent = new Intl.NumberFormat(STORE_CONFIG.locale, {
    style: "currency",
    currency: STORE_CONFIG.currency,
    maximumFractionDigits: 0
  }).format(total);
  orderPanel.hidden = false;
  copyButton.hidden = false;
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

function showToast(title, detail, isError = false) {
  if (!toastRegion) return;
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast-error" : ""}`;
  const strong = document.createElement("strong");
  const span = document.createElement("span");
  strong.textContent = title;
  span.textContent = detail;
  toast.append(strong, span);
  toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}
