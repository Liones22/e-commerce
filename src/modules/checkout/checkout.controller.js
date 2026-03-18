const checkoutService = require('./checkout.service');

async function showCheckout(req, res) {
  const result = await checkoutService.getCheckoutSummary({
    userId: req.session.user.id,
    ...req.query
  });
  return res.status(200).json({ result });
}

async function summary(req, res) {
  const result = await checkoutService.getCheckoutSummary({
    userId: req.session.user.id,
    ...req.body
  });
  return res.status(200).json({ result });
}

async function confirm(req, res) {
  const result = await checkoutService.confirmCheckout({
    userId: req.session.user.id,
    ...req.body
  });
  return res.status(200).json({ result });
}

module.exports = { showCheckout, summary, confirm };
