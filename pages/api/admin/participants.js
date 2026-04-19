import { withAuth } from '../../../lib/middleware';
import { getParticipants, saveParticipants, getReminderLogs } from '../../../lib/store';
import { getStats } from '../../../services/reminderService';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { action, page = 1, limit = 50, search = '', status = '', type = '' } = req.query;

    if (action === 'stats') {
      try {
        const stats = getStats();
        return res.status(200).json(stats);
      } catch (e) {
        return res.status(200).json({ total: 0, preCompleted: 0, prePending: 0, postCompleted: 0, postPending: 0, managerCompleted: 0, managerPending: 0, pendingPostReminders: 0, pendingManagerReminders: 0 });
      }
    }

    if (action === 'logs') {
      try {
        const logs = getReminderLogs();
        // Filter by type if provided
        const filtered = type ? logs.filter(l => l.type === type) : logs;
        return res.status(200).json(filtered.slice(0, 500));
      } catch {
        return res.status(200).json([]);
      }
    }

    if (action === 'export') {
      const data = getParticipants();
      return res.status(200).json(data);
    }

    // Paginated participant list
    let data = getParticipants();

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(r =>
        (r.Name || '').toLowerCase().includes(q) ||
        (r.Email || '').toLowerCase().includes(q) ||
        (r['Training Name'] || '').toLowerCase().includes(q)
      );
    }

    if (status) {
      data = data.filter(r => {
        if (status === 'pre-pending') return (r['Pre Status'] || '').toLowerCase() !== 'yes';
        if (status === 'post-pending') return (r['Post Status'] || '').toLowerCase() !== 'yes';
        if (status === 'manager-pending') return (r['Manager Status'] || '').toLowerCase() !== 'yes';
        if (status === 'completed') return (
          (r['Pre Status'] || '').toLowerCase() === 'yes' &&
          (r['Post Status'] || '').toLowerCase() === 'yes' &&
          (r['Manager Status'] || '').toLowerCase() === 'yes'
        );
        return true;
      });
    }

    const total = data.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = data.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    return res.status(200).json({ data: paginated, total, page: pageNum, limit: limitNum });
  }

  if (req.method === 'POST') {
    // Add single participant
    const record = req.body;
    const data = getParticipants();
    const key = `${(record.Email || '').toLowerCase()}|${record['Training Name']}`;
    const idx = data.findIndex(r => `${r.Email}|${r['Training Name']}` === key);
    const normalized = normalizeRecord(record);
    if (idx >= 0) {
      data[idx] = { ...data[idx], ...normalized };
    } else {
      data.push(normalized);
    }
    saveParticipants(data);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PUT') {
    const { email, trainingName, updates } = req.body;
    const data = getParticipants();
    const idx = data.findIndex(r => r.Email === email && r['Training Name'] === trainingName);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    data[idx] = { ...data[idx], ...updates };
    saveParticipants(data);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { email, trainingName } = req.body;
    let data = getParticipants();
    data = data.filter(r => !(r.Email === email && r['Training Name'] === trainingName));
    saveParticipants(data);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

function normalizeRecord(row) {
  return {
    Name: row['Name'] || row['name'] || '',
    Email: (row['Email'] || row['email'] || '').toLowerCase().trim(),
    'Manager Email': (row['Manager Email'] || row['manager_email'] || row['ManagerEmail'] || '').toLowerCase().trim(),
    'Training Name': row['Training Name'] || row['training_name'] || row['TrainingName'] || '',
    'Training Date': row['Training Date'] || row['training_date'] || row['TrainingDate'] || '',
    'Pre Status': row['Pre Status'] || row['pre_status'] || '',
    'Post Status': row['Post Status'] || row['post_status'] || '',
    'Manager Status': row['Manager Status'] || row['manager_status'] || '',
    'Pre Link': row['Pre Link'] || row['pre_link'] || '',
    'Post Link': row['Post Link'] || row['post_link'] || '',
    'Manager Link': row['Manager Link'] || row['manager_link'] || '',
    'Last Pre Sent': row['Last Pre Sent'] || '',
    'Last Post Sent': row['Last Post Sent'] || '',
    'Last Manager Sent': row['Last Manager Sent'] || '',
    'Pre Count': parseInt(row['Pre Count'] || 0),
    'Post Count': parseInt(row['Post Count'] || 0),
    'Manager Count': parseInt(row['Manager Count'] || 0),
    Notes: row['Notes'] || '',
  };
}

export default withAuth(handler);
