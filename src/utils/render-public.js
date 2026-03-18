function renderPublicView(res, view, locals = {}) {
  return new Promise((resolve, reject) => {
    res.render(view, locals, (viewErr, body) => {
      if (viewErr) return reject(viewErr);

      const layoutLocals = { ...locals, body };
      res.render('layouts/public.layout', layoutLocals, (layoutErr, html) => {
        if (layoutErr) return reject(layoutErr);

        res.send(html);
        return resolve();
      });
    });
  });
}

module.exports = { renderPublicView };
