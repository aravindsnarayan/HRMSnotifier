#!/usr/bin/env node
import { config, validateConfig } from './config.js';
import { checkAttendance } from './attendance.js';
import { sendAbsenceAlert, sendTestEmail } from './notifier.js';

const DAYS_TO_CHECK = 31;

/**
 * Main application entry point
 */
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║        HRMS Attendance Notifier           ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const isTestMode = args.includes('--test');
    const isEmailTest = args.includes('--test-email');

    // Validate configuration
    const validation = validateConfig();
    if (!validation.valid) {
        console.error('❌ Configuration errors:');
        validation.errors.forEach(err => console.error(`   • ${err}`));
        console.log('');
        console.log('💡 Copy .env.example to .env and fill in your values.');
        console.log('   See README.md for instructions on extracting HRMS tokens.');
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
        const result = await checkAttendance(DAYS_TO_CHECK);

        console.log('');
        console.log('📊 Attendance Summary:');
        result.summary.forEach(s => {
            console.log(`   ${s.month}/${s.year}: Present=${s.present}, Absent=${s.absent}, Leave=${s.leave}`);
        });

        if (result.absentDays.length === 0) {
            console.log('');
            console.log('✅ No absences detected in the past 31 days!');
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

        if (error.message.includes('401') || error.message.includes('403')) {
            console.log('');
            console.log('💡 Authentication failed. Your tokens may have expired.');
            console.log('   Please refresh the tokens from your browser cookies.');
        }

        process.exit(1);
    }

    console.log('');
    console.log('Done!');
}

main().catch(console.error);
