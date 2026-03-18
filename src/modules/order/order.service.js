const { AppError } = require('../../utils/app-error');
const orderRepository = require('./order.repository');

async function getMyOrders(userId, options = {}) {
  return orderRepository.listByUser(userId, options);
}

async function getOrderDetail(orderNumber, userId, options = {}) {
  const order = await orderRepository.findByOrderNumber(orderNumber, options);
  if (!order || order.userId !== userId) throw new AppError('Order not found', 404);
  return order;
}

module.exports = { getMyOrders, getOrderDetail };
