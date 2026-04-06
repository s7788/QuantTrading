import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/stores/appStore';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(window.location.origin, {
      path: '/socket.io',
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Subscribe to current market
      const market = useAppStore.getState().market;
      this.socket?.emit('subscribe:market', market);
    });

    this.socket.on('disconnect', () => {
      console.warn('[Socket] Disconnected');
    });

    // Data sync progress from server
    this.socket.on('sync:progress', (data: { market: string; progress: number; status: string }) => {
      useAppStore.getState().setSyncStatus(data.market as 'tw' | 'us', {
        lastSync: new Date().toISOString(),
        status: data.status as 'idle' | 'syncing' | 'error',
      });
    });

    // Incoming alerts
    this.socket.on('alert', (alert: { level: string; message: string }) => {
      const count = useAppStore.getState().unreadAlerts;
      useAppStore.getState().setUnreadAlerts(count + 1);
      console.warn('[Alert]', alert.level, alert.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void) {
    this.socket?.off(event, handler);
  }
}

export const socketService = new SocketService();
