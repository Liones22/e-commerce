const customerRepository = require('./customer.repository');

async function getAccount(userId) {
  return customerRepository.findUserById(userId);
}

module.exports = { getAccount };
