#!/usr/bin/env node
/**
 * Session Export Module
 * Exports browser session cookies to a portable JSON file that can be used on any platform.
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
 * Exports session cookies to a portable JSON file
 */
async function exportSession() {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     Export Session to Portable File       ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');

    if (!fs.existsSync(USER_DATA_DIR) || !fs.existsSync(path.join(USER_DATA_DIR, 'Default'))) {
        console.error('❌ No browser session found. Run "npm run login" first.');
        process.exit(1);
    }

    console.log('🌐 Opening browser to extract cookies...');

    const browser = await puppeteer.launch({
        headless: 'new',
        userDataDir: USER_DATA_DIR,
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

        // Wait for page to fully load
        await page.waitForFunction(
            () => document.readyState === 'complete',
            { timeout: 30000 }
        );

        // Small delay to ensure tokens are refreshed
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Extract all cookies for the HRMS domain
        const cookies = await page.cookies();
        const hrmsCookies = cookies.filter(c =>
            c.domain.includes('pitsolutions.com') || c.domain.includes('hrms')
        );

        if (hrmsCookies.length === 0) {
            console.error('❌ No HRMS cookies found. Session may have expired.');
            await browser.close();
            process.exit(1);
        }

        // Save cookies to file
        const sessionData = {
            exportedAt: new Date().toISOString(),
            cookies: hrmsCookies,
        };

        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

        console.log('');
        console.log('✅ Session exported to: session.json');
        console.log(`   ${hrmsCookies.length} cookies saved`);
        console.log('');
        console.log('📦 Copy this file to your server:');
        console.log('   scp session.json user@server:/path/to/HRMSnotifier/');
        console.log('');

    } catch (error) {
        console.error('❌ Failed to export session:', error.message);
    }

    await browser.close();
}

exportSession().catch(console.error);
