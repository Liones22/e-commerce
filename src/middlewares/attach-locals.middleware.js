function attachLocalsMiddleware(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  res.locals.flash = req.session?.flash || null;

  if (req.session?.flash) {
    delete req.session.flash;
  }

  next();
}

module.exports = { attachLocalsMiddleware };
