const { Prisma } = require('@prisma/client');
const { AppError } = require('../../utils/app-error');
const { getDb } = require('../shared/transaction.service');

function toPositiveInt(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Quantity must be a positive integer', 400);
  }

  return parsed;
}

async function getVariantForValidation(db, variantId) {
  return db.productVariant.findUnique({ where: { id: variantId } });
}

async function findExistingMovement(db, idempotencyKey) {
  if (!idempotencyKey) return null;
  return db.inventoryMovement.findUnique({ where: { idempotencyKey } });
}

async function getVariantAfterOperation(db, variantId) {
  return db.productVariant.findUnique({ where: { id: variantId } });
}

async function createMovement(db, data) {
  await db.inventoryMovement.create({ data });
}

async function listLowStock(threshold = 5, options = {}) {
  const db = getDb(options.tx);

  return db.productVariant.findMany({
    where: { stock: { lte: threshold }, isActive: true, deletedAt: null },
    orderBy: { stock: 'asc' },
    take: 50,
    include: {
      product: true,
      size: true
    }
  });
}

async function findVariantById(id, options = {}) {
  const db = getDb(options.tx);

  return db.productVariant.findFirst({
    where: { id, isActive: true, deletedAt: null },
    include: {
      product: true,
      size: true
    }
  });
}

async function findVariantsByIds(ids, options = {}) {
  const db = getDb(options.tx);

  return db.productVariant.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      deletedAt: null
    },
    include: {
      product: true,
      size: true
    }
  });
}

async function reserveStock({ variantId, quantity, referenceType, referenceId, note, createdByUserId, idempotencyKey }, options = {}) {
  const db = getDb(options.tx);
  const parsedQuantity = toPositiveInt(quantity);

  const existingMovement = await findExistingMovement(db, idempotencyKey);
  if (existingMovement) {
    return getVariantAfterOperation(db, variantId);
  }

  const updatedRows = await db.$queryRaw(Prisma.sql`
    UPDATE "ProductVariant"
       SET "reservedStock" = "reservedStock" + ${parsedQuantity},
           "updatedAt" = NOW()
     WHERE "id" = ${variantId}
       AND "isActive" = TRUE
       AND "deletedAt" IS NULL
       AND ("stock" - "reservedStock") >= ${parsedQuantity}
   RETURNING "id", "stock", "reservedStock";
  `);

  if (!updatedRows.length) {
    const variant = await getVariantForValidation(db, variantId);
    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new AppError('Variant not found', 404);
    }

    throw new AppError('Insufficient stock', 409, {
      variantId,
      requestedQuantity: parsedQuantity,
      availableStock: Math.max(Number(variant.stock || 0) - Number(variant.reservedStock || 0), 0)
    });
  }

  const updatedVariant = updatedRows[0];

  await createMovement(db, {
    productVariantId: variantId,
    type: 'RESERVE',
    quantity: parsedQuantity,
    stockAfter: updatedVariant.stock,
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    note: note || null,
    createdByUserId: createdByUserId || null,
    idempotencyKey: idempotencyKey || null
  });

  return getVariantAfterOperation(db, variantId);
}

async function releaseStock({ variantId, quantity, referenceType, referenceId, note, createdByUserId, idempotencyKey }, options = {}) {
  const db = getDb(options.tx);
  const parsedQuantity = toPositiveInt(quantity);

  const existingMovement = await findExistingMovement(db, idempotencyKey);
  if (existingMovement) {
    return getVariantAfterOperation(db, variantId);
  }

  const updatedRows = await db.$queryRaw(Prisma.sql`
    UPDATE "ProductVariant"
       SET "reservedStock" = "reservedStock" - ${parsedQuantity},
           "updatedAt" = NOW()
     WHERE "id" = ${variantId}
       AND "isActive" = TRUE
       AND "deletedAt" IS NULL
       AND "reservedStock" >= ${parsedQuantity}
   RETURNING "id", "stock", "reservedStock";
  `);

  if (!updatedRows.length) {
    const variant = await getVariantForValidation(db, variantId);
    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new AppError('Variant not found', 404);
    }

    throw new AppError('Reserved stock is insufficient for release', 409, {
      variantId,
      requestedQuantity: parsedQuantity,
      reservedStock: Number(variant.reservedStock || 0)
    });
  }

  const updatedVariant = updatedRows[0];

  await createMovement(db, {
    productVariantId: variantId,
    type: 'RELEASE',
    quantity: parsedQuantity,
    stockAfter: updatedVariant.stock,
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    note: note || null,
    createdByUserId: createdByUserId || null,
    idempotencyKey: idempotencyKey || null
  });

  return getVariantAfterOperation(db, variantId);
}

