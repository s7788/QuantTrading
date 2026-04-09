import axios from 'axios';
import YahooFinance from 'yahoo-finance2';
import type { Market, OHLCV, Symbol, DataSyncStatus } from '@quant/shared';

// yahoo-finance2 v2.14.x exports the class (not a singleton). Instantiate once
// so the crumb/cookie jar is reused across requests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf = new (YahooFinance as any)() as InstanceType<typeof YahooFinance>;
import { logger } from '../utils/logger.js';
import { getFirestore, Collections } from './firestore.js';

export interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  longName?: string;
  shortName?: string;
}

// ── TWSE Open API response shapes ─────────────────────────────
interface TwseCompany {
  公司代號: string;
  公司簡稱: string;
  產業類別: string;
}

interface TwseStockDayResponse {
  stat: string;
  fields: string[];
  data?: string[][];
}

// ── Alpha Vantage response shape ───────────────────────────────
interface AlphaVantageDaily {
  'Time Series (Daily)'?: Record<string, {
    '1. open': string;
    '2. high': string;
    '3. low': string;
    '4. close': string;
    '5. volume': string;
  }>;
  'Note'?: string;
  'Information'?: string;
}

// ── In-memory OHLCV cache ──────────────────────────────────────
interface CacheEntry { data: OHLCV[]; expiresAt: number }

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const ohlcvCache = new Map<string, CacheEntry>();

function cacheKey(market: Market, symbol: string, from: string, freq: string): string {
  return `${market}:${symbol}:${from}:${freq}`;
}

