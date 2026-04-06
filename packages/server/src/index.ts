import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import { dashboardRouter } from './routes/dashboard.js';
import { strategyRouter } from './routes/strategy.js';
import { backtestRouter } from './routes/backtest.js';
import { analyticsRouter } from './routes/analytics.js';
import { dataRouter } from './routes/data.js';
import { settingsRouter } from './routes/settings.js';

// Services
import { setupWebSocket } from './services/websocket.js';
import { logger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

// WebSocket
const io = new SocketIOServer(server, {
  cors: { origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000' },
});
setupWebSocket(io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/strategy', strategyRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/data', dataRouter);
app.use('/api/settings', settingsRouter);

// Health check (for Cloud Run)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React SPA in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Start
const PORT = parseInt(process.env.PORT || '8080');
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io };
