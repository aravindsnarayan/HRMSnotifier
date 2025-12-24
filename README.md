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

## Server Deployment (Cron)

1. Clone to server, run `npm install`, configure `.env`
2. SSH with X-forwarding: `ssh -X user@server`
3. Run `npm run login` - complete Microsoft 2FA once
4. Add cron for daily check during salary review (23rd-27th):

```bash
0 9 23-27 * * cd /path/to/HRMSnotifier && npm start
```

Session persists like your browser (weeks/months). Re-run `npm run login` only if session expires.

## Troubleshooting

| Error | Solution |
|-------|----------|
| `No browser session found` | Run `npm run login` |
| `401 Unauthorized` | Session expired, run `npm run login` |
| `SMTP authentication failed` | Check email settings in `.env` |
