const COMING_SOON_TAGS = ['coming-soon', 'Coming soon', 'coming soon', 'Coming Soon'];

// A "qualifier" is any cart product without an upsell price — the discount
// function only applies its deal when the cart holds at least one of these.
export function hasQualifier(cartProducts) {
  return cartProducts.some((p) => p.upsellPrice == null);
}

export function isComingSoon(tags) {
  return tags.some((tag) => COMING_SOON_TAGS.includes(tag));
}

// Mirrors snippets/sidecart-upsell-item.liquid: upsell_price (dollars) is the
// shown price; the regular variant price is struck through only when higher.
export function computePriceDisplay({ variantPriceCents, upsellPrice }) {
  if (upsellPrice == null) {
    return { currentCents: variantPriceCents, compareAtCents: null };
  }
  const currentCents = Math.round(upsellPrice * 100);
  const compareAtCents = currentCents < variantPriceCents ? variantPriceCents : null;
  return { currentCents, compareAtCents };
}

export function isOfferEligible(offer, cartProductIds) {
  return offer.available && !offer.comingSoon && !cartProductIds.includes(offer.productId);
}
