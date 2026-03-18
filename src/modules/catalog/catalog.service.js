const productRepository = require('./product.repository');
const categoryRepository = require('./category.repository');

const MONEY_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

const ACCENT_BACKGROUNDS = [
  'linear-gradient(135deg, #f4d9d5 0%, #fffdfb 50%, #a65f5f 150%)',
  'linear-gradient(135deg, #1f1c1a 0%, #8b564e 58%, #f6e5e1 140%)',
  'linear-gradient(135deg, #efcfc8 0%, #ffffff 44%, #b37c75 150%)',
  'linear-gradient(135deg, #231f1d 0%, #90665e 56%, #f1ded8 150%)'
];

function formatMoney(value) {
  return MONEY_FORMATTER.format(Number(value || 0));
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function buildCatalogWhere(filters = {}) {
  const where = {};
  const search = normalizeText(filters.search);
  const size = normalizeText(filters.size);
  const categorySlug = normalizeText(filters.categorySlug);
  const minPrice = parseNumber(filters.minPrice);
  const maxPrice = parseNumber(filters.maxPrice);

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { shortDescription: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { name: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const variantFilters = {};
  if (size) variantFilters.size = { code: size };
  if (minPrice !== null || maxPrice !== null) {
    variantFilters.price = {};
    if (minPrice !== null) variantFilters.price.gte = minPrice;
    if (maxPrice !== null) variantFilters.price.lte = maxPrice;
  }

  if (Object.keys(variantFilters).length > 0) {
    where.variants = { some: variantFilters };
  }

  return where;
}

function buildOrderBy(sort) {
  switch (sort) {
    case 'newest':
      return [{ createdAt: 'desc' }];
    case 'name':
      return [{ name: 'asc' }];
    default:
      return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
  }
}

function buildProductUi(product, index = 0) {
  const variants = product.variants || [];
  const prices = variants.map((variant) => Number(variant.price));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const compareAtPrices = variants
    .map((variant) => (variant.compareAtPrice ? Number(variant.compareAtPrice) : null))
    .filter(Boolean);
  const maxCompareAt = compareAtPrices.length ? Math.max(...compareAtPrices) : null;
  const availableSizes = [...new Set(variants.map((variant) => variant.size?.code).filter(Boolean))];
  const background = ACCENT_BACKGROUNDS[index % ACCENT_BACKGROUNDS.length];

  return {
    ...product,
    ui: {
      cardStyle: `background: ${background};`,
      galleryStyle: `background: ${background};`,
      priceLabel:
        minPrice === maxPrice
          ? formatMoney(minPrice)
          : `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`,
      priceValue: minPrice,
      compareAtLabel: maxCompareAt ? formatMoney(maxCompareAt) : null,
      availableSizes,
      sizeLabel: availableSizes.length ? availableSizes.join(' · ') : 'Talla unica',
      categoryLabel: product.category?.name || 'Boutique',
      isFeatured: Boolean(product.isFeatured),
      isLowStock: variants.some((variant) => Number(variant.stock || 0) <= 3),
      slug: product.slug
    }
  };
}

function buildProductList(products) {
  return products.map((product, index) => buildProductUi(product, index));
}

async function getHomeData() {
  const [categories, featuredProducts, freshProducts] = await Promise.all([
    categoryRepository.listCategories(),
    productRepository.listProducts({ take: 8, orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }] }),
    productRepository.listProducts({ take: 4, orderBy: [{ createdAt: 'desc' }] })
  ]);

  return {
    categories,
    featuredProducts: buildProductList(featuredProducts),
    freshProducts: buildProductList(freshProducts),
    hero: {
      eyebrow: 'Boutique femenina en Cali',
      title: 'Piezas elegantes, femeninas y listas para destacar sin esfuerzo.',
      copy:
        'Una experiencia de compra cuidada, visual y directa. Descubre vestidos, blusas, faldas, conjuntos y accesorios con estilo boutique.',
      primaryCta: { href: '/catalogo', label: 'Explorar catalogo' },
      secondaryCta: { href: '/promociones', label: 'Ver promociones' }
    },
    highlights: [
      { label: 'Curadoria', value: 'Seleccion premium' },
      { label: 'Entrega', value: 'Cobertura local y nacional' },
      { label: 'Atencion', value: 'Acompañamiento cercano' }
    ]
  };
}

async function getCatalogData(filters = {}) {
  const normalizedFilters = {
    search: normalizeText(filters.search),
    size: normalizeText(filters.size),
    categorySlug: normalizeText(filters.categorySlug),
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    sort: normalizeText(filters.sort)
  };

  const where = buildCatalogWhere(normalizedFilters);
  const orderBy = buildOrderBy(normalizedFilters.sort);
  const [categories, products, total] = await Promise.all([
    categoryRepository.listCategories(),
    productRepository.listProducts({ take: 24, where, orderBy }),
    productRepository.countProducts(where)
  ]);

  let mappedProducts = buildProductList(products);

  if (normalizedFilters.sort === 'price-asc') {
    mappedProducts = mappedProducts.sort((a, b) => a.ui.priceValue - b.ui.priceValue);
  } else if (normalizedFilters.sort === 'price-desc') {
    mappedProducts = mappedProducts.sort((a, b) => b.ui.priceValue - a.ui.priceValue);
  }

  return {
    categories,
    products: mappedProducts,
    total,
    hasResults: mappedProducts.length > 0,
    filters: normalizedFilters,
    catalogSummary: {
      title: normalizedFilters.categorySlug ? 'Catalogo por categoria' : 'Catalogo completo',
      subtitle: normalizedFilters.search
        ? `Resultados para "${normalizedFilters.search}"`
        : 'Explora nuevas piezas y filtra por talla, precio o categoria.'
    }
  };
}

async function getProductDetail(slug) {
  const product = await productRepository.findProductBySlug(slug);
  if (!product) return null;

  const relatedProducts = await productRepository.listRelatedProducts({
    categoryId: product.categoryId,
    productId: product.id,
    limit: 4
  });

  const mappedProduct = buildProductUi(product, 0);
  const mainVariant = product.variants[0] || null;
  const gallery = product.variants.map((variant, index) => ({
    id: variant.id,
    tone: ACCENT_BACKGROUNDS[index % ACCENT_BACKGROUNDS.length],
    title: `${product.name} ${variant.size?.code || ''}`.trim(),
    subtitle: variant.size?.name || 'Talla unica',
    priceLabel: formatMoney(variant.price),
    stockLabel: variant.stock > 0 ? `${variant.stock} disponibles` : 'Agotado'
  }));

  return {
    product: {
      ...mappedProduct,
      gallery,
      mainVariant,
      variants: product.variants,
      descriptionBlocks: [
        product.shortDescription || 'Una pieza seleccionada para resaltar la silueta con un acabado limpio y femenino.',
        product.description || 'Pensado para combinar versatilidad, presencia y comodidad en el dia a dia o en ocasiones especiales.'
      ],
      fitNotes: [
        'Elige tu talla habitual si prefieres un ajuste clasico.',
        'Revisa la guia de tallas en la ficha del producto antes de comprar.'
      ]
    },
    relatedProducts: buildProductList(relatedProducts)
  };
}

module.exports = {
  getHomeData,
  getCatalogData,
  getProductDetail,
  buildProductUi,
  formatMoney
};
