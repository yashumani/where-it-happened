/**
 * Store configuration for the static MVP.
 *
 * Hosted checkout links are intentionally public configuration, not secrets.
 * Create matching products in Payhip (or replace these with Stripe Payment
 * Links) and paste the direct checkout URLs below to activate real payments.
 */
export const STORE_CONFIG = Object.freeze({
  currency: "USD",
  locale: "en-US",
  checkoutProvider: "Payhip",
  checkoutProviderUrl: "https://payhip.com/",
  products: Object.freeze({
    digital: Object.freeze({
      id: "digital",
      name: "Digital Keepsake",
      shortName: "Digital",
      price: 7,
      badge: "Simple favorite",
      description: "A clean, watermark-free map for sharing, screens, and personal archives.",
      delivery: "High-resolution PNG",
      features: Object.freeze([
        "Watermark-free high-resolution PNG",
        "Your chosen poster format",
        "Personal-use license",
        "Design link saved with the order"
      ]),
      checkoutUrl: ""
    }),
    printPack: Object.freeze({
      id: "printPack",
      name: "Print-Ready Pack",
      shortName: "Print pack",
      price: 12,
      badge: "Most popular",
      description: "The flexible set for printing at home, through a local shop, or as a gift.",
      delivery: "PNG + print-ready PDF",
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
      description: "A complete digital gift set with alternate captions and presentation files.",
      delivery: "Complete digital gift set",
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
