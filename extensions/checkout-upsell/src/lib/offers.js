import { isComingSoon } from './upsell.js';

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

function parseUpsellPrice(metafield) {
  if (!metafield || metafield.value == null || metafield.value === '') return null;
  const v = parseFloat(metafield.value);
  return v > 0 ? v : null;
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
    upsellPrice: parseUpsellPrice(node.product.metafield),
  };
}
