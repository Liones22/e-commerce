const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const { profileSchema } = require('./customer.validator');
const accountController = require('./account.controller');
const addressController = require('./address.controller');

const customerRoutes = Router();

customerRoutes.get('/mi-cuenta', asyncHandler(accountController.showAccount));
customerRoutes.get('/mi-cuenta/perfil', asyncHandler(accountController.showAccount));
customerRoutes.post('/mi-cuenta/perfil', validate(profileSchema), asyncHandler(accountController.updateProfile));
customerRoutes.get('/mi-cuenta/direcciones', asyncHandler(addressController.listAddresses));
customerRoutes.post('/mi-cuenta/direcciones', asyncHandler(addressController.createAddress));
customerRoutes.put('/mi-cuenta/direcciones/:id', asyncHandler(addressController.updateAddress));

module.exports = { customerRoutes };
