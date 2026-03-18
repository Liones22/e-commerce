const { z } = require('zod');

const variantIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ variantId: z.string().min(1) }),
  query: z.object({}).optional()
});

module.exports = { variantIdSchema };
