const { toMoney } = require('./money.service');

function roundMoney(value) {
  return toMoney(value);
}

function toNumber(value) {
  return Number(value || 0);
}

function normalizeCartItem(item) {
  const unitPrice = toNumber(item.unitPrice ?? item.productVariant?.price ?? 0);
  const quantity = Number(item.quantity || 0);
  const lineSubtotal = roundMoney(unitPrice * quantity);

  return {
    cartItemId: item.id || null,
    productId: item.productId || item.productVariant?.productId || item.productVariant?.product?.id || null,
    productVariantId: item.productVariantId || item.productVariant?.id || null,
    categoryId: item.categoryId || item.productVariant?.product?.categoryId || null,
    productName: item.productName || item.productVariant?.product?.name || 'Product',
    sizeName: item.sizeName || item.productVariant?.size?.name || 'Size',
    sku: item.sku || item.productVariant?.sku || null,
    quantity,
    unitPrice,
    lineSubtotal
  };
}

function isPromotionActive(promotion, now = new Date()) {
  if (!promotion || promotion.status !== 'ACTIVE') return false;

  if (promotion.startsAt && new Date(promotion.startsAt) > now) return false;
  if (promotion.endsAt && new Date(promotion.endsAt) < now) return false;

  return true;
}

function promotionAppliesToItem(promotion, item) {
  const categoryTargets = promotion.promotionCategories || [];
  const productTargets = promotion.promotionProducts || [];

  if (!categoryTargets.length && !productTargets.length) return true;

  const categoryHit = categoryTargets.some((target) => target.categoryId === item.categoryId);
  const productHit = productTargets.some((target) => target.productId === item.productId);

  return categoryHit || productHit;
}

function calculatePromotionDiscount(promotion, eligibleSubtotal) {
  const promotionValue = toNumber(promotion.value);
  const maxDiscountAmount = promotion.maxDiscountAmount != null ? toNumber(promotion.maxDiscountAmount) : null;
  let discount = 0;

  if (promotion.discountType === 'PERCENTAGE') {
    discount = roundMoney(eligibleSubtotal * (promotionValue / 100));
  } else {
    discount = roundMoney(Math.min(promotionValue, eligibleSubtotal));
  }

  if (maxDiscountAmount != null) {
    discount = roundMoney(Math.min(discount, maxDiscountAmount));
  }

  return roundMoney(Math.max(discount, 0));
}

function allocateDiscountAcrossItems(items, totalDiscount) {
  if (!items.length || totalDiscount <= 0) {
    return items.map((item) => ({
      ...item,
      discountAmount: 0,
      lineTotal: item.lineSubtotal
    }));
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  let remaining = roundMoney(totalDiscount);

  return items.map((item, index) => {
    if (index === items.length - 1) {
      const finalDiscount = roundMoney(Math.min(remaining, item.lineSubtotal));
      return {
        ...item,
        discountAmount: finalDiscount,
        lineTotal: roundMoney(item.lineSubtotal - finalDiscount)
      };
    }

    const ratio = subtotal > 0 ? item.lineSubtotal / subtotal : 0;
    const allocated = roundMoney(Math.min(item.lineSubtotal, totalDiscount * ratio));
    remaining = roundMoney(Math.max(remaining - allocated, 0));

    return {
      ...item,
      discountAmount: allocated,
      lineTotal: roundMoney(item.lineSubtotal - allocated)
    };
  });
}

function clampPoints(pointsRequested, availablePoints, maxByTotal) {
  return Math.max(0, Math.min(Number(pointsRequested || 0), Number(availablePoints || 0), Number(maxByTotal || 0)));
}

function calculateCartPricing({ items = [], promotions = [], pointsToRedeem = 0, availablePoints = 0 } = {}) {
  const normalizedItems = items.map(normalizeCartItem);
  const subtotal = roundMoney(normalizedItems.reduce((sum, item) => sum + item.lineSubtotal, 0));
  const sortedPromotions = [...promotions].sort((a, b) => Number(a.priority || 100) - Number(b.priority || 100));

  const appliedPromotions = [];
  let promotionDiscountTotal = 0;
  let nonStackableApplied = false;

  for (const promotion of sortedPromotions) {
    if (!isPromotionActive(promotion)) continue;
    if (nonStackableApplied) break;

    const minSubtotal = promotion.minSubtotal != null ? toNumber(promotion.minSubtotal) : 0;
    if (subtotal < minSubtotal) continue;

    const eligibleItems = normalizedItems.filter((item) => promotionAppliesToItem(promotion, item));
    const eligibleSubtotal = roundMoney(eligibleItems.reduce((sum, item) => sum + item.lineSubtotal, 0));
    if (eligibleSubtotal <= 0) continue;

    const discountAmount = calculatePromotionDiscount(promotion, eligibleSubtotal);
    if (discountAmount <= 0) continue;

    appliedPromotions.push({
      promotionId: promotion.id,
      couponId: promotion.couponId || null,
      code: promotion.code || null,
      name: promotion.name,
      triggerType: promotion.triggerType,
      discountAmount
    });

    promotionDiscountTotal = roundMoney(promotionDiscountTotal + discountAmount);

    if (!promotion.stackable) {
      nonStackableApplied = true;
    }
  }

  const discountedItems = allocateDiscountAcrossItems(normalizedItems, promotionDiscountTotal);
  const afterPromotionTotal = roundMoney(subtotal - promotionDiscountTotal);
  const pointsApplied = clampPoints(pointsToRedeem, availablePoints, afterPromotionTotal);
  const total = roundMoney(afterPromotionTotal - pointsApplied);

  return {
    items: discountedItems,
    subtotal,
    promotionDiscountTotal,
    pointsApplied,
    total,
    appliedPromotions
  };
}

module.exports = {
  calculateCartPricing,
  normalizeCartItem
};
