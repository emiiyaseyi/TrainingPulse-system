import { withAuth } from '../../../lib/middleware';
import { getSettings, saveSettings } from '../../../lib/store';
import { testSmtp } from '../../../services/emailService';

async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = getSettings();
    const safe = JSON.parse(JSON.stringify(settings));
    if (safe.smtp?.pass && safe.smtp.pass.length > 0) safe.smtp.pass = '••••••••';
    if (safe.graph?.clientSecret && safe.graph.clientSecret.length > 0) safe.graph.clientSecret = '••••••••';
    return res.status(200).json(safe);
  }

  if (req.method === 'PUT') {
    const current = getSettings();
    const updates = req.body;
    if (updates.smtp?.pass === '••••••••') updates.smtp.pass = current.smtp.pass;
    if (updates.graph?.clientSecret === '••••••••') updates.graph.clientSecret = current.graph.clientSecret;
    // Deep merge
    const merged = deepMerge(current, updates);
    saveSettings(merged);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    if (action === 'test-smtp') {
      try {
        const settings = getSettings();
        await testSmtp(settings.smtp);
        return res.status(200).json({ success: true, message: 'SMTP connection successful ✓' });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }
  }

  return res.status(405).end();
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

export default withAuth(handler);
