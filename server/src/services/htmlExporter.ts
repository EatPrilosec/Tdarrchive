import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TdarrFlow, CompositeFlowGraph } from '../types/tdarr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface HtmlExportOptions {
  title?: string;
  theme?: 'dark' | 'midnight';
  showMinimap?: boolean;
  allowImageExport?: boolean;
}

export class HtmlExporter {
  public generateSingleFlowHtml(flow: TdarrFlow, options: HtmlExportOptions = {}): string {
    const title = options.title || flow.name || 'Tdarr Flow Viewer';
    const standalonePayload = {
      flow,
      flows: [flow],
      activeFlowId: flow._id,
      viewMode: 'single',
      isTreeMode: false,
      title
    };

    return this.renderStandaloneAppHtml(standalonePayload, title, options);
  }

  public generateCompositeTreeHtml(composite: CompositeFlowGraph, options: HtmlExportOptions = {}): string {
    const title = options.title || composite.name || 'Tdarr Composite Flow Tree';
    const standalonePayload = {
      compositeGraph: composite,
      viewMode: 'tree',
      isTreeMode: true,
      title
    };

    return this.renderStandaloneAppHtml(standalonePayload, title, options);
  }

  private getClientDistPath(): string {
    const possiblePaths = [
      path.resolve(process.cwd(), 'client/dist'),
      path.resolve(__dirname, '../../../client/dist'),
      path.resolve(__dirname, '../../client/dist'),
      path.resolve(__dirname, '../client/dist'),
      '/app/client/dist'
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        return p;
      }
    }
    return path.resolve(process.cwd(), 'client/dist');
  }

  private renderStandaloneAppHtml(standalonePayload: any, title: string, options: HtmlExportOptions): string {
    try {
      const distPath = this.getClientDistPath();
      const indexPath = path.join(distPath, 'index.html');

      if (fs.existsSync(indexPath)) {
        let indexHtml = fs.readFileSync(indexPath, 'utf8');
        const assetsDir = path.join(distPath, 'assets');

        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          const cssFile = files.find(f => f.endsWith('.css'));
          const jsFile = files.find(f => f.endsWith('.js'));

          if (cssFile) {
            const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
            indexHtml = indexHtml.replace(
              /<link\s+rel="stylesheet"[^>]*href="[^"]*"[^>]*>/i,
              `<style>\n${cssContent}\n</style>`
            );
          }

          if (jsFile) {
            const jsContent = fs.readFileSync(path.join(assetsDir, jsFile));
            const jsBase64 = jsContent.toString('base64');
            const dataScript = `<script>window.TDARRCHIVE_STANDALONE_DATA = ${JSON.stringify(standalonePayload)};</script>`;
            indexHtml = indexHtml.replace(
              /<script\s+type="module"[^>]*src="[^"]*"[^>]*><\/script>/i,
              `${dataScript}\n<script type="module" src="data:text/javascript;base64,${jsBase64}"></script>`
            );
          }

          // Update page title
          indexHtml = indexHtml.replace(/<title>.*?<\/title>/i, `<title>${this.escapeHtml(title)} - Tdarrchive</title>`);
          return indexHtml;
        }
      }
    } catch (err) {
      console.warn('Failed to embed client dist bundle in HTML export, falling back to standalone template:', err);
    }

    return this.renderFallbackHtmlTemplate(title, standalonePayload, options);
  }

  private renderFallbackHtmlTemplate(title: string, graphData: any, _options: HtmlExportOptions): string {
    const serializedData = JSON.stringify(graphData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(title)} - Tdarrchive Standalone Flow</title>
</head>
<body>
  <div id="app">
    <h1>${this.escapeHtml(title)}</h1>
  </div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
