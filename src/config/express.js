const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');

const { env } = require('./env');
const { setupViewEngine } = require('./view-engine');
const { createSessionMiddleware } = require('./session');

function createExpressApp() {
  const app = express();

  app.set('trust proxy', 1);
  setupViewEngine(app);

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'script-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'"]
      }
    }
  }));
  app.use(compression());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = buffer?.toString('utf8') || '';
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride('_method'));
  app.use(cookieParser());
  app.use(createSessionMiddleware());

  app.use(express.static(path.resolve(process.cwd(), 'src/public')));

  return app;
}

module.exports = { createExpressApp };
