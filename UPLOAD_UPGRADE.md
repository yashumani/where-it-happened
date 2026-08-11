# Publish this storefront upgrade

This folder is ready to replace the current repository root.

## Easiest GitHub web upload

1. Open `yashumani/where-it-happened` on GitHub.
2. Choose **Add file → Upload files** on the `main` branch.
3. Drag the contents of this folder into the upload area.
4. Use the commit message: `Add storefront search and cart experience`.
5. Commit directly to `main`.
6. Open **Actions** and wait for **Deploy static site to GitHub Pages** to complete.

The new runtime files are `commerce.js` and `store-config.js`. `PAYMENTS_SETUP.md` contains the seller checkout checklist. Existing files that change are `index.html`, `styles.css`, `app.js`, `_headers`, `README.md`, and `site.webmanifest`.

Real card payments remain disabled until public hosted checkout URLs are pasted into `store-config.js`. No secret keys belong in this repository.
