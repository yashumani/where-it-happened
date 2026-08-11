# Where It Happened

A mobile-first memory-map storefront and poster creator. Visitors can search for a meaningful place, personalize a map, choose a finished-file package, keep several designs in a local cart, and continue to a hosted checkout once the seller product keys are connected.

## What works now

### Discovery and creation

- Premium editorial landing page with direct calls to action
- Explicit worldwide place search, plus a built-in catalogue of 50+ cities
- Optional “use my location” action
- Live MapLibre map using OpenFreeMap styles without an API key
- Manual latitude/longitude entry for any exact coordinate
- Editable title, place line, date, heading, and dedication
- Seven story presets, five map moods, three layouts, and three formats
- Direct map pan/zoom, marker toggle, label toggle, and recenter
- Automatic design saving in `localStorage`
- Stateful sharing through a compact URL hash
- Designed offline fallback when live map resources cannot load

### Store and conversion

- Three configurable digital products at $7, $12, and $18
- Product-selection cards on the landing page and inside the editor
- Persistent cart stored in the buyer’s browser
- Multiple custom designs in one cart
- Edit and remove actions for every cart item
- Calculated subtotal and checkout review
- Order packet containing the exact restorable design links
- Payhip direct-checkout adapter, including multi-item checkout and metadata
- Customer-friendly fallback while payment keys are not configured
- Checkout-success page that restores the pending order reference from local storage

### Preview protection

- Free PNG export remains available as a clearly watermarked preview
- Browser print/PDF preview is also watermarked
- Finished watermark-free products are represented separately in the store

## Current activation boundary

The storefront, cart, pricing, order packet, and checkout handoff are implemented. Actual card/PayPal payment becomes active after the three seller-owned Payhip product keys are placed in `store-config.js`.

See [CHECKOUT_SETUP.md](./CHECKOUT_SETUP.md) for the exact account and product setup.

## Run locally

The site uses JavaScript modules, so serve the folder rather than opening `index.html` directly.

```bash
cd where-it-happened
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Search implementation

Worldwide search uses the public OpenStreetMap Nominatim endpoint only when a visitor explicitly submits a query. It does **not** use remote autocomplete.

The current guardrails are:

- one remote request at a time
- at least 1.1 seconds between requests
- local browser caching for repeated searches
- built-in city results shown before remote results
- visible OpenStreetMap attribution
- a single endpoint constant that can be changed quickly if the service must be replaced

This is suitable only for a moderate early-stage MVP. Move to a dedicated geocoding provider or proxy before meaningful traffic or paid promotion.

## Checkout architecture

The buyer’s design remains client-side. When an item is added to the cart, the app stores a sanitized snapshot of the design in `localStorage`. At checkout it creates:

1. A human-readable order reference
2. A restorable link for every map design
3. A cart subtotal
4. A hosted Payhip checkout URL
5. Compact checkout metadata for a future webhook workflow

The intended first operational model is **custom digital fulfillment**: the buyer pastes the generated order packet into a required Payhip checkout question, and the finished files are delivered manually after purchase.

## File map

- `index.html` — landing page, shop, editor, cart, and checkout UI
- `styles.css` — responsive design system, cart, product, and confirmation layouts
- `app.js` — map state, search, cart, checkout, sharing, persistence, and export
- `store-config.js` — product catalogue, pricing, currency, and Payhip keys
- `cities.js` — built-in city catalogue
- `thank-you.html` / `thank-you.js` — checkout-success experience
- `CHECKOUT_SETUP.md` — payment activation instructions
- `_headers` — Cloudflare-compatible CSP and permissions policy
- `assets/favicon.svg` — provisional brand mark

## External runtime resources

- MapLibre GL JS from unpkg
- OpenFreeMap vector-map styles and tiles
- OpenStreetMap-derived map data
- OpenStreetMap Nominatim for explicit worldwide search
- Payhip for hosted checkout after configuration

## Free deployment

### Current preview: GitHub Pages

The included `.github/workflows/pages.yml` publishes every push to `main`.

### Recommended commercial host: Cloudflare Pages

Before public promotion, connect this repository to Cloudflare Pages. There is no build command and the publish directory is the repository root. The included `_headers` file is prepared for the map and search connections.

## Validation completed

- JavaScript syntax checks
- CSS parser checks
- duplicate-ID and local-file-reference checks
- browser interaction test for search, product selection, cart, duplicate prevention, checkout review, and mobile layout
- 390px mobile overflow check

A final real-payment test must be completed after Payhip keys are added.
