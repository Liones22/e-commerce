const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const { slugParamSchema, catalogQuerySchema } = require('./catalog.validator');
const productController = require('./product.controller');

const catalogRoutes = Router();

catalogRoutes.get('/', asyncHandler(productController.home));
catalogRoutes.get('/catalogo', validate(catalogQuerySchema), asyncHandler(productController.listCatalog));
catalogRoutes.get('/catalogo/categoria/:slug', validate(slugParamSchema), asyncHandler(productController.listByCategory));
catalogRoutes.get('/producto/:slug', validate(slugParamSchema), asyncHandler(productController.detail));

module.exports = { catalogRoutes };
