#!/usr/bin/env node
/**
 * Browser Login Module
 * Opens a browser for interactive login to Peeplynx HR with Microsoft SSO.
 * Saves the session (cookies, localStorage) to a persistent profile.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', '.browser-session');
const HRMS_URL = 'https://hrms.pitsolutions.com/';

/**
 * Detects if running on ARM architecture and returns system Chromium path if available
 * @returns {string | undefined}
 */
function getSystemChromiumPath() {
    const arch = process.arch;
    const platform = process.platform;

    // On ARM Linux, Puppeteer's bundled Chrome doesn't work
    if (platform === 'linux' && (arch === 'arm64' || arch === 'arm')) {
        const possiblePaths = [
            '/snap/bin/chromium',           // Snap version (Ubuntu)
            '/usr/bin/chromium',             // Direct binary
            '/usr/bin/chromium-browser',     // May be wrapper on Ubuntu
        ];

        for (const chromePath of possiblePaths) {
            if (fs.existsSync(chromePath)) {
                console.log(`🔧 ARM detected, using system Chromium: ${chromePath}`);
                return chromePath;
            }
        }

        console.error('⚠️  ARM architecture detected but no system Chromium found.');
        console.error('   Install Chromium: sudo snap install chromium');
    }

    return undefined; // Use Puppeteer's bundled Chrome
}

/**
 * Opens browser for interactive login
 */
async function login() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║      Peeplynx HR Browser Login            ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    console.log('📂 Session directory:', USER_DATA_DIR);
    console.log('');

    // Ensure session directory exists
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    console.log('🌐 Opening browser...');
    console.log('   Please complete the Microsoft login with 2FA.');
    console.log('   The browser will close automatically once logged in.');
    console.log('');

    const executablePath = getSystemChromiumPath();

    const browser = await puppeteer.launch({
        headless: false, // Visible browser for login
        userDataDir: USER_DATA_DIR,
        executablePath, // Uses system Chromium on ARM, bundled on x86
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu', // Helps on headless Linux servers
        ],
        defaultViewport: null, // Use full window size
    });

    const page = await browser.newPage();

    // Navigate to HRMS
    await page.goto(HRMS_URL, { waitUntil: 'networkidle2' });

    // Wait for successful login by checking for dashboard elements
    console.log('⏳ Waiting for login to complete...');

    try {
        // Wait for either the dashboard to load or a long timeout
        await page.waitForFunction(
            () => {
                // Check for dashboard indicators
                const hasUserMenu = document.querySelector('[class*="user"]') !== null;
                const hasDashboard = document.body.innerText.includes('Overview') ||
                    document.body.innerText.includes('Attendance');
                return hasUserMenu || hasDashboard;
            },
            { timeout: 300000 } // 5 minute timeout for login
        );

        console.log('');
        console.log('✅ Login successful! Session saved.');
        console.log('');

        // Extract and display token info
        const cookies = await page.cookies();
        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');

        if (hrAtk && xsrf) {
            console.log('📝 Tokens captured:');
            console.log(`   hr_atk: ${hrAtk.value.substring(0, 50)}...`);
            console.log(`   XSRF-TOKEN: ${xsrf.value.substring(0, 50)}...`);

            // Decode JWT to show expiry
            try {
                const payload = JSON.parse(Buffer.from(hrAtk.value.split('.')[1], 'base64').toString());
                console.log(`   Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`);
            } catch (e) {
                // Ignore decode errors
            }
        }

        console.log('');
        console.log('🎉 You can now use: npm start');
        console.log('   This will use the saved browser session.');

    } catch (error) {
        console.error('');
        console.error('❌ Login timed out or failed.');
        console.error('   Please try again.');
    }

    await browser.close();
}

login().catch(console.error);
