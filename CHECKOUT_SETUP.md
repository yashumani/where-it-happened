# Activate the checkout

The website code is ready for a free-to-start Payhip checkout. This setup must be completed in the owner’s Payhip account because payments, payout details, tax settings, buyer emails, and product ownership cannot be created safely from the public website code.

## 1. Create the seller account

Create a Payhip account and remain on the Free Forever plan while validating demand. Connect either Stripe or PayPal for payouts before accepting a live order.

## 2. Create three digital products

Create these as **Digital Product** listings:

| Website product | Payhip title | Price |
|---|---|---:|
| `hd-digital` | HD Digital Map | $7 |
| `complete-digital` | Complete Digital Set | $12 |
| `print-ready` | Print-Ready Gift Set | $18 |

Recommended settings:

- Visibility: **Unlisted** while testing
- Product type: custom digital order
- Upload: a simple placeholder instruction file explaining that the finished custom artwork will be sent separately
- Delivery expectation: choose a realistic turnaround before publishing, such as 24, 48, or 72 hours
- Refund policy: write a clear custom-product policy before launch

## 3. Add the required checkout question

In Payhip:

1. Open **Account → Settings → Advanced Settings**.
2. Find **Checkout Settings**.
3. Enable custom checkout questions.
4. Add a required text question for the three products.
5. Use this label:

```text
Design details — paste the complete order block copied from Where It Happened
```

Complete a test order packet before launch to confirm the field accepts the full text for the maximum cart size you plan to allow.

## 4. Copy the product keys

A Payhip product URL resembles:

```text
https://payhip.com/b/AbC12
```

The product key is the final value—in this example, `AbC12`.

Open `store-config.js` and replace:

```js
REPLACE_WITH_PAYHIP_HD_KEY
REPLACE_WITH_PAYHIP_COMPLETE_KEY
REPLACE_WITH_PAYHIP_PRINT_KEY
```

with the three actual product keys. Do not place Stripe, PayPal, API, or webhook secret keys in this public repository.

## 5. Configure the success redirect

Set the Payhip checkout success redirect to:

```text
https://yashumani.github.io/where-it-happened/thank-you.html
```

The confirmation page reads the locally stored order reference and reminds the buyer that custom finished files arrive separately.

## 6. Test before announcing the store

Use a low-value test or temporary discount and verify:

- one product opens the correct direct checkout
- a mixed cart includes all selected products
- the generated order packet can be pasted into the required question
- the checkout email contains the buyer’s answer
- the success redirect opens
- the order reference appears on the confirmation page
- the seller can open every design link and reproduce the chosen map
- the buyer receives the correct files and support contact information

## 7. Fulfillment workflow for the MVP

For each paid order:

1. Open the order in Payhip.
2. Copy the buyer’s “Design details” answer.
3. Open each restorable design link.
4. Export or prepare the purchased files.
5. Email the finished files to the buyer.
6. Record the order reference as fulfilled.

This manual workflow avoids backend and automation costs while demand is still being validated. Add webhooks, cloud storage, automatic rendering, and account history only after real order volume justifies them.
