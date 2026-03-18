const { getDb } = require('../shared/transaction.service');

function buildActiveWhere(triggerType, now) {
  return {
    triggerType,
    status: 'ACTIVE',
    deletedAt: null,
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }]
  };
}

async function listActivePromotions(options = {}) {
  const db = getDb(options.tx);
  const now = options.now || new Date();

  return db.promotion.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }]
    },
    orderBy: { priority: 'asc' },
    include: {
      promotionCategories: true,
      promotionProducts: true,
      coupons: true
    }
  });
}

async function listAutomaticPromotions(options = {}) {
  const db = getDb(options.tx);
  const now = options.now || new Date();

  return db.promotion.findMany({
    where: buildActiveWhere('AUTOMATIC', now),
    orderBy: { priority: 'asc' },
    include: {
      promotionCategories: true,
      promotionProducts: true
    }
  });
}

async function findCouponByCode(code, options = {}) {
  const db = getDb(options.tx);
  const now = options.now || new Date();

  return db.coupon.findFirst({
    where: {
      code,
      status: 'ACTIVE',
      deletedAt: null,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    include: {
      promotion: {
        include: {
          promotionCategories: true,
          promotionProducts: true
        }
      }
    }
  });
}

async function countCouponUsageByUser(couponId, userId, options = {}) {
  const db = getDb(options.tx);

  return db.orderAppliedPromotion.count({
    where: {
      couponId,
      order: {
        userId,
        status: { not: 'CANCELLED' }
      }
    }
  });
}

async function incrementPromotionUsage(promotionId, options = {}) {
  const db = getDb(options.tx);

  return db.promotion.update({
    where: { id: promotionId },
    data: { usedCount: { increment: 1 } }
  });
}

async function incrementCouponUsage(couponId, options = {}) {
  const db = getDb(options.tx);

  return db.coupon.update({
    where: { id: couponId },
    data: { usedCount: { increment: 1 } }
  });
}

async function decrementPromotionUsage(promotionId, options = {}) {
  const db = getDb(options.tx);

  return db.promotion.updateMany({
    where: {
      id: promotionId,
      usedCount: { gt: 0 }
    },
    data: { usedCount: { decrement: 1 } }
  });
}

async function decrementCouponUsage(couponId, options = {}) {
  const db = getDb(options.tx);

  return db.coupon.updateMany({
    where: {
      id: couponId,
      usedCount: { gt: 0 }
    },
    data: { usedCount: { decrement: 1 } }
  });
}

module.exports = {
  listActivePromotions,
  listAutomaticPromotions,
  findCouponByCode,
  countCouponUsageByUser,
  incrementPromotionUsage,
  incrementCouponUsage,
  decrementPromotionUsage,
  decrementCouponUsage
};
