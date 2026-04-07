import { GoogleGenerativeAI } from '@google/generative-ai';
import type { OHLCV } from '@quant/shared';
import { logger } from '../utils/logger.js';

export class GeminiService {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set');
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeStock(symbol: string, market: string, ohlcv: OHLCV[]): Promise<string> {
    const recent = ohlcv.slice(-30);
    if (recent.length === 0) {
      return '資料不足，無法進行分析。';
    }

    const latest = recent[recent.length - 1];
    const oldest = recent[0];
    const priceChange = (((latest.close - oldest.close) / oldest.close) * 100).toFixed(2);
    const avgVolume = Math.round(recent.reduce((s, r) => s + r.volume, 0) / recent.length);

    const priceTable = recent
      .slice(-10)
      .map((r) => `${r.date}: 開${r.open.toFixed(2)} 高${r.high.toFixed(2)} 低${r.low.toFixed(2)} 收${r.close.toFixed(2)} 量${r.volume}`)
      .join('\n');

    const marketLabel = market === 'tw' ? '台股' : '美股';
    const prompt = `你是一位專業的量化交易分析師，請用繁體中文分析以下${marketLabel}股票。

股票代碼: ${symbol} (${marketLabel})
近30日漲跌幅: ${priceChange}%
近30日平均成交量: ${avgVolume.toLocaleString()}
最近10日K線資料:
${priceTable}

請提供:
1. 近期趨勢判斷（多頭/空頭/盤整）
2. 關鍵支撐與壓力位
3. 成交量分析
4. 短線操作建議（含風險提示）

請簡潔扼要，每項分析不超過3句。`;

    logger.info(`[Gemini] Analyzing stock ${symbol}`);
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async reviewStrategy(code: string, description: string): Promise<string> {
    const prompt = `你是一位量化策略專家，請用繁體中文審查以下交易策略。

策略描述: ${description || '(未提供)'}

策略程式碼:
\`\`\`
${code.slice(0, 3000)}
\`\`\`

請提供:
1. 策略邏輯摘要（2句話）
2. 潛在風險或缺陷（列出2-3點）
3. 改進建議（列出2-3點）
4. 整體評分（1-10分）及理由

請簡潔扼要。`;

    logger.info('[Gemini] Reviewing strategy');
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async marketSummary(market: string, topMovers: { symbol: string; change: number }[]): Promise<string> {
    const marketLabel = market === 'tw' ? '台股' : '美股';
    const moversText = topMovers
      .slice(0, 10)
      .map((m) => `${m.symbol}: ${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%`)
      .join(', ');

    const prompt = `你是一位財經分析師，請用繁體中文撰寫今日${marketLabel}市場簡報（150字以內）。

今日主要漲跌股: ${moversText || '資料不足'}

請包含: 市場整體氣氛、主要板塊動向、值得關注的風險。`;

    logger.info('[Gemini] Generating market summary');
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
