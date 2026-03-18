const { Router } = require('express');
const { authRoutes } = require('../modules/auth/auth.routes');
const { catalogRoutes } = require('../modules/catalog/catalog.routes');
const { promotionRoutes } = require('../modules/promotion/promotion.routes');
const { paymentRoutes } = require('../modules/payment/payment.routes');

const webRoutes = Router();

webRoutes.use('/', catalogRoutes);
webRoutes.use('/', authRoutes);
webRoutes.use('/promociones', promotionRoutes);
webRoutes.use('/pago', paymentRoutes);

module.exports = { webRoutes };
