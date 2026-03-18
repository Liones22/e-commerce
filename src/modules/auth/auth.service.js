const bcrypt = require('bcrypt');
const { AppError } = require('../../utils/app-error');
const authRepository = require('./auth.repository');

async function login({ email, password }) {
  const user = await authRepository.findUserByEmail(email);
  if (!user) throw new AppError('Invalid credentials', 401);

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid credentials', 401);

  return user;
}

async function register({ email, password, firstName, lastName }) {
  const exists = await authRepository.findAnyUserByEmail(email);
  if (exists) throw new AppError('Email already exists', 409);

  const passwordHash = await bcrypt.hash(password, 10);
  return authRepository.createUser({
    email,
    passwordHash,
    firstName,
    lastName,
    role: 'CLIENT'
  });
}

module.exports = { login, register };
