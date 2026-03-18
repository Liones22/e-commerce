const { prisma } = require('../../config/prisma');

async function listProducts(options = {}) {
  const {
    take = 12,
    skip = 0,
    where = {},
    orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
  } = options;

  return prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...where
    },
    orderBy,
    skip,
    take,
    include: {
      category: true,
      variants: {
        where: { isActive: true, deletedAt: null },
        include: { size: true }
      }
    }
  });
}

async function countProducts(where = {}) {
  return prisma.product.count({
    where: {
      isActive: true,
      deletedAt: null,
      ...where
    }
  });
}

async function findProductBySlug(slug) {
  return prisma.product.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    include: {
      category: true,
      variants: {
        where: { isActive: true, deletedAt: null },
        include: { size: true }
      }
    }
  });
}

async function listRelatedProducts({ categoryId, productId, limit = 4 }) {
  return prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId,
      isActive: true,
      deletedAt: null
    },
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      category: true,
      variants: {
        where: { isActive: true, deletedAt: null },
        include: { size: true }
      }
    }
  });
}

module.exports = { listProducts, countProducts, findProductBySlug, listRelatedProducts };
