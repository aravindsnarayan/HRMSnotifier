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
    from: `"Peeplynx HR Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: `⚠️ Peeplynx HR Alert: ${absentDays.length} Absent Day(s) Detected`,
    text: `
Peeplynx HR Attendance Alert
=====================

${absentDays.length} absent day(s) detected in the past 31 days:

${absentList}

Please review your attendance in Peeplynx HR and take necessary action (e.g., apply for regularization or leave).

---
Peeplynx HR Portal: https://hrms.pitsolutions.com/
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
      <p><a href="https://hrms.pitsolutions.com/" class="btn">Open Peeplynx HR</a></p>
      <div class="footer">
        <p>This is an automated alert from Peeplynx HR Notifier.</p>
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
    from: `"Peeplynx HR Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: '✅ Peeplynx HR Notifier - Test Email',
    text: 'This is a test email from Peeplynx HR Notifier. Your email configuration is working correctly!',
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
    <p>Your Peeplynx HR Notifier email configuration is working correctly.</p>
  </div>
</body>
</html>
    `.trim(),
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Test email sent to ${config.email.notifyEmail}`);
}

/**
 * Sends an alert when browser session has expired
 * @returns {Promise<void>}
 */
export async function sendSessionExpiredAlert() {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Peeplynx HR Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: '🔐 Peeplynx HR Session Expired - Re-login Required',
    text: `
Peeplynx HR Session Expired
============================

Your browser session has expired and the attendance notifier cannot check your attendance.

Please re-authenticate by running:
  npm run login

This will open a browser for Microsoft SSO with 2FA.
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .icon { font-size: 48px; }
    code { background: #e8e8e8; padding: 10px; display: block; border-radius: 4px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🔐</div>
      <div>Session Expired</div>
    </div>
    <div class="content">
      <p>Your browser session has expired and the attendance notifier cannot check your attendance.</p>
      <p><strong>To fix this, run:</strong></p>
      <code>npm run login</code>
      <p>This will open a browser for Microsoft SSO authentication.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Session expired alert sent to ${config.email.notifyEmail}`);
}

/**
 * Sends an alert when an error occurs during attendance check
 * @param {string} errorMessage - The error message
 * @param {string} errorType - Type of error (auth, network, unknown)
 * @returns {Promise<void>}
 */
export async function sendErrorAlert(errorMessage, errorType = 'unknown') {
  const transporter = createTransporter();

  const typeLabels = {
    auth: '🔐 Authentication Error',
    network: '🌐 Network Error',
    unknown: '❌ Error',
  };

  const suggestions = {
    auth: 'Run "npm run login" to re-authenticate.',
    network: 'Check your network connection and try again.',
    unknown: 'Check the server logs for more details.',
  };

  const mailOptions = {
    from: `"Peeplynx HR Notifier" <${config.email.user}>`,
    to: config.email.notifyEmail,
    subject: `⚠️ Peeplynx HR Notifier - ${typeLabels[errorType] || typeLabels.unknown}`,
    text: `
Peeplynx HR Notifier Error
===========================

${typeLabels[errorType] || typeLabels.unknown}

Error: ${errorMessage}

Suggestion: ${suggestions[errorType] || suggestions.unknown}
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f44336, #c62828); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
    .icon { font-size: 48px; }
    .error-box { background: #ffebee; border-left: 4px solid #f44336; padding: 10px; margin: 10px 0; font-family: monospace; }
    .suggestion { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">⚠️</div>
      <div>${typeLabels[errorType] || typeLabels.unknown}</div>
    </div>
    <div class="content">
      <p>The Peeplynx HR attendance check encountered an error:</p>
      <div class="error-box">${errorMessage}</div>
      <div class="suggestion"><strong>Suggestion:</strong> ${suggestions[errorType] || suggestions.unknown}</div>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Error alert sent to ${config.email.notifyEmail}`);
}
