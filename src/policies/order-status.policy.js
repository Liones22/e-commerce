const ALLOWED_ORDER_TRANSITIONS = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED', 'REFUNDED'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
  SHIPPED: ['DELIVERED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
};

function canTransitionOrderStatus(fromStatus, toStatus) {
  if (!toStatus) return false;
  if (!fromStatus) return true;
  if (fromStatus === toStatus) return true;

  const allowed = ALLOWED_ORDER_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

module.exports = { canTransitionOrderStatus };
