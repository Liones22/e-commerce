const crypto = require('crypto');
const { AppError } = require('../../utils/app-error');
const { env } = require('../../config/env');

function normalizeProvider(provider) {
  const value = String(provider || 'MANUAL').toUpperCase();
  if (!['MANUAL', 'WOMPI', 'CASH'].includes(value)) {
    throw new AppError('Unsupported payment provider', 400, { provider: value });
  }
  return value;
}

function buildWebhookSignature(rawBody) {
  if (!env.PAYMENT_WEBHOOK_SECRET) return null;

  return crypto
    .createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET)
    .update(rawBody || '')
    .digest('hex');
}

function secureCompare(left, right) {
  const lhs = Buffer.from(String(left || ''), 'utf8');
  const rhs = Buffer.from(String(right || ''), 'utf8');

  if (lhs.length !== rhs.length) return false;
  return crypto.timingSafeEqual(lhs, rhs);
}

function verifyWebhookSignature({ provider, signature, rawBody, payload }) {
  normalizeProvider(provider);

  if (!env.PAYMENT_WEBHOOK_SECRET) {
    throw new AppError('Payment webhook secret is not configured', 500);
  }

  if (!signature) {
    throw new AppError('Missing payment webhook signature', 401);
  }

  const source = rawBody || JSON.stringify(payload || {});
  const expectedSignature = buildWebhookSignature(source);

  if (!secureCompare(signature, expectedSignature)) {
    throw new AppError('Invalid payment webhook signature', 401);
  }

  return true;
}

async function createPaymentIntent({ provider, payment, order, shippingAddress }) {
  const normalizedProvider = normalizeProvider(provider);

  if (normalizedProvider === 'CASH') {
    const city = String(shippingAddress?.city || '').trim().toLowerCase();
    const countryCode = String(shippingAddress?.countryCode || '').trim().toUpperCase();
    if (city !== 'cali' || countryCode !== 'CO') {
      throw new AppError('Cash on delivery is only available in Cali, Colombia', 409);
    }

    return {
      provider: 'CASH',
      paymentStatus: 'PENDING',
      orderStatus: 'CONFIRMED',
      attemptStatus: 'SUCCEEDED',
      externalReference: order.orderNumber,
      redirectUrl: null,
      metadata: {
        channel: 'cash_on_delivery',
        city: shippingAddress.city,
        countryCode: shippingAddress.countryCode
      }
    };
  }

  if (normalizedProvider === 'WOMPI') {
    return {
      provider: 'WOMPI',
      paymentStatus: 'REQUIRES_ACTION',
      orderStatus: 'PENDING_PAYMENT',
      attemptStatus: 'REQUIRES_ACTION',
      externalReference: order.orderNumber,
      redirectUrl: `/pago/retorno?paymentId=${payment.id}&reference=${order.orderNumber}`,
      metadata: {
        gateway: 'wompi',
        mode: 'stub',
        amount: Number(payment.amount || 0),
        currency: payment.currency
      }
    };
  }

  return {
    provider: 'MANUAL',
    paymentStatus: 'PENDING',
    orderStatus: 'PENDING_PAYMENT',
    attemptStatus: 'CREATED',
    externalReference: order.orderNumber,
    redirectUrl: null,
    metadata: {
      channel: 'manual_transfer'
    }
  };
}

module.exports = {
  normalizeProvider,
  buildWebhookSignature,
  verifyWebhookSignature,
  createPaymentIntent
};
