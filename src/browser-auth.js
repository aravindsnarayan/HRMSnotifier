/**
 * Browser Auth Module
 * Extracts authentication tokens using browser with session from session.json.
 * Injects cookies on each run and lets the browser refresh tokens automatically.
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
 * Extracts tokens by launching browser with injected cookies from session.json
 * The browser refreshes the tokens automatically.
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

    // Read session file
    let sessionData;
    try {
        sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    } catch (error) {
        console.error('❌ Failed to read session.json:', error.message);
        return null;
    }

    console.log('🌐 Launching browser with session...');

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

        // Set cookies from session.json BEFORE navigating
        console.log('🍪 Injecting session cookies...');
        for (const cookie of sessionData.cookies) {
            try {
                await page.setCookie({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain.startsWith('.') ? cookie.domain : `.${cookie.domain}`,
                    path: cookie.path || '/',
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax',
                });
            } catch (e) {
                // Some cookies may fail, continue
            }
        }

        // Navigate to HRMS - the browser will use injected cookies
        await page.goto(HRMS_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for page to fully load and tokens to refresh
        await page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 30000 }
        );

        // Small delay for token refresh
        await new Promise(resolve => setTimeout(resolve, 2000));

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

        // Update session.json with refreshed cookies for next run
        const updatedCookies = cookies.filter(c =>
            c.domain.includes('pitsolutions.com') || c.domain.includes('hrms')
        );
        if (updatedCookies.length > 0) {
            const updatedSession = {
                exportedAt: new Date().toISOString(),
                cookies: updatedCookies,
            };
            fs.writeFileSync(SESSION_FILE, JSON.stringify(updatedSession, null, 2));
            console.log('✅ Tokens refreshed and saved');
        } else {
            console.log('✅ Tokens extracted');
        }

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
