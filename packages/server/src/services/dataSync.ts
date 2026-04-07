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

  // ── Taiwan Stock Exchange (TWSE) ──────────────────────────
  private async syncTW(): Promise<void> {
    // 1. Fetch daily trading data from TWSE Open API
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${today}&type=ALL`;
    const res = await axios.get(url, { timeout: 30_000 });
    logger.debug('[DataSync:TW] TWSE response received', { rows: res.data?.data9?.length });

    // 2. Fetch additional data from FinMind (community free tier)
    // https://finmindtrade.com/analysis/#/data/api
    // Rate limit: 600 requests/hour without token
    // TODO: store FinMind token in Secret Manager when needed

    // 3. Parse and store to Cloud Storage / Firestore
    // TODO: implement storage write
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
    // TODO: fetch symbol list from Firestore / Cloud Storage cache
    // Returning stubs for now
    if (market === 'tw') {
      return [
        { code: '2330', name: '台積電', market: 'tw', sector: '半導體' },
        { code: '2317', name: '鴻海', market: 'tw', sector: '電子' },
        { code: '2454', name: '聯發科', market: 'tw', sector: '半導體' },
      ];
    }
    return [
      { code: 'AAPL', name: 'Apple Inc.', market: 'us', sector: 'Technology' },
      { code: 'TSLA', name: 'Tesla Inc.', market: 'us', sector: 'Consumer Discretionary' },
      { code: 'NVDA', name: 'NVIDIA Corp.', market: 'us', sector: 'Technology' },
    ];
  }

  async getOHLCV(
    market: Market,
    symbol: string,
    options: { from?: string; to?: string; freq?: string }
  ): Promise<OHLCV[]> {
    const interval = options.freq === 'weekly' ? '1wk' : '1d';
    const period1 = options.from || new Date(Date.now() - 365 * 86400_000);
    const period2 = options.to;

    if (market === 'us') {
      return this.fetchUsHistorical(symbol, { period1, period2, interval });
    }

    // TW stocks: Yahoo Finance supports them with .TW suffix (e.g. 2330.TW)
    const yahooSymbol = symbol.endsWith('.TW') ? symbol : `${symbol}.TW`;
    return this.fetchUsHistorical(yahooSymbol, { period1, period2, interval });
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
