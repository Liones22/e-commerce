const { Router } = require('express');
const { asyncHandler } = require('../../utils/async-handler');
const inventoryService = require('./inventory.service');

const inventoryRoutes = Router();

inventoryRoutes.get('/', asyncHandler(async (_req, res) => {
  const data = await inventoryService.getLowStock();
  return res.status(200).json({ items: data });
}));

module.exports = { inventoryRoutes };
