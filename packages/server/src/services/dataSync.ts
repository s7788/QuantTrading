import axios from 'axios';
import type { Market, OHLCV, Symbol, DataSyncStatus } from '@quant/shared';
import { logger } from '../utils/logger.js';
import { getFirestore, Collections } from './firestore.js';

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

// TWSE Open API response shape (openapi.twse.com.tw)
interface TwseCompany {
  公司代號: string;
  公司簡稱: string;
  產業類別: string;
}

// ── In-memory OHLCV cache ──────────────────────────────────────
interface CacheEntry { data: OHLCV[]; expiresAt: number }

// Cache key: "{market}:{symbol}:{from}:{freq}"
// TTL: 4 hours (market data refreshes daily, so this is fine)
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
const ohlcvCache = new Map<string, CacheEntry>();

function cacheKey(market: Market, symbol: string, from: string, freq: string): string {
  return `${market}:${symbol}:${from}:${freq}`;
}

// ============================================================
// DataSyncService
// Fetches market data from free APIs; caches in memory + Firestore
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

      // Persist sync status to Firestore (best-effort)
      await this.saveStatus(market).catch((err) =>
        logger.warn(`[DataSync] Failed to persist status for ${market}`, { err })
      );
    } catch (err) {
      this.status[market].status = 'error';
      this.status[market].error = String(err);
      logger.error(`[DataSync] Failed sync for ${market}`, { err });
      throw err;
    }
  }

  // ── Taiwan Stock Exchange ─────────────────────────────────
  private async syncTW(): Promise<void> {
    const symbols = await this.getSymbols('tw');
    let done = 0;
    const from = new Date(Date.now() - 7 * 86400_000);

    for (const sym of symbols.slice(0, 50)) {
      try {
        const data = await this.fetchYahooOHLCV(`${sym.code}.TW`, {
          period1: from,
          interval: '1d',
        });
        if (data.length > 0) {
          const key = cacheKey('tw', sym.code, from.toISOString().slice(0, 10), 'daily');
          ohlcvCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
          await this.persistOhlcv('tw', sym.code, data);
        }
        done++;
        this.status.tw.progress = Math.round((done / Math.min(symbols.length, 50)) * 100);
      } catch (err) {
        logger.warn(`[DataSync:TW] Failed for ${sym.code}`, { err });
      }
    }
  }

  // ── US Market via Yahoo Finance ───────────────────────────
  private async syncUS(): Promise<void> {
    const symbols = await this.getSymbols('us');
    const from = new Date(Date.now() - 7 * 86400_000);
    let done = 0;

    for (const sym of symbols.slice(0, 50)) {
      try {
        const data = await this.fetchYahooOHLCV(sym.code, {
          period1: from,
          interval: '1d',
        });
        if (data.length > 0) {
          const key = cacheKey('us', sym.code, from.toISOString().slice(0, 10), 'daily');
          ohlcvCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
          await this.persistOhlcv('us', sym.code, data);
        }
        done++;
        this.status.us.progress = Math.round((done / Math.min(symbols.length, 50)) * 100);
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
      return this.getTWSymbols();
    }
    // US: hardcoded common symbols for now
    return [
      { code: 'AAPL', name: 'Apple Inc.',     market: 'us', sector: 'Technology' },
      { code: 'MSFT', name: 'Microsoft Corp.', market: 'us', sector: 'Technology' },
      { code: 'NVDA', name: 'NVIDIA Corp.',    market: 'us', sector: 'Technology' },
      { code: 'TSLA', name: 'Tesla Inc.',      market: 'us', sector: 'Consumer Discretionary' },
      { code: 'AMZN', name: 'Amazon.com',      market: 'us', sector: 'Consumer Discretionary' },
      { code: 'META', name: 'Meta Platforms',  market: 'us', sector: 'Communication' },
      { code: 'GOOGL',name: 'Alphabet Inc.',   market: 'us', sector: 'Communication' },
      { code: 'AMD',  name: 'AMD Inc.',        market: 'us', sector: 'Technology' },
    ];
  }

  async getOHLCV(
    market: Market,
    symbol: string,
    options: { from?: string; to?: string; freq?: string }
  ): Promise<OHLCV[]> {
    const freq = options.freq === 'weekly' ? 'weekly' : 'daily';
    const interval: '1d' | '1wk' = freq === 'weekly' ? '1wk' : '1d';
    const fromDate = options.from ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

    // 1. Check in-memory cache
    const key = cacheKey(market, symbol, fromDate, freq);
    const cached = ohlcvCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(`[DataSync] Cache hit for ${market}:${symbol}`);
      return cached.data;
    }

    // 2. Try loading from Firestore
    const stored = await this.loadOhlcv(market, symbol, fromDate).catch(() => null);
    if (stored && stored.length > 0) {
      ohlcvCache.set(key, { data: stored, expiresAt: Date.now() + CACHE_TTL_MS });
      logger.debug(`[DataSync] Firestore hit for ${market}:${symbol}`);
      return stored;
    }

    // 3. Fetch live from Yahoo Finance
    const yahooSymbol = market === 'tw'
      ? (symbol.endsWith('.TW') ? symbol : `${symbol}.TW`)
      : symbol;

    const data = await this.fetchYahooOHLCV(yahooSymbol, {
      period1: options.from || new Date(Date.now() - 365 * 86400_000),
      period2: options.to,
      interval,
    });

    // 4. Store in cache + Firestore (best-effort)
    ohlcvCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    await this.persistOhlcv(market, symbol, data).catch((err) =>
      logger.warn(`[DataSync] Firestore persist failed for ${market}:${symbol}`, { err })
    );

    return data;
  }

  // ── TW symbol list from TWSE Open API ────────────────────
  private async getTWSymbols(): Promise<Symbol[]> {
    const FALLBACK: Symbol[] = [
      { code: '2330', name: '台積電', market: 'tw', sector: '半導體' },
      { code: '2317', name: '鴻海',   market: 'tw', sector: '電子' },
      { code: '2454', name: '聯發科', market: 'tw', sector: '半導體' },
      { code: '2382', name: '廣達',   market: 'tw', sector: '電腦及週邊設備' },
      { code: '2308', name: '台達電', market: 'tw', sector: '電子零組件' },
      { code: '2881', name: '富邦金', market: 'tw', sector: '金融保險' },
      { code: '2886', name: '兆豐金', market: 'tw', sector: '金融保險' },
    ];

    try {
      const url = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
      const { data } = await axios.get<TwseCompany[]>(url, { timeout: 10_000 });

      if (!Array.isArray(data) || data.length === 0) return FALLBACK;

      return data
        .filter((c) => /^\d{4}$/.test(c['公司代號']))  // 4-digit stock codes only
        .slice(0, 200)
        .map((c) => ({
          code: c['公司代號'],
          name: c['公司簡稱'],
          market: 'tw' as const,
          sector: c['產業類別'] || '其他',
        }));
    } catch (err) {
      logger.warn('[DataSync:TW] Failed to fetch symbol list from TWSE, using fallback', { err });
      return FALLBACK;
    }
  }

  // ── Yahoo Finance OHLCV fetch ─────────────────────────────
  private async fetchYahooOHLCV(
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
    const quote  = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];

    if (!result || !quote) {
      const message = data.chart?.error?.description || `Yahoo chart missing data for ${symbol}`;
      throw new Error(message);
    }

    return timestamps.flatMap((timestamp, index) => {
      const open   = quote.open?.[index];
      const high   = quote.high?.[index];
      const low    = quote.low?.[index];
      const close  = quote.close?.[index];
      const volume = quote.volume?.[index];

      if (open == null || high == null || low == null || close == null || volume == null) {
        return [];
      }

      return [{
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        open, high, low, close, volume,
      }];
    });
  }

  // ── Firestore persistence ─────────────────────────────────
  private async persistOhlcv(market: Market, symbol: string, ohlcv: OHLCV[]): Promise<void> {
    const db = getFirestore();
    const docId = `${market}_${symbol}`;
    await db.collection(Collections.OHLCV).doc(docId).set({
      market,
      symbol,
      ohlcv,
      updatedAt: new Date().toISOString(),
    });
    logger.debug(`[DataSync] Persisted ${ohlcv.length} bars to Firestore for ${market}:${symbol}`);
  }

  private async loadOhlcv(market: Market, symbol: string, from: string): Promise<OHLCV[] | null> {
    const db = getFirestore();
    const docId = `${market}_${symbol}`;
    const doc = await db.collection(Collections.OHLCV).doc(docId).get();

    if (!doc.exists) return null;

    const stored = doc.data() as { ohlcv: OHLCV[]; updatedAt: string } | undefined;
    if (!stored?.ohlcv?.length) return null;

    // Only use stored data if it was updated within the last 24h
    const age = Date.now() - new Date(stored.updatedAt).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      logger.debug(`[DataSync] Stale Firestore data for ${market}:${symbol}, will re-fetch`);
      return null;
    }

    // Filter to requested date range
    return stored.ohlcv.filter((bar) => bar.date >= from);
  }

  private async saveStatus(market: Market): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.DATA_STATUS).doc(market).set(this.status[market]);
  }

  private toUnixTimestamp(value: string | Date): number {
    const date = value instanceof Date ? value : new Date(value);
    return Math.floor(date.getTime() / 1000);
  }
}
