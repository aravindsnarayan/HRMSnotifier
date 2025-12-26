# Peeplynx HR Attendance Notifier

Monitors your Peeplynx HR attendance for the current salary period (26th → 25th) and sends email alerts when any "Absent" status is detected.

## Quick Start (Local)

```bash
npm install
copy .env.example .env    # Configure email settings
npm run login             # Complete Microsoft SSO + 2FA
npm start                 # Check attendance
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run login` | Browser login with Microsoft SSO + 2FA |
| `npm run export` | Export session to portable `session.json` |
| `npm start` | Check attendance and email if absences found |
| `npm test` | Check without sending email |

## Server Deployment

### Setup

**Step 1: Login & Export (on your local machine)**
```bash
npm run login     # Complete 2FA
npm run export    # Creates session.json
```

**Step 2: Copy to Server**
```bash
scp session.json user@server:/path/to/HRMSnotifier/
```

**Step 3: Set Up Cron**
```bash
0 9 23-27 * * cd /path/to/HRMSnotifier && npm start
```

### How It Works

Each run:
1. Loads cookies from `session.json`
2. Launches headless browser with those cookies
3. Browser auto-refreshes tokens
4. Saves refreshed cookies back to `session.json`

This means tokens stay fresh as long as you run within the session window!

### Session Refresh

When you get a "session expired" email:
1. On local: `npm run login` → `npm run export`
2. Copy new `session.json` to server

### ARM Servers (Oracle ARM, Raspberry Pi)

Install Chromium first:
```bash
sudo snap install chromium
```

## Email Notifications

| Scenario | Email Alert |
|----------|-------------|
| Absences detected | ⚠️ Peeplynx HR Alert: X Absent Day(s) |
| Session expired | 🔐 Re-login Required |
| Auth/Network errors | ⚠️ Error notification |

## Email Configuration (.env)

```env
SMTP_HOST=smtp.displayme.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
NOTIFY_EMAIL=your-email@company.com
```

## Salary Period Logic

- **Days 1-27:** Shows previous period (for review/regularization)
- **Days 28-31:** Shows current period

This ensures you review the right period before it's finalized.
