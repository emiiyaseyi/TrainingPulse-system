import { withAuth } from '../../../lib/middleware';
import { runReminderJob, getStats } from '../../../services/reminderService';
import { sendEmail } from '../../../services/emailService';
import { getSettings } from '../../../lib/store';
import { readExcel } from '../../../services/excelService';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_PATH = path.join(DATA_DIR, 'master.xlsx');

async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, email, trainingName, type } = req.body;

    if (action === 'run-job') {
      try {
        const log = await runReminderJob();
        return res.status(200).json({ success: true, log });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    // Send individual reminder
    if (action === 'send-one') {
      try {
        const data = readExcel(MASTER_PATH);
        const record = data.find(
          (r) => r.Email === email && r['Training Name'] === trainingName
        );
        if (!record) return res.status(404).json({ error: 'Record not found' });

        const settings = getSettings();
        let templateKey, to;

        if (type === 'pre') {
          templateKey = 'preTraining';
          to = record.Email;
        } else if (type === 'post') {
          templateKey = 'postTraining';
          to = record.Email;
        } else if (type === 'manager') {
          templateKey = 'managerFeedback';
          to = record['Manager Email'];
        } else {
          return res.status(400).json({ error: 'Invalid type' });
        }

        await sendEmail({
          to,
          subject: settings.templates[templateKey].subject,
          body: settings.templates[templateKey].body,
          data: {
            name: record.Name,
            training_name: record['Training Name'],
            training_date: record['Training Date'],
            link: record[type === 'manager' ? 'Manager Link' : type === 'pre' ? 'Pre Link' : 'Post Link'] || '#',
          },
          type,
          record,
        });

        return res.status(200).json({ success: true, message: `Reminder sent to ${to}` });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  return res.status(405).end();
}

export default withAuth(handler);
