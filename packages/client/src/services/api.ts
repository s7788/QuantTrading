import axios from 'axios';

// Base axios instance — proxied to /api in dev, same-origin in prod
export const api = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

api.interceptors.response.use(
  (r) => r.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Unknown error';
    console.error('[API]', msg);
    return Promise.reject(new Error(msg));
  }
);

// ── Data sync ─────────────────────────────────────────────────
export const syncData = (market: string) =>
  api.post(`/data/sync?market=${market}`);

export const getDataStatus = () => api.get('/data/status');

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardSummary = () => api.get('/dashboard/summary');
export const getEquityCurve = (period = 'month') =>
  api.get(`/dashboard/equity-curve?period=${period}`);
export const getPositions = (market: string) =>
  api.get(`/dashboard/positions?market=${market}`);
export const getRecentTrades = (market: string, limit = 50) =>
  api.get(`/dashboard/trades?market=${market}&limit=${limit}`);
export const getAlerts = () => api.get('/dashboard/alerts');
export const markAlertRead = (id: string) =>
  api.patch(`/dashboard/alerts/${id}/read`);

// ── Strategy ──────────────────────────────────────────────────
export const getStrategies = (params?: Record<string, string>) =>
  api.get('/strategy', { params });
export const getStrategy = (id: string) => api.get(`/strategy/${id}`);
export const createStrategy = (data: unknown) => api.post('/strategy', data);
export const updateStrategy = (id: string, data: unknown) =>
  api.put(`/strategy/${id}`, data);
export const deleteStrategy = (id: string) => api.delete(`/strategy/${id}`);
export const startStrategy = (id: string) =>
  api.post(`/strategy/${id}/start`);
export const pauseStrategy = (id: string) =>
  api.post(`/strategy/${id}/pause`);
export const stopStrategy = (id: string) => api.post(`/strategy/${id}/stop`);
export const getStrategyVersions = (id: string) =>
  api.get(`/strategy/${id}/versions`);
export const getStrategyTemplates = () =>
  api.get('/strategy/meta/templates');

// ── Backtest ──────────────────────────────────────────────────
export const runBacktest = (config: unknown) =>
  api.post('/backtest/run', config);
export const getBacktests = (params?: Record<string, string>) =>
  api.get('/backtest', { params });
export const getBacktest = (id: string) => api.get(`/backtest/${id}`);
export const deleteBacktest = (id: string) => api.delete(`/backtest/${id}`);
export const cancelBacktest = (id: string) =>
  api.post(`/backtest/${id}/cancel`);
export const compareBacktests = (ids: string[]) =>
  api.get(`/backtest/meta/compare?ids=${ids.join(',')}`);

// ── Analytics ─────────────────────────────────────────────────
export const getMarketOverview = (market: string) =>
  api.get(`/analytics/market-overview?market=${market}`);
export const getSymbolData = (
  market: string,
  code: string,
  params?: { from?: string; to?: string; freq?: string }
) => api.get(`/analytics/symbol/${market}/${code}`, { params });
export const runScreener = (data: unknown) =>
  api.post('/analytics/screener', data);
export const getBoards = () => api.get('/analytics/boards');
export const createBoard = (data: unknown) =>
  api.post('/analytics/boards', data);
export const updateBoard = (id: string, data: unknown) =>
  api.put(`/analytics/boards/${id}`, data);
export const deleteBoard = (id: string) =>
  api.delete(`/analytics/boards/${id}`);

// ── Settings ──────────────────────────────────────────────────
export const getSettings = () => api.get('/settings');
export const updateSettings = (data: unknown) => api.put('/settings', data);
export const getDataSources = () => api.get('/settings/data-sources');
