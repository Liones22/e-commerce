const { z } = require('zod');

const orderNumberSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ orderNumber: z.string().min(1) }),
  query: z.object({}).optional()
});

module.exports = { orderNumberSchema };
