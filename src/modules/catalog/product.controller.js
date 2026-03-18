const { AppError } = require('../../utils/app-error');
const { renderPublicView } = require('../../utils/render-public');
const catalogService = require('./catalog.service');

function buildCatalogQuery(query = {}) {
  return {
    search: query.q,
    size: query.size,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort
  };
}

async function home(_req, res) {
  const data = await catalogService.getHomeData();
  return renderPublicView(res, 'public/home', { title: 'Inicio', ...data });
}

async function listCatalog(req, res) {
  const data = await catalogService.getCatalogData(buildCatalogQuery(req.query));
  return renderPublicView(res, 'public/catalog', { title: 'Catalogo', ...data, activeCategory: null });
}

async function listByCategory(req, res) {
  const data = await catalogService.getCatalogData({
    ...buildCatalogQuery(req.query),
    categorySlug: req.params.slug
  });

  return renderPublicView(res, 'public/catalog', {
    title: `Catalogo - ${req.params.slug}`,
    activeCategory: req.params.slug,
    ...data
  });
}

async function detail(req, res) {
  const result = await catalogService.getProductDetail(req.params.slug);
  if (!result) throw new AppError('Product not found', 404);

  return renderPublicView(res, 'public/product-detail', {
    title: result.product.name,
    ...result
  });
}

module.exports = { home, listCatalog, listByCategory, detail };
