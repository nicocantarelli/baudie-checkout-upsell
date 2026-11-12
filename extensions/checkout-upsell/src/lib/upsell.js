export const UPSELL_NAMESPACE = 'custom';
export const UPSELL_KEY = 'upsell_price';

const COMING_SOON_TAGS = ['coming-soon', 'Coming soon', 'coming soon', 'Coming Soon'];

// Parses the upsell_price metafield value. Mirrors the deal-price rule in
// baudie-discounts and MUST stay in sync: missing/blank/non-numeric/zero/negative
// → null. null means "not an upsell product" (= qualifier for the discount).
export function parseUpsellPrice(metafield) {
  if (!metafield || metafield.value == null || metafield.value === '') return null;
  const v = parseFloat(metafield.value);
  return v > 0 ? v : null;
}

// A "qualifier" is any cart product without an upsell price — the discount
// function only applies its deal when the cart holds at least one of these.
// Sparse/undefined entries count as qualifiers (unknown product = not upsell).
export function hasQualifier(cartProducts) {
  return cartProducts.some((p) => p?.upsellPrice == null);
}

// A free gift the theme added (a `_gift` line attribute). Gifts never count as
// the regular product the deal needs, and never make an offer "already in the
// cart": the customer didn't pick them. Mirrors baudie-discounts and the
// theme's cart drawer.
export function isGiftLine(line) {
  return (line?.attributes || []).some((attribute) => attribute.key === '_gift' && attribute.value);
}

export function isComingSoon(tags) {
  return tags.some((tag) => COMING_SOON_TAGS.includes(tag));
}

// The deal price in the customer's currency. upsell_price is in the shop's
// currency (USD); Shopify only localizes real variant prices (market price
// lists, rounding), so in another currency the deal takes the same share off
// the variant's price in that market:
//   deal = market price × upsell_price ÷ the variant's shop-currency price
// with the shop-currency prices saved in the `baudie.upsell_offers` shop
// metafield (`shopCurrency`, `basePrices`) by the Upsell deals page. Mirrors
// baudie-discounts (extensions/discount-function/src/upsell_price.js) and the
// theme's snippets/sidecart-upsell-item.liquid, and MUST stay in sync: all
// three compute the same cents, so the shown price is exactly the charge.

// Before the Upsell deals page saves the prices (no `shopCurrency`), every
// currency keeps the deal price as saved, in all three places alike.
const PRICES_NOT_SAVED = { shopCurrency: null, basePrices: {} };

// The deal pricing from the `baudie.upsell_offers` metafield's (parsed) value.
export function dealPricing(offersValue) {
  const shopCurrency = typeof offersValue?.shopCurrency === 'string' ? offersValue.shopCurrency : null;
  const basePrices =
    offersValue?.basePrices && typeof offersValue.basePrices === 'object' ? offersValue.basePrices : {};
  return { shopCurrency, basePrices };
}

function toCents(amount) {
  return Math.round(parseFloat(amount) * 100);
}

// The deal price in another currency, in cents, or null when the deal doesn't
// apply: no saved shop-currency price for the variant, or a deal price that
// isn't below it.
export function localDealCents(unitCents, dealPrice, basePrice) {
  if (basePrice == null) return null;
  const dealCents = toCents(dealPrice);
  const baseCents = toCents(basePrice);
  if (!(baseCents > 0) || !(dealCents > 0) || !(dealCents < baseCents)) return null;
  return Math.round((unitCents * dealCents) / baseCents);
}

// upsell_price is the shown price; the regular variant price is struck
// through only when higher. In the shop's currency, currentCents is clamped to
// variantPriceCents: the discount only applies when upsell_price < variant
// price, so a misconfigured higher value would never reduce the charge, and
// capping ensures the display matches what the buyer pays. In another
// currency, a deal that doesn't apply shows the regular price, as charged.
export function computePriceDisplay(
  { variantId, variantPriceCents, currencyCode, upsellPrice },
  pricing = PRICES_NOT_SAVED,
) {
  const regular = { currentCents: variantPriceCents, compareAtCents: null };
  if (upsellPrice == null) return regular;

  if (pricing.shopCurrency === null || currencyCode === pricing.shopCurrency) {
    const currentCents = Math.min(Math.round(upsellPrice * 100), variantPriceCents);
    const compareAtCents = currentCents < variantPriceCents ? variantPriceCents : null;
    return { currentCents, compareAtCents };
  }

  const dealCents = localDealCents(variantPriceCents, upsellPrice, pricing.basePrices[variantId]);
  if (dealCents === null || !(dealCents < variantPriceCents)) return regular;
  return { currentCents: dealCents, compareAtCents: variantPriceCents };
}

export function isOfferEligible(offer, cartProductIds) {
  return offer.available && !offer.comingSoon && !cartProductIds.includes(offer.productId);
}
