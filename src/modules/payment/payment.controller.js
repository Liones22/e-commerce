const paymentService = require('./payment.service');

async function paymentReturn(req, res) {
  const result = await paymentService.handleReturn(req.query);
  return res.status(200).json({ result });
}

async function paymentWebhook(req, res) {
  const result = await paymentService.handleWebhook(req.body, {
    signature: req.get('x-jrb-signature'),
    rawBody: req.rawBody
  });

  return res.status(200).json({ result });
}

module.exports = { paymentReturn, paymentWebhook };
