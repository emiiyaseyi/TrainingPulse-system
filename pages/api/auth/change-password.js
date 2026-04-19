import { withAuth } from '../../../lib/middleware';
import { verifyPassword, hashPassword } from '../../../lib/auth';
import { getSettings, saveSettings } from '../../../lib/store';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { currentPassword, newPassword, targetUsername } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const settings = getSettings();

  // Changing own password (env-based admin)
  if (!targetUsername || targetUsername === req.admin.username) {
    const { getAdminCredentials } = await import('../../../lib/auth');
    const creds = getAdminCredentials();
    if (req.admin.username === creds.username) {
      // Env-based admin - can't change via app, but update in extraAdmins override
      if (!verifyPassword(currentPassword, creds.password)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      // Store override in settings
      const overrides = settings.adminOverrides || {};
      overrides[req.admin.username] = hashPassword(newPassword);
      settings.adminOverrides = overrides;
      saveSettings(settings);
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    }
    // Extra admin changing own password
    const extras = settings.extraAdmins || [];
    const idx = extras.findIndex(a => a.username === req.admin.username);
    if (idx === -1) return res.status(404).json({ error: 'Account not found' });
    if (!verifyPassword(currentPassword, extras[idx].password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    extras[idx].password = hashPassword(newPassword);
    settings.extraAdmins = extras;
    saveSettings(settings);
    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  }

  return res.status(403).json({ error: 'Forbidden' });
}

export default withAuth(handler);
