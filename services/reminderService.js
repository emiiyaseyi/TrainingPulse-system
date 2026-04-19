import { differenceInDays, parseISO, isValid } from 'date-fns';
import { getSettings, getParticipants, saveParticipants } from '../lib/store';
import { sendBatch } from './emailService';

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return Infinity;
    return differenceInDays(new Date(), d);
  } catch { return Infinity; }
}

function shouldSend(record, type, settings) {
  const { reminders } = settings;
  if (type === 'pre') {
    if ((record['Pre Status'] || '').toLowerCase() === 'yes') return false;
    if ((record['Pre Count'] || 0) >= reminders.preTrainingMaxReminders) return false;
    const last = record['Last Pre Sent'];
    if (last && daysSince(last) < reminders.preTrainingFrequencyDays) return false;
    return !!(record.Email && record['Training Name']);
  }
  if (type === 'post') {
    if ((record['Post Status'] || '').toLowerCase() === 'yes') return false;
    if (!record['Training Date']) return false;
    if (daysSince(record['Training Date']) < reminders.postTrainingGraceDays) return false;
    if ((record['Post Count'] || 0) >= reminders.postTrainingMaxReminders) return false;
    const last = record['Last Post Sent'];
    if (last && daysSince(last) < reminders.postTrainingFrequencyDays) return false;
    return !!(record.Email);
  }
  if (type === 'manager') {
    if ((record['Manager Status'] || '').toLowerCase() === 'yes') return false;
    if (!record['Training Date']) return false;
    if (daysSince(record['Training Date']) < reminders.managerGraceDays) return false;
    if ((record['Manager Count'] || 0) >= reminders.managerMaxReminders) return false;
    const last = record['Last Manager Sent'];
    if (last && daysSince(last) < reminders.managerFrequencyDays) return false;
    return !!(record['Manager Email']);
  }
  return false;
}

export async function runReminderJob() {
  const settings = getSettings();
  const data = getParticipants();
  const now = new Date().toISOString();
  const log = { started: now, pre: 0, post: 0, manager: 0, errors: [] };

  const preRecords = data.filter(r => shouldSend(r, 'pre', settings));
  const postRecords = data.filter(r => shouldSend(r, 'post', settings));
  const managerRecords = data.filter(r => shouldSend(r, 'manager', settings));

  const makeGetData = (type) => (record) => ({
    to: type === 'manager' ? record['Manager Email'] : record.Email,
    subject: settings.templates[type === 'pre' ? 'preTraining' : type === 'post' ? 'postTraining' : 'managerFeedback'].subject,
    body: settings.templates[type === 'pre' ? 'preTraining' : type === 'post' ? 'postTraining' : 'managerFeedback'].body,
    data: {
      name: record.Name,
      training_name: record['Training Name'],
      training_date: record['Training Date'],
      link: record[type === 'pre' ? 'Pre Link' : type === 'post' ? 'Post Link' : 'Manager Link'] || '#',
    },
  });

  if (preRecords.length) { const r = await sendBatch(preRecords, 'pre', makeGetData('pre')); log.pre = r.sent; log.errors.push(...r.errors); }
  if (postRecords.length) { const r = await sendBatch(postRecords, 'post', makeGetData('post')); log.post = r.sent; log.errors.push(...r.errors); }
  if (managerRecords.length) { const r = await sendBatch(managerRecords, 'manager', makeGetData('manager')); log.manager = r.sent; log.errors.push(...r.errors); }

  // Update tracking in store
  const updatedData = data.map(record => {
    const u = { ...record };
    if (preRecords.find(r => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      u['Last Pre Sent'] = now; u['Pre Count'] = (record['Pre Count'] || 0) + 1;
    }
    if (postRecords.find(r => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      u['Last Post Sent'] = now; u['Post Count'] = (record['Post Count'] || 0) + 1;
    }
    if (managerRecords.find(r => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      u['Last Manager Sent'] = now; u['Manager Count'] = (record['Manager Count'] || 0) + 1;
    }
    return u;
  });
  saveParticipants(updatedData);
  return log;
}

export function getStats() {
  const data = getParticipants();
  const settings = getSettings();
  return {
    total: data.length,
    preCompleted: data.filter(r => (r['Pre Status'] || '').toLowerCase() === 'yes').length,
    prePending: data.filter(r => (r['Pre Status'] || '').toLowerCase() !== 'yes').length,
    postCompleted: data.filter(r => (r['Post Status'] || '').toLowerCase() === 'yes').length,
    postPending: data.filter(r => (r['Post Status'] || '').toLowerCase() !== 'yes').length,
    managerCompleted: data.filter(r => (r['Manager Status'] || '').toLowerCase() === 'yes').length,
    managerPending: data.filter(r => (r['Manager Status'] || '').toLowerCase() !== 'yes').length,
    pendingPostReminders: data.filter(r => shouldSend(r, 'post', settings)).length,
    pendingManagerReminders: data.filter(r => shouldSend(r, 'manager', settings)).length,
  };
}
