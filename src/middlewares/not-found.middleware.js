const { renderPublicView } = require('../utils/render-public');

function notFoundMiddleware(req, res, next) {
  if (req.accepts('html')) {
    res.status(404);
    renderPublicView(res, 'public/404', { title: 'No encontrado' }).catch(next);
    return;
  }

  res.status(404).json({ error: { message: 'Not found' } });
}

module.exports = { notFoundMiddleware };
