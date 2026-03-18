const csurf = require('csurf');
const { env } = require('../config/env');

const csrfProtection = csurf({
  cookie: false,
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

function shouldSkipCsrf(req) {
  if (!env.CSRF_ENABLED) return true;

  // External payment providers do not have session-backed CSRF tokens.
  if (req.method === 'POST' && req.path.startsWith('/pago/webhook')) {
    return true;
  }

  return false;
}

function applyCsrfProtection(req, res, next) {
  if (shouldSkipCsrf(req)) return next();
  return csrfProtection(req, res, next);
}

module.exports = { csrfProtection, applyCsrfProtection };

