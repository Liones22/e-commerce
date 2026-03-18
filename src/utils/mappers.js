function mapUserSession(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName
  };
}

module.exports = { mapUserSession };
