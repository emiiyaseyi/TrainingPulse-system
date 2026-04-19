import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { getSettings, addReminderLog } from '../lib/store';
import { format } from 'date-fns';

function createTransport(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(smtp.port),
    secure: smtp.secure === true || String(smtp.port) === '465',
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false },
    pool: true,
    maxConnections: 2,
    rateDelta: 20000,
    rateLimit: 5,
  });
}

function renderTemplate(templateStr, data) {
  try {
    return Handlebars.compile(templateStr)(data);
  } catch {
    return templateStr;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return format(new Date(dateStr), 'MMMM d, yyyy'); } catch { return dateStr; }
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function sendEmail({ to, subject, body, data, type, record }) {
  const settings = getSettings();
  const { smtp, emailStyle = {} } = settings;

  if (!smtp?.user || !smtp?.pass || !smtp?.host) {
    throw new Error('SMTP not configured. Please go to Settings → Email (SMTP) and fill in your credentials.');
  }

  const transporter = createTransport(smtp);
  const font = emailStyle.fontFamily || 'Tahoma, Arial, sans-serif';
  const fontSize = emailStyle.fontSize || '12pt';

  const templateData = {
    ...data,
    training_date: formatDate(data?.training_date || data?.['Training Date']),
  };

  const renderedSubject = renderTemplate(subject || '', templateData);
  const renderedBody = renderTemplate(body || '', templateData);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="background:#0078d4;padding:16px 28px;">
    <p style="margin:0;color:#ffffff;font-family:${font};font-size:13pt;font-weight:bold;">${smtp.fromName || 'Learning & Development'}</p>
  </td></tr>
  <tr><td style="padding:28px;font-family:${font};font-size:${fontSize};color:#1a1a1a;line-height:1.7;">
    ${renderedBody}
  </td></tr>
  <tr><td style="padding:14px 28px;background:#f8f8f8;border-top:1px solid #e8e8e8;">
    <p style="margin:0;font-family:${font};font-size:10pt;color:#888888;">
      This email was sent by ${smtp.fromName || 'Learning & Development'}. Please do not reply to this email.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  await transporter.sendMail({
    from: `"${smtp.fromName || 'Learning & Development'}" <${smtp.fromEmail || smtp.user}>`,
    to,
    subject: renderedSubject,
    html,
    headers: {
      'X-Mailer': 'TrainingPulse',
      'X-Priority': '3',
      'Precedence': 'bulk',
    },
  });

  addReminderLog({
    type,
    to,
    subject: renderedSubject,
    participant: data?.name || '',
    trainingName: data?.training_name || '',
    status: 'sent',
  });

  return true;
}

export async function sendBatch(records, type, getEmailData) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const record of records) {
    try {
      const emailData = getEmailData(record);
      if (!emailData.to) { results.failed++; continue; }
      await sendEmail({ ...emailData, type, record });
      results.sent++;
      await delay(3000);
    } catch (err) {
      results.failed++;
      results.errors.push({ email: record.Email, error: err.message });
      addReminderLog({
        type,
        to: record.Email,
        participant: record.Name,
        trainingName: record['Training Name'],
        status: 'failed',
        error: err.message,
      });
    }
  }
  return results;
}

export async function testSmtp(smtp) {
  const transporter = createTransport(smtp);
  await transporter.verify();
  return true;
}
