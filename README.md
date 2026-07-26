# Baudie Checkout Upsell — Shopify Checkout UI Extension

Checkout UI extension that renders upsell offer cards inside Shopify checkout for the **Baudie** storefront. Extension-only app (no server) built with Shopify's checkout extensibility stack.

Works as one half of a two-app system with [baudie-discounts](https://github.com/nicocantarelli/baudie-discounts): this extension *shows* the deal in checkout, the discount function *enforces* it server-side.

Designed and built by Nicolas Cantarelli for Lumios Digital.

## How it works

- Fetches the configured offer variants through the **Storefront API from within checkout** (image, availability, price, and the product's `upsell_price` metafield in one query)
- Renders offer cards with the deal price and the regular price struck through — one-tap add straight into the checkout's cart lines
- **`custom.upsell_price` metafield contract** — a product carrying this metafield is an "upsell product" and its value is the deal price; a product without it is a *qualifier*. Offers only render when the cart holds at least one qualifier, mirroring the discount function's rule exactly (the two implementations must stay in sync — both codebases say so in comments)
- **Price-display safety** — the shown price is clamped to the variant price: since the discount only applies when `upsell_price` is *below* the regular price, a misconfigured higher value can never change what the buyer pays, and the clamp guarantees the card never displays a price that won't be honored
- Products tagged `coming-soon` are excluded from offers
- The pure pricing/qualifier logic lives in `src/lib/` and is unit-tested (`offers.test.js`, `upsell.test.js`)

## Structure

```
baudie-checkout-upsell/
├── shopify.app.toml                     # App config (extension-only)
└── extensions/checkout-upsell/
    ├── shopify.extension.toml           # Checkout extension config
    ├── src/
    │   ├── Checkout.jsx                 # Extension entry — offer cards UI
    │   └── lib/
    │       ├── offers.js                # Storefront query + variant mapping
    │       ├── upsell.js                # Metafield contract, qualifier +
    │       │                            #   clamping rules
    │       └── *.test.js                # Unit tests for the above
    └── locales/en.default.json
```

## Development

```bash
npm install
shopify app dev        # Run against a dev store
shopify app deploy     # Release a new extension version
```

## License

All rights reserved. Published as a working reference — Baudie branding and store data belong to Baudie.
