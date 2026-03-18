const authService = require('./auth.service');
const { mapUserSession } = require('../../utils/mappers');
const { renderPublicView } = require('../../utils/render-public');

async function showLogin(_req, res) {
  return renderPublicView(res, 'public/login', { title: 'Login' });
}

async function login(req, res) {
  const user = await authService.login(req.body);
  req.session.user = mapUserSession(user);
  return res.redirect('/');
}

async function showRegister(_req, res) {
  return renderPublicView(res, 'public/register', { title: 'Registro' });
}

async function register(req, res) {
  const user = await authService.register(req.body);
  req.session.user = mapUserSession(user);
  return res.redirect('/');
}

async function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('jrb.sid');
    res.redirect('/');
  });
}

module.exports = { showLogin, login, showRegister, register, logout };
