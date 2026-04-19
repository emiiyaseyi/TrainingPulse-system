import { differenceInDays, parseISO } from 'date-fns';
import { getSettings, getParticipants, saveParticipants } from '../lib/store';
import { sendBatch } from './emailService';
import { readExcel, writeExcel } from './excelService';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || './data';
const MASTER_PATH = path.join(DATA_DIR, 'master.xlsx');

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  try {
    return differenceInDays(new Date(), parseISO(dateStr));
  } catch {
    return Infinity;
  }
}

function shouldSend(record, type, settings) {
  const { reminders } = settings;

  if (type === 'pre') {
    if (record['Pre Status']?.toLowerCase() === 'yes') return false;
    const count = record['Pre Count'] || 0;
    if (count >= reminders.postTrainingMaxReminders) return false;
    const lastSent = record['Last Pre Sent'];
    if (lastSent && daysSince(lastSent) < reminders.postTrainingFrequencyDays) return false;
    return true;
  }

  if (type === 'post') {
    if (record['Post Status']?.toLowerCase() === 'yes') return false;
    const trainingDate = record['Training Date'];
    if (!trainingDate) return false;
    const daysAfterTraining = daysSince(trainingDate);
    if (daysAfterTraining < reminders.postTrainingGraceDays) return false;
    const count = record['Post Count'] || 0;
    if (count >= reminders.postTrainingMaxReminders) return false;
    const lastSent = record['Last Post Sent'];
    if (lastSent && daysSince(lastSent) < reminders.postTrainingFrequencyDays) return false;
    return true;
  }

  if (type === 'manager') {
    if (record['Manager Status']?.toLowerCase() === 'yes') return false;
    const trainingDate = record['Training Date'];
    if (!trainingDate) return false;
    const daysAfterTraining = daysSince(trainingDate);
    if (daysAfterTraining < reminders.managerGraceDays) return false;
    const count = record['Manager Count'] || 0;
    if (count >= reminders.managerMaxReminders) return false;
    const lastSent = record['Last Manager Sent'];
    if (lastSent && daysSince(lastSent) < reminders.managerFrequencyDays) return false;
    // Must have manager email
    if (!record['Manager Email']) return false;
    return true;
  }

  return false;
}

export async function runReminderJob() {
  const settings = getSettings();
  const data = readExcel(MASTER_PATH);
  const now = new Date().toISOString();
  const log = { started: now, pre: 0, post: 0, manager: 0, errors: [] };

  // PRE-TRAINING REMINDERS
  const preRecords = data.filter((r) => shouldSend(r, 'pre', settings));
  if (preRecords.length > 0) {
    const results = await sendBatch(preRecords, 'pre', (record) => ({
      to: record.Email,
      subject: settings.templates.preTraining.subject,
      body: settings.templates.preTraining.body,
      data: {
        name: record.Name,
        training_name: record['Training Name'],
        training_date: record['Training Date'],
        link: record['Pre Link'] || '#',
      },
    }));
    log.pre = results.sent;
    log.errors.push(...results.errors);
  }

  // POST-TRAINING REMINDERS
  const postRecords = data.filter((r) => shouldSend(r, 'post', settings));
  if (postRecords.length > 0) {
    const results = await sendBatch(postRecords, 'post', (record) => ({
      to: record.Email,
      subject: settings.templates.postTraining.subject,
      body: settings.templates.postTraining.body,
      data: {
        name: record.Name,
        training_name: record['Training Name'],
        training_date: record['Training Date'],
        link: record['Post Link'] || '#',
      },
    }));
    log.post = results.sent;
    log.errors.push(...results.errors);
  }

  // MANAGER REMINDERS
  const managerRecords = data.filter((r) => shouldSend(r, 'manager', settings));
  if (managerRecords.length > 0) {
    const results = await sendBatch(managerRecords, 'manager', (record) => ({
      to: record['Manager Email'],
      subject: settings.templates.managerFeedback.subject,
      body: settings.templates.managerFeedback.body,
      data: {
        name: record.Name,
        training_name: record['Training Name'],
        training_date: record['Training Date'],
        link: record['Manager Link'] || '#',
      },
    }));
    log.manager = results.sent;
    log.errors.push(...results.errors);
  }

  // Update tracking fields in Excel
  const updatedData = data.map((record) => {
    const updated = { ...record };
    if (preRecords.find((r) => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      updated['Last Pre Sent'] = now;
      updated['Pre Count'] = (record['Pre Count'] || 0) + 1;
    }
    if (postRecords.find((r) => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      updated['Last Post Sent'] = now;
      updated['Post Count'] = (record['Post Count'] || 0) + 1;
    }
    if (managerRecords.find((r) => r.Email === record.Email && r['Training Name'] === record['Training Name'])) {
      updated['Last Manager Sent'] = now;
      updated['Manager Count'] = (record['Manager Count'] || 0) + 1;
    }
    return updated;
  });

  writeExcel(updatedData, MASTER_PATH);

  return log;
}

export function getStats() {
  const data = readExcel(MASTER_PATH);
  const settings = getSettings();

  return {
    total: data.length,
    preCompleted: data.filter((r) => r['Pre Status']?.toLowerCase() === 'yes').length,
    prePending: data.filter((r) => r['Pre Status']?.toLowerCase() !== 'yes').length,
    postCompleted: data.filter((r) => r['Post Status']?.toLowerCase() === 'yes').length,
    postPending: data.filter((r) => r['Post Status']?.toLowerCase() !== 'yes').length,
    managerCompleted: data.filter((r) => r['Manager Status']?.toLowerCase() === 'yes').length,
    managerPending: data.filter((r) => r['Manager Status']?.toLowerCase() !== 'yes').length,
    pendingPostReminders: data.filter((r) => shouldSend(r, 'post', settings)).length,
    pendingManagerReminders: data.filter((r) => shouldSend(r, 'manager', settings)).length,
  };
}
