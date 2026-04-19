import { getSettings } from '../lib/store';

async function getAccessToken(config) {
  const { tenantId, clientId, clientSecret } = config;
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function downloadExcelFromOneDrive() {
  const settings = getSettings();
  const { graph } = settings;

  if (!graph.tenantId || !graph.clientId || !graph.clientSecret) {
    throw new Error('Microsoft Graph API not configured. Please update settings.');
  }

  const token = await getAccessToken(graph);

  // Support both file path and file ID
  const endpoint = graph.filePath.startsWith('/')
    ? `https://graph.microsoft.com/v1.0/me/drive/root:${graph.filePath}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${graph.filePath}/content`;

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file: ${res.statusText}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function uploadExcelToOneDrive(filePath) {
  const settings = getSettings();
  const { graph } = settings;

  if (!graph.tenantId || !graph.clientId || !graph.clientSecret) {
    throw new Error('Microsoft Graph API not configured.');
  }

  const fs = await import('fs');
  const fileBuffer = fs.readFileSync(filePath);
  const token = await getAccessToken(graph);

  const endpoint = graph.filePath.startsWith('/')
    ? `https://graph.microsoft.com/v1.0/me/drive/root:${graph.filePath}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/items/${graph.filePath}/content`;

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file: ${res.statusText}`);
  }

  return true;
}

export async function testGraphConnection(config) {
  const token = await getAccessToken(config);
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Graph API connection test failed');
  return true;
}
