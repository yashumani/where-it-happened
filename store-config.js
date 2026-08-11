/**
 * Public storefront configuration.
 *
 * Hosted checkout links are public configuration, not secrets. Create matching
 * products in Payhip (or replace these with another hosted checkout provider)
 * and paste the public checkout URLs below. Never add secret keys to this file.
 */
export const STORE_CONFIG = Object.freeze({
  currency: "USD",
  locale: "en-US",
  businessName: "Where It Happened",
  checkoutProvider: "Payhip",
  checkoutProviderUrl: "https://payhip.com/",
  supportEmail: "",
  orderRequestEnabled: true,
  fulfillmentMode: "manual-review",
  standardDeliveryWindow: "2–3 business days after complete order details are received",
  policyVersion: "2026-08-10",
  policies: Object.freeze({
    privacy: "./privacy.html",
    terms: "./terms.html",
    refunds: "./refunds.html",
    delivery: "./delivery.html"
  }),
  products: Object.freeze({
    digital: Object.freeze({
      id: "digital",
      name: "Digital Keepsake",
      shortName: "Digital",
      price: 7,
      badge: "Simple favorite",
      bestFor: "Sharing, wallpapers, and personal archives",
      description: "A clean, watermark-free map for sharing, screens, and personal archives.",
      delivery: "High-resolution PNG",
      turnaround: "2 business days",
      features: Object.freeze([
        "Watermark-free high-resolution PNG",
        "Your chosen poster format",
        "Personal-use license",
        "Restorable design link saved with the order"
      ]),
      checkoutUrl: ""
    }),
    printPack: Object.freeze({
      id: "printPack",
      name: "Print-Ready Pack",
      shortName: "Print pack",
      price: 12,
      badge: "Most popular",
      bestFor: "Printing at home, a local shop, or framing as a gift",
      description: "The flexible set for printing at home, through a local shop, or as a gift.",
      delivery: "PNG + print-ready PDF",
      turnaround: "2–3 business days",
      features: Object.freeze([
        "Everything in Digital Keepsake",
        "Print-ready PDF",
        "Portrait, square, and wallpaper versions",
        "Simple home-printing guide"
      ]),
      checkoutUrl: ""
    }),
    gift: Object.freeze({
      id: "gift",
      name: "Gift Edition",
      shortName: "Gift edition",
      price: 18,
      badge: "For meaningful gifts",
      bestFor: "Anniversaries, weddings, housewarmings, and milestone gifts",
      description: "A complete digital gift set with alternate captions and presentation files.",
      delivery: "Complete digital gift set",
      turnaround: "3 business days",
      features: Object.freeze([
        "Everything in Print-Ready Pack",
        "Three caption variations",
        "Gift-card image for sharing",
        "Priority design review before delivery"
      ]),
      checkoutUrl: ""
    })
  })
});

export const PRODUCT_LIST = Object.freeze(Object.values(STORE_CONFIG.products));
