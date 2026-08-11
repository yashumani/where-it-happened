# Activate the hosted checkout

The storefront and browser cart are already implemented. This setup connects them to a seller-owned Payhip checkout without adding a server, monthly hosting bill, or secret payment key to the website.

## 1. Create the three products

Create three **Digital Product** listings in Payhip:

| Product | Price | Suggested placeholder delivery note |
| --- | ---: | --- |
| Digital Keepsake | $7 USD | One watermark-free high-resolution PNG |
| Print-Ready Pack | $12 USD | High-resolution PNG and print-ready PDF |
| Gift Edition | $18 USD | Print files, presentation image, and caption options |

For a personalized digital order, upload a small placeholder PDF explaining that the final custom files will be emailed after the design is reviewed. State a realistic delivery window before accepting real orders.

## 2. Collect the exact design

In **Account → Settings → Advanced Settings → Checkout Settings**, enable custom checkout questions.

Add a required **Short Text Question** for all three products:

**Design details**

Suggested help text:

> Paste the complete order brief copied from Where It Happened. It includes the order reference and a restorable link for every map in this purchase.

The website copies this brief immediately before it opens checkout. Customers can paste it into this field.

## 3. Copy each public product link

Set each product to **Visible** or **Unlisted**. Invisible products cannot be purchased through a direct link.

Copy either the normal product URL or the direct checkout URL. A direct checkout URL looks like:

```text
https://payhip.com/buy?link=PRODUCT_KEY
```

Paste the three public links into `store-config.js`:

```js
checkoutUrl: "https://payhip.com/buy?link=YOUR_PRODUCT_KEY"
```

Only these public links belong in the repository. Never add a PayPal secret, Stripe secret, webhook secret, password, or personal access token.

## 4. Test before promotion

1. Use a low-value test product or coupon.
2. Build a map and add it to the cart.
3. Confirm that the order brief is copied and the Payhip checkout opens.
4. Confirm that the `Design details` response appears in the order.
5. Open the supplied design link and verify that the map restores correctly.
6. Deliver the custom file and test the refund process.

## Current static-MVP behavior

- One configured product can go directly to checkout.
- Different configured products can be combined in one Payhip checkout.
- Repeated custom designs using the same product should be purchased as separate orders for now.
- Fulfillment is manual because each final file is personalized.
- Automatic paid-file delivery would require a verified webhook and a small backend in a later cycle.
