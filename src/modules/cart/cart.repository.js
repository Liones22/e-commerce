const { getDb } = require('../shared/transaction.service');

function cartInclude() {
  return {
    items: {
      orderBy: { createdAt: 'asc' },
      include: {
        productVariant: {
          include: {
            product: true,
            size: true
          }
        }
      }
    },
    appliedPromotions: {
      include: {
        promotion: true,
        coupon: true
      }
    }
  };
}

async function ensureCart(userId, options = {}) {
  const db = getDb(options.tx);

  await db.cart.upsert({
    where: { userId },
    update: { lastActivityAt: new Date(), status: 'ACTIVE' },
    create: { userId }
  });

  return findByUserId(userId, options);
}

async function findByUserId(userId, options = {}) {
  const db = getDb(options.tx);

  return db.cart.findUnique({
    where: { userId },
    include: cartInclude()
  });
}

async function findById(cartId, options = {}) {
  const db = getDb(options.tx);

  return db.cart.findUnique({
    where: { id: cartId },
    include: cartInclude()
  });
}

async function findItemById(itemId, options = {}) {
  const db = getDb(options.tx);

  return db.cartItem.findUnique({
    where: { id: itemId },
    include: {
      productVariant: {
        include: {
          product: true,
          size: true
        }
      },
      cart: true
    }
  });
}

async function upsertCartItem(data, options = {}) {
  const db = getDb(options.tx);
  const existing = await db.cartItem.findFirst({
    where: {
      cartId: data.cartId,
      productVariantId: data.productVariantId
    }
  });

  if (existing) {
    return db.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        discountAmount: data.discountAmount,
        lineTotal: data.lineTotal
      }
    });
  }

  return db.cartItem.create({ data });
}

async function updateCartItem(itemId, data, options = {}) {
  const db = getDb(options.tx);
  return db.cartItem.update({ where: { id: itemId }, data });
}

async function deleteCartItem(itemId, options = {}) {
  const db = getDb(options.tx);
  return db.cartItem.delete({ where: { id: itemId } });
}

async function deleteCartItemsByCartId(cartId, options = {}) {
  const db = getDb(options.tx);
  return db.cartItem.deleteMany({ where: { cartId } });
}

async function replaceAppliedPromotions(cartId, promotions, options = {}) {
  const db = getDb(options.tx);
  await db.cartAppliedPromotion.deleteMany({ where: { cartId } });

  for (const promotion of promotions) {
    await db.cartAppliedPromotion.create({
      data: {
        cartId,
        promotionId: promotion.promotionId,
        couponId: promotion.couponId || null,
        discountAmount: promotion.discountAmount
      }
    });
  }
}

async function updateCartTotals(cartId, totals, options = {}) {
  const db = getDb(options.tx);

  return db.cart.update({
    where: { id: cartId },
    data: {
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      total: totals.total,
      status: totals.status || 'ACTIVE',
      lastActivityAt: new Date()
    }
  });
}

module.exports = {
  ensureCart,
  findByUserId,
  findById,
  findItemById,
  upsertCartItem,
  updateCartItem,
  deleteCartItem,
  deleteCartItemsByCartId,
  replaceAppliedPromotions,
  updateCartTotals
};
