async function noop(_req, res) {
  return res.status(204).end();
}

module.exports = { noop };
