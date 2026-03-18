const { getDb } = require('../shared/transaction.service');

async function findByOrderId(orderId, options = {}) {
  const db = getDb(options.tx);
  return db.payment.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' }, include: { attempts: true } });
}

async function findById(id, options = {}) {
  const db = getDb(options.tx);
  return db.payment.findUnique({ where: { id }, include: { order: true, attempts: true } });
}

async function findByExternalReference(externalReference, options = {}) {
  const db = getDb(options.tx);
  return db.payment.findFirst({ where: { externalReference }, include: { order: true, attempts: true } });
}

async function findAttemptById(id, options = {}) {
  const db = getDb(options.tx);
  return db.paymentAttempt.findUnique({ where: { id } });
}

async function findAttemptByIdempotencyKey(idempotencyKey, options = {}) {
  if (!idempotencyKey) return null;

  const db = getDb(options.tx);
  return db.paymentAttempt.findUnique({ where: { idempotencyKey } });
}

async function findAttemptByProviderAttemptId(providerAttemptId, options = {}) {
  if (!providerAttemptId) return null;

  const db = getDb(options.tx);
  return db.paymentAttempt.findUnique({ where: { providerAttemptId } });
}

async function createPayment(data, options = {}) {
  const db = getDb(options.tx);
  return db.payment.create({ data });
}

async function createAttempt(data, options = {}) {
  const db = getDb(options.tx);
  return db.paymentAttempt.create({ data });
}

async function updateAttempt(id, data, options = {}) {
  const db = getDb(options.tx);
  return db.paymentAttempt.update({ where: { id }, data });
}

async function updatePayment(id, data, options = {}) {
  const db = getDb(options.tx);
  return db.payment.update({ where: { id }, data });
}

module.exports = {
  findByOrderId,
  findById,
  findByExternalReference,
  findAttemptById,
  findAttemptByIdempotencyKey,
  findAttemptByProviderAttemptId,
  createPayment,
  createAttempt,
  updateAttempt,
  updatePayment
};
