import puppeteer, { Browser } from 'puppeteer';
import { HtmlExporter } from './htmlExporter.js';
import { TdarrFlow, CompositeFlowGraph } from '../types/tdarr.js';

export interface ScreenshotOptions {
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  transparentBackground?: boolean;
}

export class ScreenshotRenderer {
  private browserPromise: Promise<Browser> | null = null;
  private htmlExporter = new HtmlExporter();

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
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
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Wait for rendering to settle
      await page.evaluate(() => {
        // Trigger fitView
        if (typeof (window as any).fitView === 'function') {
          (window as any).fitView();
        }
      });

      await new Promise(r => setTimeout(r, 600));

      // Calculate the bounding box of all node cards & clusters
      const boundingBox = await page.evaluate(() => {
        const viewport = document.getElementById('viewport');
        if (!viewport) return { x: 0, y: 0, width: 1920, height: 1080 };

        const rect = viewport.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        };
      });

      const screenshot = await page.screenshot({
        type: format,
        clip: boundingBox,
        omitBackground: options.transparentBackground ?? false
      });

      return Buffer.from(screenshot);
    } finally {
      await page.close();
    }
  }

  public async close(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      await browser.close();
      this.browserPromise = null;
    }
  }
}
