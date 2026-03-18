const { renderPublicView } = require('../utils/render-public');

function errorHandlerMiddleware(err, req, res, _next) {
  const isCsrfError = err && err.code === 'EBADCSRFTOKEN';
  const statusCode = isCsrfError ? 403 : (err.statusCode || 500);
  const message = isCsrfError ? 'Invalid CSRF token' : (err.message || 'Internal Server Error');

  if (req.accepts('html')) {
    res.status(statusCode);
    renderPublicView(res, 'public/error', {
      title: 'Error',
      message,
      details: err.details || null
    }).catch(() => {
      res.status(statusCode).send(message);
    });
    return;
  }

  res.status(statusCode).json({
    error: {
      message,
      details: err.details || null
    }
  });
}

module.exports = { errorHandlerMiddleware };
