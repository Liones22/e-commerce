const { prisma } = require('../../config/prisma');

async function findById(id) {
  return prisma.productVariant.findUnique({ where: { id } });
}

module.exports = { findById };
