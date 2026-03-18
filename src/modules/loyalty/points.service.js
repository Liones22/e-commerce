const { AppError } = require('../../utils/app-error');
const pointsRepository = require('./points.repository');
const { calculateEarnedPoints } = require('./points-rule.service');

async function getMyPoints(userId, options = {}) {
  return pointsRepository.ensureUserAccount(userId, options);
}

async function getAvailablePoints(userId, options = {}) {
  const account = await pointsRepository.ensureUserAccount(userId, options);
  return Number(account.currentBalance || 0);
}

async function postPointsMovement({
  userId,
  points,
  movementType,
  referenceType,
  referenceId,
  description,
  idempotencyKey,
  reversesLedgerId
}, options = {}) {
  if (Number(points || 0) <= 0) return null;

  const existingLedger = await pointsRepository.findLedgerByIdempotencyKey(idempotencyKey, options);
  if (existingLedger) return existingLedger;

  const userAccount = await pointsRepository.ensureUserAccount(userId, options);
  const systemAccount = await pointsRepository.ensureSystemAccount(options);
  const pointsValue = Number(points || 0);

  if (movementType === 'REDEEM' && Number(userAccount.currentBalance || 0) < pointsValue) {
    throw new AppError('Insufficient loyalty points', 409);
  }

  const ledger = await pointsRepository.createLedger({
    userId,
    movementType,
    idempotencyKey,
    referenceType,
    referenceId,
    description,
    reversesLedgerId
  }, options);

  const userDelta = movementType === 'REDEEM' ? -pointsValue : pointsValue;
  const systemDelta = movementType === 'REDEEM' ? pointsValue : -pointsValue;

  const updatedUserAccount = await pointsRepository.updateAccountBalance(userAccount.id, userDelta, options);
  const updatedSystemAccount = await pointsRepository.updateAccountBalance(systemAccount.id, systemDelta, options);

  await pointsRepository.createLedgerEntry({
    ledgerId: ledger.id,
    accountId: userAccount.id,
    side: movementType === 'REDEEM' ? 'DEBIT' : 'CREDIT',
    points: pointsValue,
    balanceAfter: updatedUserAccount.currentBalance
  }, options);

  await pointsRepository.createLedgerEntry({
    ledgerId: ledger.id,
    accountId: systemAccount.id,
    side: movementType === 'REDEEM' ? 'CREDIT' : 'DEBIT',
    points: pointsValue,
    balanceAfter: updatedSystemAccount.currentBalance
  }, options);

  return ledger;
}

async function redeemPoints(payload, options = {}) {
  return postPointsMovement({ ...payload, movementType: 'REDEEM' }, options);
}

async function reverseRedeemedPointsForOrder(order, options = {}) {
  const redeemLedger = await pointsRepository.findRedeemLedgerByOrderId(order.id, options);
  if (!redeemLedger) return null;

  const userEntry = redeemLedger.entries.find((entry) => entry.side === 'DEBIT');
  if (!userEntry) return null;

  const reversal = await postPointsMovement({
    userId: order.userId,
    points: userEntry.points,
    movementType: 'REVERSE',
    referenceType: 'ORDER',
    referenceId: order.id,
    description: `Points reversal for cancelled order ${order.orderNumber}`,
    idempotencyKey: `reverse:${order.id}`,
    reversesLedgerId: redeemLedger.id
  }, options);

  await pointsRepository.updateLedgerStatus(redeemLedger.id, 'REVERSED', options);
  return reversal;
}

async function earnPointsFromOrder(order, options = {}) {
  const points = calculateEarnedPoints(order);
  if (!points) return null;

  return postPointsMovement({
    userId: order.userId,
    points,
    movementType: 'EARN',
    referenceType: 'ORDER',
    referenceId: order.id,
    description: `Points earned for order ${order.orderNumber}`,
    idempotencyKey: `earn:${order.id}`
  }, options);
}

module.exports = {
  getMyPoints,
  getAvailablePoints,
  redeemPoints,
  reverseRedeemedPointsForOrder,
  earnPointsFromOrder
};
