const { z } = require('zod');

const ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const PROMOTION_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED'];

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const productBodySchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().min(1)
}).passthrough();

const productSchema = z.object({
  body: productBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const promotionBodySchema = z.object({
  name: z.string().min(2),
  value: z.union([z.string(), z.number()])
}).passthrough();

const promotionSchema = z.object({
  body: promotionBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const idParamSchema = z.object({
  body: z.object({}).passthrough().optional(),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const variantParamSchema = z.object({
  body: z.object({}).passthrough().optional(),
  params: z.object({ variantId: z.string().min(1) }),
  query: z.object({}).optional()
});

const productWithIdSchema = z.object({
  body: productBodySchema,
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const productStateSchema = z.object({
  body: z.object({
    isActive: z.union([z.boolean(), z.string()])
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const promotionWithIdSchema = z.object({
  body: promotionBodySchema,
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const promotionStateSchema = z.object({
  body: z.object({
    status: z.enum(PROMOTION_STATUSES)
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const orderStatusSchema = z.object({
  body: z.object({
    status: z.enum(ORDER_STATUSES),
    note: z.string().max(500).optional()
  }),
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}).optional()
});

const inventoryAdjustSchema = z.object({
  body: z.object({
    variantId: z.string().min(1),
    quantity: z.union([z.string(), z.number()]),
    note: z.string().max(500).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = {
  loginSchema,
  productSchema,
  productWithIdSchema,
  productStateSchema,
  promotionSchema,
  promotionWithIdSchema,
  promotionStateSchema,
  idParamSchema,
  variantParamSchema,
  orderStatusSchema,
  inventoryAdjustSchema
};
