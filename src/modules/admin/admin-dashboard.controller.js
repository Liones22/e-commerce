const adminService = require('./admin.service');

async function index(_req, res) {
  const data = await adminService.getDashboardData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Dashboard',
    section: 'dashboard',
    contentView: 'admin/index',
    data
  });
}

module.exports = { index };

