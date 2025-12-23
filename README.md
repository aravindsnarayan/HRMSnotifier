# HRMS Attendance Notifier

Monitors your HRMS attendance and sends email alerts when any "Absent" status is detected in the past 31 days.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
copy .env.example .env

# 3. Fill in your tokens and email config (see below)

# 4. Run the notifier
npm start
```

## Configuration

### 1. Extract HRMS Tokens from Browser

1. Go to https://hrms.pitsolutions.com/ and log in
2. Open DevTools (`F12`) → **Application** tab → **Cookies**
3. Copy these cookie values to your `.env` file:

| Cookie | → .env Variable |
|--------|-----------------|
| `hr_atk` | `HRMS_ACCESS_TOKEN` |
| `XSRF-TOKEN` | `HRMS_XSRF_TOKEN` |

**Note:** Tokens expire periodically. Refresh them when you get authentication errors.

### 2. Configure Custom SMTP

Set your company's SMTP server details in the `.env` file:
```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@company.com
SMTP_PASS=your-smtp-password
NOTIFY_EMAIL=your-email@company.com
```

## Usage

```bash
# Full check with email notification
npm start

# Test mode (check attendance, no email)
npm run test

# Test email configuration
npm run test-email
```

## Scheduling (Optional)

### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task → Set trigger (e.g., daily at 9 AM)
3. Action: Start a program
   - Program: `node`
   - Arguments: `src/index.js`
   - Start in: `C:\Users\aravind.sn\Downloads\HRMSnotifier`

### Using cron (Linux/WSL)
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/HRMSnotifier && node src/index.js
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `401 Unauthorized` | Tokens expired. Re-extract from browser cookies |
| `SMTP authentication failed` | Check SMTP credentials are correct |
| `Configuration errors` | Ensure all `.env` variables are filled |
