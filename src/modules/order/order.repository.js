const { AppError } = require('../../utils/app-error');
const { canTransitionOrderStatus } = require('../../policies/order-status.policy');
const { getDb } = require('../shared/transaction.service');

async function listByUser(userId, options = {}) {
  const db = getDb(options.tx);

  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      payments: true,
      appliedPromotions: true
    }
  });
}

async function findByOrderNumber(orderNumber, options = {}) {
  const db = getDb(options.tx);

  return db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { include: { attempts: true } },
      appliedPromotions: true,
      statusHistory: true
    }
  });
}

async function findById(id, options = {}) {
  const db = getDb(options.tx);

  return db.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      appliedPromotions: true
    }
  });
}

async function createOrder(data, options = {}) {
  const db = getDb(options.tx);

  const order = await db.order.create({
    data: {
      orderNumber: data.orderNumber,
      userId: data.userId,
      status: data.status,
      currency: data.currency,
      subtotal: data.subtotal,
      discountTotal: data.discountTotal,
      shippingTotal: data.shippingTotal,
      taxTotal: data.taxTotal,
      grandTotal: data.grandTotal,
      notes: data.notes || null,
      shippingAddressId: data.shippingAddressId || null,
      billingAddressId: data.billingAddressId || null,
      shippingAddressSnapshot: data.shippingAddressSnapshot,
      billingAddressSnapshot: data.billingAddressSnapshot,
      placedAt: data.placedAt || new Date(),
      paidAt: data.paidAt || null,
      cancelledAt: data.cancelledAt || null
    }
  });

  for (const item of data.items) {
    await db.orderItem.create({
      data: {
        orderId: order.id,
        productId: item.productId || null,
        productVariantId: item.productVariantId || null,
        productName: item.productName,
        variantSizeName: item.variantSizeName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal
      }
    });
  }

  for (const promotion of data.appliedPromotions || []) {
    await db.orderAppliedPromotion.create({
      data: {
        orderId: order.id,
        promotionId: promotion.promotionId,
        couponId: promotion.couponId || null,
        discountAmount: promotion.discountAmount
      }
    });
  }

  await db.orderStatusHistory.create({
    data: {
      orderId: order.id,
      fromStatus: null,
      toStatus: data.status,
      note: 'Order created',
      changedByUserId: data.changedByUserId || null,
      metadata: data.statusMetadata || null
    }
  });

  return findById(order.id, options);
}

async function updateOrderStatus(orderId, { toStatus, note, changedByUserId, metadata, paidAt, cancelledAt }, options = {}) {
  const db = getDb(options.tx);
  const currentOrder = await db.order.findUnique({ where: { id: orderId } });
  if (!currentOrder) throw new AppError('Order not found', 404);

  if (!canTransitionOrderStatus(currentOrder.status, toStatus)) {
    throw new AppError('Invalid order status transition', 409, {
      fromStatus: currentOrder.status,
      toStatus
    });
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: toStatus,
      paidAt: paidAt !== undefined ? paidAt : currentOrder.paidAt,
      cancelledAt: cancelledAt !== undefined ? cancelledAt : currentOrder.cancelledAt
    }
  });

  await db.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: currentOrder.status,
      toStatus,
      note: note || null,
      changedByUserId: changedByUserId || null,
      metadata: metadata || null
    }
  });

  return findById(orderId, options);
}

module.exports = {
  listByUser,
  findByOrderNumber,
  findById,
  createOrder,
  updateOrderStatus
};
