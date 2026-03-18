const { prisma } = require('../../config/prisma');

async function findUserByEmail(email) {
  return prisma.user.findFirst({
    where: {
      email,
      isActive: true,
      deletedAt: null
    }
  });
}

async function findAnyUserByEmail(email) {
  return prisma.user.findFirst({
    where: {
      email,
      deletedAt: null
    }
  });
}

async function createUser(data) {
  return prisma.user.create({ data });
}

module.exports = { findUserByEmail, findAnyUserByEmail, createUser };
