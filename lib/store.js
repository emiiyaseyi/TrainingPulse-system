/**
 * Store — works in both local dev (filesystem) and Vercel (KV or in-memory).
 * On Vercel, data persists via Vercel KV if configured, otherwise uses /tmp (resets on cold start).
 * For production persistence without KV, use the manual export/import feature.
 */
import fs from 'fs';
import path from 'path';

const IS_VERCEL = !!process.env.VERCEL;
const TMP_DIR = IS_VERCEL ? '/tmp/trainingpulse' : (process.env.DATA_DIR || './data');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filename, defaultValue) {
  try {
    ensureDir(TMP_DIR);
    const file = path.join(TMP_DIR, filename);
    if (!fs.existsSync(file)) return defaultValue;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

function writeJSON(filename, data) {
  try {
    ensureDir(TMP_DIR);
    fs.writeFileSync(path.join(TMP_DIR, filename), JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('writeJSON error:', e.message);
  }
}

// ─── Default Settings ──────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.FROM_NAME || 'Learning & Development',
    fromEmail: process.env.FROM_EMAIL || '',
  },
  reminders: {
    postTrainingGraceDays: 2,
    postTrainingFrequencyDays: 1,
    postTrainingMaxReminders: 10,
    managerGraceDays: 30,
    managerFrequencyDays: 3,
    managerMaxReminders: 5,
    preTrainingFrequencyDays: 1,
    preTrainingMaxReminders: 5,
  },
  dataSource: 'manual',
  graph: {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_CLIENT_SECRET || '',
    filePath: process.env.ONEDRIVE_FILE_PATH || '',
  },
  templates: {
    postTraining: {
      subject: 'Post-Training Feedback Reminder – {{training_name}}',
      body: `<p>Dear {{name}},</p>
<p>We hope your training on <strong>{{training_name}}</strong> (held on <strong>{{training_date}}</strong>) was a valuable experience.</p>
<p>Kindly take a few minutes to complete your post-training survey:</p>
<p style="margin:24px 0">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block">Complete Survey</a>
</p>
<p>If you have already completed the survey, please disregard this message.</p>
<p>Thank you for your commitment to continuous learning.</p>
<p>Warm regards,<br><strong>Learning &amp; Development</strong></p>`,
    },
    managerFeedback: {
      subject: 'Training Feedback Request – {{name}} | {{training_name}}',
      body: `<p>Dear Manager,</p>
<p>Following the completion of <strong>{{training_name}}</strong> by <strong>{{name}}</strong> on <strong>{{training_date}}</strong>, we kindly request your feedback on their application of learning on the job.</p>
<p style="margin:24px 0">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block">Submit Feedback</a>
</p>
<p>Thank you for your continued support of our learning initiatives.</p>
<p>Warm regards,<br><strong>Learning &amp; Development</strong></p>`,
    },
    preTraining: {
      subject: 'Action Required: Pre-Training Survey – {{training_name}}',
      body: `<p>Dear {{name}},</p>
<p>You are registered for <strong>{{training_name}}</strong> scheduled for <strong>{{training_date}}</strong>.</p>
<p>Please complete the pre-training survey before attending:</p>
<p style="margin:24px 0">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:600;display:inline-block">Complete Pre-Training Survey</a>
</p>
<p>Warm regards,<br><strong>Learning &amp; Development</strong></p>`,
    },
  },
};

export function getSettings() {
  const saved = readJSON('settings.json', {});
  // Deep merge saved over defaults so new default keys always appear
  return deepMerge(DEFAULT_SETTINGS, saved);
}

export function saveSettings(settings) {
  writeJSON('settings.json', settings);
}

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override || {})) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

// ─── Participants ──────────────────────────────────────────────────────────
export function getParticipants() {
  return readJSON('participants.json', []);
}

export function saveParticipants(data) {
  writeJSON('participants.json', data);
}

// ─── Reminder Logs ─────────────────────────────────────────────────────────
export function getReminderLogs() {
  return readJSON('reminder_logs.json', []);
}

export function addReminderLog(log) {
  const logs = getReminderLogs();
  logs.unshift({ ...log, id: Date.now() + Math.random(), timestamp: new Date().toISOString() });
  writeJSON('reminder_logs.json', logs.slice(0, 3000));
}
