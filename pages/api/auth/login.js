import { getAdminCredentials, verifyPassword, signToken } from '../../../lib/auth';
import { getSettings } from '../../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body;

  // Check main admin
  const creds = getAdminCredentials();
  if (username === creds.username && verifyPassword(password, creds.password)) {
    const token = signToken({ username, role: 'admin' });
    res.setHeader('Set-Cookie', [`admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`]);
    return res.status(200).json({ success: true, token });
  }

  // Check additional admin accounts stored in settings
  const settings = getSettings();
  const extraAdmins = settings.extraAdmins || [];
  const found = extraAdmins.find(a => a.username === username && verifyPassword(password, a.password));
  if (found) {
    const token = signToken({ username, role: 'admin' });
    res.setHeader('Set-Cookie', [`admin_token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`]);
    return res.status(200).json({ success: true, token });
  }

  return res.status(401).json({ error: 'Invalid username or password' });
}
