import yahooFinance from 'yahoo-finance2';
import axios from 'axios';
import type { Market, OHLCV, Symbol, DataSyncStatus } from '@quant/shared';
import { logger } from '../utils/logger.js';

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
    // yahoo-finance2 does not require API key
    // Fetches adjusted OHLCV, splits, dividends for US stocks
    const symbols = await this.getSymbols('us');
    let done = 0;

    for (const sym of symbols.slice(0, 50)) { // batch limit per run
      try {
        await yahooFinance.historical(sym.code, {
          period1: new Date(Date.now() - 7 * 86400_000), // last 7 days
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
    // TODO: read from Cloud Storage cache first, fall back to live fetch
    if (market === 'us') {
      const results = await yahooFinance.historical(symbol, {
        period1: options.from || new Date(Date.now() - 365 * 86400_000),
        period2: options.to,
        interval: options.freq === 'daily' ? '1d' : '1wk',
      });
      return results.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close ?? 0,
        volume: r.volume ?? 0,
      }));
    }
    // TODO: TW OHLCV from TWSE / FinMind cache
    return [];
  }
}
