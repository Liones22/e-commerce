function hasRole(user, role) {
  return Boolean(user && user.role === role);
}

module.exports = { hasRole };
