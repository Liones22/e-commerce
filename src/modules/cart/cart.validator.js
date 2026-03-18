const { z } = require('zod');

const addCartItemSchema = z.object({
  body: z.object({
    variantId: z.string().min(1),
    quantity: z.coerce.number().int().positive()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().positive()
  }),
  params: z.object({ itemId: z.string().min(1) }),
  query: z.object({}).optional()
});

const itemIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ itemId: z.string().min(1) }),
  query: z.object({}).optional()
});

const couponSchema = z.object({
  body: z.object({ couponCode: z.string().min(3) }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = {
  addCartItemSchema,
  updateCartItemSchema,
  itemIdSchema,
  couponSchema
};