// ── Retry helper with exponential backoff ──────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 800,
  label = 'request'
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn(`[withRetry] ${label} attempt ${attempt} failed, retrying in ${delay}ms`, { err });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================
// DataSyncService
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

  // ── Taiwan sync (TWSE primary, Yahoo fallback) ────────────
  private async syncTW(): Promise<void> {
    const symbols = await this.getSymbols('tw');
    let done = 0;
    const from = new Date(Date.now() - 7 * 86400_000);
    const fromStr = from.toISOString().slice(0, 10);

    for (const sym of symbols.slice(0, 50)) {
      try {
        const data = await this.getTWOHLCV(sym.code, fromStr);
        if (data.length > 0) {
          const key = cacheKey('tw', sym.code, fromStr, 'daily');
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

  // ── US sync (Yahoo primary, Alpha Vantage fallback) ───────
  private async syncUS(): Promise<void> {
    const symbols = await this.getSymbols('us');
    const from = new Date(Date.now() - 7 * 86400_000);
    const fromStr = from.toISOString().slice(0, 10);
    let done = 0;

    for (const sym of symbols.slice(0, 50)) {
      try {
        const data = await this.getUSOHLCV(sym.code, fromStr);
        if (data.length > 0) {
          const key = cacheKey('us', sym.code, fromStr, 'daily');
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

  // ── Fetch real-time quotes via yahoo-finance2 (crumb handled internally) ─────
  async fetchQuotes(symbols: string[]): Promise<YahooQuoteResult[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = await (yf as any).quote(symbols);
      const quotes: YahooQuoteResult[] = (Array.isArray(raw) ? raw : [raw]).map((q: any) => ({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChange: q.regularMarketChange,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketVolume: q.regularMarketVolume ?? undefined,
        regularMarketDayHigh: q.regularMarketDayHigh ?? undefined,
        regularMarketDayLow: q.regularMarketDayLow ?? undefined,
        regularMarketOpen: q.regularMarketOpen ?? undefined,
        regularMarketPreviousClose: q.regularMarketPreviousClose ?? undefined,
        longName: q.longName ?? undefined,
        shortName: q.shortName ?? undefined,
      }));
      if (quotes.length > 0) return quotes;
      throw new Error('Empty quote result');
    } catch (err) {
      logger.warn('[DataSync] fetchQuotes failed, falling back to OHLCV prices', { err: String(err) });
      return this.fetchQuotesFallback(symbols);
    }
  }

  // Fallback: derive price/change from OHLCV when quote API is unavailable
  private async fetchQuotesFallback(symbols: string[]): Promise<YahooQuoteResult[]> {
    const results = await Promise.allSettled(
      symbols.map(async (sym): Promise<YahooQuoteResult | null> => {
        try {
          const ohlcv = await this.fetchYahooOHLCV(sym, {
            period1: new Date(Date.now() - 7 * 86400_000),
            interval: '1d',
          });
          if (!ohlcv.length) return null;
          const last = ohlcv[ohlcv.length - 1];
          const prev = ohlcv.length > 1 ? ohlcv[ohlcv.length - 2] : null;
          const change = prev ? +(last.close - prev.close).toFixed(4) : 0;
          const changePct = prev ? +((change / prev.close) * 100).toFixed(4) : 0;
          return {
            symbol: sym,
            regularMarketPrice: last.close,
            regularMarketChange: change,
            regularMarketChangePercent: changePct,
            regularMarketVolume: last.volume,
            regularMarketDayHigh: last.high,
            regularMarketDayLow: last.low,
            regularMarketOpen: last.open,
          };
        } catch {
          return null;
        }
      })
    );
    return results
      .filter((r): r is PromiseFulfilledResult<YahooQuoteResult> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);
  }

  // ── Public getters ────────────────────────────────────────
  async getStatus(): Promise<Record<Market, DataSyncStatus>> {
    return this.status;
  }

  async getSymbols(market: Market): Promise<Symbol[]> {
    if (market === 'tw') return this.getTWSymbols();
    return [
      { code: 'AAPL',  name: 'Apple Inc.',          market: 'us', sector: 'Technology' },
      { code: 'MSFT',  name: 'Microsoft Corp.',      market: 'us', sector: 'Technology' },
      { code: 'NVDA',  name: 'NVIDIA Corp.',         market: 'us', sector: 'Technology' },
      { code: 'TSLA',  name: 'Tesla Inc.',           market: 'us', sector: 'Consumer Discretionary' },
      { code: 'AMZN',  name: 'Amazon.com',           market: 'us', sector: 'Consumer Discretionary' },
      { code: 'META',  name: 'Meta Platforms',       market: 'us', sector: 'Communication' },
      { code: 'GOOGL', name: 'Alphabet Inc.',        market: 'us', sector: 'Communication' },
      { code: 'AMD',   name: 'AMD Inc.',             market: 'us', sector: 'Technology' },
    ];
  }

  async getOHLCV(
    market: Market,
    symbol: string,
    options: { from?: string; to?: string; freq?: string }
  ): Promise<OHLCV[]> {
    const freq = options.freq === 'weekly' ? 'weekly' : 'daily';
    const fromDate = options.from ?? new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);

    // 1. In-memory cache
    const key = cacheKey(market, symbol, fromDate, freq);
    const cached = ohlcvCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug(`[DataSync] Cache hit for ${market}:${symbol}`);
      return cached.data;
    }

    // 2. Firestore
    const stored = await this.loadOhlcv(market, symbol, fromDate).catch(() => null);
    if (stored && stored.length > 0) {
      ohlcvCache.set(key, { data: stored, expiresAt: Date.now() + CACHE_TTL_MS });
      logger.debug(`[DataSync] Firestore hit for ${market}:${symbol}`);
      return stored;
    }

    // 3. Live fetch
    const data = market === 'tw'
      ? await this.getTWOHLCV(symbol, fromDate, options.to, freq)
      : await this.getUSOHLCV(symbol, fromDate, options.to, freq);

    ohlcvCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    await this.persistOhlcv(market, symbol, data).catch((err) =>
      logger.warn(`[DataSync] Firestore persist failed for ${market}:${symbol}`, { err })
    );

    return data;
  }

  // ── Taiwan OHLCV: TWSE primary → Yahoo Finance fallback ───
  private async getTWOHLCV(
    symbol: string,
    from: string,
    to?: string,
    freq: string = 'daily'
  ): Promise<OHLCV[]> {
    try {
      const data = await this.fetchTWSEOHLCV(symbol, from, to);
      if (data.length > 0) {
        logger.debug(`[DataSync:TW] TWSE hit for ${symbol} (${data.length} bars)`);
        return data;
      }
    } catch (err) {
      logger.warn(`[DataSync:TW] TWSE fetch failed for ${symbol}, falling back to Yahoo`, { err });
    }

    // Fallback: Yahoo Finance via yf._fetch (crumb-aware)
    const interval: '1d' | '1wk' = freq === 'weekly' ? '1wk' : '1d';
    const yahooSymbol = symbol.endsWith('.TW') ? symbol : `${symbol}.TW`;
    return this.fetchYahooOHLCV(yahooSymbol, {
      period1: from || new Date(Date.now() - 365 * 86400_000),
      period2: to,
      interval,
    });
  }

  // ── US OHLCV: Yahoo Finance primary → Alpha Vantage fallback ─
  private async getUSOHLCV(
    symbol: string,
    from: string,
    to?: string,
    freq: string = 'daily'
  ): Promise<OHLCV[]> {
    const interval: '1d' | '1wk' = freq === 'weekly' ? '1wk' : '1d';

    try {
      const data = await this.fetchYahooOHLCV(symbol, {
        period1: from || new Date(Date.now() - 365 * 86400_000),
        period2: to,
        interval,
      });
      if (data.length > 0) return data;
    } catch (err) {
      logger.warn(`[DataSync:US] Yahoo fetch failed for ${symbol}, trying Alpha Vantage`, { err });
    }

    // Fallback: Alpha Vantage (requires ALPHA_VANTAGE_KEY in env)
    const avKey = process.env.ALPHA_VANTAGE_KEY;
    if (avKey) {
      return this.fetchAlphaVantageOHLCV(symbol, from, to, avKey);
    }

    throw new Error(`No data source available for US symbol: ${symbol}`);
  }

  // ── TWSE official API (twse.com.tw/exchangeReport/STOCK_DAY) ─
  // Fetches month-by-month; parses ROC calendar dates.
  private async fetchTWSEOHLCV(
    symbol: string,
    from: string,
    to?: string
  ): Promise<OHLCV[]> {
    const fromDate = new Date(from);
    const toDate = to ? new Date(to) : new Date();

    const months: string[] = [];
    const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    while (cursor <= toDate) {
      const yyyymmdd = `${cursor.getFullYear()}${String(cursor.getMonth() + 1).padStart(2, '0')}01`;
      months.push(yyyymmdd);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const allBars: OHLCV[] = [];

    for (const monthDate of months) {
      try {
        const url = 'https://www.twse.com.tw/exchangeReport/STOCK_DAY';
        const { data } = await withRetry(
          () => axios.get<TwseStockDayResponse>(url, {
            params: { response: 'json', stockNo: symbol, date: monthDate },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Accept': 'application/json',
              'Referer': 'https://www.twse.com.tw',
            },
            timeout: 15_000,
          }),
          3, 500, `TWSE ${symbol} ${monthDate}`
        );

        if (data.stat !== 'OK' || !data.data) continue;

        // fields: ["日期","成交股數","成交金額","開盤價","最高價","最低價","收盤價","漲跌價差","成交筆數"]
        for (const row of data.data) {
          const bar = this.parseTWSERow(row, from, to);
          if (bar) allBars.push(bar);
        }

        // Polite delay between TWSE requests
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        logger.warn(`[DataSync:TWSE] Failed for ${symbol} month ${monthDate}`, { err });
      }
    }

    return allBars.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Parse one TWSE data row → OHLCV | null
  // row[0] format: "113/04/01" (ROC year / MM / DD)
  private parseTWSERow(row: string[], from: string, to?: string): OHLCV | null {
    if (!row || row.length < 7) return null;

    const parts = row[0].split('/');
    if (parts.length !== 3) return null;

    const rocYear = parseInt(parts[0], 10);
    const month   = parts[1].padStart(2, '0');
    const day     = parts[2].padStart(2, '0');
    const dateStr = `${rocYear + 1911}-${month}-${day}`;

    if (dateStr < from) return null;
    if (to && dateStr > to) return null;

    const parseNum = (s: string) => parseFloat(s.replace(/,/g, ''));
    const open   = parseNum(row[3]);
    const high   = parseNum(row[4]);
    const low    = parseNum(row[5]);
    const close  = parseNum(row[6]);
    const volume = parseNum(row[1]); // 成交股數

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || isNaN(volume)) return null;

    return { date: dateStr, open, high, low, close, volume };
  }

  // ── Yahoo Finance OHLCV via yf._fetch (crumb-aware) ───────
  private async fetchYahooOHLCV(
    symbol: string,
    options: { period1?: string | Date; period2?: string | Date; interval: '1d' | '1wk' }
  ): Promise<OHLCV[]> {
    const toUnix = (v: string | Date | number | undefined, fallback: number) =>
      Math.floor(((v instanceof Date ? v : v ? new Date(v) : new Date(fallback)).getTime()) / 1000);

    const period1 = toUnix(options.period1, Date.now() - 365 * 86400_000);
    const period2 = toUnix(options.period2, Date.now());

    // Use yf._fetch (authenticated via the shared crumb/cookie jar) to call the
    // v8 chart API. The ${YF_QUERY_HOST} template is substituted internally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await (yf as any)._fetch(
      `https://\${YF_QUERY_HOST}/v8/finance/chart/${encodeURIComponent(symbol)}`,
      { interval: options.interval, period1, period2, includePrePost: false, events: 'div,splits' },
      {},
      'json',
      true,  // needsCrumb
    );

    const result = data.chart?.result?.[0];
    const quote  = result?.indicators?.quote?.[0];
    const timestamps: number[] = result?.timestamp ?? [];

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
      if (open == null || high == null || low == null || close == null || volume == null) return [];
      return [{ date: new Date(timestamp * 1000).toISOString().slice(0, 10), open, high, low, close, volume }];
    });
  }

  // ── Alpha Vantage OHLCV fallback (US stocks) ──────────────
  private async fetchAlphaVantageOHLCV(
    symbol: string,
    from: string,
    to: string | undefined,
    apiKey: string
  ): Promise<OHLCV[]> {
    const url = 'https://www.alphavantage.co/query';
    const { data } = await withRetry(
      () => axios.get<AlphaVantageDaily>(url, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol,
          apikey: apiKey,
          outputsize: 'full',
          datatype: 'json',
        },
        timeout: 30_000,
      }),
      2, 2000, `AlphaVantage ${symbol}`
    );

    if (data['Note'] || data['Information']) {
      throw new Error(`Alpha Vantage rate limit or invalid key for ${symbol}`);
    }

    const series = data['Time Series (Daily)'];
    if (!series) throw new Error(`Alpha Vantage: no data for ${symbol}`);

    return Object.entries(series)
      .filter(([date]) => date >= from && (!to || date <= to))
      .map(([date, bar]) => ({
        date,
        open:   parseFloat(bar['1. open']),
        high:   parseFloat(bar['2. high']),
        low:    parseFloat(bar['3. low']),
        close:  parseFloat(bar['4. close']),
        volume: parseFloat(bar['5. volume']),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
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
      { code: '2412', name: '中華電', market: 'tw', sector: '電信' },
      { code: '2603', name: '長榮',   market: 'tw', sector: '航運' },
      { code: '3008', name: '大立光', market: 'tw', sector: '光學' },
    ];

    try {
      const url = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';
      const { data } = await axios.get<TwseCompany[]>(url, {
        timeout: 10_000,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      });

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
      logger.warn('[DataSync:TW] TWSE symbol list failed, using fallback', { err });
      return FALLBACK;
    }
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
}
