import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_PATH = path.join(DATA_DIR, 'master.xlsx');

export const REQUIRED_COLUMNS = [
  'Name', 'Email', 'Manager Email', 'Training Name', 'Training Date',
  'Pre Status', 'Post Status', 'Manager Status',
  'Pre Link', 'Post Link', 'Manager Link',
  'Last Pre Sent', 'Last Post Sent', 'Last Manager Sent',
  'Pre Count', 'Post Count', 'Manager Count',
  'Notes',
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readExcel(filePath = MASTER_PATH) {
  if (!fs.existsSync(filePath)) return [];
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return data.map(normalizeRecord);
}

export function writeExcel(data, filePath = MASTER_PATH) {
  ensureDir();
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
  XLSX.writeFile(workbook, filePath);
}

export function normalizeRecord(row) {
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
    'Notes': row['Notes'] || '',
  };
}

export function mergeRecords(existing, incoming) {
  const map = new Map();

  for (const rec of existing) {
    const key = `${rec.Email}|${rec['Training Name']}`;
    map.set(key, rec);
  }

  for (const rec of incoming) {
    const normalized = normalizeRecord(rec);
    const key = `${normalized.Email}|${normalized['Training Name']}`;
    if (map.has(key)) {
      // Merge: preserve existing counts and sent dates, update incoming fields
      const existing = map.get(key);
      map.set(key, {
        ...existing,
        ...normalized,
        // Preserve tracking fields
        'Last Pre Sent': existing['Last Pre Sent'],
        'Last Post Sent': existing['Last Post Sent'],
        'Last Manager Sent': existing['Last Manager Sent'],
        'Pre Count': existing['Pre Count'],
        'Post Count': existing['Post Count'],
        'Manager Count': existing['Manager Count'],
      });
    } else {
      map.set(key, normalized);
    }
  }

  return Array.from(map.values());
}

export function parseCSVBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function generateTemplate() {
  ensureDir();
  const sample = [
    {
      Name: 'John Doe',
      Email: 'john.doe@company.com',
      'Manager Email': 'manager@company.com',
      'Training Name': 'Leadership Essentials',
      'Training Date': '2025-01-15',
      'Pre Status': '',
      'Post Status': '',
      'Manager Status': '',
      'Pre Link': 'https://forms.office.com/...',
      'Post Link': 'https://forms.office.com/...',
      'Manager Link': 'https://forms.office.com/...',
      'Last Pre Sent': '',
      'Last Post Sent': '',
      'Last Manager Sent': '',
      'Pre Count': 0,
      'Post Count': 0,
      'Manager Count': 0,
      Notes: '',
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const filePath = path.join(DATA_DIR, 'template.xlsx');
  XLSX.writeFile(wb, filePath);
  return filePath;
}