async function commitReservedStock({ variantId, quantity, referenceType, referenceId, note, createdByUserId, idempotencyKey }, options = {}) {
  const db = getDb(options.tx);
  const parsedQuantity = toPositiveInt(quantity);

  const existingMovement = await findExistingMovement(db, idempotencyKey);
  if (existingMovement) {
    return getVariantAfterOperation(db, variantId);
  }

  const updatedRows = await db.$queryRaw(Prisma.sql`
    UPDATE "ProductVariant"
       SET "reservedStock" = "reservedStock" - ${parsedQuantity},
           "stock" = "stock" - ${parsedQuantity},
           "updatedAt" = NOW()
     WHERE "id" = ${variantId}
       AND "isActive" = TRUE
       AND "deletedAt" IS NULL
       AND "reservedStock" >= ${parsedQuantity}
       AND "stock" >= ${parsedQuantity}
   RETURNING "id", "stock", "reservedStock";
  `);

  if (!updatedRows.length) {
    const variant = await getVariantForValidation(db, variantId);
    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new AppError('Variant not found', 404);
    }

    throw new AppError('Insufficient reserved stock to commit', 409, {
      variantId,
      requestedQuantity: parsedQuantity,
      stock: Number(variant.stock || 0),
      reservedStock: Number(variant.reservedStock || 0)
    });
  }

  const updatedVariant = updatedRows[0];

  await createMovement(db, {
    productVariantId: variantId,
    type: 'DECREASE',
    quantity: parsedQuantity,
    stockAfter: updatedVariant.stock,
    referenceType: referenceType || null,
    referenceId: referenceId || null,
    note: note || null,
    createdByUserId: createdByUserId || null,
    idempotencyKey: idempotencyKey || null
  });

  return getVariantAfterOperation(db, variantId);
}

async function adjustStock({ variantId, quantity, referenceType, referenceId, note, createdByUserId, idempotencyKey }, options = {}) {
  const db = getDb(options.tx);
  const parsedQuantity = Number(quantity);

  if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
    throw new AppError('Inventory adjustment quantity must be a non-zero integer', 400);
  }

  const existingMovement = await findExistingMovement(db, idempotencyKey);
  if (existingMovement) {
    return getVariantAfterOperation(db, variantId);
  }

  const absoluteQuantity = Math.abs(parsedQuantity);
  const updatedRows = parsedQuantity > 0
    ? await db.$queryRaw(Prisma.sql`
      UPDATE "ProductVariant"
         SET "stock" = "stock" + ${absoluteQuantity},
             "updatedAt" = NOW()
       WHERE "id" = ${variantId}
         AND "isActive" = TRUE
         AND "deletedAt" IS NULL
     RETURNING "id", "stock", "reservedStock";
    `)
    : await db.$queryRaw(Prisma.sql`
      UPDATE "ProductVariant"
         SET "stock" = "stock" - ${absoluteQuantity},
             "updatedAt" = NOW()
       WHERE "id" = ${variantId}
         AND "isActive" = TRUE
         AND "deletedAt" IS NULL
         AND "stock" >= ${absoluteQuantity}
     RETURNING "id", "stock", "reservedStock";
    `);

  if (!updatedRows.length) {
    const variant = await getVariantForValidation(db, variantId);
    if (!variant || !variant.isActive || variant.deletedAt) {
      throw new AppError('Variant not found', 404);
    }

    throw new AppError('Insufficient stock for adjustment', 409, {
      variantId,
      requestedQuantity: parsedQuantity,
      stock: Number(variant.stock || 0)
    });
  }

  const updatedVariant = updatedRows[0];

  await createMovement(db, {
    productVariantId: variantId,
    type: 'ADJUSTMENT',
    quantity: parsedQuantity,
    stockAfter: updatedVariant.stock,
    referenceType: referenceType || 'ADMIN_ADJUSTMENT',
    referenceId: referenceId || null,
    note: note || null,
    createdByUserId: createdByUserId || null,
    idempotencyKey: idempotencyKey || null
  });

  return getVariantAfterOperation(db, variantId);
}

module.exports = {
  listLowStock,
  findVariantById,
  findVariantsByIds,
  reserveStock,
  releaseStock,
  commitReservedStock,
  adjustStock
};
