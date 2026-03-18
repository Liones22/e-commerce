const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const { createRateLimiter } = require('../../middlewares/rate-limit.middleware');
const { env } = require('../../config/env');
const {
  loginSchema,
  productSchema,
  productWithIdSchema,
  productStateSchema,
  promotionSchema,
  promotionWithIdSchema,
  promotionStateSchema,
  idParamSchema,
  variantParamSchema,
  orderStatusSchema,
  inventoryAdjustSchema
} = require('./admin.validator');
const authController = require('./admin-auth.controller');
const dashboardController = require('./admin-dashboard.controller');
const productController = require('./admin-product.controller');
const orderController = require('./admin-order.controller');
const customerController = require('./admin-customer.controller');
const promotionController = require('./admin-promotion.controller');
const inventoryController = require('./admin-inventory.controller');

const adminRoutes = Router();

const adminLoginRateLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  maxAttempts: env.AUTH_RATE_LIMIT_MAX,
  keyPrefix: 'admin-login',
  keyResolver: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase() || 'anonymous'}`,
  message: 'Too many admin login attempts, try again later'
});

adminRoutes.get('/login', asyncHandler(authController.showLogin));
adminRoutes.post('/login', adminLoginRateLimiter, validate(loginSchema), asyncHandler(authController.login));
adminRoutes.post('/logout', asyncHandler(authController.logout));

adminRoutes.get('/', asyncHandler(dashboardController.index));

adminRoutes.get('/productos', asyncHandler(productController.list));
adminRoutes.get('/productos/nuevo', asyncHandler(productController.createForm));
adminRoutes.post('/productos', validate(productSchema), asyncHandler(productController.create));
adminRoutes.get('/productos/:id/editar', validate(idParamSchema), asyncHandler(productController.editForm));
adminRoutes.put('/productos/:id', validate(productWithIdSchema), asyncHandler(productController.update));
adminRoutes.patch('/productos/:id/estado', validate(productStateSchema), asyncHandler(productController.toggleState));

adminRoutes.get('/inventario', asyncHandler(inventoryController.list));
adminRoutes.get('/inventario/:variantId', validate(variantParamSchema), asyncHandler(inventoryController.detail));
adminRoutes.post('/inventario/ajustes', validate(inventoryAdjustSchema), asyncHandler(inventoryController.adjust));

adminRoutes.get('/pedidos', asyncHandler(orderController.list));
adminRoutes.get('/pedidos/:id', validate(idParamSchema), asyncHandler(orderController.detail));
adminRoutes.patch('/pedidos/:id/estado', validate(orderStatusSchema), asyncHandler(orderController.updateStatus));

adminRoutes.get('/clientes', asyncHandler(customerController.list));
adminRoutes.get('/clientes/:id', validate(idParamSchema), asyncHandler(customerController.detail));

adminRoutes.get('/promociones', asyncHandler(promotionController.list));
adminRoutes.get('/promociones/nueva', asyncHandler(promotionController.createForm));
adminRoutes.post('/promociones', validate(promotionSchema), asyncHandler(promotionController.create));
adminRoutes.get('/promociones/:id/editar', validate(idParamSchema), asyncHandler(promotionController.editForm));
adminRoutes.put('/promociones/:id', validate(promotionWithIdSchema), asyncHandler(promotionController.update));
adminRoutes.patch('/promociones/:id/estado', validate(promotionStateSchema), asyncHandler(promotionController.updateState));

module.exports = { adminRoutes };
