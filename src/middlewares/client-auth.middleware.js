const { requireAuth, requireRole } = require('./auth.middleware');

const requireClientRole = requireRole('CLIENT');

function requireClientAuth(req, res, next) {
  return requireAuth(req, res, (authErr) => {
    if (authErr) return next(authErr);
    return requireClientRole(req, res, next);
  });
}

module.exports = { requireClientAuth };
