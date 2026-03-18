const crypto = require('crypto');
const { AppError } = require('../../utils/app-error');
const { canTransitionPaymentStatus } = require('../../policies/payment-status.policy');
const paymentRepository = require('./payment.repository');
const paymentProviderService = require('./payment-provider.service');
const orderRepository = require('../order/order.repository');
const loyaltyPointsService = require('../loyalty/points.service');
const promotionService = require('../promotion/promotion.service');
const inventoryService = require('../inventory/inventory.service');
const { runInTransaction } = require('../shared/transaction.service');

function normalizeWebhookOutcome(event) {
  const value = String(event || '').trim().toLowerCase();

  if (['payment.succeeded', 'payment.paid', 'paid', 'success', 'succeeded', 'approved'].includes(value)) {
    return 'PAID';
  }

  if (['payment.failed', 'failed', 'declined', 'rejected', 'cancelled', 'canceled'].includes(value)) {
    return 'FAILED';
  }

  return null;
}

function toAttemptStatus(outcome) {
  if (outcome === 'PAID') return 'SUCCEEDED';
  if (outcome === 'FAILED') return 'FAILED';
  return 'REQUIRES_ACTION';
}

function ensurePaymentTransition(fromStatus, toStatus) {
  if (!canTransitionPaymentStatus(fromStatus, toStatus)) {
    throw new AppError('Invalid payment status transition', 409, {
      fromStatus,
      toStatus
    });
  }
}

async function resolvePayment({ paymentId, reference }, options = {}) {
  if (paymentId) {
    return paymentRepository.findById(paymentId, options);
  }

  if (reference) {
    return paymentRepository.findByExternalReference(reference, options);
  }

  return null;
}

async function ensureAttemptOwnership(payment, payload, options = {}) {
  if (payload.attemptId) {
    const attempt = await paymentRepository.findAttemptById(payload.attemptId, options);
    if (!attempt || attempt.paymentId !== payment.id) {
      throw new AppError('Payment attempt does not belong to payment', 409);
    }
  }

  if (payload.providerAttemptId) {
    const attempt = await paymentRepository.findAttemptByProviderAttemptId(payload.providerAttemptId, options);
    if (attempt && attempt.paymentId !== payment.id) {
      throw new AppError('Provider attempt does not belong to payment', 409);
    }
  }
}

async function logWebhookAttempt(payment, payload, outcome, options = {}) {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload || {}))
    .digest('hex');
  const eventId = payload.eventId || payload.id || payload.requestId || hash;
  const idempotencyKey = `webhook:${eventId}`;

  const existingAttempt = await paymentRepository.findAttemptByIdempotencyKey(idempotencyKey, options);
  if (existingAttempt) return { attempt: existingAttempt, alreadyProcessed: true };

  const provider = paymentProviderService.normalizeProvider(payload.provider || payment.provider);
  const attempt = await paymentRepository.createAttempt({
    paymentId: payment.id,
    status: toAttemptStatus(outcome),
    provider,
    idempotencyKey,
    providerAttemptId: payload.providerAttemptId || null,
    amount: payment.amount,
    currency: payment.currency,
    requestPayload: payload,
    responsePayload: payload,
    processedAt: new Date()
  }, options);

  return { attempt, alreadyProcessed: false };
}

async function createOrderPayment({ order, provider, shippingAddress }, options = {}) {
  const normalizedProvider = paymentProviderService.normalizeProvider(provider);

  const payment = await paymentRepository.createPayment({
    orderId: order.id,
    status: 'PENDING',
    provider: normalizedProvider,
    amount: order.grandTotal,
    currency: order.currency,
    externalReference: order.orderNumber,
    metadata: { source: 'checkout' }
  }, options);

  const providerIntent = await paymentProviderService.createPaymentIntent({
    provider: normalizedProvider,
    payment,
    order,
    shippingAddress
  });

  await paymentRepository.createAttempt({
    paymentId: payment.id,
    status: providerIntent.attemptStatus,
    provider: normalizedProvider,
    amount: order.grandTotal,
    currency: order.currency,
    requestPayload: {
      orderId: order.id,
      provider: normalizedProvider
    },
    responsePayload: providerIntent,
    processedAt: new Date()
  }, options);

  const updatedPayment = await paymentRepository.updatePayment(payment.id, {
    status: providerIntent.paymentStatus,
    externalReference: providerIntent.externalReference,
    metadata: providerIntent.metadata
  }, options);

  if (providerIntent.provider === 'CASH') {
    await inventoryService.commitReservedItems(order.items, {
      referenceType: 'ORDER',
      referenceId: order.id,
      note: 'Reserved stock committed for cash on delivery order',
      idempotencyKey: `order:${order.id}:cash`
    }, options);

    await promotionService.registerPromotionUsage(order.appliedPromotions || [], options);
  }

  if (providerIntent.orderStatus && providerIntent.orderStatus !== order.status) {
    await orderRepository.updateOrderStatus(order.id, {
      toStatus: providerIntent.orderStatus,
      note: `Order status updated by ${normalizedProvider} initialization`,
      metadata: providerIntent.metadata
    }, options);
  }

  return {
    payment: updatedPayment,
    providerIntent
  };
}

