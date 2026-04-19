import { runReminderJob } from '../../../services/reminderService';

// This endpoint is called by Vercel Cron Jobs or any scheduler
// Secure with a secret header
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const secret = req.headers['x-cron-secret'] || req.query.secret;
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const log = await runReminderJob();
    return res.status(200).json({ success: true, log, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Cron job error:', err);
    return res.status(500).json({ error: err.message });
  }
}
