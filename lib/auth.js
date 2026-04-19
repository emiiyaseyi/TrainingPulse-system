import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change-in-production';
const JWT_EXPIRES = '24h';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password, hash) {
  if (!hash) return false;
  if (hash.startsWith('$2')) return bcrypt.compareSync(password, hash);
  return password === hash; // plain text fallback for env vars
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

export function getAdminCredentials() {
  // Check for password override stored in settings
  try {
    const { getSettings } = require('./store');
    const settings = getSettings();
    const username = process.env.ADMIN_USERNAME || 'admin';
    const override = settings?.adminOverrides?.[username];
    return {
      username,
      password: override || process.env.ADMIN_PASSWORD || 'admin123',
    };
  } catch {
    return {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    };
  }
}
