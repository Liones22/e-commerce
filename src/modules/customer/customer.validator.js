const { z } = require('zod');

const profileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().min(7).optional()
  }).passthrough(),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = { profileSchema };
