import { describe, it, expect } from 'vitest';
import {
  hasQualifier,
  isComingSoon,
  computePriceDisplay,
  isOfferEligible,
  parseUpsellPrice,
} from './upsell.js';

describe('parseUpsellPrice', () => {
  it('returns null for null metafield', () => {
    expect(parseUpsellPrice(null)).toBe(null);
  });
  it('returns null for blank value', () => {
    expect(parseUpsellPrice({ value: '' })).toBe(null);
  });
  it('returns null for zero', () => {
    expect(parseUpsellPrice({ value: '0' })).toBe(null);
  });
  it('returns null for negative value', () => {
    expect(parseUpsellPrice({ value: '-5' })).toBe(null);
  });
  it('returns null for non-numeric value', () => {
    expect(parseUpsellPrice({ value: 'abc' })).toBe(null);
  });
  it('returns the parsed number for a valid price', () => {
    expect(parseUpsellPrice({ value: '19.0' })).toBe(19);
  });
});

describe('hasQualifier', () => {
  it('true when a cart product has no upsell price', () => {
    expect(hasQualifier([{ upsellPrice: null }, { upsellPrice: 19 }])).toBe(true);
  });
  it('false when every cart product is an upsell product', () => {
    expect(hasQualifier([{ upsellPrice: 8 }, { upsellPrice: 19 }])).toBe(false);
  });
  it('false for an empty cart', () => {
    expect(hasQualifier([])).toBe(false);
  });
  it('true when an entry is undefined (unknown product = not an upsell product)', () => {
    expect(hasQualifier([undefined])).toBe(true);
  });
});

describe('isComingSoon', () => {
  it('matches common spellings', () => {
    expect(isComingSoon(['coming-soon'])).toBe(true);
    expect(isComingSoon(['Coming Soon'])).toBe(true);
  });
  it('false when absent', () => {
    expect(isComingSoon(['bestseller'])).toBe(false);
    expect(isComingSoon([])).toBe(false);
  });
});

describe('computePriceDisplay', () => {
  it('shows upsell price as current with compare-at when lower', () => {
    expect(computePriceDisplay({ variantPriceCents: 2400, upsellPrice: 19 }))
      .toEqual({ currentCents: 1900, compareAtCents: 2400 });
  });
  it('no compare-at when upsell price is not lower', () => {
    expect(computePriceDisplay({ variantPriceCents: 1900, upsellPrice: 19 }))
      .toEqual({ currentCents: 1900, compareAtCents: null });
  });
  it('falls back to variant price when no upsell price', () => {
    expect(computePriceDisplay({ variantPriceCents: 2400, upsellPrice: null }))
      .toEqual({ currentCents: 2400, compareAtCents: null });
  });
});

describe('isOfferEligible', () => {
  const offer = { productId: 'gid://shopify/Product/1', available: true, comingSoon: false };
  it('eligible when available, not coming soon, not in cart', () => {
    expect(isOfferEligible(offer, [])).toBe(true);
  });
  it('not eligible when already in cart', () => {
    expect(isOfferEligible(offer, ['gid://shopify/Product/1'])).toBe(false);
  });
  it('not eligible when unavailable', () => {
    expect(isOfferEligible({ ...offer, available: false }, [])).toBe(false);
  });
  it('not eligible when coming soon', () => {
    expect(isOfferEligible({ ...offer, comingSoon: true }, [])).toBe(false);
  });
});
