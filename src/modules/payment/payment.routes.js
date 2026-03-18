const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const paymentController = require('./payment.controller');
const { paymentReturnSchema, paymentWebhookSchema } = require('./payment.validator');

const paymentRoutes = Router();

paymentRoutes.get('/retorno', validate(paymentReturnSchema), asyncHandler(paymentController.paymentReturn));
paymentRoutes.post('/webhook', validate(paymentWebhookSchema), asyncHandler(paymentController.paymentWebhook));

module.exports = { paymentRoutes };
