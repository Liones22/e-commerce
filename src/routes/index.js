const { Router } = require('express');
const { webRoutes } = require('./web.routes');
const { clientRoutes } = require('./client.routes');
const { adminRoutes } = require('./admin.routes');

function createAppRouter() {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ ok: true, service: 'jrb-ecommerce' });
  });

  router.use('/', webRoutes);
  router.use('/', clientRoutes);
  router.use('/', adminRoutes);

  return router;
}

module.exports = { createAppRouter };
