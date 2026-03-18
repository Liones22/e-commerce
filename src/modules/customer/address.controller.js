async function listAddresses(_req, res) {
  return res.status(501).json({ message: 'Address list not implemented yet' });
}

async function createAddress(_req, res) {
  return res.status(501).json({ message: 'Address create not implemented yet' });
}

async function updateAddress(_req, res) {
  return res.status(501).json({ message: 'Address update not implemented yet' });
}

module.exports = { listAddresses, createAddress, updateAddress };
