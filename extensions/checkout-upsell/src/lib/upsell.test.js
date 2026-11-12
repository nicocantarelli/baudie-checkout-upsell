import { describe, it, expect } from 'vitest';
import {
  hasQualifier,
  isGiftLine,
  isComingSoon,
  computePriceDisplay,
  dealPricing,
  isOfferEligible,
  localDealCents,
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
  it('clamps to variant price when upsell price is misconfigured higher', () => {
    expect(computePriceDisplay({ variantPriceCents: 1900, upsellPrice: 24 }))
      .toEqual({ currentCents: 1900, compareAtCents: null });
  });
});

// The same cases as the discount function's fixtures in baudie-discounts
// (tests/fixtures/cart-lines-upsell-deal-*.json): the card must show exactly
// what the discount charges.
describe('computePriceDisplay in other currencies', () => {
  const WIPES = 'gid://shopify/ProductVariant/20';
  const WIPES_3 = 'gid://shopify/ProductVariant/30';
  const saved = { shopCurrency: 'USD', basePrices: { [WIPES]: '10.00', [WIPES_3]: '24.00' } };
  const wipes = (variantPriceCents, currencyCode) => ({
    variantId: WIPES,
    variantPriceCents,
    currencyCode,
    upsellPrice: 8,
  });

  it('keeps the deal share of the market price: US$8 of US$10 is CA$11.40 of CA$14.25', () => {
    expect(computePriceDisplay(wipes(1425, 'CAD'), saved))
      .toEqual({ currentCents: 1140, compareAtCents: 1425 });
  });
  it('follows a rounded or price-list market price', () => {
    expect(computePriceDisplay(wipes(995, 'EUR'), saved))
      .toEqual({ currentCents: 796, compareAtCents: 995 });
    // €22.95 × 19 / 24 = €18.16875 → €18.17
    expect(computePriceDisplay({ variantId: WIPES_3, variantPriceCents: 2295, currencyCode: 'EUR', upsellPrice: 19 }, saved))
      .toEqual({ currentCents: 1817, compareAtCents: 2295 });
  });
  it("follows each variant's own saved price when a product's variants differ in price", () => {
    // One deal product at US$8 with a US$10 and a US$12 variant (fixture
    // cart-lines-upsell-deal-variants-at-different-prices.json).
    const variants = { shopCurrency: 'USD', basePrices: { [WIPES]: '10.00', [WIPES_3]: '12.00' } };
    expect(computePriceDisplay(wipes(1425, 'CAD'), variants))
      .toEqual({ currentCents: 1140, compareAtCents: 1425 });
    expect(computePriceDisplay({ variantId: WIPES_3, variantPriceCents: 1725, currencyCode: 'CAD', upsellPrice: 8 }, variants))
      .toEqual({ currentCents: 1150, compareAtCents: 1725 });
  });
  it('shows the regular price when the variant has no saved shop-currency price', () => {
    expect(computePriceDisplay(wipes(1425, 'CAD'), { shopCurrency: 'USD', basePrices: {} }))
      .toEqual({ currentCents: 1425, compareAtCents: null });
  });
  it('shows the regular price when the deal price is not below the saved price', () => {
    expect(computePriceDisplay(wipes(1425, 'CAD'), { shopCurrency: 'USD', basePrices: { [WIPES]: '8.00' } }))
      .toEqual({ currentCents: 1425, compareAtCents: null });
  });
  it('in the shop currency, shows the deal price as saved, exactly as before', () => {
    expect(computePriceDisplay(wipes(900, 'USD'), saved))
      .toEqual({ currentCents: 800, compareAtCents: 900 });
    expect(computePriceDisplay(wipes(900, 'USD'), saved))
      .toEqual(computePriceDisplay(wipes(900, 'USD')));
  });
  it('before the prices are saved, every currency shows the deal price as saved', () => {
    expect(computePriceDisplay(wipes(1425, 'CAD'), dealPricing({ offers: [], dealProductIds: [] })))
      .toEqual({ currentCents: 800, compareAtCents: 1425 });
  });
});

describe('dealPricing', () => {
  it('reads the shop currency and saved prices', () => {
    expect(dealPricing({ shopCurrency: 'USD', basePrices: { a: '10.00' } }))
      .toEqual({ shopCurrency: 'USD', basePrices: { a: '10.00' } });
  });
  it('is "not saved" for a missing or older value', () => {
    expect(dealPricing(null)).toEqual({ shopCurrency: null, basePrices: {} });
    expect(dealPricing({ offers: [] })).toEqual({ shopCurrency: null, basePrices: {} });
  });
});

describe('localDealCents', () => {
  it('rounds to the nearest cent', () => {
    expect(localDealCents(2295, 19, '24.00')).toBe(1817);
  });
  it('is null without a usable saved price', () => {
    expect(localDealCents(1425, 8, undefined)).toBe(null);
    expect(localDealCents(1425, 8, '0')).toBe(null);
    expect(localDealCents(1425, 10, '10.00')).toBe(null);
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

describe('isGiftLine', () => {
  it('is true for a line the theme added as a free gift', () => {
    expect(isGiftLine({ attributes: [{ key: '_gift', value: 'vip:VIPWIPE' }] })).toBe(true);
    expect(isGiftLine({ attributes: [{ key: '_gift', value: 'tier:1' }] })).toBe(true);
  });

  it('is false for a regular line', () => {
    expect(isGiftLine({ attributes: [] })).toBe(false);
    expect(isGiftLine({ attributes: [{ key: '_note', value: 'x' }] })).toBe(false);
    expect(isGiftLine({ attributes: [{ key: '_gift', value: '' }] })).toBe(false);
    expect(isGiftLine({})).toBe(false);
  });
});
