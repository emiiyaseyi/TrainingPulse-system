import { withAuth } from '../../../lib/middleware';
import { getSettings, saveSettings } from '../../../lib/store';
import { testSmtp } from '../../../services/emailService';
import { testGraphConnection } from '../../../services/graphService';

async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = getSettings();
    // Mask password in response
    const safe = JSON.parse(JSON.stringify(settings));
    if (safe.smtp?.pass) safe.smtp.pass = '••••••••';
    if (safe.graph?.clientSecret) safe.graph.clientSecret = '••••••••';
    return res.status(200).json(safe);
  }

  if (req.method === 'PUT') {
    const current = getSettings();
    const updates = req.body;

    // If passwords are masked, keep existing
    if (updates.smtp?.pass === '••••••••') updates.smtp.pass = current.smtp.pass;
    if (updates.graph?.clientSecret === '••••••••') updates.graph.clientSecret = current.graph.clientSecret;

    const updated = { ...current, ...updates };
    saveSettings(updated);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'test-smtp') {
      try {
        const settings = getSettings();
        await testSmtp(settings.smtp);
        return res.status(200).json({ success: true, message: 'SMTP connection successful' });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    if (action === 'test-graph') {
      try {
        const settings = getSettings();
        await testGraphConnection(settings.graph);
        return res.status(200).json({ success: true, message: 'Microsoft Graph connection successful' });
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }
  }

  return res.status(405).end();
}

export default withAuth(handler);
