const { AppError } = require('../../utils/app-error');
const cartRepository = require('./cart.repository');
const inventoryService = require('../inventory/inventory.service');
const promotionService = require('../promotion/promotion.service');
const pointsService = require('../loyalty/points.service');
const { calculateCartPricing } = require('../shared/pricing.service');

function resolveActiveCouponCode(cart) {
  const couponPromotion = (cart.appliedPromotions || []).find((entry) => entry.coupon?.code);
  return couponPromotion?.coupon?.code || null;
}

async function refreshCart(userId, options = {}) {
  const cart = await cartRepository.ensureCart(userId, options);
  const couponCode = options.couponCode !== undefined ? options.couponCode : resolveActiveCouponCode(cart);
  const items = cart.items || [];

  const promotions = await promotionService.resolveEligiblePromotions({
    items,
    couponCode,
    userId
  }, options);

  const pricing = calculateCartPricing({ items, promotions });

  for (const item of pricing.items) {
    if (!item.cartItemId) continue;
    await cartRepository.updateCartItem(item.cartItemId, {
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      lineTotal: item.lineTotal,
      quantity: item.quantity
    }, options);
  }

  await cartRepository.replaceAppliedPromotions(cart.id, pricing.appliedPromotions, options);
  await cartRepository.updateCartTotals(cart.id, {
    subtotal: pricing.subtotal,
    discountTotal: pricing.promotionDiscountTotal,
    total: pricing.total
  }, options);

  return cartRepository.findById(cart.id, options);
}

async function getMyCart(userId, options = {}) {
  return refreshCart(userId, options);
}

async function addItem({ userId, variantId, quantity }, options = {}) {
  const cart = await cartRepository.ensureCart(userId, options);
  const variant = await inventoryService.getVariantOrFail(variantId, options);
  await inventoryService.assertItemsAvailable([{ variantId, quantity }], options);

  const existing = (cart.items || []).find((item) => item.productVariantId === variantId);
  const nextQuantity = existing ? Number(existing.quantity || 0) + Number(quantity || 0) : Number(quantity || 0);
  await inventoryService.assertItemsAvailable([{ variantId, quantity: nextQuantity }], options);

  await cartRepository.upsertCartItem({
    cartId: cart.id,
    productVariantId: variantId,
    quantity: nextQuantity,
    unitPrice: variant.price,
    discountAmount: 0,
    lineTotal: Number(variant.price) * nextQuantity
  }, options);

  return refreshCart(userId, options);
}

async function updateItem({ userId, itemId, quantity }, options = {}) {
  const item = await cartRepository.findItemById(itemId, options);
  if (!item || item.cart.userId !== userId) throw new AppError('Cart item not found', 404);

  await inventoryService.assertItemsAvailable([{ variantId: item.productVariantId, quantity }], options);
  await cartRepository.updateCartItem(itemId, {
    quantity,
    unitPrice: item.productVariant.price,
    lineTotal: Number(item.productVariant.price) * Number(quantity || 0)
  }, options);

  return refreshCart(userId, options);
}

async function removeItem({ userId, itemId }, options = {}) {
  const item = await cartRepository.findItemById(itemId, options);
  if (!item || item.cart.userId !== userId) throw new AppError('Cart item not found', 404);

  await cartRepository.deleteCartItem(itemId, options);
  return refreshCart(userId, options);
}

async function applyCoupon({ userId, couponCode }, options = {}) {
  return refreshCart(userId, {
    ...options,
    couponCode: String(couponCode || '').trim().toUpperCase()
  });
}

async function removeCoupon({ userId }, options = {}) {
  return refreshCart(userId, {
    ...options,
    couponCode: null
  });
}

async function buildCheckoutContext({ userId, pointsToRedeem = 0, couponCode }, options = {}) {
  const cart = await refreshCart(userId, { ...options, couponCode });
  const availablePoints = await pointsService.getAvailablePoints(userId, options);
  const maxPoints = Math.max(Number(cart.total || 0), 0);
  const appliedPoints = Math.max(0, Math.min(Number(pointsToRedeem || 0), availablePoints, maxPoints));

  return {
    cart,
    availablePoints,
    pricing: {
      items: (cart.items || []).map((item) => ({
        cartItemId: item.id,
        productId: item.productVariant?.productId || null,
        productVariantId: item.productVariantId,
        productName: item.productVariant?.product?.name || 'Product',
        sizeName: item.productVariant?.size?.name || 'Size',
        sku: item.productVariant?.sku || null,
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        discountAmount: Number(item.discountAmount || 0),
        lineSubtotal: Number(item.unitPrice || 0) * Number(item.quantity || 0),
        lineTotal: Number(item.lineTotal || 0)
      })),
      subtotal: Number(cart.subtotal || 0),
      promotionDiscountTotal: Number(cart.discountTotal || 0),
      pointsApplied: appliedPoints,
      total: Math.max(Number(cart.total || 0) - appliedPoints, 0),
      appliedPromotions: (cart.appliedPromotions || []).map((entry) => ({
        promotionId: entry.promotionId,
        couponId: entry.couponId || null,
        code: entry.coupon?.code || null,
        name: entry.promotion?.name || 'Promotion',
        triggerType: entry.couponId ? 'COUPON' : 'AUTOMATIC',
        discountAmount: Number(entry.discountAmount || 0)
      }))
    }
  };
}

module.exports = {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  applyCoupon,
  removeCoupon,
  buildCheckoutContext
};
