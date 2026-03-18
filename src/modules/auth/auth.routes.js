const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { validate } = require('../../middlewares/validation.middleware');
const { createRateLimiter } = require('../../middlewares/rate-limit.middleware');
const { env } = require('../../config/env');
const authController = require('./auth.controller');
const { loginSchema, registerSchema } = require('./auth.validator');

const authRoutes = Router();

const loginRateLimiter = createRateLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  maxAttempts: env.AUTH_RATE_LIMIT_MAX,
  keyPrefix: 'auth-login',
  keyResolver: (req) => `${req.ip}:${String(req.body?.email || '').trim().toLowerCase() || 'anonymous'}`,
  message: 'Too many login attempts, try again later'
});

authRoutes.get('/login', asyncHandler(authController.showLogin));
authRoutes.post('/login', loginRateLimiter, validate(loginSchema), asyncHandler(authController.login));
authRoutes.get('/registro', asyncHandler(authController.showRegister));
authRoutes.post('/registro', validate(registerSchema), asyncHandler(authController.register));
authRoutes.post('/logout', asyncHandler(authController.logout));

module.exports = { authRoutes };
