import puppeteer, { type Browser } from 'puppeteer';
import puppeteerCore, { type Browser as BrowserCore } from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

const CHROMIUM_PACK_URL =
    'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar';

export async function launchBrowser(): Promise<Browser | BrowserCore> {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        const executablePath = await chromium.executablePath(CHROMIUM_PACK_URL);

        return puppeteerCore.launch({
            executablePath,
            args: chromium.args,
            headless: 'shell',
            defaultViewport: {
                deviceScaleFactor: 1,
                hasTouch: false,
                height: 1080,
                isLandscape: true,
                isMobile: false,
                width: 1920,
            },
        });
    }

    // Local development
    return puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
}
