import { Router, Request, Response } from 'express';
import { TdarrClient } from '../services/tdarrClient.js';
import { SAMPLE_FLOWS } from '../services/sampleFlows.js';

const router = Router();
const tdarrClient = new TdarrClient();

// Test connection to Tdarr server
router.post('/test-connection', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, apiKey } = req.body;
    if (!url) {
      res.status(400).json({ success: false, message: 'Server URL is required' });
      return;
    }

    const result = await tdarrClient.testConnection({ url, apiKey });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch all flows from Tdarr server
router.post('/flows', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, apiKey } = req.body;
    if (!url) {
      res.status(400).json({ error: 'Server URL is required' });
      return;
    }

    const flows = await tdarrClient.fetchFlows({ url, apiKey });
    res.json({ success: true, count: flows.length, flows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch specific flow by ID from Tdarr
router.post('/flow/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, apiKey } = req.body;
    const id = String(req.params.id);

    if (!url) {
      res.status(400).json({ error: 'Server URL is required' });
      return;
    }

    const flow = await tdarrClient.fetchFlowById({ url, apiKey }, id);
    if (!flow) {
      res.status(404).json({ error: `Flow with ID ${id} not found` });
      return;
    }

    res.json({ success: true, flow });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get built-in sample flows
router.get('/sample-flows', (_req: Request, res: Response): void => {
  res.json({ success: true, count: SAMPLE_FLOWS.length, flows: SAMPLE_FLOWS });
});

export default router;
