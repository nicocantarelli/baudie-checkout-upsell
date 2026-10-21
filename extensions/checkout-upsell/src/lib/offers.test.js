import { describe, it, expect } from 'vitest';
import { OFFER_QUERY, mapVariantNode, offerVariantIds } from './offers.js';

describe('OFFER_QUERY', () => {
  it('requests the fields the card needs', () => {
    expect(OFFER_QUERY).toContain('availableForSale');
    expect(OFFER_QUERY).toContain('price { amount currencyCode }');
    expect(OFFER_QUERY).toContain('image { url(transform: { maxWidth: 192, maxHeight: 192 }) }');
    expect(OFFER_QUERY).toContain('tags');
    expect(OFFER_QUERY).toContain('metafield(namespace: "custom", key: "upsell_price")');
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
      currencyCode: 'USD',
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
      currencyCode: 'USD',
      upsellPrice: null,
    });
  });
  it('returns null for an empty object (non-variant node shape)', () => {
    expect(mapVariantNode({})).toBe(null);
  });
});

describe('offerVariantIds', () => {
  const shopOffers = (value) => ({
    target: { type: 'shop', id: 'gid://shopify/Shop/1' },
    metafield: { namespace: 'baudie', key: 'upsell_offers', value },
  });
  const offers = {
    offers: [
      { productId: 'gid://shopify/Product/1', variantId: 'gid://shopify/ProductVariant/10' },
      { productId: 'gid://shopify/Product/2', variantId: 'gid://shopify/ProductVariant/20' },
    ],
    dealProductIds: ['gid://shopify/Product/1', 'gid://shopify/Product/2'],
  };

  it('reads the offered variants, in order, from the shop metafield', () => {
    expect(offerVariantIds([shopOffers(JSON.stringify(offers))])).toEqual([
      'gid://shopify/ProductVariant/10',
      'gid://shopify/ProductVariant/20',
    ]);
  });

  it('accepts an already parsed value', () => {
    expect(offerVariantIds([shopOffers(offers)])).toEqual([
      'gid://shopify/ProductVariant/10',
      'gid://shopify/ProductVariant/20',
    ]);
  });

  it('ignores product metafields and other keys', () => {
    const productEntry = {
      target: { type: 'product', id: 'gid://shopify/Product/1' },
      metafield: { namespace: 'custom', key: 'upsell_price', value: '8.0' },
    };
    expect(offerVariantIds([productEntry])).toEqual([]);
  });

  it('offers nothing when the metafield is missing, unreadable or empty', () => {
    expect(offerVariantIds([])).toEqual([]);
    expect(offerVariantIds([shopOffers('not json')])).toEqual([]);
    expect(offerVariantIds([shopOffers(JSON.stringify({ offers: [], dealProductIds: [] }))])).toEqual([]);
  });
});
