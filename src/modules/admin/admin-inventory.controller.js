const adminService = require('./admin.service');

async function list(_req, res) {
  const data = await adminService.getInventoryPageData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Inventario',
    section: 'inventory',
    contentView: 'admin/inventory/index',
    ...data
  });
}

async function detail(req, res) {
  const variant = await adminService.getInventoryDetail(req.params.variantId);
  return res.render('layouts/admin.layout.ejs', {
    title: `Inventario ${variant.product.name}`,
    section: 'inventory',
    contentView: 'admin/inventory/detail',
    variant
  });
}

async function adjust(req, res) {
  await adminService.adjustInventory({
    variantId: req.body.variantId,
    quantity: req.body.quantity,
    note: req.body.note,
    createdByUserId: req.session.user.id
  });

  return res.redirect(`/admin/inventario/${req.body.variantId}`);
}

module.exports = { list, detail, adjust };

