const { z } = require('zod');

const slugParamSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({ slug: z.string().min(1) }),
  query: z.object({}).optional()
});

const catalogQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    q: z.string().optional(),
    size: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    sort: z.string().optional()
  }).optional()
});

module.exports = { slugParamSchema, catalogQuerySchema };
