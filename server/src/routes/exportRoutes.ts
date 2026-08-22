import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import { HtmlExporter } from '../services/htmlExporter.js';
import { ScreenshotRenderer } from '../services/screenshotRenderer.js';
import { TreeBuilder } from '../services/treeBuilder.js';
import { TdarrFlow } from '../types/tdarr.js';

const router = Router();
const htmlExporter = new HtmlExporter();
const screenshotRenderer = new ScreenshotRenderer();
const treeBuilder = new TreeBuilder();

/**
 * Formats a flow object to be 100% compliant with Tdarr's Import JSON Template format.
 */
function sanitizeForTdarrImport(flow: TdarrFlow): any {
  return {
    _id: flow._id,
    name: flow.name,
    description: flow.description || '',
    templateVersion: flow.templateVersion || '2.0.0',
    flowPlugins: (flow.flowPlugins || flow.nodes || []).map(p => ({
      id: p.id,
      name: p.name,
      pluginName: p.pluginName,
      sourceType: p.sourceType || 'community',
      category: p.category || 'action',
      description: p.description || '',
      position: p.position || { x: 100, y: 100 },
      inputs: p.inputs || p.inputsDB || {}
    })),
    flowEdges: (flow.flowEdges || flow.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label
    }))
  };
}

// Export single flow or array of flows as Tdarr Importable JSON
router.post('/json', (req: Request, res: Response): void => {
  try {
    const { flow, flows, filename } = req.body;

    if (flow) {
      const sanitized = sanitizeForTdarrImport(flow);
      const outputFilename = (filename || `${flow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
      res.send(JSON.stringify(sanitized, null, 2));
      return;
    }

    if (flows && Array.isArray(flows)) {
      const sanitizedList = flows.map(f => sanitizeForTdarrImport(f));
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="tdarr_flows_export.json"');
      res.send(JSON.stringify(sanitizedList, null, 2));
      return;
    }

    res.status(400).json({ error: 'No flow or flows array provided' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export flow as standalone portable HTML
router.post('/html', (req: Request, res: Response): void => {
  try {
    const { flow, flows, rootFlowId, isTreeMode, title } = req.body;

    if (isTreeMode && flows && Array.isArray(flows)) {
      const composite = treeBuilder.buildCompositeMegaGraph(flows, rootFlowId);
      const html = htmlExporter.generateCompositeTreeHtml(composite, { title });
      const safeTitle = (title || composite.name).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.html"`);
      res.send(html);
      return;
    }

    if (flow) {
      const html = htmlExporter.generateSingleFlowHtml(flow, { title });
      const safeTitle = (title || flow.name).replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.html"`);
      res.send(html);
      return;
    }

    res.status(400).json({ error: 'Missing flow data for HTML export' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export flow as screenshot image (PNG / JPEG)
router.post('/image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { flow, flows, rootFlowId, isTreeMode, scale, format, quality } = req.body;
    const imgFormat = format === 'jpeg' ? 'jpeg' : 'png';
    const scaleFactor = Number(scale) || 2;

    let imageBuffer: Buffer;
    let safeName: string;

    if (isTreeMode && flows && Array.isArray(flows)) {
      const composite = treeBuilder.buildCompositeMegaGraph(flows, rootFlowId);
      imageBuffer = await screenshotRenderer.renderCompositeTreeScreenshot(composite, {
        scale: scaleFactor,
        format: imgFormat,
        quality: Number(quality) || 90
      });
      safeName = composite.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    } else if (flow) {
      imageBuffer = await screenshotRenderer.renderFlowScreenshot(flow, {
        scale: scaleFactor,
        format: imgFormat,
        quality: Number(quality) || 90
      });
      safeName = flow.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    } else {
      res.status(400).json({ error: 'Missing flow or flows data for image render' });
      return;
    }

    res.setHeader('Content-Type', imgFormat === 'jpeg' ? 'image/jpeg' : 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.${imgFormat}"`);
    res.send(imageBuffer);
  } catch (err: any) {
    res.status(500).json({ error: `Image rendering failed: ${err.message}` });
  }
});

// Build and inspect flow tree hierarchy
router.post('/tree', (req: Request, res: Response): void => {
  try {
    const { flows, rootFlowId } = req.body;
    if (!flows || !Array.isArray(flows)) {
      res.status(400).json({ error: 'Flows array is required' });
      return;
    }

    const hierarchy = treeBuilder.buildHierarchy(flows, rootFlowId);
    const compositeGraph = treeBuilder.buildCompositeMegaGraph(flows, rootFlowId);

    res.json({
      success: true,
      hierarchy,
      compositeGraph
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export complete ZIP bundle containing JSON, Standalone HTMLs, and Tree View
router.post('/zip', async (req: Request, res: Response): Promise<void> => {
  try {
    const { flows, rootFlowId, includeImages } = req.body;
    if (!flows || !Array.isArray(flows) || flows.length === 0) {
      res.status(400).json({ error: 'Flows array is required' });
      return;
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="tdarr_flows_archive.zip"');
    archive.pipe(res);

    // 1. Add individual sanitized JSON templates
    flows.forEach(flow => {
      const sanitized = sanitizeForTdarrImport(flow);
      const filename = `json/${flow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      archive.append(JSON.stringify(sanitized, null, 2), { name: filename });
    });

    // 2. Add individual standalone HTML viewers
    flows.forEach(flow => {
      const html = htmlExporter.generateSingleFlowHtml(flow);
      const filename = `html/${flow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      archive.append(html, { name: filename });
    });

    // 3. Add Composite Flow Tree HTML viewer
    const composite = treeBuilder.buildCompositeMegaGraph(flows, rootFlowId);
    const treeHtml = htmlExporter.generateCompositeTreeHtml(composite);
    archive.append(treeHtml, { name: 'Flow_Tree_MegaViewer.html' });

    // 4. Optionally generate screenshots for each flow
    if (includeImages) {
      for (const flow of flows) {
        try {
          const imgBuffer = await screenshotRenderer.renderFlowScreenshot(flow, { scale: 2 });
          const imgFilename = `images/${flow.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
          archive.append(imgBuffer, { name: imgFilename });
        } catch {
          // Skip image if rendering fails
        }
      }
    }

    await archive.finalize();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
