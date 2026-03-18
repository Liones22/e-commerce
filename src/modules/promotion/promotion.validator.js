const { z } = require('zod');

const couponSchema = z.object({
  body: z.object({ couponCode: z.string().min(3) }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = { couponSchema };
