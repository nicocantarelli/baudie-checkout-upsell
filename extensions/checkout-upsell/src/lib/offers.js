import { dealPricing, isComingSoon, parseUpsellPrice, UPSELL_NAMESPACE, UPSELL_KEY } from './upsell.js';

// The products to offer: the `baudie.upsell_offers` shop metafield (JSON),
// saved on the Upsell deals page of the Baudie Gifts & Deals app
// (baudie-discounts). The theme's cart drawer reads the same metafield, so the
// drawer and checkout always offer the same products. It also holds the deal
// pricing for other currencies (`shopCurrency`, `basePrices`), which the
// discount function reads too.
export const OFFERS_NAMESPACE = 'baudie';
export const OFFERS_KEY = 'upsell_offers';

// The shop metafield's parsed value from appMetafields, or null when it's
// missing or unreadable.
function upsellOffersValue(appMetafields) {
  const entry = appMetafields.find(
    (candidate) =>
      candidate.target.type === 'shop' &&
      candidate.metafield.namespace === OFFERS_NAMESPACE &&
      candidate.metafield.key === OFFERS_KEY,
  );
  let value = entry?.metafield.value;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' ? value : null;
}

// The variant ids to offer, in order, from the shop metafield in
// appMetafields. Empty when it's missing or unreadable.
export function offerVariantIds(appMetafields) {
  const value = upsellOffersValue(appMetafields);
  if (!value || !Array.isArray(value.offers)) return [];
  return value.offers.map((offer) => offer?.variantId).filter(Boolean);
}

// The deal pricing saved with the offers (see dealPricing in ./upsell.js).
export function offersDealPricing(appMetafields) {
  return dealPricing(upsellOffersValue(appMetafields));
}

// Storefront API query: fetch offer variants by id with the fields the card needs.
export const OFFER_QUERY = `
  query OfferVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        price { amount currencyCode }
        image { url(transform: { maxWidth: 192, maxHeight: 192 }) }
        product {
          id
          title
          tags
          metafield(namespace: "${UPSELL_NAMESPACE}", key: "${UPSELL_KEY}") { value }
        }
      }
    }
  }
`;

function toCents(amount) {
  return Math.round(parseFloat(amount) * 100);
}

export function mapVariantNode(node) {
  if (!node || !node.product) return null;
  return {
    variantId: node.id,
    productId: node.product.id,
    title: node.product.title,
    available: Boolean(node.availableForSale),
    comingSoon: isComingSoon(node.product.tags || []),
    imageUrl: node.image?.url ?? null,
    variantPriceCents: toCents(node.price.amount),
    currencyCode: node.price.currencyCode,
    upsellPrice: parseUpsellPrice(node.product.metafield),
  };
}
