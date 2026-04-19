import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { getSettings, addReminderLog } from '../lib/store';
import { format } from 'date-fns';

function createTransport(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(smtp.port),
    secure: smtp.secure === true || smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: false },
    // Anti-spam / deliverability settings
    pool: true,
    maxConnections: 2,
    rateDelta: 20000,
    rateLimit: 5,
  });
}

function renderTemplate(templateStr, data) {
  const template = Handlebars.compile(templateStr);
  return template(data);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export async function sendEmail({ to, subject, body, data, type, record }) {
  const settings = getSettings();
  const { smtp } = settings;

  if (!smtp.user || !smtp.pass || !smtp.host) {
    throw new Error('SMTP not configured. Please update settings.');
  }

  const transporter = createTransport(smtp);
  const templateData = {
    ...data,
    training_date: formatDate(data.training_date || data['Training Date']),
  };

  const renderedSubject = renderTemplate(subject, templateData);
  const renderedBody = renderTemplate(body, templateData);

  // Professional HTML wrapper with anti-spam headers
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="background:#0078d4;padding:20px 32px;">
<p style="margin:0;color:#ffffff;font-family:Calibri,Arial,sans-serif;font-size:16px;font-weight:600;">${smtp.fromName}</p>
</td></tr>
<tr><td style="padding:32px;">${renderedBody}</td></tr>
<tr><td style="padding:16px 32px;background:#f8f8f8;border-top:1px solid #e8e8e8;">
<p style="margin:0;font-family:Calibri,Arial,sans-serif;font-size:11px;color:#888;">
This email was sent by ${smtp.fromName}. If you have questions, please contact your HR/L&D team.
</p></td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const mailOptions = {
    from: `"${smtp.fromName}" <${smtp.fromEmail || smtp.user}>`,
    to,
    subject: renderedSubject,
    html,
    headers: {
      'X-Mailer': 'Training-Reminder-System',
      'X-Priority': '3',
      'Precedence': 'bulk',
    },
  };

  await transporter.sendMail(mailOptions);

  // Log the send
  addReminderLog({
    type,
    to,
    subject: renderedSubject,
    participant: data.name || '',
    trainingName: data.training_name || '',
    status: 'sent',
  });

  return true;
}

export async function sendBatch(records, type, getEmailData) {
  const settings = getSettings();
  const delayMs = 3000; // 3 seconds between emails (anti-spam)
  const results = { sent: 0, failed: 0, errors: [] };

  for (const record of records) {
    try {
      const emailData = getEmailData(record);
      await sendEmail({ ...emailData, type, record });
      results.sent++;
      await delay(delayMs);
    } catch (err) {
      results.failed++;
      results.errors.push({ email: record.Email, error: err.message });
      addReminderLog({
        type,
        to: record.Email,
        subject: '',
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
