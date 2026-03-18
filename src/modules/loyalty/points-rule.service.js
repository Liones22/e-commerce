function calculateEarnedPoints(order) {
  const grandTotal = Number(order?.grandTotal || 0);
  return Math.max(Math.floor(grandTotal / 10000), 0);
}

module.exports = { calculateEarnedPoints };
