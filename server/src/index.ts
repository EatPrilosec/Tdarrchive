import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import tdarrRoutes from './routes/tdarrRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8267;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: 'Tdarrchive',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/tdarr', tdarrRoutes);
app.use('/api/export', exportRoutes);

// Static client serving (Production)
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../client/dist'),
  path.resolve(__dirname, './client/dist')
];

let clientDistPath: string | null = null;
for (const cand of clientDistCandidates) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
    clientDistPath = cand;
    break;
  }
}

if (clientDistPath) {
  console.log(`[Tdarrchive] Serving client web UI from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA fallback
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
} else {
  console.log('[Tdarrchive] Running in API-only / development mode (Client dist not found).');
  app.get('/', (_req: Request, res: Response) => {
    res.send(`
      <html>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px;">
          <h1>Tdarrchive Backend is Running</h1>
          <p>Client build not detected. If developing, start Vite client dev server at port 5173.</p>
          <p>Health check: <a href="/health" style="color: #38bdf8;">/health</a></p>
        </body>
      </html>
    `);
  });
}

// Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Tdarrchive Server started on port ${PORT}`);
  console.log(`🔗 Web UI URL: http://localhost:${PORT}`);
  console.log(`⚙️  API Endpoint: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Tdarrchive] SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('[Tdarrchive] Process terminated.');
    process.exit(0);
  });
});
