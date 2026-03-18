const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const checkoutController = require('./checkout.controller');
const { checkoutSummarySchema, checkoutQuerySchema } = require('./checkout.validator');

const checkoutRoutes = Router();

checkoutRoutes.get('/', validate(checkoutQuerySchema), asyncHandler(checkoutController.showCheckout));
checkoutRoutes.post('/resumen', validate(checkoutSummarySchema), asyncHandler(checkoutController.summary));
checkoutRoutes.post('/confirmacion', validate(checkoutSummarySchema), asyncHandler(checkoutController.confirm));

module.exports = { checkoutRoutes };
