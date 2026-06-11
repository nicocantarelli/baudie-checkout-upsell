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

export function isComingSoon(tags) {
  return tags.some((tag) => COMING_SOON_TAGS.includes(tag));
}

// Mirrors snippets/sidecart-upsell-item.liquid: upsell_price (dollars) is the
// shown price; the regular variant price is struck through only when higher.
// Clamps currentCents to variantPriceCents: the discount only applies when
// upsell_price < variant price, so a misconfigured higher value would never
// reduce the charge — capping ensures the display matches what the buyer pays.
export function computePriceDisplay({ variantPriceCents, upsellPrice }) {
  if (upsellPrice == null) {
    return { currentCents: variantPriceCents, compareAtCents: null };
  }
  const currentCents = Math.min(Math.round(upsellPrice * 100), variantPriceCents);
  const compareAtCents = currentCents < variantPriceCents ? variantPriceCents : null;
  return { currentCents, compareAtCents };
}

export function isOfferEligible(offer, cartProductIds) {
  return offer.available && !offer.comingSoon && !cartProductIds.includes(offer.productId);
}
