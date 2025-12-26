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
| `npm run import` | Import `session.json` into browser session (server) |
| `npm start` | Check attendance and email if absences found |
| `npm test` | Check without sending email |

## Server Deployment

### One-Time Setup

**Step 1: Login & Export (on your local machine)**
```bash
npm run login     # Complete 2FA
npm run export    # Creates session.json
```

**Step 2: Copy & Import (on server)**
```bash
# Copy to server
scp session.json user@server:/path/to/HRMSnotifier/

# On server: import into browser session
npm run import    # Creates .browser-session with auto-refresh
```

**Step 3: Set Up Cron**
```bash
0 9 23-27 * * cd /path/to/HRMSnotifier && npm start
```

### How It Works

```
Local Machine                    Server
─────────────                    ──────
npm run login ─┐
               │ session.json
npm run export ─┘     ──────►    npm run import
                                      │
                            .browser-session (with auto-refresh)
                                      │
                                 npm start ✓
```

The `import` command creates a real browser session on the server that can auto-refresh tokens - just like your local browser!

### Session Refresh

When you get a "session expired" email:
1. On local: `npm run export`
2. Copy `session.json` to server
3. On server: `npm run import`

### ARM Servers

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
