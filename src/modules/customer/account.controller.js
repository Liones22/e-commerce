const customerService = require('./customer.service');

async function showAccount(req, res) {
  const account = await customerService.getAccount(req.session.user.id);
  return res.render('client/account', { title: 'Mi cuenta', account });
}

async function updateProfile(_req, res) {
  return res.status(501).json({ message: 'Profile update not implemented yet' });
}

module.exports = { showAccount, updateProfile };
