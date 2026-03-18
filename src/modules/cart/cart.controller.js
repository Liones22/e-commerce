const cartService = require('./cart.service');

async function showCart(req, res) {
  const cart = await cartService.getMyCart(req.session.user.id);
  return res.status(200).json({ cart });
}

async function addItem(req, res) {
  const result = await cartService.addItem({
    userId: req.session.user.id,
    ...req.body
  });
  return res.status(201).json({ result });
}

async function updateItem(req, res) {
  const result = await cartService.updateItem({
    userId: req.session.user.id,
    itemId: req.params.itemId,
    ...req.body
  });
  return res.status(200).json({ result });
}

async function removeItem(req, res) {
  await cartService.removeItem({
    userId: req.session.user.id,
    itemId: req.params.itemId
  });
  return res.status(204).end();
}

async function applyCoupon(req, res) {
  const result = await cartService.applyCoupon({
    userId: req.session.user.id,
    couponCode: req.body.couponCode
  });
  return res.status(200).json({ result });
}

async function removeCoupon(req, res) {
  const result = await cartService.removeCoupon({ userId: req.session.user.id });
  return res.status(200).json({ result });
}

module.exports = { showCart, addItem, updateItem, removeItem, applyCoupon, removeCoupon };
