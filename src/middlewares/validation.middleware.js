function validate(schema) {
  return (req, _res, next) => {
    if (!schema) return next();

    const payload = {
      body: req.body,
      params: req.params,
      query: req.query
    };

    const result = schema.safeParse(payload);
    if (!result.success) {
      return next({
        statusCode: 400,
        message: 'Validation error',
        details: result.error.issues
      });
    }

    req.validated = result.data;
    req.body = result.data.body || {};
    req.params = result.data.params || {};
    req.query = result.data.query || {};
    return next();
  };
}

module.exports = { validate };
