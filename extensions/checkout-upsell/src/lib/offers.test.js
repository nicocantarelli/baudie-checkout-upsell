import { describe, it, expect } from 'vitest';
import { OFFER_QUERY, mapVariantNode } from './offers.js';

describe('OFFER_QUERY', () => {
  it('requests the fields the card needs', () => {
    for (const field of ['price', 'availableForSale', 'image', 'metafield', 'tags']) {
      expect(OFFER_QUERY).toContain(field);
    }
  });
});

describe('mapVariantNode', () => {
  it('maps a Storefront variant node to offer data', () => {
    const node = {
      id: 'gid://shopify/ProductVariant/10',
      availableForSale: true,
      price: { amount: '24.0', currencyCode: 'USD' },
      image: { url: 'https://cdn/x.png' },
      product: {
        id: 'gid://shopify/Product/1',
        title: 'Wipes',
        tags: ['bestseller'],
        metafield: { value: '19.0' },
      },
    };
    expect(mapVariantNode(node)).toEqual({
      variantId: 'gid://shopify/ProductVariant/10',
      productId: 'gid://shopify/Product/1',
      title: 'Wipes',
      available: true,
      comingSoon: false,
      imageUrl: 'https://cdn/x.png',
      variantPriceCents: 2400,
      upsellPrice: 19,
    });
  });
  it('returns null for a missing node', () => {
    expect(mapVariantNode(null)).toBe(null);
  });
  it('treats a blank metafield as no upsell price', () => {
    const node = {
      id: 'gid://shopify/ProductVariant/10',
      availableForSale: false,
      price: { amount: '8.0', currencyCode: 'USD' },
      image: null,
      product: { id: 'gid://shopify/Product/2', title: 'X', tags: ['coming-soon'], metafield: null },
    };
    expect(mapVariantNode(node)).toEqual({
      variantId: 'gid://shopify/ProductVariant/10',
      productId: 'gid://shopify/Product/2',
      title: 'X',
      available: false,
      comingSoon: true,
      imageUrl: null,
      variantPriceCents: 800,
      upsellPrice: null,
    });
  });
});
