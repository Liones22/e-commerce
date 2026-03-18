const adminService = require('./admin.service');

async function list(_req, res) {
  const data = await adminService.getOrdersPageData();
  return res.render('layouts/admin.layout', {
    title: 'Pedidos',
    section: 'orders',
    contentView: 'admin/orders/index',
    ...data
  });
}

async function detail(req, res) {
  const order = await adminService.getOrderDetail(req.params.id);
  return res.render('layouts/admin.layout', {
    title: `Pedido ${order.orderNumber}`,
    section: 'orders',
    contentView: 'admin/orders/detail',
    order
  });
}

async function updateStatus(req, res) {
  await adminService.changeOrderStatus({
    id: req.params.id,
    status: req.body.status,
    note: req.body.note,
    changedByUserId: req.session.user.id
  });

  return res.redirect(`/admin/pedidos/${req.params.id}`);
}

module.exports = { list, detail, updateStatus };
