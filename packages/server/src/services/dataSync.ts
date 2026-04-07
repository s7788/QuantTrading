import axios from 'axios';
import type { Market, OHLCV, Symbol, DataSyncStatus } from '@quant/shared';
import { logger } from '../utils/logger.js';
import { getFirestore, Collections } from './firestore.js';

interface YahooQuoteResult {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: YahooQuoteResult[];
    error?: { description?: string };
  };
}

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

  // ── Fetch real-time quotes from Yahoo Finance ─────────────
  async fetchQuotes(symbols: string[]): Promise<YahooQuoteResult[]> {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote`;
    const { data } = await axios.get<YahooQuoteResponse>(url, {
      params: {
        symbols: symbols.join(','),
        fields: 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,regularMarketPreviousClose,longName,shortName',
      },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 30_000,
    });
    return data.quoteResponse?.result ?? [];
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
    // TODO: read from Cloud Storage cache first, fall back to live fetch
    const interval = options.freq === 'daily' ? '1d' as const : '1wk' as const;
    const period1 = options.from || new Date(Date.now() - 365 * 86400_000);
    const period2 = options.to;

    if (market === 'tw') {
      const yahooSymbol = symbol.endsWith('.TW') ? symbol : `${symbol}.TW`;
      return this.fetchUsHistorical(yahooSymbol, { period1, period2, interval });
    }
    return this.fetchUsHistorical(symbol, { period1, period2, interval });
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
