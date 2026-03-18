const promotionService = require('./promotion.service');

async function validateCoupon(code, userId, options = {}) {
  const promotions = await promotionService.resolveEligiblePromotions({
    items: [],
    couponCode: code,
    userId
  }, options);

  return promotions.find((promotion) => promotion.triggerType === 'COUPON') || null;
}

module.exports = { validateCoupon };
