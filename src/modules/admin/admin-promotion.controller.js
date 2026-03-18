const adminService = require('./admin.service');

async function list(_req, res) {
  const data = await adminService.getPromotionsPageData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Promociones',
    section: 'promotions',
    contentView: 'admin/promotions/index',
    ...data
  });
}

async function createForm(_req, res) {
  const data = await adminService.getPromotionFormData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Nueva promocion',
    section: 'promotions',
    contentView: 'admin/promotions/form',
    mode: 'create',
    ...data
  });
}

async function editForm(req, res) {
  const data = await adminService.getPromotionFormData(req.params.id);
  return res.render('layouts/admin.layout.ejs', {
    title: 'Editar promocion',
    section: 'promotions',
    contentView: 'admin/promotions/form',
    mode: 'edit',
    ...data
  });
}

async function create(req, res) {
  await adminService.createPromotion(req.body);
  return res.redirect('/admin/promociones');
}

async function update(req, res) {
  await adminService.updatePromotion(req.params.id, req.body);
  return res.redirect('/admin/promociones');
}

async function updateState(req, res) {
  await adminService.setPromotionState(req.params.id, req.body.status);
  return res.redirect('/admin/promociones');
}

module.exports = { list, createForm, editForm, create, update, updateState };

