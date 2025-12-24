#!/usr/bin/env node
import { config, validateConfig, setTokens } from './config.js';
import { checkAttendance } from './attendance.js';
import { sendAbsenceAlert, sendTestEmail, sendSessionExpiredAlert, sendErrorAlert } from './notifier.js';
import { extractTokensFromBrowser, hasSession } from './browser-auth.js';

/**
 * Main application entry point
 */
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     Peeplynx HR Attendance Notifier       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const isTestMode = args.includes('--test');
    const isEmailTest = args.includes('--test-email');

    // Check for browser session
    if (!hasSession()) {
        console.error('❌ No browser session found.');
        console.log('');
        console.log('💡 Run "npm run login" first to authenticate with Microsoft SSO.');

        // Send email notification about missing session
        try {
            await sendSessionExpiredAlert();
        } catch (emailError) {
            console.error('⚠️  Could not send session alert email:', emailError.message);
        }

        process.exit(1);
    }

    // Extract tokens from browser session
    const tokens = await extractTokensFromBrowser();
    if (!tokens) {
        console.error('❌ Failed to extract tokens from browser session.');
        console.log('');
        console.log('💡 Run "npm run login" to re-authenticate.');

        // Send email notification about session expiry
        try {
            await sendSessionExpiredAlert();
        } catch (emailError) {
            console.error('⚠️  Could not send session expiry email:', emailError.message);
        }

        process.exit(1);
    }

    setTokens(tokens);

    // Validate email configuration
    const validation = validateConfig();
    if (!validation.valid) {
        console.error('❌ Configuration errors:');
        validation.errors.forEach(err => console.error(`   • ${err}`));
        console.log('');
        console.log('💡 Ensure .env has email configuration (SMTP_*, NOTIFY_EMAIL).');
        process.exit(1);
    }

    console.log('✅ Configuration validated');

    // Handle test email mode
    if (isEmailTest) {
        console.log('');
        console.log('📧 Sending test email...');
        try {
            await sendTestEmail();
            console.log('✅ Test email sent successfully!');
        } catch (error) {
            console.error('❌ Failed to send test email:', error.message);
            process.exit(1);
        }
        return;
    }

    // Check attendance
    console.log('');
    try {
        const result = await checkAttendance();

        console.log('');
        console.log('📊 Attendance Summary:');
        result.summary.forEach(s => {
            console.log(`   📅 ${s.month}/${s.year} (Payable: ${s.payableDays} days):`);
            console.log(`      🏢 In-office: ${s.inOffice} | 🚗 On-duty: ${s.onDuty} | ❌ Absent: ${s.absent}`);
            console.log(`      🏖️  Leave: ${s.leave} | 🎄 Holiday: ${s.holiday} | 🛋️  Weekly Off: ${s.weeklyOff}`);
            if (s.regularization > 0) {
                console.log(`      📝 Regularization: ${s.regularization}`);
            }
        });

        if (result.absentDays.length === 0) {
            console.log('');
            console.log('✅ No absences detected in this salary period!');
            console.log('   Your attendance looks good. 🎉');
        } else {
            console.log('');
            console.log(`⚠️  ${result.absentDays.length} absent day(s) detected:`);
            result.absentDays.forEach(day => {
                console.log(`   • ${day.date} - ${day.status}`);
            });

            if (!isTestMode) {
                console.log('');
                console.log('📧 Sending alert email...');
                await sendAbsenceAlert(result.absentDays);
                console.log('✅ Alert email sent!');
            } else {
                console.log('');
                console.log('ℹ️  Test mode: Skipping email notification');
            }
        }

    } catch (error) {
        console.error('');
        console.error('❌ Error checking attendance:', error.message);

        // Determine error type and send appropriate alert
        let errorType = 'unknown';
        if (error.message.includes('401') || error.message.includes('403')) {
            errorType = 'auth';
            console.log('');
            console.log('💡 Authentication failed. Session may have expired.');
            console.log('   Run "npm run login" to re-authenticate.');
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT') || error.message.includes('network')) {
            errorType = 'network';
            console.log('');
            console.log('💡 Network error. Check your internet connection.');
        }

        // Send error notification email
        try {
            await sendErrorAlert(error.message, errorType);
        } catch (emailError) {
            console.error('⚠️  Could not send error alert email:', emailError.message);
        }

        process.exit(1);
    }

    console.log('');
    console.log('Done!');
}

main().catch(console.error);
