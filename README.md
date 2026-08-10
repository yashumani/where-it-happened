# Where It Happened

A mobile-first, browser-only memory-map poster creator. The working name and all copy can be renamed later.

## What works now

- Editorial landing page with six one-click example stories
- Live MapLibre map using OpenFreeMap styles, with no API key
- Built-in searchable catalogue of 50+ international cities
- Manual latitude/longitude entry for any exact coordinate
- Editable title, place line, date, small heading, and dedication
- Seven story presets, five map moods, three layouts, and three formats
- Direct map pan/zoom, marker toggle, label toggle, and recenter
- Automatic draft saving in `localStorage`
- Stateful sharing through a compact URL hash
- High-resolution, browser-generated PNG export
- Browser print view for “Save as PDF”
- Responsive behavior for 320px phones through desktop
- Designed offline fallback when live map resources cannot load
- No account, database, analytics, email collection, or payment integration

## Run locally

The site uses JavaScript modules, so serve the folder rather than opening `index.html` directly.

```bash
cd where-it-happened
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Free deployment choices

### Recommended for the public MVP: Cloudflare Pages

Create a new Pages project and upload/connect this folder. There is no build command and the publish directory is the repository root. This is the cleanest fit for a static public MVP that may later become a business.

### Temporary prototype preview: GitHub Pages

1. Create an empty **public** GitHub repository.
2. Upload this entire folder to the repository root.
3. In **Settings → Pages**, choose **GitHub Actions** as the source.
4. Push to `main`. The included `.github/workflows/pages.yml` publishes the site.

GitHub documents usage restrictions for sites primarily used as an online business or SaaS, so use it as a preview environment rather than the long-term commercial host.

### Netlify

Create a new static-site project and upload/connect this folder. There is no build command and the publish directory is the repository root. Review the current free-plan limits before launch.

## Architecture

This is intentionally build-free:

- `index.html` — semantic page structure and editor controls
- `styles.css` — responsive design system and poster layouts
- `app.js` — state, map integration, accessibility, persistence, sharing, and export
- `cities.js` — built-in zero-cost city catalogue
- `assets/favicon.svg` — original provisional brand mark

External runtime resources:

- MapLibre GL JS from unpkg
- OpenFreeMap vector-map styles and tiles
- OpenStreetMap-derived map data

The export is composed locally on a high-resolution canvas. No poster content is uploaded by the app.

## Current MVP boundary

City search is deliberately local to avoid violating public geocoding-service policies or requiring a paid key. Users can still enter any latitude and longitude. A later cycle can add a swappable geocoding provider behind the existing location interface.

OpenFreeMap is a free public service without an SLA. The app therefore includes an offline/failure state, but a live internet connection is required for interactive map tiles.

## Important attribution

Keep the visible line:

`OpenFreeMap · OpenMapTiles · © OpenStreetMap contributors`

It appears in the editor and generated image.

## Recommended next development cycle

1. Confirm the final brand name and voice.
2. Add a free-key geocoder only after choosing its provider and reviewing its terms.
3. Test exported PNGs on Safari/iPhone, Chrome/Android, and desktop browsers.
4. Add custom-domain, privacy, and terms pages before public promotion.
5. Validate demand before adding accounts, payments, or physical print fulfillment.
