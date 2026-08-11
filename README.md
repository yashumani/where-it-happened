# Where It Happened

A mobile-first memory-map studio and storefront. Visitors can search for a meaningful place, design a personalized poster, save exact design snapshots to a browser cart, and continue to a hosted checkout once payment links are configured.

Live preview: `https://yashumani.github.io/where-it-happened/`

## What works now

- Editorial landing page with six one-click example stories
- Prominent hero search that sends visitors directly into the creator
- Fast built-in search across 50+ international cities
- Global city, neighborhood, and landmark search through Wikipedia coordinates
- Browser geolocation and manual latitude/longitude entry
- Live MapLibre map using OpenFreeMap styles, with no map API key
- Editable title, place line, date, small heading, and dedication
- Seven story presets, five map moods, three layouts, and three formats
- Direct map pan/zoom, marker toggle, label toggle, and recenter
- Automatic design saving in `localStorage`
- Stateful sharing through a compact URL hash
- Three product tiers: Digital Keepsake, Print-Ready Pack, and Gift Edition
- Persistent browser cart storing the exact design state and restorable design URL
- Cart editing, product switching, removal, subtotal, and order-brief copying
- Free watermarked PNG and print/PDF previews
- Hosted-checkout handoff prepared for Payhip or Stripe Payment Links
- Responsive behavior for 320px phones through desktop
- Designed offline fallback when live map resources cannot load
- No account, custom backend, analytics, or database

## Run locally

The site uses JavaScript modules, so serve the folder rather than opening `index.html` directly.

```bash
cd where-it-happened
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Activate real payments

The cart and checkout handoff are implemented, but checkout URLs are deliberately blank until the merchant account and products exist. The complete seller checklist is in [PAYMENTS_SETUP.md](PAYMENTS_SETUP.md).

The lowest-cost recommended setup is Payhip's free plan. Create these three products using the same names and prices shown on the site:

1. Digital Keepsake — USD 7
2. Print-Ready Pack — USD 12
3. Gift Edition — USD 18

For each product, copy its product URL or direct checkout URL and paste it into `store-config.js`:

```js
checkoutUrl: "https://payhip.com/buy?link=YOUR_PRODUCT_CODE"
```

No private API secret belongs in this repository. Hosted checkout URLs are public links and are safe to keep in the static configuration.

The checkout module can send one item directly to Payhip or combine different configured products in one hosted checkout. It copies an order brief first and adds a safe order reference as checkout metadata. Repeated personalized copies of the same product should be purchased in separate checkouts during this static MVP so the hosted-cart quantity always matches the design brief.

## Product-delivery workflow for the MVP

Each cart item includes a restorable design URL. In Payhip, enable a required **Custom Checkout Question** named `Design details` and ask the buyer to paste the order brief copied by this website. This lets the seller reopen every exact map, wording choice, map position, theme, layout, and format after purchase. For a custom digital product, upload a small placeholder PDF that confirms the expected delivery timeframe while the personalized files are prepared.

The public free preview is intentionally watermarked. Paid deliverables should be generated without the preview flag after the order is verified. A secure automatic unlock requires a small backend or payment webhook and is outside a purely static GitHub Pages deployment.

## Free deployment choices

### Current preview: GitHub Pages

The included `.github/workflows/pages.yml` publishes every update to `main`.

### Recommended long-term public host: Cloudflare Pages

Connect this repository to Cloudflare Pages. There is no build command and the publish directory is the repository root. The included `_headers` file adds security and permissions headers on hosts that support it.

## Architecture

This remains intentionally build-free:

- `index.html` — semantic landing page, shop, editor, cart, and dialogs
- `styles.css` — responsive design system, poster layouts, shop, and cart styling
- `app.js` — design state, place search, map integration, persistence, sharing, and preview export
- `commerce.js` — product selection, browser cart, order handoff, and checkout readiness
- `store-config.js` — product names, prices, features, and hosted checkout URLs
- `PAYMENTS_SETUP.md` — seller-owned Payhip activation and test-order checklist
- `cities.js` — built-in zero-cost city catalogue
- `assets/favicon.svg` — original provisional brand mark

External runtime resources:

- MapLibre GL JS from unpkg
- OpenFreeMap vector-map styles and tiles
- OpenStreetMap-derived map data
- Wikipedia Action API for notable-place search

Poster and cart content stay in the browser unless the visitor shares a design link or continues to the external hosted checkout.

## Attribution

Keep the visible map attribution:

`OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors`

Global place-search results are attributed to Wikipedia in the interface and footer.

## Remaining launch work

1. Create the free hosted-checkout account and paste the three product links into `store-config.js`.
2. Add privacy, terms, refund, and delivery-policy pages.
3. Decide whether paid files are manually fulfilled or unlocked through a lightweight backend/webhook.
4. Test the live map, cart, preview exports, and checkout handoff on Safari/iPhone, Chrome/Android, and desktop browsers.
5. Move the commercial launch to a custom domain and a host intended for business use.
