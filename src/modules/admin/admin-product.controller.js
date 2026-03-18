const adminService = require('./admin.service');

async function list(_req, res) {
  const data = await adminService.getProductsPageData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Productos',
    section: 'products',
    contentView: 'admin/products/index',
    ...data
  });
}

async function createForm(_req, res) {
  const data = await adminService.getProductFormData();
  return res.render('layouts/admin.layout.ejs', {
    title: 'Nuevo producto',
    section: 'products',
    contentView: 'admin/products/form',
    mode: 'create',
    ...data
  });
}

async function editForm(req, res) {
  const data = await adminService.getProductFormData(req.params.id);
  return res.render('layouts/admin.layout.ejs', {
    title: 'Editar producto',
    section: 'products',
    contentView: 'admin/products/form',
    mode: 'edit',
    ...data
  });
}

async function create(req, res) {
  await adminService.createProduct(req.body);
  return res.redirect('/admin/productos');
}

async function update(req, res) {
  await adminService.updateProduct(req.params.id, req.body);
  return res.redirect('/admin/productos');
}

async function toggleState(req, res) {
  const isActive = req.body.isActive === true || req.body.isActive === 'true';
  await adminService.setProductState(req.params.id, isActive);
  return res.redirect('/admin/productos');
}

module.exports = { list, createForm, editForm, create, update, toggleState };


