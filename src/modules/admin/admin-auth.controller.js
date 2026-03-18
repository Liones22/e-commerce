const adminService = require('./admin.service');

function buildSessionUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };
}

async function showLogin(_req, res) {
  return res.render('layouts/admin.layout', {
    title: 'Admin Login',
    section: 'login',
    contentView: 'admin/login'
  });
}

async function login(req, res) {
  const user = await adminService.loginAdmin(req.body);
  req.session.user = buildSessionUser(user);
  return res.redirect('/admin');
}

async function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('jrb.sid');
    res.redirect('/admin/login');
  });
}

module.exports = { showLogin, login, logout };
