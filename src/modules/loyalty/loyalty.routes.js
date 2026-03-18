const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const pointsService = require('./points.service');

const loyaltyRoutes = Router();

loyaltyRoutes.get('/', asyncHandler(async (req, res) => {
  const account = await pointsService.getMyPoints(req.session.user.id);
  return res.status(200).json({ account });
}));

module.exports = { loyaltyRoutes };
