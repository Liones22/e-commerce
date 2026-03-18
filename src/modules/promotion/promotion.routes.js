const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const { renderPublicView } = require('../../utils/render-public');
const promotionService = require('./promotion.service');

const promotionRoutes = Router();

promotionRoutes.get('/', asyncHandler(async (_req, res) => {
  const promotions = await promotionService.getPublicPromotions();
  return renderPublicView(res, 'public/promotions', { title: 'Promociones', promotions });
}));

module.exports = { promotionRoutes };
