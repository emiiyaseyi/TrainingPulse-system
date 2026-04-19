import { withAuth } from '../../../lib/middleware';
import { getParticipants, saveParticipants } from '../../../lib/store';
import { parseFileBuffer, mergeRecords, normalizeRecord } from '../../../services/excelService';
import { sendBatch } from '../../../services/emailService';
import { getSettings } from '../../../lib/store';

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { action } = req.query;

  if (action === 'upload') {
    try {
      const { fileData, fileName, sendImmediately, emailType } = req.body;
      if (!fileData) return res.status(400).json({ error: 'No file data provided' });

      const buffer = Buffer.from(fileData, 'base64');
      const incoming = parseFileBuffer(buffer, fileName).map(normalizeRecord);

      if (incoming.length === 0) {
        return res.status(400).json({ error: 'No valid records found in file. Check column headers.' });
      }

      const existing = getParticipants();
      const merged = mergeRecords(existing, incoming);
      saveParticipants(merged);

      const newCount = merged.length - existing.length;
      const updatedCount = incoming.length - Math.max(0, newCount);

      let emailResult = null;
      if (sendImmediately && emailType) {
        const settings = getSettings();
        const templateMap = {
          pre: settings.templates.preTraining,
          post: settings.templates.postTraining,
          manager: settings.templates.managerFeedback,
        };
        const tpl = templateMap[emailType];
        if (tpl) {
          const targets = incoming.map(r => r);
          emailResult = await sendBatch(targets, emailType, (record) => ({
            to: emailType === 'manager' ? record['Manager Email'] : record.Email,
            subject: tpl.subject,
            body: tpl.body,
            data: {
              name: record.Name,
              training_name: record['Training Name'],
              training_date: record['Training Date'],
              link: record[emailType === 'pre' ? 'Pre Link' : emailType === 'post' ? 'Post Link' : 'Manager Link'] || '#',
            },
          }));
          // Update sent counts
          const updated = getParticipants().map(r => {
            const wasInBatch = incoming.find(i => i.Email === r.Email && i['Training Name'] === r['Training Name']);
            if (!wasInBatch) return r;
            const countKey = emailType === 'pre' ? 'Pre Count' : emailType === 'post' ? 'Post Count' : 'Manager Count';
            const lastKey = emailType === 'pre' ? 'Last Pre Sent' : emailType === 'post' ? 'Last Post Sent' : 'Last Manager Sent';
            return { ...r, [countKey]: (r[countKey] || 0) + 1, [lastKey]: new Date().toISOString() };
          });
          saveParticipants(updated);
        }
      }

      return res.status(200).json({
        success: true,
        message: `Upload complete: ${newCount} new, ${updatedCount} updated. Total: ${merged.length}`,
        total: merged.length,
        new: newCount,
        updated: updatedCount,
        emailResult,
      });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'replace') {
    try {
      const { fileData, fileName } = req.body;
      const buffer = Buffer.from(fileData, 'base64');
      const data = parseFileBuffer(buffer, fileName).map(normalizeRecord);
      saveParticipants(data);
      return res.status(200).json({ success: true, message: `Replaced with ${data.length} records`, total: data.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (action === 'sync-onedrive') {
    try {
      const { downloadExcelFromOneDrive } = await import('../../../services/graphService');
      const buffer = await downloadExcelFromOneDrive();
      const incoming = parseFileBuffer(buffer, 'master.xlsx').map(normalizeRecord);
      const existing = getParticipants();
      const merged = mergeRecords(existing, incoming);
      saveParticipants(merged);
      return res.status(200).json({ success: true, message: `Synced ${incoming.length} records from OneDrive. Total: ${merged.length}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

export default withAuth(handler);