async function markPaymentPaid(payment, options = {}) {
  const currentPayment = payment.id ? payment : await paymentRepository.findById(payment, options);
  if (!currentPayment) throw new AppError('Payment not found', 404);
  if (currentPayment.status === 'PAID') {
    return currentPayment;
  }

  ensurePaymentTransition(currentPayment.status, 'PAID');

  await paymentRepository.updatePayment(currentPayment.id, {
    status: 'PAID',
    paidAt: new Date(),
    failedAt: null
  }, options);

  const order = await orderRepository.updateOrderStatus(currentPayment.orderId, {
    toStatus: 'CONFIRMED',
    note: 'Payment confirmed',
    metadata: { paymentId: currentPayment.id },
    paidAt: new Date()
  }, options);

  if (currentPayment.provider !== 'CASH') {
    await inventoryService.commitReservedItems(order.items, {
      referenceType: 'ORDER',
      referenceId: order.id,
      note: 'Reserved stock committed after payment',
      idempotencyKey: `order:${order.id}:commit`
    }, options);

    await promotionService.registerPromotionUsage(order.appliedPromotions || [], options);
  }

  await loyaltyPointsService.earnPointsFromOrder(order, options);
  return paymentRepository.findById(currentPayment.id, options);
}

async function markPaymentFailed(payment, options = {}) {
  const currentPayment = payment.id ? payment : await paymentRepository.findById(payment, options);
  if (!currentPayment) throw new AppError('Payment not found', 404);
  if (currentPayment.status === 'FAILED') {
    return currentPayment;
  }

  ensurePaymentTransition(currentPayment.status, 'FAILED');

  await paymentRepository.updatePayment(currentPayment.id, {
    status: 'FAILED',
    failedAt: new Date()
  }, options);

  const order = await orderRepository.updateOrderStatus(currentPayment.orderId, {
    toStatus: 'CANCELLED',
    note: 'Payment failed',
    metadata: { paymentId: currentPayment.id },
    cancelledAt: new Date()
  }, options);

  await inventoryService.releaseItems(order.items, {
    referenceType: 'ORDER',
    referenceId: order.id,
    note: 'Reserved stock released after payment failure',
    idempotencyKey: `order:${order.id}:failed`
  }, options);

  await loyaltyPointsService.reverseRedeemedPointsForOrder(order, options);

  if (currentPayment.provider === 'CASH') {
    await promotionService.releasePromotionUsage(order.appliedPromotions || [], options);
  }

  return paymentRepository.findById(currentPayment.id, options);
}

async function handleReturn(query) {
  return runInTransaction(async (tx) => {
    const payment = await resolvePayment({
      paymentId: query.paymentId,
      reference: query.reference
    }, { tx });

    if (!payment) throw new AppError('Payment not found', 404);

    await ensureAttemptOwnership(payment, query, { tx });

    return {
      paymentId: payment.id,
      externalReference: payment.externalReference,
      paymentStatus: payment.status,
      orderStatus: payment.order?.status || null,
      provider: payment.provider
    };
  });
}

async function handleWebhook(payload, meta = {}) {
  return runInTransaction(async (tx) => {
    const payment = await resolvePayment({
      paymentId: payload.paymentId,
      reference: payload.reference
    }, { tx });

    if (!payment) throw new AppError('Payment not found', 404);

    paymentProviderService.verifyWebhookSignature({
      provider: payment.provider,
      signature: meta.signature || payload.signature,
      rawBody: meta.rawBody,
      payload
    });

    await ensureAttemptOwnership(payment, payload, { tx });

    const outcome = normalizeWebhookOutcome(payload.event || payload.status);
    const { alreadyProcessed } = await logWebhookAttempt(payment, payload, outcome, { tx });
    if (alreadyProcessed) {
      return paymentRepository.findById(payment.id, { tx });
    }

    if (outcome === 'PAID') {
      return markPaymentPaid(payment, { tx });
    }

    if (outcome === 'FAILED') {
      return markPaymentFailed(payment, { tx });
    }

    return paymentRepository.findById(payment.id, { tx });
  });
}

module.exports = {
  createOrderPayment,
  handleReturn,
  handleWebhook,
  markPaymentPaid,
  markPaymentFailed
};



