import type { MarketConfig } from '../types';

export const MARKETS: Record<string, MarketConfig> = {
  tw: {
    id: 'tw',
    name: '台股',
    currency: 'TWD',
    timezone: 'Asia/Taipei',
    tradingHours: { open: '09:00', close: '13:30' },
    fees: { rate: 0.001425, minimum: 20 }, // 0.1425%
    tax: { rate: 0.003 }, // 賣出 0.3%
  },
  us: {
    id: 'us',
    name: '美股',
    currency: 'USD',
    timezone: 'America/New_York',
    tradingHours: { open: '09:30', close: '16:00' },
    fees: { rate: 0, minimum: 0 }, // Most brokers: commission-free
    tax: { rate: 0 },
  },
};

export const DATA_SYNC_SCHEDULE = {
  tw: '0 15 * * 1-5', // Weekdays 15:00 UTC+8 (after TW market close)
  us: '0 6 * * 2-6',  // Weekdays 06:00 UTC+8 (after US market close)
};

export const DEFAULT_INITIAL_CAPITAL = {
  tw: 1000000,  // NT$1,000,000
  us: 100000,   // $100,000
};

export const STRATEGY_TEMPLATES = [
  'ma-crossover',
  'rsi-reversal',
  'bollinger-breakout',
  'momentum',
  'pairs-trading',
  'blank',
] as const;

export const TECHNICAL_INDICATORS = {
  trend: ['SMA', 'EMA', 'BOLL', 'MACD', 'Ichimoku'],
  oscillator: ['RSI', 'KDJ', 'Stochastic', 'CCI', 'Williams %R'],
  volume: ['OBV', 'Volume MA', 'VWAP', 'MFI'],
  volatility: ['ATR', 'Bollinger Width', 'Historical Volatility'],
} as const;

export const CHART_COLORS = {
  up: '#3fb950',
  down: '#f85149',
  primary: '#58a6ff',
  warning: '#d29922',
  text: '#e6edf3',
  textSecondary: '#7d8590',
  background: '#0f1117',
  card: '#1c2128',
  border: '#30363d',
} as const;
