import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
    const diagnostics: Record<string, unknown> = {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL: process.env.VERCEL,
        timestamp: new Date().toISOString(),
    };

    try {
        // Step 1: Import chromium-min
        diagnostics.step = 'importing chromium-min';
        const chromium = (await import('@sparticuz/chromium-min')).default;
        diagnostics.chromiumImported = true;
        diagnostics.chromiumArgs = chromium.args;

        // Step 2: Get executable path
        diagnostics.step = 'getting executable path';
        const executablePath = await chromium.executablePath(
            'https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar'
        );
        diagnostics.executablePath = executablePath;

        // Step 3: Import puppeteer-core
        diagnostics.step = 'importing puppeteer-core';
        const puppeteerCore = (await import('puppeteer-core')).default;
        diagnostics.puppeteerCoreImported = true;

        // Step 4: Launch browser
        diagnostics.step = 'launching browser';
        const browser = await puppeteerCore.launch({
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
        diagnostics.browserLaunched = true;

        // Step 5: Create page and generate simple PDF
        diagnostics.step = 'creating page';
        const page = await browser.newPage();
        await page.setContent('<html><body><h1>Test PDF</h1></body></html>', { waitUntil: 'networkidle0' });
        diagnostics.pageCreated = true;

        diagnostics.step = 'generating pdf';
        const pdf = await page.pdf({ format: 'A4' });
        diagnostics.pdfGenerated = true;
        diagnostics.pdfSize = pdf.length;

        await browser.close();
        diagnostics.success = true;

        return NextResponse.json(diagnostics, { status: 200 });
    } catch (error: any) {
        diagnostics.error = {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
        };
        return NextResponse.json(diagnostics, { status: 500 });
    }
}
