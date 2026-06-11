import '@shopify/ui-extensions/preact';

//@ts-ignore
declare module './src/Checkout.jsx' {
  const shopify: import('@shopify/ui-extensions/checkout').Api<'purchase.checkout.block.render'>;
  const globalThis: { shopify: typeof shopify };
}
