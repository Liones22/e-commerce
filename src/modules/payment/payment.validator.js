const { z } = require('zod');

const paymentLookupSchema = z.object({
  paymentId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  attemptId: z.string().min(1).optional(),
  providerAttemptId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  event: z.string().min(1).optional()
}).refine((payload) => payload.paymentId || payload.reference, {
  message: 'paymentId or reference is required'
});

const paymentReturnSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: paymentLookupSchema
});

const paymentWebhookSchema = z.object({
  body: paymentLookupSchema.extend({
    eventId: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    provider: z.enum(['MANUAL', 'WOMPI', 'CASH']).optional(),
    signature: z.string().min(16).optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
}).refine((payload) => payload.body.event || payload.body.status, {
  message: 'event or status is required for webhook',
  path: ['body', 'event']
});

module.exports = {
  paymentReturnSchema,
  paymentWebhookSchema
};
