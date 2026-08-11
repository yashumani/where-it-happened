export const STORE_CONFIG = Object.freeze({
  brand: "Where It Happened",
  currency: "USD",
  locale: "en-US",
  provider: "payhip",
  defaultProductId: "complete-digital",
  payhipCheckoutBase: "https://payhip.com/buy",
  checkoutSuccessPath: "./thank-you.html",
  products: Object.freeze([
    Object.freeze({
      id: "hd-digital",
      name: "HD Digital Map",
      shortName: "HD Digital",
      price: 7,
      payhipKey: "REPLACE_WITH_PAYHIP_HD_KEY",
      eyebrow: "One finished file",
      description: "A clean, watermark-free high-resolution PNG in your chosen format.",
      delivery: "Custom digital delivery",
      includes: Object.freeze([
        "One selected format",
        "High-resolution PNG",
        "No preview watermark"
      ])
    }),
    Object.freeze({
      id: "complete-digital",
      name: "Complete Digital Set",
      shortName: "Complete Set",
      price: 12,
      payhipKey: "REPLACE_WITH_PAYHIP_COMPLETE_KEY",
      eyebrow: "Most popular",
      description: "Your map prepared as a portrait poster, square post, and phone wallpaper.",
      delivery: "Custom digital delivery",
      featured: true,
      includes: Object.freeze([
        "Portrait, square, and wallpaper",
        "Three watermark-free PNGs",
        "Ready for sharing and gifting"
      ])
    }),
    Object.freeze({
      id: "print-ready",
      name: "Print-Ready Gift Set",
      shortName: "Print-Ready",
      price: 18,
      payhipKey: "REPLACE_WITH_PAYHIP_PRINT_KEY",
      eyebrow: "Made for framing",
      description: "A polished print bundle prepared for popular frame and home-printer sizes.",
      delivery: "Custom digital delivery",
      includes: Object.freeze([
        "High-resolution PNG and PDF",
        "8×10, 11×14, and A4 files",
        "Watermark-free print artwork"
      ])
    })
  ])
});

export const PRODUCT_BY_ID = Object.freeze(
  Object.fromEntries(STORE_CONFIG.products.map((product) => [product.id, product]))
);

export function isPayhipProductConfigured(product) {
  return Boolean(
    product?.payhipKey &&
      !product.payhipKey.startsWith("REPLACE_WITH_") &&
      /^[A-Za-z0-9_-]{3,}$/.test(product.payhipKey)
  );
}
