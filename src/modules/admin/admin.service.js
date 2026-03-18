const bcrypt = require('bcrypt');
const { AppError } = require('../../utils/app-error');
const { slugify } = require('../shared/slug.service');
const inventoryService = require('../inventory/inventory.service');
const adminRepository = require('./admin.repository');

function toBoolean(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeVariants(payload) {
  const ids = asArray(payload.variantIds);
  const sizeIds = asArray(payload.variantSizeIds);
  const skus = asArray(payload.variantSkus);
  const prices = asArray(payload.variantPrices);
  const compareAtPrices = asArray(payload.variantCompareAtPrices);
  const stocks = asArray(payload.variantStocks);
  const activeFlags = asArray(payload.variantActiveFlags);

  const sizeMap = new Map();

  sizeIds.forEach((sizeId, index) => {
    if (!sizeId) return;

    sizeMap.set(sizeId, {
      id: ids[index] || undefined,
      sizeId,
      sku: skus[index] || '',
      price: toNumber(prices[index]),
      compareAtPrice: compareAtPrices[index] ? toNumber(compareAtPrices[index]) : null,
      stock: toNumber(stocks[index]),
      reservedStock: 0,
      isActive: toBoolean(activeFlags[index]) || activeFlags[index] === undefined
    });
  });

  return Array.from(sizeMap.values()).filter((variant) => variant.sku && variant.price >= 0);
}

async function loginAdmin({ email, password }) {
  const admin = await adminRepository.findAdminByEmail(email);
  if (!admin) throw new AppError('Invalid admin credentials', 401);

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) throw new AppError('Invalid admin credentials', 401);

  return admin;
}

async function getDashboardData() {
  const [
    sales,
    totalProducts,
    activePromotions,
    pendingOrders,
    lowStockCount,
    topProducts,
    lowStockItems,
    recentOrders
  ] = await Promise.all([
    adminRepository.getSalesOverview(),
    adminRepository.countActiveProducts(),
    adminRepository.countActivePromotions(),
    adminRepository.countPendingOrders(),
    adminRepository.getLowStockCount(),
    adminRepository.listTopProducts(),
    adminRepository.listLowStockVariants(),
    adminRepository.listRecentOrders()
  ]);

  return {
    kpis: {
      totalProducts,
      activePromotions,
      pendingOrders,
      lowStockCount
    },
    sales,
    topProducts,
    lowStockItems,
    recentOrders
  };
}

async function getProductsPageData() {
  const [products, categories, sizes] = await Promise.all([
    adminRepository.listProducts(),
    adminRepository.listCategories(),
    adminRepository.listSizes()
  ]);

  return { products, categories, sizes };
}

async function getProductFormData(id = null) {
  const [categories, sizes, product] = await Promise.all([
    adminRepository.listCategories(),
    adminRepository.listSizes(),
    id ? adminRepository.findProductById(id) : Promise.resolve(null)
  ]);

  return { categories, sizes, product };
}

async function createProduct(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new AppError('Product name is required', 400);

  const variants = normalizeVariants(payload);
  if (variants.length === 0) throw new AppError('At least one valid variant is required', 400);

  return adminRepository.createProductWithVariants({
    product: {
      categoryId: payload.categoryId,
      name,
      slug: slugify(payload.slug || name),
      shortDescription: payload.shortDescription || null,
      description: payload.description || null,
      brand: payload.brand || null,
      material: payload.material || null,
      careInstructions: payload.careInstructions || null,
      isFeatured: toBoolean(payload.isFeatured),
      isActive: toBoolean(payload.isActive) || payload.isActive === undefined
    },
    variants
  });
}

async function updateProduct(id, payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new AppError('Product name is required', 400);

  return adminRepository.updateProduct({
    id,
    product: {
      categoryId: payload.categoryId,
      name,
      slug: slugify(payload.slug || name),
      shortDescription: payload.shortDescription || null,
      description: payload.description || null,
      brand: payload.brand || null,
      material: payload.material || null,
      careInstructions: payload.careInstructions || null,
      isFeatured: toBoolean(payload.isFeatured),
      isActive: toBoolean(payload.isActive)
    },
    variants: normalizeVariants(payload)
  });
}

async function setProductState(id, isActive) {
  return adminRepository.toggleProductState(id, isActive);
}

async function getInventoryPageData() {
  const items = await adminRepository.listInventory();
  return { items };
}

async function getInventoryDetail(variantId) {
  const variant = await adminRepository.findInventoryVariantById(variantId);
  if (!variant) throw new AppError('Inventory variant not found', 404);
  return variant;
}

