#!/usr/bin/env node
/**
 * Session Import Module
 * Imports cookies from session.json into a new browser session on the server.
 * This allows cross-platform session transfer and enables token auto-refresh.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', '.browser-session');
const SESSION_FILE = path.join(__dirname, '..', 'session.json');
const HRMS_URL = 'https://hrms.pitsolutions.com/';

/**
 * Detects if running on ARM architecture and returns system Chromium path
 */
function getSystemChromiumPath() {
    const arch = process.arch;
    const platform = process.platform;

    if (platform === 'linux' && (arch === 'arm64' || arch === 'arm')) {
        const possiblePaths = [
            '/snap/bin/chromium',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
        ];

        for (const chromePath of possiblePaths) {
            if (fs.existsSync(chromePath)) {
                console.log(`🔧 ARM detected, using system Chromium: ${chromePath}`);
                return chromePath;
            }
        }
    }

    return undefined;
}

/**
 * Imports session from session.json into a new browser session
 */
async function importSession() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     Import Session from Portable File     ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    if (!fs.existsSync(SESSION_FILE)) {
        console.error('❌ session.json not found.');
        console.log('');
        console.log('💡 Copy session.json from your local machine:');
        console.log('   scp session.json user@server:/path/to/HRMSnotifier/');
        process.exit(1);
    }

    // Read session file
    let sessionData;
    try {
        sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        console.log(`📂 Found session.json (exported: ${sessionData.exportedAt})`);
        console.log(`   ${sessionData.cookies.length} cookies to import`);
    } catch (error) {
        console.error('❌ Failed to read session.json:', error.message);
        process.exit(1);
    }

    // Clear existing browser session
    if (fs.existsSync(USER_DATA_DIR)) {
        console.log('🗑️  Clearing old browser session...');
        fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });

    console.log('');
    console.log('🌐 Launching browser to import cookies...');

    const executablePath = getSystemChromiumPath();

    const browser = await puppeteer.launch({
        headless: 'new',
        userDataDir: USER_DATA_DIR,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
        ],
    });

    try {
        const page = await browser.newPage();

        // Navigate to HRMS first (cookies need domain context)
        await page.goto(HRMS_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Set all cookies from session file
        console.log('🍪 Importing cookies...');
        for (const cookie of sessionData.cookies) {
            try {
                await page.setCookie({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path || '/',
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax',
                });
            } catch (e) {
                // Some cookies may fail, that's okay
            }
        }

        // Reload page to apply cookies and trigger token refresh
        console.log('🔄 Refreshing page to establish session...');
        await page.goto(HRMS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for page to fully load
        await page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 30000 }
        );

        // Give time for session to establish
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify session is valid
        const cookies = await page.cookies();
        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');

        if (hrAtk && xsrf) {
            console.log('');
            console.log('✅ Session imported successfully!');
            console.log('   Browser session created at: .browser-session/');
            console.log('');
            console.log('🎉 You can now run: npm start');
            console.log('   The browser will auto-refresh tokens.');

            // Show token expiry
            try {
                const payload = JSON.parse(Buffer.from(hrAtk.value.split('.')[1], 'base64').toString());
                console.log(`   Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`);
            } catch (e) {
                // Ignore decode errors
            }
        } else {
            console.error('');
            console.error('❌ Session import failed - cookies may have expired.');
            console.log('💡 Re-export from local machine: npm run export');
        }

    } catch (error) {
        console.error('❌ Failed to import session:', error.message);
    }

    await browser.close();
}

importSession().catch(console.error);
