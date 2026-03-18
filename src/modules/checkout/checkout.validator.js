const { z } = require('zod');

const paymentProviderSchema = z.enum(['MANUAL', 'WOMPI', 'CASH']).default('MANUAL');

const checkoutPayload = z.object({
  shippingAddressId: z.string().min(1).optional(),
  billingAddressId: z.string().min(1).optional(),
  paymentProvider: paymentProviderSchema,
  couponCode: z.string().min(3).optional(),
  pointsToRedeem: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(500).optional()
});

const checkoutSummarySchema = z.object({
  body: checkoutPayload,
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const checkoutQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: checkoutPayload.partial().default({})
});

module.exports = { checkoutSummarySchema, checkoutQuerySchema };
