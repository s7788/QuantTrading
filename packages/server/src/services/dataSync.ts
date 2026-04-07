import axios from 'axios';
import type { Market, OHLCV, Symbol, DataSyncStatus } from '@quant/shared';
import { logger } from '../utils/logger.js';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
}

// ============================================================
// DataSyncService
// Fetches market data from free APIs and caches in Cloud Storage
// ============================================================
export class DataSyncService {
  private status: Record<Market, DataSyncStatus> = {
    tw: { market: 'tw', lastSync: '', status: 'idle' },
    us: { market: 'us', lastSync: '', status: 'idle' },
  };

  async sync(market: Market): Promise<void> {
    this.status[market].status = 'syncing';
    this.status[market].progress = 0;
    logger.info(`[DataSync] Starting sync for ${market}`);

    try {
      if (market === 'tw') {
        await this.syncTW();
      } else {
        await this.syncUS();
      }
      this.status[market].status = 'idle';
      this.status[market].lastSync = new Date().toISOString();
      this.status[market].progress = 100;
      logger.info(`[DataSync] Completed sync for ${market}`);
    } catch (err) {
      this.status[market].status = 'error';
      this.status[market].error = String(err);
      logger.error(`[DataSync] Failed sync for ${market}`, { err });
      throw err;
    }
  }

  // ── Taiwan Stocks via Yahoo Finance (.TW suffix) ─────────
  private async syncTW(): Promise<void> {
    const symbols = await this.getSymbols('tw');
    let done = 0;

    for (const sym of symbols.slice(0, 50)) {
      try {
        await this.fetchUsHistorical(`${sym.code}.TW`, {
          period1: new Date(Date.now() - 7 * 86400_000),
          interval: '1d',
        });
        done++;
        this.status.tw.progress = Math.round((done / symbols.length) * 100);
      } catch (err) {
        logger.warn(`[DataSync:TW] Failed for ${sym.code}`, { err });
      }
    }
  }

  // ── US Market via Yahoo Finance ───────────────────────────
  private async syncUS(): Promise<void> {
    const symbols = await this.getSymbols('us');
    let done = 0;

    for (const sym of symbols.slice(0, 50)) { // batch limit per run
      try {
        await this.fetchUsHistorical(sym.code, {
          period1: new Date(Date.now() - 7 * 86400_000),
          interval: '1d',
        });
        done++;
        this.status.us.progress = Math.round((done / symbols.length) * 100);
      } catch (err) {
        logger.warn(`[DataSync:US] Failed for ${sym.code}`, { err });
      }
    }
  }

  // ── Public getters ────────────────────────────────────────
  async getStatus(): Promise<Record<Market, DataSyncStatus>> {
    return this.status;
  }

  async getSymbols(market: Market): Promise<Symbol[]> {
    if (market === 'tw') {
      return [
        { code: '2330', name: '台積電', market: 'tw', sector: '半導體' },
        { code: '2317', name: '鴻海', market: 'tw', sector: '電子' },
        { code: '2454', name: '聯發科', market: 'tw', sector: '半導體' },
        { code: '2308', name: '台達電', market: 'tw', sector: '電子' },
        { code: '2382', name: '廣達', market: 'tw', sector: '電子' },
        { code: '2412', name: '中華電', market: 'tw', sector: '電信' },
        { code: '2303', name: '聯電', market: 'tw', sector: '半導體' },
        { code: '3711', name: '日月光投控', market: 'tw', sector: '半導體' },
        { code: '2881', name: '富邦金', market: 'tw', sector: '金融' },
        { code: '2882', name: '國泰金', market: 'tw', sector: '金融' },
        { code: '2886', name: '兆豐金', market: 'tw', sector: '金融' },
        { code: '1301', name: '台塑', market: 'tw', sector: '塑化' },
        { code: '1303', name: '南亞', market: 'tw', sector: '塑化' },
        { code: '2002', name: '中鋼', market: 'tw', sector: '鋼鐵' },
        { code: '2891', name: '中信金', market: 'tw', sector: '金融' },
      ];
    }
    return [
      { code: 'AAPL', name: 'Apple Inc.', market: 'us', sector: 'Technology' },
      { code: 'TSLA', name: 'Tesla Inc.', market: 'us', sector: 'Consumer Discretionary' },
      { code: 'NVDA', name: 'NVIDIA Corp.', market: 'us', sector: 'Technology' },
      { code: 'MSFT', name: 'Microsoft Corp.', market: 'us', sector: 'Technology' },
      { code: 'GOOGL', name: 'Alphabet Inc.', market: 'us', sector: 'Technology' },
      { code: 'AMZN', name: 'Amazon.com Inc.', market: 'us', sector: 'Consumer Discretionary' },
      { code: 'META', name: 'Meta Platforms Inc.', market: 'us', sector: 'Technology' },
      { code: 'TSM', name: 'Taiwan Semiconductor ADR', market: 'us', sector: 'Technology' },
      { code: 'JPM', name: 'JPMorgan Chase', market: 'us', sector: 'Financials' },
      { code: 'SPY', name: 'S&P 500 ETF', market: 'us', sector: 'ETF' },
      { code: 'QQQ', name: 'Nasdaq-100 ETF', market: 'us', sector: 'ETF' },
    ];
  }

  async getOHLCV(
    market: Market,
    symbol: string,
    options: { from?: string; to?: string; freq?: string }
  ): Promise<OHLCV[]> {
    // TODO: read from Cloud Storage cache first, fall back to live fetch
    if (market === 'us') {
      return this.fetchUsHistorical(symbol, {
        period1: options.from || new Date(Date.now() - 365 * 86400_000),
        period2: options.to,
        interval: options.freq === 'daily' ? '1d' : '1wk',
      });
    }
    // TW stocks: append .TW suffix for Yahoo Finance
    return this.fetchUsHistorical(`${symbol}.TW`, {
      period1: options.from || new Date(Date.now() - 365 * 86400_000),
      period2: options.to,
      interval: options.freq === 'weekly' ? '1wk' : '1d',
    });
  }

  private async fetchUsHistorical(
    symbol: string,
    options: { period1?: string | Date; period2?: string | Date; interval: '1d' | '1wk' }
  ): Promise<OHLCV[]> {
    const period1 = this.toUnixTimestamp(options.period1 ?? new Date(Date.now() - 365 * 86400_000));
    const period2 = this.toUnixTimestamp(options.period2 ?? new Date());
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

    const { data } = await axios.get<YahooChartResponse>(url, {
      params: {
        interval: options.interval,
        period1,
        period2,
        includePrePost: false,
        events: 'div,splits',
      },
      timeout: 30_000,
    });

    const result = data.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];

    if (!result || !quote) {
      const message = data.chart?.error?.description || `Yahoo chart response missing data for ${symbol}`;
      throw new Error(message);
    }

    return timestamps.flatMap((timestamp, index) => {
      const open = quote.open?.[index];
      const high = quote.high?.[index];
      const low = quote.low?.[index];
      const close = quote.close?.[index];
      const volume = quote.volume?.[index];

      if (
        open == null ||
        high == null ||
        low == null ||
        close == null ||
        volume == null
      ) {
        return [];
      }

      return [{
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open,
        high,
        low,
        close,
        volume,
      }];
    });
  }

  private toUnixTimestamp(value: string | Date): number {
    const date = value instanceof Date ? value : new Date(value);
    return Math.floor(date.getTime() / 1000);
  }
}
