const { AppError } = require('../utils/app-error');

function requireAdminAuth(req, res, next) {
  if (req.path === '/login' && (req.method === 'GET' || req.method === 'POST')) {
    return next();
  }

  if (!req.session || !req.session.user) {
    if (req.accepts('html')) {
      return res.redirect('/admin/login');
    }

    return next(new AppError('Authentication required', 401));
  }

  if (req.session.user.role !== 'ADMIN') {
    return next(new AppError('Admin role required', 403));
  }

  return next();
}

module.exports = { requireAdminAuth };
