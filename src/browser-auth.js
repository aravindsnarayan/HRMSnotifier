/**
 * Browser Auth Module
 * Extracts authentication tokens from a saved Puppeteer browser session.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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
                return chromePath;
            }
        }
    }

    return undefined; // Use Puppeteer's bundled Chrome
}

/**
 * Checks if a browser session exists
 * @returns {boolean}
 */
export function hasSession() {
    return fs.existsSync(USER_DATA_DIR) &&
        fs.existsSync(path.join(USER_DATA_DIR, 'Default'));
}

/**
 * Extracts tokens from the saved browser session
 * @returns {Promise<{accessToken: string, xsrfToken: string, mappingId: string} | null>}
 */
export async function extractTokensFromBrowser() {
    if (!hasSession()) {
        console.error('❌ No browser session found. Run "npm run login" first.');
        return null;
    }

    console.log('🌐 Extracting tokens from browser session...');

    const executablePath = getSystemChromiumPath();

    const browser = await puppeteer.launch({
        headless: 'new', // Headless mode for cron
        userDataDir: USER_DATA_DIR,
        executablePath, // Uses system Chromium on ARM, bundled on x86
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

        if (!hrAtk || !xsrf) {
            console.error('❌ Session expired. Run "npm run login" to re-authenticate.');
            await browser.close();
            return null;
        }

        // Check if token is expired
        try {
            const payload = JSON.parse(Buffer.from(hrAtk.value.split('.')[1], 'base64').toString());
            const expires = new Date(payload.exp * 1000);
            if (expires < new Date()) {
                console.log('⚠️  Token expired, session should auto-refresh...');
                // Wait a bit more for refresh
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Re-extract cookies after refresh
                const newCookies = await page.cookies();
                const newHrAtk = newCookies.find(c => c.name === 'hr_atk');
                const newXsrf = newCookies.find(c => c.name === 'XSRF-TOKEN');

                if (newHrAtk && newXsrf) {
                    await browser.close();
                    return {
                        accessToken: newHrAtk.value,
                        xsrfToken: newXsrf.value,
                        mappingId: hrMid?.value || 'P4D9T6HA',
                    };
                }
            }
        } catch (e) {
            // Ignore decode errors
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
