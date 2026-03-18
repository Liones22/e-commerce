const { createExpressApp } = require('./config/express');
const { createAppRouter } = require('./routes');
const { attachLocalsMiddleware } = require('./middlewares/attach-locals.middleware');
const { applyCsrfProtection } = require('./middlewares/csrf.middleware');
const { notFoundMiddleware } = require('./middlewares/not-found.middleware');
const { errorHandlerMiddleware } = require('./middlewares/error-handler.middleware');

const app = createExpressApp();

app.use(applyCsrfProtection);
app.use(attachLocalsMiddleware);
app.use(createAppRouter());
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = { app };
