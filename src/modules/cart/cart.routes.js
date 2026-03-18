const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const cartController = require('./cart.controller');
const { addCartItemSchema, updateCartItemSchema, itemIdSchema, couponSchema } = require('./cart.validator');

const cartRoutes = Router();

cartRoutes.get('/', asyncHandler(cartController.showCart));
cartRoutes.post('/items', validate(addCartItemSchema), asyncHandler(cartController.addItem));
cartRoutes.patch('/items/:itemId', validate(updateCartItemSchema), asyncHandler(cartController.updateItem));
cartRoutes.delete('/items/:itemId', validate(itemIdSchema), asyncHandler(cartController.removeItem));
cartRoutes.post('/cupon', validate(couponSchema), asyncHandler(cartController.applyCoupon));
cartRoutes.delete('/cupon', asyncHandler(cartController.removeCoupon));

module.exports = { cartRoutes };
