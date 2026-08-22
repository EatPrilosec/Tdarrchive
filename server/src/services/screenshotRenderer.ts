import puppeteer, { Browser } from 'puppeteer';
import { existsSync } from 'fs';
import { HtmlExporter } from './htmlExporter.js';
import { TdarrFlow, CompositeFlowGraph } from '../types/tdarr.js';

export interface ScreenshotOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  transparentBackground?: boolean;
}

const POSSIBLE_CHROME_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

export class ScreenshotRenderer {
  private browserPromise: Promise<Browser> | null = null;
  private htmlExporter = new HtmlExporter();

  private findChromePath(): string | undefined {
    for (const p of POSSIBLE_CHROME_PATHS) {
      if (p && existsSync(p)) {
        return p;
      }
    }
    return undefined;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const executablePath = this.findChromePath();
      this.browserPromise = puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--font-render-hinting=none'
        ]
      }).catch(err => {
        this.browserPromise = null;
        throw err;
      });
    }
    return this.browserPromise;
  }

  public async renderFlowScreenshot(flow: TdarrFlow, options: ScreenshotOptions = {}): Promise<Buffer> {
    const html = this.htmlExporter.generateSingleFlowHtml(flow);
    return this.renderHtmlToImage(html, options);
  }

  public async renderCompositeTreeScreenshot(composite: CompositeFlowGraph, options: ScreenshotOptions = {}): Promise<Buffer> {
    const html = this.htmlExporter.generateCompositeTreeHtml(composite);
    return this.renderHtmlToImage(html, options);
  }

  private async renderHtmlToImage(htmlContent: string, options: ScreenshotOptions = {}): Promise<Buffer> {
    const scale = Math.min(Math.max(options.scale || 2, 1), 4);
    const format = options.format || 'png';
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: scale
      });

      await page.setContent(htmlContent, {
        waitUntil: 'load',
        timeout: 15000
      });

      // Allow animations / layout to settle
      await new Promise(r => setTimeout(r, 400));

      // Capture element or viewport
      const canvasEl = await page.$('#viewport');
      let imageBuffer: Buffer;

      if (canvasEl) {
        imageBuffer = (await canvasEl.screenshot({
          type: format === 'jpeg' ? 'jpeg' : 'png',
          quality: format === 'jpeg' ? (options.quality || 90) : undefined,
          omitBackground: options.transparentBackground || false
        })) as Buffer;
      } else {
        imageBuffer = (await page.screenshot({
          type: format === 'jpeg' ? 'jpeg' : 'png',
          quality: format === 'jpeg' ? (options.quality || 90) : undefined,
          fullPage: true
        })) as Buffer;
      }

      return imageBuffer;
    } finally {
      await page.close().catch(() => {});
    }
  }
}
