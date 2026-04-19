import { withAuth } from '../../../lib/middleware';
import { readExcel, writeExcel, mergeRecords, parseCSVBuffer, normalizeRecord } from '../../../services/excelService';
import { downloadExcelFromOneDrive } from '../../../services/graphService';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_PATH = path.join(DATA_DIR, 'master.xlsx');

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { action } = req.query;

  // Sync from OneDrive via Graph API
  if (action === 'sync-onedrive') {
    try {
      const buffer = await downloadExcelFromOneDrive();
      const incoming = parseCSVBuffer(buffer).map(normalizeRecord);
      const existing = readExcel(MASTER_PATH);
      const merged = mergeRecords(existing, incoming);
      writeExcel(merged, MASTER_PATH);
      return res.status(200).json({
        success: true,
        message: `Synced ${incoming.length} records from OneDrive. Total: ${merged.length}`,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Manual file upload (base64 encoded)
  if (action === 'upload') {
    try {
      const { fileData, fileName } = req.body;
      if (!fileData) return res.status(400).json({ error: 'No file data' });

      const buffer = Buffer.from(fileData, 'base64');
      const incoming = parseCSVBuffer(buffer).map(normalizeRecord);

      if (incoming.length === 0) {
        return res.status(400).json({ error: 'No valid records found in file' });
      }

      const existing = readExcel(MASTER_PATH);
      const merged = mergeRecords(existing, incoming);
      writeExcel(merged, MASTER_PATH);

      const newCount = merged.length - existing.length;
      const updatedCount = incoming.length - newCount;

      return res.status(200).json({
        success: true,
        message: `Upload complete: ${newCount} new records added, ${updatedCount} updated. Total: ${merged.length}`,
        total: merged.length,
        new: newCount,
        updated: updatedCount,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Replace all data
  if (action === 'replace') {
    try {
      const { fileData } = req.body;
      const buffer = Buffer.from(fileData, 'base64');
      const data = parseCSVBuffer(buffer).map(normalizeRecord);
      writeExcel(data, MASTER_PATH);
      return res.status(200).json({ success: true, message: `Replaced all data with ${data.length} records` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

export default withAuth(handler);
