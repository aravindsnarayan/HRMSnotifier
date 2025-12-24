/**
 * Browser Auth Module
 * Extracts authentication tokens from a portable session.json file or browser session.
 * Supports cross-platform session sharing (login on Windows, use on Linux server).
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
                return chromePath;
            }
        }
    }

    return undefined; // Use Puppeteer's bundled Chrome
}

/**
 * Checks if a session exists (either portable file or browser session)
 * @returns {boolean}
 */
export function hasSession() {
    // First check for portable session file (cross-platform)
    if (fs.existsSync(SESSION_FILE)) {
        return true;
    }
    // Fall back to browser session directory
    return fs.existsSync(USER_DATA_DIR) &&
        fs.existsSync(path.join(USER_DATA_DIR, 'Default'));
}

/**
 * Extracts tokens from portable session.json file
 * @returns {{ accessToken: string, xsrfToken: string, mappingId: string } | null}
 */
function extractTokensFromFile() {
    if (!fs.existsSync(SESSION_FILE)) {
        return null;
    }

    try {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        const cookies = sessionData.cookies;

        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');
        const hrMid = cookies.find(c => c.name === 'hr_mid');

        if (!hrAtk || !xsrf) {
            console.error('❌ Session file missing required cookies.');
            return null;
        }

        // Check if token is expired
        try {
            const payload = JSON.parse(Buffer.from(hrAtk.value.split('.')[1], 'base64').toString());
            const expires = new Date(payload.exp * 1000);
            if (expires < new Date()) {
                console.error('❌ Session expired. Re-export from local machine.');
                return null;
            }
        } catch (e) {
            // Ignore decode errors
        }

        console.log('✅ Tokens loaded from session.json');
        return {
            accessToken: hrAtk.value,
            xsrfToken: xsrf.value,
            mappingId: hrMid?.value || 'P4D9T6HA',
        };
    } catch (error) {
        console.error('❌ Failed to read session.json:', error.message);
        return null;
    }
}

/**
 * Extracts tokens from the saved browser session
 * @returns {Promise<{accessToken: string, xsrfToken: string, mappingId: string} | null>}
 */
export async function extractTokensFromBrowser() {
    // First try portable session file (preferred for cross-platform)
    const fileTokens = extractTokensFromFile();
    if (fileTokens) {
        return fileTokens;
    }

    // Fall back to browser session
    if (!fs.existsSync(USER_DATA_DIR) || !fs.existsSync(path.join(USER_DATA_DIR, 'Default'))) {
        console.error('❌ No session found. Run "npm run login" first.');
        return null;
    }

    console.log('🌐 Extracting tokens from browser session...');

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
        await page.goto(HRMS_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 30000 }
        );
        await new Promise(resolve => setTimeout(resolve, 2000));

        const cookies = await page.cookies();
        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');
        const hrMid = cookies.find(c => c.name === 'hr_mid');

        if (!hrAtk || !xsrf) {
            console.error('❌ Session expired. Run "npm run login" to re-authenticate.');
            await browser.close();
            return null;
        }

        await browser.close();
        console.log('✅ Tokens extracted from browser session');

        return {
            accessToken: hrAtk.value,
            xsrfToken: xsrf.value,
            mappingId: hrMid?.value || 'P4D9T6HA',
        };

    } catch (error) {
        await browser.close();
        console.error('❌ Failed to extract tokens:', error.message);
        return null;
    }
}
