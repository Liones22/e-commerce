const { prisma } = require('../../config/prisma');
const { AppError } = require('../../utils/app-error');
const { canTransitionOrderStatus } = require('../../policies/order-status.policy');

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date = new Date()) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? 6 : day - 1;
  value.setDate(value.getDate() - diff);
  return value;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date = new Date()) {
  return new Date(date.getFullYear(), 0, 1);
}

async function findAdminByEmail(email) {
  return prisma.user.findFirst({
    where: {
      email,
      role: 'ADMIN',
      isActive: true,
      deletedAt: null
    }
  });
}

async function countActiveProducts() {
  return prisma.product.count({
    where: { isActive: true, deletedAt: null }
  });
}

async function countActivePromotions() {
  return prisma.promotion.count({
    where: { status: 'ACTIVE', deletedAt: null }
  });
}

async function countPendingOrders() {
  return prisma.order.count({
    where: { status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING'] } }
  });
}

async function getLowStockCount(threshold = 5) {
  return prisma.productVariant.count({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { lte: threshold }
    }
  });
}

async function sumSalesSince(startDate) {
  const result = await prisma.order.aggregate({
    _sum: { grandTotal: true },
    where: {
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      paidAt: { gte: startDate }
    }
  });

  return Number(result._sum.grandTotal || 0);
}

async function getSalesOverview(now = new Date()) {
  return {
    daily: await sumSalesSince(startOfDay(now)),
    weekly: await sumSalesSince(startOfWeek(now)),
    monthly: await sumSalesSince(startOfMonth(now)),
    yearly: await sumSalesSince(startOfYear(now))
  };
}

async function listTopProducts(limit = 5) {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId', 'productName'],
    _sum: {
      quantity: true,
      lineTotal: true
    },
    where: {
      productId: { not: null },
      order: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
      }
    },
    orderBy: {
      _sum: { quantity: 'desc' }
    },
    take: limit
  });

  return rows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    quantitySold: row._sum.quantity || 0,
    revenue: Number(row._sum.lineTotal || 0)
  }));
}

async function listLowStockVariants(limit = 10) {
  return prisma.productVariant.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      stock: { lte: 5 }
    },
    include: {
      product: true,
      size: true
    },
    orderBy: [{ stock: 'asc' }, { updatedAt: 'desc' }],
    take: limit
  });
}

async function listRecentOrders(limit = 10) {
  return prisma.order.findMany({
    include: {
      user: true,
      payments: true,
      items: true
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

async function listProducts() {
  return prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      variants: {
        where: { deletedAt: null },
        include: { size: true },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });
}

async function listSizes() {
  return prisma.size.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { sortOrder: 'asc' }
  });
}

async function findProductById(id) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        where: { deletedAt: null },
        include: { size: true },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
}

async function createProductWithVariants(input) {
  const { product, variants } = input;

  return prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: product
    });

    if (variants.length > 0) {
      await tx.productVariant.createMany({
        data: variants.map((variant) => ({
          ...variant,
          productId: createdProduct.id
        }))
      });
    }

    return tx.product.findUnique({
      where: { id: createdProduct.id },
      include: {
        category: true,
        variants: { include: { size: true } }
      }
    });
  });
}

async function updateProduct(input) {
  const { id, product, variants } = input;

  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: product
    });

    for (const variant of variants) {
      if (!variant.id) {
        await tx.productVariant.create({
          data: {
            productId: id,
            sizeId: variant.sizeId,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stock: variant.stock,
            reservedStock: variant.reservedStock,
            isActive: variant.isActive
          }
        });
        continue;
      }

      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          isActive: variant.isActive
        }
      });
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: { include: { size: true } }
      }
    });
  });
}

async function toggleProductState(id, isActive) {
  return prisma.product.update({
    where: { id },
    data: { isActive }
  });
}

async function listInventory() {
  return prisma.productVariant.findMany({
    where: { deletedAt: null },
    include: {
      product: true,
      size: true
    },
    orderBy: [{ product: { name: 'asc' } }, { size: { sortOrder: 'asc' } }]
  });
}

async function findInventoryVariantById(variantId) {
  return prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: true,
      size: true,
      inventoryMovements: {
        orderBy: { createdAt: 'desc' },
        take: 15
      }
    }
  });
}

async function listOrders() {
  return prisma.order.findMany({
    include: {
      user: true,
      payments: true,
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function findOrderById(id) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      items: true,
      payments: {
        include: { attempts: true }
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        include: { changedByUser: true }
      }
    }
  });
}

async function updateOrderStatus({ id, status, note, changedByUserId }) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new AppError('Order not found', 404);

    if (!canTransitionOrderStatus(current.status, status)) {
      throw new AppError('Invalid order status transition', 409, {
        fromStatus: current.status,
        toStatus: status
      });
    }

    const updated = await tx.order.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'CONFIRMED' && !current.paidAt ? new Date() : current.paidAt,
        cancelledAt: status === 'CANCELLED' ? new Date() : current.cancelledAt
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: current.status,
        toStatus: status,
        note,
        changedByUserId
      }
    });

    return updated;
  });
}

async function listCustomers() {
  return prisma.user.findMany({
    where: { role: 'CLIENT', deletedAt: null },
    include: {
      orders: true,
      loyaltyAccount: true,
      addresses: {
        where: { deletedAt: null }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

async function findCustomerById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      },
      loyaltyAccount: true,
      addresses: {
        where: { deletedAt: null }
      }
    }
  });
}

async function listPromotions() {
  return prisma.promotion.findMany({
    where: { deletedAt: null },
    include: { coupons: true },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
  });
}

async function findPromotionById(id) {
  return prisma.promotion.findUnique({
    where: { id },
    include: { coupons: true }
  });
}

async function createPromotionWithCoupon({ promotion, coupon }) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.promotion.create({ data: promotion });

    if (coupon && coupon.code) {
      await tx.coupon.create({
        data: {
          ...coupon,
          promotionId: created.id
        }
      });
    }

    return tx.promotion.findUnique({
      where: { id: created.id },
      include: { coupons: true }
    });
  });
}

async function updatePromotionWithCoupon({ id, promotion, coupon }) {
  return prisma.$transaction(async (tx) => {
    await tx.promotion.update({
      where: { id },
      data: promotion
    });

    if (coupon && coupon.code) {
      const existing = await tx.coupon.findFirst({
        where: { promotionId: id }
      });

      if (existing) {
        await tx.coupon.update({
          where: { id: existing.id },
          data: coupon
        });
      } else {
        await tx.coupon.create({
          data: {
            ...coupon,
            promotionId: id
          }
        });
      }
    }

    return tx.promotion.findUnique({
      where: { id },
      include: { coupons: true }
    });
  });
}

async function togglePromotionState(id, status) {
  return prisma.promotion.update({
    where: { id },
    data: { status }
  });
}

module.exports = {
  findAdminByEmail,
  countActiveProducts,
  countActivePromotions,
  countPendingOrders,
  getLowStockCount,
  getSalesOverview,
  listTopProducts,
  listLowStockVariants,
  listRecentOrders,
  listProducts,
  listCategories,
  listSizes,
  findProductById,
  createProductWithVariants,
  updateProduct,
  toggleProductState,
  listInventory,
  findInventoryVariantById,
  listOrders,
  findOrderById,
  updateOrderStatus,
  listCustomers,
  findCustomerById,
  listPromotions,
  findPromotionById,
  createPromotionWithCoupon,
  updatePromotionWithCoupon,
  togglePromotionState
};




