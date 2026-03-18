const { Router } = require('express');
const { requireAdminAuth } = require('../middlewares/admin-auth.middleware');
const { adminRoutes: adminModuleRoutes } = require('../modules/admin/admin.routes');

const adminRoutes = Router();

adminRoutes.use('/admin', requireAdminAuth, adminModuleRoutes);

module.exports = { adminRoutes };
