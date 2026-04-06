// ============================================================
// Market Types
// ============================================================

export type Market = 'tw' | 'us';

export interface MarketConfig {
  id: Market;
  name: string;
  currency: string;
  timezone: string;
  tradingHours: { open: string; close: string };
  fees: { rate: number; minimum: number };
  tax: { rate: number };
}

// ============================================================
// Stock / Symbol Types
// ============================================================

export interface Symbol {
  code: string;
  name: string;
  market: Market;
  sector?: string;
  industry?: string;
}

export interface Quote {
  symbol: string;
  market: Market;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================================
// Strategy Types
// ============================================================

export type StrategyStatus = 'draft' | 'backtesting' | 'ready' | 'running' | 'paused' | 'stopped' | 'error';
export type StrategyType = 'trend' | 'mean-reversion' | 'arbitrage' | 'momentum' | 'breakout' | 'custom';

export interface StrategyParam {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: StrategyStatus;
  type: StrategyType;
  market: Market;
  symbols: string[];
  code: string;
  params: StrategyParam[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Position & Trade Types
// ============================================================

export type TradeDirection = 'long' | 'short';
export type TradeAction = 'buy' | 'sell';

export interface Position {
  id: string;
  symbol: string;
  name?: string;
  market: Market;
  direction: TradeDirection;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  weight: number;
  strategyId: string;
  strategyName: string;
  openedAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  market: Market;
  action: TradeAction;
  quantity: number;
  price: number;
  realizedPnl?: number;
  realizedPnlPercent?: number;
  strategyId: string;
  strategyName: string;
  executedAt: string;
}

// ============================================================
// Backtest Types
// ============================================================

export type BacktestStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BacktestConfig {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  feeModel: { type: 'fixed' | 'percent' | 'tiered'; value: number };
  slippage: { type: 'fixed' | 'percent' | 'none'; value: number };
  symbols: string[];
  market: Market;
  frequency: 'tick' | '1m' | '5m' | '15m' | '1h' | 'daily';
  benchmark: string;
}

export interface BacktestResult {
  id: string;
  config: BacktestConfig;
  status: BacktestStatus;
  metrics: PerformanceMetrics;
  equityCurve: { date: string; value: number; benchmark: number; drawdown: number }[];
  trades: Trade[];
  monthlyReturns: { year: number; month: number; return: number }[];
  createdAt: string;
  duration: number; // ms
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownDays: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgHoldingDays: number;
  maxConsecutiveLosses: number;
  maxConsecutiveWins: number;
}

// ============================================================
// Alert Types
// ============================================================

export type AlertLevel = 'error' | 'warning' | 'info';
export type AlertType = 'strategy_error' | 'drawdown_threshold' | 'api_disconnect' | 'order_timeout' | 'custom';

export interface Alert {
  id: string;
  level: AlertLevel;
  type: AlertType;
  message: string;
  strategyId?: string;
  read: boolean;
  createdAt: string;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardSummary {
  totalEquity: number;
  equityChange: number;
  equityChangePercent: number;
  todayPnl: number;
  todayRealizedPnl: number;
  todayUnrealizedPnl: number;
  positionCount: number;
  longCount: number;
  shortCount: number;
  activeStrategies: number;
  totalStrategies: number;
  todayTrades: number;
  todayBuys: number;
  todaySells: number;
  todayWinRate: number;
}

// ============================================================
// Data Sync Types
// ============================================================

export interface DataSyncStatus {
  market: Market;
  lastSync: string;
  status: 'idle' | 'syncing' | 'error';
  progress?: number;
  error?: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
