const { AppError } = require('../../utils/app-error');
const promotionRepository = require('./promotion.repository');

async function getPublicPromotions() {
  return promotionRepository.listActivePromotions();
}

async function resolveEligiblePromotions({ items, couponCode, userId }, options = {}) {
  const automaticPromotions = await promotionRepository.listAutomaticPromotions(options);
  const eligiblePromotions = [...automaticPromotions];

  if (couponCode) {
    const coupon = await promotionRepository.findCouponByCode(String(couponCode).trim().toUpperCase(), options);
    if (!coupon || !coupon.promotion || coupon.promotion.status !== 'ACTIVE') {
      throw new AppError('Coupon not found or inactive', 404);
    }

    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 409);
    }

    if (coupon.perUserLimit != null) {
      const userUsageCount = await promotionRepository.countCouponUsageByUser(coupon.id, userId, options);
      if (userUsageCount >= coupon.perUserLimit) {
        throw new AppError('Coupon per-user limit reached', 409);
      }
    }

    eligiblePromotions.push({
      ...coupon.promotion,
      couponId: coupon.id,
      code: coupon.code,
      triggerType: 'COUPON'
    });
  }

  return eligiblePromotions;
}

async function registerPromotionUsage(appliedPromotions, options = {}) {
  for (const promotion of appliedPromotions) {
    await promotionRepository.incrementPromotionUsage(promotion.promotionId, options);
    if (promotion.couponId) {
      await promotionRepository.incrementCouponUsage(promotion.couponId, options);
    }
  }
}

async function releasePromotionUsage(appliedPromotions, options = {}) {
  for (const promotion of appliedPromotions) {
    await promotionRepository.decrementPromotionUsage(promotion.promotionId, options);
    if (promotion.couponId) {
      await promotionRepository.decrementCouponUsage(promotion.couponId, options);
    }
  }
}

module.exports = {
  getPublicPromotions,
  resolveEligiblePromotions,
  registerPromotionUsage,
  releasePromotionUsage
};
