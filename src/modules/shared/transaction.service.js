const { prisma } = require('../../config/prisma');

function getDb(tx) {
  return tx || prisma;
}

async function runInTransaction(callback) {
  return prisma.$transaction((tx) => callback(tx));
}

module.exports = { getDb, runInTransaction };
