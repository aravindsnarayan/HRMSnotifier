import nodemailer from 'nodemailer';
import { config } from './config.js';
import { formatDisplayDate } from './utils.js';

/**
 * Creates the email transporter
 * @returns {nodemailer.Transporter}
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
}

/**
 * Sends an absence alert email
 * @param {Array<{date: string, status: string}>} absentDays 
 * @returns {Promise<void>}
 */
export async function sendAbsenceAlert(absentDays) {
  const transporter = createTransporter();

  const absentList = absentDays
    .map(day => `  • ${formatDisplayDate(day.date)} - ${day.status}`)
    .join('\n');

  const htmlList = absentDays
    .map(day => `<li><strong>${formatDisplayDate(day.date)}</strong> - ${day.status}</li>`)
    .join('');

  const mailOptions = {
    from: `"HRMS Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: `⚠️ HRMS Alert: ${absentDays.length} Absent Day(s) Detected`,
    text: `
HRMS Attendance Alert
=====================

${absentDays.length} absent day(s) detected in the past 31 days:

${absentList}

Please review your attendance in HRMS and take necessary action (e.g., apply for regularization or leave).

---
HRMS Portal: https://hrms.pitsolutions.com/
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff6b6b, #ee5a5a); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .alert-count { font-size: 48px; font-weight: bold; }
    ul { background: white; padding: 15px 15px 15px 35px; border-radius: 4px; border-left: 4px solid #ff6b6b; }
    li { margin: 8px 0; }
    .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .btn { display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="alert-count">${absentDays.length}</div>
      <div>Absent Day(s) Detected</div>
    </div>
    <div class="content">
      <p>The following absent days were found in the past 31 days:</p>
      <ul>${htmlList}</ul>
      <p>Please review your attendance and take necessary action:</p>
      <p><a href="https://hrms.pitsolutions.com/" class="btn">Open HRMS Portal</a></p>
      <div class="footer">
        <p>This is an automated alert from HRMS Notifier.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Alert email sent to ${config.email.notifyEmail}`);
}

/**
 * Sends a test email to verify configuration
 * @returns {Promise<void>}
 */
export async function sendTestEmail() {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"HRMS Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: '✅ HRMS Notifier - Test Email',
    text: 'This is a test email from HRMS Notifier. Your email configuration is working correctly!',
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
    .success { color: #4CAF50; font-size: 48px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h2>Email Configuration Verified!</h2>
    <p>Your HRMS Notifier email configuration is working correctly.</p>
  </div>
</body>
</html>
    `.trim(),
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Test email sent to ${config.email.notifyEmail}`);
}
