# Peeplynx HR Attendance Notifier

Monitors your Peeplynx HR attendance for the current salary period (26th → 25th) and sends email alerts when any "Absent" status is detected.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure email settings
copy .env.example .env
# Edit .env with your SMTP settings

# 3. Login to Peeplynx HR (opens browser for Microsoft SSO + 2FA)
npm run login

# 4. Run the notifier
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run login` | Opens browser for Microsoft SSO login (one-time setup) |
| `npm run export` | Export session to portable `session.json` for server use |
| `npm start` | Check attendance and send email if absences found |
| `npm test` | Check attendance without sending email |
| `npm run test-email` | Test email configuration |

## Email Configuration (.env)

```env
SMTP_HOST=smtp.displayme.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
NOTIFY_EMAIL=your-email@company.com
```

## Email Notifications

The notifier sends email alerts for:

| Scenario | Email Subject |
|----------|---------------|
| Absences detected | ⚠️ Peeplynx HR Alert: X Absent Day(s) Detected |
| Session expired | 🔐 Peeplynx HR Session Expired - Re-login Required |
| Auth error (401/403) | ⚠️ Peeplynx HR Notifier - 🔐 Authentication Error |
| Network error | ⚠️ Peeplynx HR Notifier - 🌐 Network Error |
| Other errors | ⚠️ Peeplynx HR Notifier - ❌ Error |

## Server Deployment (Cron)

Since servers don't have a display for interactive login, use the portable session export:

### Step 1: Login & Export (on your local machine)

```bash
# Login with Microsoft SSO + 2FA
npm run login

# Export session to portable file
npm run export
# Creates: session.json
```

### Step 2: Copy to Server

```powershell
# Windows PowerShell
scp -i "~\.ssh\your-key.pem" session.json user@server:/path/to/HRMSnotifier/
```

```bash
# Mac/Linux
scp session.json user@server:/path/to/HRMSnotifier/
```

### Step 3: Set Up Cron on Server

```bash
# On the server (no browser needed!)
0 9 23-27 * * cd /path/to/HRMSnotifier && npm start
```

The `session.json` file is platform-independent and works on any server (x86, ARM, any OS).

### Session Refresh

When session expires (you'll get an email), repeat Steps 1-2:
1. `npm run export` on your local machine
2. `scp session.json` to server

### ARM Servers (Oracle ARM, Raspberry Pi, etc.)

**No special setup needed!** With `session.json`, the server doesn't need to run a browser for normal operation.

For local development on ARM, install system Chromium:
```bash
sudo snap install chromium
```

## Troubleshooting

| Error | Email Sent? | Solution |
|-------|-------------|----------|
| No session found | ✅ Yes | Export session locally: `npm run export`, copy to server |
| Session expired | ✅ Yes | Re-export: `npm run export`, copy to server |
| 401/403 Auth error | ✅ Yes | Re-login locally, then export and copy |
| Network error | ✅ Yes | Check internet connection |
| SMTP failure | ❌ No | Check `.env` email settings |
