import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const distPath = path.resolve(__dirname, 'dist');

app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Serve static assets from dist
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback
  app.get('*', (_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Index file not found. Please build the frontend.');
    }
  });
} else {
  app.get('*', (_req, res) => {
    res.status(200).send('Server is running. Please run npm run build to generate dist assets.');
  });
}

const defaultPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// In AI Studio Cloud Run containers, Nginx reverse proxy listens on 8080 and proxies to 3000.
// In standalone Cloud Run containers without Nginx, the app must listen directly on process.env.PORT (usually 8080).
const isNginxPresent = fs.existsSync('/etc/nginx/nginx.conf');
const targetPort = isNginxPresent ? 3000 : defaultPort;

function startServer(port: number, attemptFallback: boolean = true) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (0.0.0.0)`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && attemptFallback) {
      const fallbackPort = port === 3000 ? 8080 : 3000;
      console.warn(`Port ${port} is in use. Falling back to port ${fallbackPort}...`);
      startServer(fallbackPort, false);
    } else {
      console.error(`Server error on port ${port}:`, err);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

startServer(targetPort);
