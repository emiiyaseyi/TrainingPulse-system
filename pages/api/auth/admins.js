import { withAuth } from '../../../lib/middleware';
import { getSettings, saveSettings } from '../../../lib/store';
import { hashPassword } from '../../../lib/auth';
import { sendEmail } from '../../../services/emailService';
import crypto from 'crypto';

async function handler(req, res) {
  if (req.method === 'GET') {
    const settings = getSettings();
    const extras = (settings.extraAdmins || []).map(a => ({
      username: a.username, email: a.email, name: a.name, createdAt: a.createdAt,
    }));
    return res.status(200).json(extras);
  }

  if (req.method === 'POST') {
    const { name, email, username } = req.body;
    if (!email || !username) return res.status(400).json({ error: 'Username and email are required' });

    const settings = getSettings();
    const extras = settings.extraAdmins || [];

    if (extras.find(a => a.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Generate temp password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashed = hashPassword(tempPassword);

    const newAdmin = { username, email, name: name || username, password: hashed, createdAt: new Date().toISOString(), mustChangePassword: true };
    extras.push(newAdmin);
    settings.extraAdmins = extras;
    saveSettings(settings);

    // Send invite email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'your app URL';
      await sendEmail({
        to: email,
        subject: 'You have been added as a TrainingPulse Admin',
        body: `<p>Dear ${name || username},</p>
<p>You have been invited to access the <strong>TrainingPulse</strong> Learning & Development Reminder System as an administrator.</p>
<p><strong>Your login credentials:</strong></p>
<table style="border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold;">URL:</td><td><a href="${appUrl}">${appUrl}</a></td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold;">Username:</td><td style="font-family:monospace;">${username}</td></tr>
  <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:bold;">Password:</td><td style="font-family:monospace;font-weight:bold;">${tempPassword}</td></tr>
</table>
<p style="color:#d97706;"><strong>⚠️ Please change your password immediately after signing in.</strong></p>
<p>Warm regards,<br><strong>Learning & Development</strong></p>`,
        data: { name: name || username, training_name: '', training_date: '', link: appUrl },
        type: 'admin-invite',
      });
    } catch (emailErr) {
      // Still created, just email failed
      return res.status(200).json({ success: true, warning: `Admin created but invite email failed: ${emailErr.message}`, tempPassword });
    }

    return res.status(200).json({ success: true, message: `Admin account created and invite sent to ${email}` });
  }

  if (req.method === 'DELETE') {
    const { username } = req.body;
    const settings = getSettings();
    settings.extraAdmins = (settings.extraAdmins || []).filter(a => a.username !== username);
    saveSettings(settings);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default withAuth(handler);
