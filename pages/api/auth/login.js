import { getAdminCredentials, verifyPassword, signToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  const creds = getAdminCredentials();

  if (username !== creds.username || !verifyPassword(password, creds.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ username, role: 'admin' });

  res.setHeader('Set-Cookie', [
    `admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`,
  ]);

  return res.status(200).json({ success: true, token });
}
