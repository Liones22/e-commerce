const { Router } = require('express');
const { requireClientAuth } = require('../middlewares/client-auth.middleware');
const { customerRoutes } = require('../modules/customer/customer.routes');
const { cartRoutes } = require('../modules/cart/cart.routes');
const { checkoutRoutes } = require('../modules/checkout/checkout.routes');
const { orderRoutes } = require('../modules/order/order.routes');
const { loyaltyRoutes } = require('../modules/loyalty/loyalty.routes');

const clientRoutes = Router();

clientRoutes.use(requireClientAuth);
clientRoutes.use('/', customerRoutes);
clientRoutes.use('/carrito', cartRoutes);
clientRoutes.use('/checkout', checkoutRoutes);
clientRoutes.use('/mis-pedidos', orderRoutes);
clientRoutes.use('/mis-puntos', loyaltyRoutes);

module.exports = { clientRoutes };
