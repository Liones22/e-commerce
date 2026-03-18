const { AppError } = require('../../utils/app-error');

function getAvailableStock(variant) {
  const stock = Number(variant?.stock || 0);
  const reservedStock = Number(variant?.reservedStock || 0);
  return Math.max(stock - reservedStock, 0);
}

function isStockAvailable(variant, quantity) {
  return getAvailableStock(variant) >= Number(quantity || 0);
}

function assertStockAvailable(variant, quantity, message = 'Insufficient stock') {
  if (!isStockAvailable(variant, quantity)) {
    throw new AppError(message, 409, {
      variantId: variant?.id || null,
      requestedQuantity: Number(quantity || 0),
      availableStock: getAvailableStock(variant)
    });
  }
}

module.exports = {
  getAvailableStock,
  isStockAvailable,
  assertStockAvailable
};
