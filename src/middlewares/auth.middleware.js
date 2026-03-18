const { AppError } = require('../utils/app-error');

function requireAuth(req, _res, next) {
  if (!req.session || !req.session.user) {
    return next(new AppError('Authentication required', 401));
  }

  return next();
}

function requireRole(role) {
  return (req, _res, next) => {
    if (!req.session || !req.session.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (req.session.user.role !== role) {
      return next(new AppError(`${role} role required`, 403));
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
