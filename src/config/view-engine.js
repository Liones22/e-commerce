const path = require('path');

function setupViewEngine(app) {
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(process.cwd(), 'src/views'));
}

module.exports = { setupViewEngine };
