const { AppError } = require('../../utils/app-error');
const inventoryRepository = require('./inventory.repository');
const { assertStockAvailable } = require('../shared/stock.service');

async function getLowStock(threshold) {
  return inventoryRepository.listLowStock(threshold);
}

async function getVariantOrFail(variantId, options = {}) {
  const variant = await inventoryRepository.findVariantById(variantId, options);
  if (!variant) throw new AppError('Variant not found', 404);
  return variant;
}

async function getVariantsMap(variantIds, options = {}) {
  const variants = await inventoryRepository.findVariantsByIds(variantIds, options);
  return new Map(variants.map((variant) => [variant.id, variant]));
}

async function assertItemsAvailable(items, options = {}) {
  const variantIds = items.map((item) => item.variantId || item.productVariantId);
  const variantsMap = await getVariantsMap(variantIds, options);

  for (const item of items) {
    const variantId = item.variantId || item.productVariantId;
    const variant = variantsMap.get(variantId);
    if (!variant) throw new AppError('Variant not found', 404, { variantId });
    assertStockAvailable(variant, item.quantity);
  }

  return variantsMap;
}

async function reserveItems(items, context = {}, options = {}) {
  const variantsMap = await assertItemsAvailable(items, options);

  for (const item of items) {
    const variantId = item.variantId || item.productVariantId;
    await inventoryRepository.reserveStock({
      variantId,
      quantity: item.quantity,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      note: context.note,
      createdByUserId: context.createdByUserId,
      idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:${variantId}:reserve` : null
    }, options);
  }

  return variantsMap;
}

async function commitReservedItems(items, context = {}, options = {}) {
  for (const item of items) {
    const variantId = item.variantId || item.productVariantId;
    await inventoryRepository.commitReservedStock({
      variantId,
      quantity: item.quantity,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      note: context.note,
      createdByUserId: context.createdByUserId,
      idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:${variantId}:commit` : null
    }, options);
  }
}

async function releaseItems(items, context = {}, options = {}) {
  for (const item of items) {
    const variantId = item.variantId || item.productVariantId;
    await inventoryRepository.releaseStock({
      variantId,
      quantity: item.quantity,
      referenceType: context.referenceType,
      referenceId: context.referenceId,
      note: context.note,
      createdByUserId: context.createdByUserId,
      idempotencyKey: context.idempotencyKey ? `${context.idempotencyKey}:${variantId}:release` : null
    }, options);
  }
}

async function adjustStock({ variantId, quantity, note, createdByUserId }, options = {}) {
  return inventoryRepository.adjustStock({
    variantId,
    quantity,
    note,
    createdByUserId,
    referenceType: 'ADMIN_ADJUSTMENT',
    referenceId: variantId,
    idempotencyKey: null
  }, options);
}

module.exports = {
  getLowStock,
  getVariantOrFail,
  getVariantsMap,
  assertItemsAvailable,
  reserveItems,
  commitReservedItems,
  releaseItems,
  adjustStock
};
