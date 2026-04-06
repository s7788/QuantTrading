import type { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

export function setupWebSocket(io: SocketIOServer) {
  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe:market', (market: string) => {
      socket.join(`market:${market}`);
      logger.debug(`Client ${socket.id} subscribed to market:${market}`);
    });

    socket.on('subscribe:strategy', (strategyId: string) => {
      socket.join(`strategy:${strategyId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });
}

// Helper to broadcast from anywhere in the app
export function broadcastToMarket(io: SocketIOServer, market: string, event: string, data: unknown) {
  io.to(`market:${market}`).emit(event, data);
}

export function broadcastAlert(io: SocketIOServer, alert: unknown) {
  io.emit('alert', alert);
}