async function adjustInventory({ variantId, quantity, note, createdByUserId }) {
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity === 0) {
    throw new AppError('Inventory adjustment quantity must be a non-zero integer', 400);
  }

  return inventoryService.adjustStock({
    variantId,
    quantity: parsedQuantity,
    note: note || null,
    createdByUserId
  });
}

async function getOrdersPageData() {
  const orders = await adminRepository.listOrders();
  return { orders };
}

async function getOrderDetail(id) {
  const order = await adminRepository.findOrderById(id);
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

async function changeOrderStatus({ id, status, note, changedByUserId }) {
  return adminRepository.updateOrderStatus({ id, status, note, changedByUserId });
}

async function getCustomersPageData() {
  const customers = await adminRepository.listCustomers();
  return { customers };
}

async function getCustomerDetail(id) {
  const customer = await adminRepository.findCustomerById(id);
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

async function getPromotionsPageData() {
  const promotions = await adminRepository.listPromotions();
  return { promotions };
}

async function getPromotionFormData(id = null) {
  return {
    promotion: id ? await adminRepository.findPromotionById(id) : null
  };
}

async function createPromotion(payload) {
  const name = String(payload.name || '').trim();
  if (!name) throw new AppError('Promotion name is required', 400);

  return adminRepository.createPromotionWithCoupon({
    promotion: {
      name,
      description: payload.description || null,
      triggerType: payload.triggerType || 'AUTOMATIC',
      discountType: payload.discountType || 'PERCENTAGE',
      value: toNumber(payload.value),
      maxDiscountAmount: payload.maxDiscountAmount ? toNumber(payload.maxDiscountAmount) : null,
      minSubtotal: payload.minSubtotal ? toNumber(payload.minSubtotal) : null,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : new Date(),
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      status: payload.status || 'DRAFT',
      usageLimit: payload.usageLimit ? toNumber(payload.usageLimit) : null,
      perUserLimit: payload.perUserLimit ? toNumber(payload.perUserLimit) : null,
      stackable: toBoolean(payload.stackable),
      priority: payload.priority ? toNumber(payload.priority) : 100
    },
    coupon: payload.couponCode ? {
      code: String(payload.couponCode).trim().toUpperCase(),
      description: payload.couponDescription || null,
      status: payload.couponStatus || 'ACTIVE',
      startsAt: payload.couponStartsAt ? new Date(payload.couponStartsAt) : null,
      endsAt: payload.couponEndsAt ? new Date(payload.couponEndsAt) : null,
      usageLimit: payload.couponUsageLimit ? toNumber(payload.couponUsageLimit) : null,
      perUserLimit: payload.couponPerUserLimit ? toNumber(payload.couponPerUserLimit) : null
    } : null
  });
}

async function updatePromotion(id, payload) {
  return adminRepository.updatePromotionWithCoupon({
    id,
    promotion: {
      name: String(payload.name || '').trim(),
      description: payload.description || null,
      triggerType: payload.triggerType || 'AUTOMATIC',
      discountType: payload.discountType || 'PERCENTAGE',
      value: toNumber(payload.value),
      maxDiscountAmount: payload.maxDiscountAmount ? toNumber(payload.maxDiscountAmount) : null,
      minSubtotal: payload.minSubtotal ? toNumber(payload.minSubtotal) : null,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : new Date(),
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      status: payload.status || 'DRAFT',
      usageLimit: payload.usageLimit ? toNumber(payload.usageLimit) : null,
      perUserLimit: payload.perUserLimit ? toNumber(payload.perUserLimit) : null,
      stackable: toBoolean(payload.stackable),
      priority: payload.priority ? toNumber(payload.priority) : 100
    },
    coupon: payload.couponCode ? {
      code: String(payload.couponCode).trim().toUpperCase(),
      description: payload.couponDescription || null,
      status: payload.couponStatus || 'ACTIVE',
      startsAt: payload.couponStartsAt ? new Date(payload.couponStartsAt) : null,
      endsAt: payload.couponEndsAt ? new Date(payload.couponEndsAt) : null,
      usageLimit: payload.couponUsageLimit ? toNumber(payload.couponUsageLimit) : null,
      perUserLimit: payload.couponPerUserLimit ? toNumber(payload.couponPerUserLimit) : null
    } : null
  });
}

async function setPromotionState(id, status) {
  return adminRepository.togglePromotionState(id, status);
}

module.exports = {
  loginAdmin,
  getDashboardData,
  getProductsPageData,
  getProductFormData,
  createProduct,
  updateProduct,
  setProductState,
  getInventoryPageData,
  getInventoryDetail,
  adjustInventory,
  getOrdersPageData,
  getOrderDetail,
  changeOrderStatus,
  getCustomersPageData,
  getCustomerDetail,
  getPromotionsPageData,
  getPromotionFormData,
  createPromotion,
  updatePromotion,
  setPromotionState
};
