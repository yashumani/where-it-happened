# Where It Happened

A mobile-first memory-map studio and storefront. Visitors can search for a meaningful place, design a personalized poster, save exact design snapshots to a browser cart, compare digital products, and continue to hosted checkout after seller-owned payment links are connected.

Live preview: `https://yashumani.github.io/where-it-happened/`

## Current development status

The public storefront is live. Secure payment is intentionally disabled because the three hosted checkout URLs in `store-config.js` are still blank. The checkout review now provides a transparent order-request fallback that downloads a complete order brief without collecting payment.

## What works now

### Discovery and design

- Editorial landing page with six one-click story presets
- Prominent hero search
- Built-in search across 50+ international cities
- Global city, neighborhood, and landmark search through Wikipedia coordinates
- Browser geolocation and manual latitude/longitude entry
- Live MapLibre map using OpenFreeMap styles
- Editable title, place line, date, heading, and dedication
- Seven story presets, five map moods, three layouts, and three formats
- Direct map pan/zoom, marker toggle, label toggle, and recenter
- Automatic browser draft saving
- Stateful design sharing through a compact URL hash
- Free watermarked PNG and print/PDF previews

### Store and conversion

- Three product tiers: Digital Keepsake, Print-Ready Pack, and Gift Edition
- Product comparison and recommended-use guidance
- Persistent browser cart with exact design snapshots
- Multiple custom designs in one cart
- Product switching, editing, removal, and subtotal calculation
- Cart-recovery banner
- Cart backup download and restore
- Optional name, email, gift recipient, and order note fields stored locally
- Complete order brief with restorable design links
- Hosted-checkout adapter for Payhip
- Safe order-request download while payment links are unconfigured
- Clear store-status messaging so preview users are not misled
- Delivery timeline and FAQ sections

### Trust and launch readiness

- Privacy, terms, refund, and delivery pages
- No account, custom backend, analytics, or database
- No card details collected by the website
- Policy version included in order briefs
- Responsive behavior from 320px phones through desktop

## Design and performance architecture

- `site.css` is the production stylesheet served by every public page. It is generated from the maintainable source styles with `node build-site-css.mjs`, eliminating runtime stylesheet injection and first-paint layout shifts.
- The first screen does not download MapLibre. The map engine and its stylesheet are loaded on demand as the creator approaches the viewport or the visitor starts a creator action.
- The seven-step studio and scroll-storytelling modules are deferred until they are useful.
- Scroll effects are gated by visibility, batched with `requestAnimationFrame`, and disabled for reduced-motion visitors.
- The storefront, comparison, cart-recovery, checkout-details, FAQ, and policy links are present in the static HTML so they do not move the page after JavaScript starts.
- The checkout-return page accepts the current and legacy local order shapes, but it never treats local browser state as proof of payment.

Rebuild the production stylesheet after changing any source CSS file:

```bash
node build-site-css.mjs
```

## Run locally

The site uses JavaScript modules, so serve the folder instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Activate real payments

Create three matching digital products in Payhip or another hosted checkout provider:

1. Digital Keepsake — USD 7
2. Print-Ready Pack — USD 12
3. Gift Edition — USD 18

Paste each public product or direct-checkout URL into `store-config.js`:

```js
checkoutUrl: "https://payhip.com/buy?link=YOUR_PRODUCT_CODE"
```

No private API secret belongs in this repository. The complete seller checklist is in [PAYMENTS_SETUP.md](PAYMENTS_SETUP.md).

## Static-MVP fulfillment model

Each cart item contains a restorable design URL. Before hosted checkout opens, the site copies a human-readable order brief containing the product, price, design details, coordinates, and design link. For Payhip, create a required custom checkout question named `Design details` and ask the buyer to paste the brief.

Until automatic payment verification and file generation are added, paid files require manual review and delivery. The target delivery window presented by the storefront is 2–3 business days after payment and complete design details are received.

## File map

- `index.html` — landing page, shop, creator, cart, and checkout dialogs
- `site.css` — generated production stylesheet loaded by public pages
- `styles.css` — core responsive design system and map-poster layouts
- `storefront-v2.css` — conversion, checkout, policy, and cart-recovery source styles
- `atelier-*.css`, `studio-wizard.css`, `scroll-story.css`, `site-polish.css` — editorial, guided-creator, motion, and final production source styles
- `build-site-css.mjs` — deterministic stylesheet bundler
- `app.js` — design state, place search, lazy map integration, persistence, sharing, and preview export
- `atelier.js` — deferred presentation orchestration
- `studio-wizard.js` — lazy seven-step creator flow
- `scroll-story.js` — visibility-gated scroll storytelling
- `commerce.js` — product selection, browser cart, order details, backups, order requests, and checkout handoff
- `store-config.js` — product catalogue, prices, fulfillment details, policies, and hosted checkout URLs
- `cities.js` — built-in city catalogue
- `privacy.html`, `terms.html`, `refunds.html`, `delivery.html` — launch-readiness policies
- `thank-you.html`, `thank-you.js` — optional hosted-checkout return experience
- `PAYMENTS_SETUP.md` — merchant activation checklist
- `.github/workflows/pages.yml` — GitHub Pages deployment

## External runtime resources

- MapLibre GL JS from unpkg
- OpenFreeMap vector-map styles and tiles
- OpenStreetMap-derived map data
- Wikipedia Action API for notable-place search
- Payhip only after public checkout URLs are configured

## Important boundaries

- Browser storage is not a permanent customer account.
- Clearing site data can remove drafts, order notes, and cart items.
- Shared design URLs can be opened by anyone who receives them.
- The policy pages are public-preview launch drafts and must be reviewed before paid promotion.
- Automatic paid-file delivery requires a verified payment webhook and a small backend in a later cycle.

## Recommended next cycle

1. Create the three hosted-checkout products and add their public links.
2. Test an end-to-end low-value or coupon order.
3. Add a dedicated business-support email.
4. Decide whether fulfillment remains manual or moves to a lightweight webhook service.
5. Add a custom domain and move commercial traffic to a host intended for business use.
