const { getDb } = require('../shared/transaction.service');

async function findUserById(id, options = {}) {
  const db = getDb(options.tx);

  return db.user.findUnique({
    where: { id },
    include: { addresses: { where: { deletedAt: null, isActive: true } } }
  });
}

async function findAddressByIdForUser(id, userId, options = {}) {
  const db = getDb(options.tx);

  return db.address.findFirst({
    where: {
      id,
      userId,
      deletedAt: null,
      isActive: true
    }
  });
}

async function findDefaultAddressForUser(userId, options = {}) {
  const db = getDb(options.tx);

  return db.address.findFirst({
    where: {
      userId,
      isDefault: true,
      deletedAt: null,
      isActive: true
    },
    orderBy: { createdAt: 'asc' }
  });
}

module.exports = {
  findUserById,
  findAddressByIdForUser,
  findDefaultAddressForUser
};
