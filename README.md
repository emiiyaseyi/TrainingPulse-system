# TrainingPulse – L&D Reminder System

A full-stack Next.js admin dashboard for automating training survey reminders.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.local.example .env.local
# Edit .env.local with your SMTP and admin credentials

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
# Login with credentials from .env.local
```

## Environment Variables

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
JWT_SECRET=your-jwt-secret

SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=you@company.com
SMTP_PASS=yourpassword
FROM_NAME=Learning & Development
FROM_EMAIL=ld@company.com

# Optional: Microsoft Graph API for OneDrive sync
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
ONEDRIVE_FILE_PATH=/Training/master.xlsx

# Optional: Protect cron endpoint
CRON_SECRET=your-cron-secret
```

## Excel Format

| Column | Description |
|--------|-------------|
| Name | Employee full name |
| Email | Employee email |
| Manager Email | Manager's email |
| Training Name | Name of the training |
| Training Date | Date (YYYY-MM-DD) |
| Pre Status | `Yes` if pre-survey complete |
| Post Status | `Yes` if post-survey complete |
| Manager Status | `Yes` if manager feedback given |
| Pre Link | Microsoft Forms URL for pre-survey |
| Post Link | Microsoft Forms URL for post-survey |
| Manager Link | Microsoft Forms URL for manager |

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set all env vars in Vercel dashboard. The cron job runs daily at 09:00 UTC via `vercel.json`.

## Features
- Admin login with JWT
- Dashboard with completion stats
- Participants table with search/filter
- Manual CSV/Excel upload (merge or replace)
- OneDrive sync via Microsoft Graph API
- Email template editor with live preview
- Per-type reminder rules (grace days, frequency, max count)
- Manual job trigger + Vercel cron
- Activity logs
- Anti-spam email delays + professional HTML wrapper
