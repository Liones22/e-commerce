const { AppError } = require('../../utils/app-error');
const cartService = require('../cart/cart.service');
const cartRepository = require('../cart/cart.repository');
const customerRepository = require('../customer/customer.repository');
const inventoryService = require('../inventory/inventory.service');
const orderRepository = require('../order/order.repository');
const paymentService = require('../payment/payment.service');
const loyaltyPointsService = require('../loyalty/points.service');
const { runInTransaction } = require('../shared/transaction.service');

function buildAddressSnapshot(address) {
  if (!address) return null;

  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    notes: address.notes
  };
}

function generateOrderNumber() {
  return `JRB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function resolveCheckoutAddresses({ userId, shippingAddressId, billingAddressId }, options = {}) {
  const shippingAddress = shippingAddressId
    ? await customerRepository.findAddressByIdForUser(shippingAddressId, userId, options)
    : await customerRepository.findDefaultAddressForUser(userId, options);

  if (!shippingAddress) {
    throw new AppError('Shipping address is required', 400);
  }

  const billingAddress = billingAddressId
    ? await customerRepository.findAddressByIdForUser(billingAddressId, userId, options)
    : shippingAddress;

  return { shippingAddress, billingAddress };
}

async function getCheckoutSummary({ userId, shippingAddressId, billingAddressId, couponCode, pointsToRedeem = 0, paymentProvider = 'MANUAL' }, options = {}) {
  const checkoutContext = await cartService.buildCheckoutContext({
    userId,
    pointsToRedeem,
    couponCode
  }, options);

  const { shippingAddress, billingAddress } = await resolveCheckoutAddresses({
    userId,
    shippingAddressId,
    billingAddressId
  }, options);

  if (paymentProvider === 'CASH' && String(shippingAddress.city || '').trim().toLowerCase() !== 'cali') {
    throw new AppError('Cash on delivery is only available in Cali, Colombia', 409);
  }

  return {
    cart: checkoutContext.cart,
    pricing: checkoutContext.pricing,
    availablePoints: checkoutContext.availablePoints,
    shippingAddress,
    billingAddress,
    paymentProvider
  };
}

async function confirmCheckout(input) {
  return runInTransaction(async (tx) => {
    const summary = await getCheckoutSummary(input, { tx });
    const { cart, pricing, shippingAddress, billingAddress } = summary;

    if (!cart.items.length) {
      throw new AppError('Cart is empty', 409);
    }

    await inventoryService.reserveItems(cart.items, {
      referenceType: 'CART_CHECKOUT',
      referenceId: cart.id,
      note: 'Stock reserved during checkout',
      idempotencyKey: `cart:${cart.id}`
    }, { tx });

    const initialStatus = input.paymentProvider === 'CASH' ? 'CONFIRMED' : 'PENDING_PAYMENT';
    const order = await orderRepository.createOrder({
      orderNumber: generateOrderNumber(),
      userId: input.userId,
      status: initialStatus,
      currency: cart.currency,
      subtotal: pricing.subtotal,
      discountTotal: pricing.promotionDiscountTotal + pricing.pointsApplied,
      shippingTotal: 0,
      taxTotal: 0,
      grandTotal: pricing.total,
      notes: input.notes,
      shippingAddressId: shippingAddress.id,
      billingAddressId: billingAddress?.id || null,
      shippingAddressSnapshot: buildAddressSnapshot(shippingAddress),
      billingAddressSnapshot: buildAddressSnapshot(billingAddress),
      items: pricing.items.map((item) => ({
        productId: item.productId,
        productVariantId: item.productVariantId,
        productName: item.productName,
        variantSizeName: item.sizeName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal
      })),
      appliedPromotions: pricing.appliedPromotions,
      changedByUserId: input.userId,
      statusMetadata: {
        paymentProvider: input.paymentProvider,
        pointsApplied: pricing.pointsApplied
      }
    }, { tx });

    if (pricing.pointsApplied > 0) {
      await loyaltyPointsService.redeemPoints({
        userId: input.userId,
        points: pricing.pointsApplied,
        referenceType: 'ORDER',
        referenceId: order.id,
        description: `Points redeemed for order ${order.orderNumber}`,
        idempotencyKey: `redeem:${order.id}`
      }, { tx });
    }

    const payment = await paymentService.createOrderPayment({
      order,
      provider: input.paymentProvider,
      shippingAddress
    }, { tx });

    await cartRepository.deleteCartItemsByCartId(cart.id, { tx });
    await cartRepository.replaceAppliedPromotions(cart.id, [], { tx });
    await cartRepository.updateCartTotals(cart.id, {
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      status: 'ACTIVE'
    }, { tx });

    return {
      order,
      payment: payment.payment,
      paymentAction: payment.providerIntent,
      pointsApplied: pricing.pointsApplied
    };
  });
}

module.exports = { getCheckoutSummary, confirmCheckout };
