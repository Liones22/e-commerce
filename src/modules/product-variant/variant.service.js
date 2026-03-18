const variantRepository = require('./variant.repository');

async function getVariant(id) {
  return variantRepository.findById(id);
}

module.exports = { getVariant };
