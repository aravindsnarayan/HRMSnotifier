/**
 * Browser Auth Module
 * Extracts authentication tokens from a browser session.
 * Uses the browser to auto-refresh tokens (supports both local and imported sessions).
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_DATA_DIR = path.join(__dirname, '..', '.browser-session');
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
                return chromePath;
            }
        }
    }

    return undefined;
}

/**
 * Checks if a browser session exists
 */
export function hasSession() {
    return fs.existsSync(USER_DATA_DIR) &&
        fs.existsSync(path.join(USER_DATA_DIR, 'Default'));
}

/**
 * Extracts tokens from browser session (with auto-refresh)
 */
export async function extractTokensFromBrowser() {
    if (!hasSession()) {
        console.error('❌ No browser session found.');
        console.log('   Run "npm run login" locally, then:');
        console.log('   1. npm run export (on local)');
        console.log('   2. scp session.json to server');
        console.log('   3. npm run import (on server)');
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

        // Navigate to HRMS to trigger token refresh
        await page.goto(HRMS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for page to fully load
        await page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 30000 }
        );

        // Small delay to ensure tokens are refreshed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract cookies
        const cookies = await page.cookies();
        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');
        const hrMid = cookies.find(c => c.name === 'hr_mid');

        await browser.close();

        if (!hrAtk || !xsrf) {
            console.error('❌ Session expired. Re-import session from local machine.');
            return null;
        }

        console.log('✅ Tokens extracted (session auto-refreshed)');

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
