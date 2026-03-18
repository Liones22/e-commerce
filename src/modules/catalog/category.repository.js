const { prisma } = require('../../config/prisma');

async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: true } }
    }
  });
}

async function findCategoryBySlug(slug) {
  return prisma.category.findFirst({ where: { slug, deletedAt: null } });
}

module.exports = { listCategories, findCategoryBySlug };
