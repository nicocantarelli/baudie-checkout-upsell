# Baudie Checkout Upsell — Shopify Checkout UI Extension

Checkout UI extension that renders upsell offer cards inside Shopify checkout for the **Baudie** storefront ([baudie.com](https://baudie.com)). Extension-only app (no server) built with Shopify's checkout extensibility stack.

Works as one half of a two-app system with [baudie-discounts](https://github.com/nicocantarelli/baudie-discounts): this extension *shows* the deal in checkout, the discount function *enforces* it server-side.

Designed and built by Nicolas Cantarelli.

## How it works

- **Offers come from the admin** — the products to offer are the `baudie.upsell_offers` shop metafield, saved on the Upsell deals page of the [Baudie Gifts & Deals app](https://github.com/nicocantarelli/baudie-discounts) (Apps → Baudie Gifts & Deals → Upsell deals, the *Offer in the cart and checkout* switch on each deal product). The theme's cart drawer reads the same metafield, so both always offer the same products. The checkout editor only holds the block's on/off switch and heading
- Fetches the offer variants through the **Storefront API from within checkout** (image, availability, price, and the product's `upsell_price` metafield in one query), priced for the checkout's country with `@inContext(country:)`: without it the Storefront API answers in the shop's default market. The query runs again when the buyer changes country in checkout
- Renders offer cards with the deal price and the regular price struck through — one-tap add straight into the checkout's cart lines
- **`custom.upsell_price` metafield contract** — a product carrying this metafield is an "upsell product" and its value is the deal price; a product without it is a *qualifier*. Offers only render when the cart holds at least one qualifier, mirroring the discount function's rule exactly (the two implementations must stay in sync — both codebases say so in comments). Free gift lines (the theme's `_gift` attribute) never count as a qualifier, and never make an offer "already in the cart"
- **Prices in the customer's currency** — `upsell_price` is in the shop's currency (USD) and is shown as-is there. In any other currency the deal takes the same share off the variant's price in the buyer's market, as the Storefront API returns it (price lists and rounding included): *market price × `upsell_price` ÷ the variant's shop-currency price*. The shop-currency prices are the `shopCurrency` and `basePrices` saved in the `baudie.upsell_offers` shop metafield by the Upsell deals page; no exchange-rate math. The deal is rounded to what the currency can charge: the nearest cent, or the nearest whole unit in a currency without cents such as yen or won (`WHOLE_UNIT_CURRENCIES` in `src/lib/upsell.js`), as Shopify charges those. The discount function and the theme's cart drawer compute the same cents from the same numbers, with the same rounding, so the card shows exactly what's charged (the three implementations must stay in sync). Until the page has saved those prices, all three keep the deal price as saved in every currency, so saving the page switches them over together. An offer whose Storefront price isn't in the checkout's currency isn't shown
- **Price-display safety** — in the shop's currency the shown price is clamped to the variant price: since the discount only applies when `upsell_price` is *below* the regular price, a misconfigured higher value can never change what the buyer pays, and the clamp guarantees the card never displays a price that won't be honored. In another currency, a deal that doesn't apply (no saved shop-currency price for the variant) shows the regular price, as charged
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
    │       ├── offers.js                # Offers metafield, Storefront query +
    │       │                            #   variant mapping
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
