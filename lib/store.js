import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function readJSON(filename, defaultValue = {}) {
  ensureDir(DATA_DIR);
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return defaultValue;
  }
}

export function writeJSON(filename, data) {
  ensureDir(DATA_DIR);
  const file = path.join(DATA_DIR, filename);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── Settings ──────────────────────────────────────────
export function getSettings() {
  return readJSON('settings.json', {
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
    },
    dataSource: 'manual', // 'manual' | 'graph' | 'sharepoint'
    graph: {
      tenantId: process.env.AZURE_TENANT_ID || '',
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      filePath: process.env.ONEDRIVE_FILE_PATH || '',
    },
    templates: {
      postTraining: {
        subject: 'Post-Training Feedback Reminder – {{training_name}}',
        body: `<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 600px;">
<p>Dear {{name}},</p>
<p>We hope your training on <strong>{{training_name}}</strong> (held on <strong>{{training_date}}</strong>) was a valuable experience.</p>
<p>Kindly take a few minutes to complete your post-training survey:</p>
<p style="margin: 24px 0;">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">Complete Survey</a>
</p>
<p>If you have already completed the survey, please disregard this message.</p>
<p>Thank you for your commitment to continuous learning.</p>
<p>Warm regards,<br><strong>Learning & Development</strong></p>
</div>`,
      },
      managerFeedback: {
        subject: 'Training Feedback Request – {{name}} | {{training_name}}',
        body: `<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 600px;">
<p>Dear Manager,</p>
<p>Following the successful completion of <strong>{{training_name}}</strong> by <strong>{{name}}</strong> on <strong>{{training_date}}</strong>, we kindly request your feedback on their application of learning on the job.</p>
<p>Your input is invaluable in helping us measure training effectiveness.</p>
<p style="margin: 24px 0;">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">Submit Feedback</a>
</p>
<p>Thank you for your continued support of our learning initiatives.</p>
<p>Warm regards,<br><strong>Learning & Development</strong></p>
</div>`,
      },
      preTraining: {
        subject: 'Upcoming Training – Action Required: {{training_name}}',
        body: `<div style="font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 600px;">
<p>Dear {{name}},</p>
<p>You are registered for <strong>{{training_name}}</strong> scheduled for <strong>{{training_date}}</strong>.</p>
<p>Kindly complete the pre-training survey before attending:</p>
<p style="margin: 24px 0;">
  <a href="{{link}}" style="background:#0078d4;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:600;">Complete Pre-Training Survey</a>
</p>
<p>Warm regards,<br><strong>Learning & Development</strong></p>
</div>`,
      },
    },
  });
}

export function saveSettings(settings) {
  writeJSON('settings.json', settings);
}

// ─── Participants ──────────────────────────────────────
export function getParticipants() {
  return readJSON('participants.json', []);
}

export function saveParticipants(data) {
  writeJSON('participants.json', data);
}

// ─── Reminder Logs ─────────────────────────────────────
export function getReminderLogs() {
  return readJSON('reminder_logs.json', []);
}

export function addReminderLog(log) {
  const logs = getReminderLogs();
  logs.unshift({ ...log, id: Date.now(), timestamp: new Date().toISOString() });
  writeJSON('reminder_logs.json', logs.slice(0, 2000)); // keep last 2000
}
