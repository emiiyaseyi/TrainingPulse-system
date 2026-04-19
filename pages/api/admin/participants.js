import { withAuth } from '../../../lib/middleware';
import { readExcel, writeExcel, mergeRecords, generateTemplate } from '../../../services/excelService';
import { getStats } from '../../../services/reminderService';
import { getReminderLogs } from '../../../lib/store';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_PATH = path.join(DATA_DIR, 'master.xlsx');

async function handler(req, res) {
  if (req.method === 'GET') {
    const { action, page = 1, limit = 50, search = '', status = '' } = req.query;

    if (action === 'stats') {
      const stats = getStats();
      return res.status(200).json(stats);
    }

    if (action === 'logs') {
      const logs = getReminderLogs();
      return res.status(200).json(logs.slice(0, 200));
    }

    if (action === 'download') {
      if (!fs.existsSync(MASTER_PATH)) {
        return res.status(404).json({ error: 'No data file found' });
      }
      const buffer = fs.readFileSync(MASTER_PATH);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=participants.xlsx');
      return res.status(200).send(buffer);
    }

    if (action === 'template') {
      const filePath = generateTemplate();
      const buffer = fs.readFileSync(filePath);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=template.xlsx');
      return res.status(200).send(buffer);
    }

    // Return paginated + filtered participants
    let data = readExcel(MASTER_PATH);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.Name?.toLowerCase().includes(q) ||
          r.Email?.toLowerCase().includes(q) ||
          r['Training Name']?.toLowerCase().includes(q)
      );
    }

    if (status) {
      data = data.filter((r) => {
        if (status === 'pre-pending') return r['Pre Status']?.toLowerCase() !== 'yes';
        if (status === 'post-pending') return r['Post Status']?.toLowerCase() !== 'yes';
        if (status === 'manager-pending') return r['Manager Status']?.toLowerCase() !== 'yes';
        if (status === 'completed') return (
          r['Pre Status']?.toLowerCase() === 'yes' &&
          r['Post Status']?.toLowerCase() === 'yes' &&
          r['Manager Status']?.toLowerCase() === 'yes'
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

  if (req.method === 'PUT') {
    // Update single participant
    const { email, trainingName, updates } = req.body;
    const data = readExcel(MASTER_PATH);
    const idx = data.findIndex(
      (r) => r.Email === email && r['Training Name'] === trainingName
    );
    if (idx === -1) return res.status(404).json({ error: 'Record not found' });
    data[idx] = { ...data[idx], ...updates };
    writeExcel(data, MASTER_PATH);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { email, trainingName } = req.body;
    let data = readExcel(MASTER_PATH);
    data = data.filter(
      (r) => !(r.Email === email && r['Training Name'] === trainingName)
    );
    writeExcel(data, MASTER_PATH);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default withAuth(handler);
