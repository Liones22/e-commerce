const { app } = require('./app');
const { env } = require('./config/env');

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[${env.APP_NAME}] running on http://localhost:${env.PORT}`);
});
