import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  computePriceDisplay,
  hasQualifier,
  isOfferEligible,
  parseUpsellPrice,
  UPSELL_NAMESPACE,
  UPSELL_KEY,
} from './lib/upsell.js';
import { OFFER_QUERY, mapVariantNode } from './lib/offers.js';

export default async () => {
  render(<Extension />, document.body);
};

function findProductUpsellPrice(appMetafields, productId) {
  const entry = appMetafields.find(
    (candidate) =>
      candidate.target.type === 'product' &&
      candidate.target.id === productId &&
      candidate.metafield.namespace === UPSELL_NAMESPACE &&
      candidate.metafield.key === UPSELL_KEY,
  );
  return parseUpsellPrice(entry?.metafield);
}

function formatMoney(cents, currencyCode) {
  return shopify.i18n.formatCurrency(cents / 100, { currency: currencyCode });
}

function Extension() {
  const settings = shopify.settings.value;
  const lines = shopify.lines.value;
  const appMetafields = shopify.appMetafields.value;

  const enabled = settings.enabled !== false;
  const heading = settings.heading;
  const offerVariantIds = [settings.offer_variant_1, settings.offer_variant_2].filter(Boolean);
  const offerIdsKey = offerVariantIds.join(',');
  const shouldFetchOffers = enabled && offerIdsKey !== '';

  const [offers, setOffers] = useState([]);
  const [pendingVariantId, setPendingVariantId] = useState(null);
  const [addFailed, setAddFailed] = useState(false);

  useEffect(() => {
    if (!shouldFetchOffers) {
      setOffers([]);
      return undefined;
    }

    let active = true;

    async function fetchOffers() {
      try {
        const { data, errors } = await shopify.query(OFFER_QUERY, {
          variables: { ids: offerVariantIds },
        });
        if (!active) return;
        if (errors?.length || !Array.isArray(data?.nodes)) {
          setOffers([]);
          return;
        }
        setOffers(data.nodes.map(mapVariantNode).filter(Boolean));
      } catch {
        if (active) setOffers([]);
      }
    }

    fetchOffers();
    return () => {
      active = false;
    };
  }, [shouldFetchOffers, offerIdsKey]);

  if (!enabled) return null;

  const cartProducts = lines.map((line) => ({
    productId: line.merchandise.product.id,
    upsellPrice: findProductUpsellPrice(appMetafields, line.merchandise.product.id),
  }));
  // No qualifier in cart means the upsell discount wouldn't apply, so the
  // offer price would be misleading — render nothing. Note: appMetafields load
  // async with no loaded-flag, so an upsell-only cart can transiently pass
  // this gate; the offer fetch round-trip usually outlasts that window, and
  // there is no API to distinguish loaded-empty from not-yet-loaded.
  if (!hasQualifier(cartProducts)) return null;

  const cartProductIds = cartProducts.map((product) => product.productId);
  const eligibleOffers = offers.filter((offer) => isOfferEligible(offer, cartProductIds));
  if (eligibleOffers.length === 0) return null;

  async function addOffer(offer) {
    setAddFailed(false);
    setPendingVariantId(offer.variantId);
    try {
      const result = await shopify.applyCartLinesChange({
        type: 'addCartLine',
        merchandiseId: offer.variantId,
        quantity: 1,
      });
      if (result.type === 'error') setAddFailed(true);
    } catch {
      setAddFailed(true);
    } finally {
      setPendingVariantId(null);
    }
  }

  return (
    <s-stack gap="base">
      {heading && <s-heading>{heading}</s-heading>}
      {addFailed && (
        <s-banner tone="critical">{shopify.i18n.translate('addError')}</s-banner>
      )}
      {eligibleOffers.map((offer) => (
        <OfferCard
          key={offer.variantId}
          offer={offer}
          loading={pendingVariantId === offer.variantId}
          disabled={pendingVariantId != null && pendingVariantId !== offer.variantId}
          onAdd={() => addOffer(offer)}
        />
      ))}
    </s-stack>
  );
}

function OfferCard({ offer, loading, disabled, onAdd }) {
  const { currentCents, compareAtCents } = computePriceDisplay(offer);
  const columns = offer.imageUrl ? '4rem 1fr auto' : '1fr auto';

  return (
    <s-grid gridTemplateColumns={columns} gap="base" alignItems="center">
      {offer.imageUrl && (
        <s-image
          src={offer.imageUrl}
          alt=""
          aspectRatio="1"
          inlineSize="fill"
          objectFit="cover"
          borderRadius="base"
        />
      )}
      <s-stack gap="small-300">
        <s-text>{offer.title}</s-text>
        <s-stack direction="inline" gap="small-300">
          {compareAtCents != null && (
            <s-text accessibilityVisibility="exclusive">{shopify.i18n.translate('salePrice')}</s-text>
          )}
          <s-text type="strong">{formatMoney(currentCents, offer.currencyCode)}</s-text>
          {compareAtCents != null && (
            <>
              <s-text accessibilityVisibility="exclusive">{shopify.i18n.translate('regularPrice')}</s-text>
              <s-text type="redundant" color="subdued">
                {formatMoney(compareAtCents, offer.currencyCode)}
              </s-text>
            </>
          )}
        </s-stack>
      </s-stack>
      <s-button
        variant="primary"
        onClick={onAdd}
        loading={loading}
        disabled={disabled}
        accessibilityLabel={shopify.i18n.translate('addButtonLabel', { title: offer.title })}
      >
        {shopify.i18n.translate('addButton')}
      </s-button>
    </s-grid>
  );
}
