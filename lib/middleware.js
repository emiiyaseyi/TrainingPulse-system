import { verifyToken } from './auth';

export function withAuth(handler) {
  return async (req, res) => {
    const token =
      req.cookies?.admin_token ||
      req.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.admin = payload;
    return handler(req, res);
  };
}
