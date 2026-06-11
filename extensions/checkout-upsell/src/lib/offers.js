import { isComingSoon, parseUpsellPrice } from './upsell.js';

// Storefront API query: fetch offer variants by id with the fields the card needs.
export const OFFER_QUERY = `
  query OfferVariants($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        price { amount currencyCode }
        image { url }
        product {
          id
          title
          tags
          metafield(namespace: "custom", key: "upsell_price") { value }
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
