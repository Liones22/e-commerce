const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const orderController = require('./order.controller');
const { orderNumberSchema } = require('./order.validator');

const orderRoutes = Router();

orderRoutes.get('/', asyncHandler(orderController.listMyOrders));
orderRoutes.get('/:orderNumber', validate(orderNumberSchema), asyncHandler(orderController.getOrder));

module.exports = { orderRoutes };
