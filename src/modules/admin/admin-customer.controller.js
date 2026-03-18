const adminService = require('./admin.service');

async function list(_req, res) {
  const data = await adminService.getCustomersPageData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Clientes',
    section: 'customers',
    contentView: 'admin/customers/index',
    ...data
  });
}

async function detail(req, res) {
  const customer = await adminService.getCustomerDetail(req.params.id);
  return res.render('layouts/admin.layout.ejs', {
    title: `${customer.firstName} ${customer.lastName}`,
    section: 'customers',
    contentView: 'admin/customers/detail',
    customer
  });
}

module.exports = { list, detail };

