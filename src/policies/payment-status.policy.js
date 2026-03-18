const ALLOWED_PAYMENT_TRANSITIONS = {
  PENDING: ['REQUIRES_ACTION', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED'],
  REQUIRES_ACTION: ['AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED'],
  AUTHORIZED: ['PAID', 'FAILED', 'CANCELLED', 'REFUNDED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: []
};

function canTransitionPaymentStatus(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;

  const allowed = ALLOWED_PAYMENT_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

module.exports = { canTransitionPaymentStatus };
