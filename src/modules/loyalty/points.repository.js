const { getDb } = require('../shared/transaction.service');

async function findAccountByUserId(userId, options = {}) {
  const db = getDb(options.tx);
  return db.loyaltyAccount.findFirst({ where: { userId } });
}

async function ensureUserAccount(userId, options = {}) {
  const db = getDb(options.tx);
  const existingAccount = await findAccountByUserId(userId, options);
  if (existingAccount) return existingAccount;

  return db.loyaltyAccount.create({
    data: {
      userId,
      code: `USER_${userId}`,
      accountType: 'USER_AVAILABLE'
    }
  });
}

async function ensureSystemAccount(options = {}) {
  const db = getDb(options.tx);
  const existingAccount = await db.loyaltyAccount.findFirst({
    where: { accountType: 'SYSTEM_OFFSET', code: 'SYSTEM_MAIN' }
  });

  if (existingAccount) return existingAccount;

  return db.loyaltyAccount.create({
    data: {
      code: 'SYSTEM_MAIN',
      accountType: 'SYSTEM_OFFSET'
    }
  });
}

async function findLedgerByIdempotencyKey(idempotencyKey, options = {}) {
  const db = getDb(options.tx);
  return db.loyaltyPointsLedger.findUnique({ where: { idempotencyKey } });
}

async function findRedeemLedgerByOrderId(orderId, options = {}) {
  const db = getDb(options.tx);
  return db.loyaltyPointsLedger.findFirst({
    where: {
      movementType: 'REDEEM',
      referenceType: 'ORDER',
      referenceId: orderId,
      status: 'POSTED'
    },
    include: {
      entries: true
    }
  });
}

async function createLedger(data, options = {}) {
  const db = getDb(options.tx);

  return db.loyaltyPointsLedger.create({
    data: {
      userId: data.userId,
      movementType: data.movementType,
      status: data.status || 'POSTED',
      idempotencyKey: data.idempotencyKey,
      referenceType: data.referenceType || null,
      referenceId: data.referenceId || null,
      description: data.description || null,
      metadata: data.metadata || null,
      reversesLedgerId: data.reversesLedgerId || null
    }
  });
}

async function updateLedgerStatus(id, status, options = {}) {
  const db = getDb(options.tx);
  return db.loyaltyPointsLedger.update({ where: { id }, data: { status } });
}

async function createLedgerEntry(entry, options = {}) {
  const db = getDb(options.tx);

  return db.loyaltyPointsLedgerEntry.create({
    data: entry
  });
}

async function updateAccountBalance(accountId, delta, options = {}) {
  const db = getDb(options.tx);
  const account = await db.loyaltyAccount.findUnique({ where: { id: accountId } });

  return db.loyaltyAccount.update({
    where: { id: accountId },
    data: { currentBalance: Number(account.currentBalance || 0) + Number(delta || 0) }
  });
}

module.exports = {
  findAccountByUserId,
  ensureUserAccount,
  ensureSystemAccount,
  findLedgerByIdempotencyKey,
  findRedeemLedgerByOrderId,
  createLedger,
  updateLedgerStatus,
  createLedgerEntry,
  updateAccountBalance
};
