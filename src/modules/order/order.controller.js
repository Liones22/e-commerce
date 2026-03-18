const orderService = require('./order.service');

async function listMyOrders(req, res) {
  const orders = await orderService.getMyOrders(req.session.user.id);
  return res.status(200).json({ orders });
}

async function getOrder(req, res) {
  const order = await orderService.getOrderDetail(req.params.orderNumber, req.session.user.id);
  return res.status(200).json({ order });
}

module.exports = { listMyOrders, getOrder };
