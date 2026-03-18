const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const { Pool } = require('pg');
const { env } = require('./env');

function createSessionMiddleware() {
  const pgSession = connectPgSimple(session);
  const isProd = env.NODE_ENV === 'production';

  let store;
  if (env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: isProd ? { rejectUnauthorized: false } : false
    });

    store = new pgSession({
      pool,
      tableName: 'user_sessions',
      createTableIfMissing: true
    });
  }

  return session({
    store,
    name: 'jrb.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  });
}

module.exports = { createSessionMiddleware };
