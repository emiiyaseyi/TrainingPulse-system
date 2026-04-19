import XLSX from 'xlsx';

export function parseFileBuffer(buffer, fileName) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function normalizeRecord(row) {
  const clean = (v) => (v || '').toString().trim();
  const cleanEmail = (v) => clean(v).toLowerCase();
  const cleanInt = (v) => parseInt(v) || 0;

  return {
    Name: clean(row['Name'] || row['name'] || row['Employee Name'] || row['Full Name']),
    Email: cleanEmail(row['Email'] || row['email'] || row['Email Address']),
    'Manager Email': cleanEmail(row['Manager Email'] || row['manager_email'] || row['ManagerEmail'] || row['Manager']),
    'Training Name': clean(row['Training Name'] || row['training_name'] || row['TrainingName'] || row['Course'] || row['Training']),
    'Training Date': clean(row['Training Date'] || row['training_date'] || row['TrainingDate'] || row['Date']),
    'Pre Status': clean(row['Pre Status'] || row['pre_status'] || ''),
    'Post Status': clean(row['Post Status'] || row['post_status'] || ''),
    'Manager Status': clean(row['Manager Status'] || row['manager_status'] || ''),
    'Pre Link': clean(row['Pre Link'] || row['pre_link'] || ''),
    'Post Link': clean(row['Post Link'] || row['post_link'] || ''),
    'Manager Link': clean(row['Manager Link'] || row['manager_link'] || ''),
    'Last Pre Sent': clean(row['Last Pre Sent'] || ''),
    'Last Post Sent': clean(row['Last Post Sent'] || ''),
    'Last Manager Sent': clean(row['Last Manager Sent'] || ''),
    'Pre Count': cleanInt(row['Pre Count']),
    'Post Count': cleanInt(row['Post Count']),
    'Manager Count': cleanInt(row['Manager Count']),
    Notes: clean(row['Notes'] || ''),
  };
}

export function mergeRecords(existing, incoming) {
  const map = new Map();
  for (const rec of existing) {
    map.set(`${rec.Email}|${rec['Training Name']}`, rec);
  }
  for (const rec of incoming) {
    const key = `${rec.Email}|${rec['Training Name']}`;
    if (map.has(key)) {
      const ex = map.get(key);
      map.set(key, {
        ...ex,
        ...rec,
        'Last Pre Sent': ex['Last Pre Sent'],
        'Last Post Sent': ex['Last Post Sent'],
        'Last Manager Sent': ex['Last Manager Sent'],
        'Pre Count': ex['Pre Count'],
        'Post Count': ex['Post Count'],
        'Manager Count': ex['Manager Count'],
      });
    } else {
      map.set(key, rec);
    }
  }
  return Array.from(map.values());
}

export function generateTemplateBuffer() {
  const sample = [{
    Name: 'John Doe',
    Email: 'john.doe@company.com',
    'Manager Email': 'manager@company.com',
    'Training Name': 'Leadership Essentials',
    'Training Date': '2025-01-15',
    'Pre Link': 'https://forms.office.com/...',
    'Post Link': 'https://forms.office.com/...',
    'Manager Link': 'https://forms.office.com/...',
  }];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Participants');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
