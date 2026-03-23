import { NextResponse, type NextRequest } from "next/server";
import { launchBrowser } from "@/lib/pdf/browser";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const urlToVisit = searchParams.get('url');

    if (!urlToVisit) {
        return NextResponse.json({ message: 'Missing URL parameter' }, { status: 400 });
    }

    let browser;
    try {
        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.goto(urlToVisit, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '10px',
                bottom: '10px',
                left: '20px',
            },
        });

        return new NextResponse(Buffer.from(pdf), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=webpage.pdf',
            },
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json(
            { message: 'Error generating PDF' },
            { status: 500 },
        );
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}
