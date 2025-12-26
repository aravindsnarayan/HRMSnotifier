/**
 * Browser Auth Module
 * Extracts authentication tokens using session.json with optimized browser usage.
 * Only launches browser when tokens need refreshing.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
                return chromePath;
            }
        }
    }

    return undefined;
}

/**
 * Checks if a session file exists
 */
export function hasSession() {
    return fs.existsSync(SESSION_FILE);
}

/**
 * Checks if tokens in session.json are still valid (not expired)
 * Returns tokens if valid, null if expired or missing
 */
function getValidTokensFromFile() {
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
            return null;
        }

        // Check if token is expired (with 5 min buffer)
        try {
            const payload = JSON.parse(Buffer.from(hrAtk.value.split('.')[1], 'base64').toString());
            const expires = new Date(payload.exp * 1000);
            const buffer = 5 * 60 * 1000; // 5 minutes buffer

            if (expires.getTime() - buffer > Date.now()) {
                // Token still valid - no need to launch browser
                return {
                    accessToken: hrAtk.value,
                    xsrfToken: xsrf.value,
                    mappingId: hrMid?.value || 'P4D9T6HA',
                    cookies: sessionData.cookies,
                };
            }
        } catch (e) {
            // Can't decode token, need to refresh
        }

        return { needsRefresh: true, cookies: sessionData.cookies };
    } catch (error) {
        return null;
    }
}

/**
 * Extracts tokens, using browser only when needed
 */
export async function extractTokensFromBrowser() {
    if (!hasSession()) {
        console.error('❌ No session.json found.');
        console.log('');
        console.log('💡 On your local machine:');
        console.log('   1. npm run login');
        console.log('   2. npm run export');
        console.log('   3. scp session.json to this server');
        return null;
    }

    // Check if existing tokens are still valid
    const cached = getValidTokensFromFile();

    if (cached && !cached.needsRefresh) {
        console.log('✅ Using cached tokens (still valid)');
        return {
            accessToken: cached.accessToken,
            xsrfToken: cached.xsrfToken,
            mappingId: cached.mappingId,
        };
    }

    // Tokens expired or need refresh - launch browser
    console.log('🌐 Refreshing tokens via browser...');

    const executablePath = getSystemChromiumPath();

    const browser = await puppeteer.launch({
        headless: 'new',
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

        // Batch set all cookies at once (faster than one-by-one)
        const cookiesToSet = cached.cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`,
            path: cookie.path || '/',
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
            sameSite: cookie.sameSite || 'Lax',
        }));

        await page.setCookie(...cookiesToSet);

        // Navigate to HRMS - browser will refresh tokens
        await page.goto(HRMS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Brief wait for token refresh
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Extract refreshed cookies
        const cookies = await page.cookies();
        const hrAtk = cookies.find(c => c.name === 'hr_atk');
        const xsrf = cookies.find(c => c.name === 'XSRF-TOKEN');
        const hrMid = cookies.find(c => c.name === 'hr_mid');

        await browser.close();

        if (!hrAtk || !xsrf) {
            console.error('❌ Session expired. Re-export from local machine.');
            return null;
        }

        // Save refreshed cookies
        const updatedCookies = cookies.filter(c =>
            c.domain.includes('pitsolutions.com') || c.domain.includes('hrms')
        );
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            exportedAt: new Date().toISOString(),
            cookies: updatedCookies,
        }, null, 2));

        console.log('✅ Tokens refreshed and saved');

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
