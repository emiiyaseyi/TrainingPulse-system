import { withAuth } from '../../../lib/middleware';
import { runReminderJob } from '../../../services/reminderService';
import { sendEmail } from '../../../services/emailService';
import { getSettings, getParticipants, saveParticipants, addReminderLog } from '../../../lib/store';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { action, email, trainingName, type } = req.body;

  if (action === 'run-job') {
    try {
      const log = await runReminderJob();
      return res.status(200).json({ success: true, log });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'send-one') {
    try {
      // Use in-memory store, NOT readExcel (which no longer exists)
      const data = getParticipants();
      const record = data.find(r => r.Email === email && r['Training Name'] === trainingName);
      if (!record) return res.status(404).json({ error: 'Record not found in participant list' });

      const settings = getSettings();
      const templateKeyMap = { pre: 'preTraining', post: 'postTraining', manager: 'managerFeedback' };
      const linkKeyMap = { pre: 'Pre Link', post: 'Post Link', manager: 'Manager Link' };
      const templateKey = templateKeyMap[type];
      if (!templateKey) return res.status(400).json({ error: 'Invalid type. Use pre, post, or manager.' });

      const to = type === 'manager' ? record['Manager Email'] : record.Email;
      if (!to) return res.status(400).json({ error: `No ${type === 'manager' ? 'manager ' : ''}email address for this record` });

      await sendEmail({
        to,
        subject: settings.templates[templateKey].subject,
        body: settings.templates[templateKey].body,
        data: {
          name: record.Name,
          training_name: record['Training Name'],
          training_date: record['Training Date'],
          link: record[linkKeyMap[type]] || '#',
        },
        type,
        record,
      });

      // Update sent count + last sent in store
      const now = new Date().toISOString();
      const countKey = { pre: 'Pre Count', post: 'Post Count', manager: 'Manager Count' }[type];
      const lastKey = { pre: 'Last Pre Sent', post: 'Last Post Sent', manager: 'Last Manager Sent' }[type];
      const updated = data.map(r =>
        r.Email === email && r['Training Name'] === trainingName
          ? { ...r, [countKey]: (r[countKey] || 0) + 1, [lastKey]: now }
          : r
      );
      saveParticipants(updated);

      return res.status(200).json({ success: true, message: `${type} reminder sent to ${to}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

export default withAuth(handler);
