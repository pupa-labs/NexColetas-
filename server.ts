import * as dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './backend/src/routes/api.ts';
import {
  apiRateLimiter,
  securityHeadersAndSanitizer,
} from './backend/src/middleware/security.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeadersAndSanitizer);
  app.use('/api', apiRateLimiter, apiRouter);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NexColetas Core Server executando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Erro ao iniciar servidor NexColetas:', err);
});
