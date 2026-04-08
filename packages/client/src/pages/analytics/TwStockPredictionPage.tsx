import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Brain, Zap, AlertTriangle } from 'lucide-react';
import { PageHeader, SectionCard, TabBar, Badge, DataTable, PnlText } from '@/components/common';
import type { Column } from '@/components/common/DataTable';
import { getSymbolData } from '@/services/api';

// ── Mock prediction data ─────────────────────────────────────────────────────

interface PredStock {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  predChange: number;
  confidence: number;
  signals: string[];
  sector: string;
  volume: string;
}

const TOP_PREDICTIONS: PredStock[] = [
  { rank:1, symbol:'2330', name:'台積電',   price:878,  predChange:4.2,  confidence:87, signals:['技術突破','法人買超','EPS上修'],  sector:'半導體',     volume:'2.3x' },
  { rank:2, symbol:'2454', name:'聯發科',   price:1320, predChange:3.8,  confidence:82, signals:['均線黃金交叉','RSI回升','業績利多'], sector:'半導體',     volume:'1.9x' },
  { rank:3, symbol:'3711', name:'日月光投控', price:168, predChange:3.5,  confidence:79, signals:['封測訂單增溫','外資加碼'],         sector:'半導體',     volume:'1.7x' },
  { rank:4, symbol:'2382', name:'廣達',     price:302,  predChange:3.1,  confidence:76, signals:['AI伺服器題材','技術面強勢'],        sector:'電子零組件', volume:'2.1x' },
  { rank:5, symbol:'2308', name:'台達電',   price:345,  predChange:2.9,  confidence:74, signals:['綠能轉型','電源模組出貨增'],        sector:'電子零組件', volume:'1.5x' },
  { rank:6, symbol:'2881', name:'富邦金',   price:88.5, predChange:2.6,  confidence:71, signals:['升息受惠','股息殖利率佳'],          sector:'金融保險',   volume:'1.3x' },
  { rank:7, symbol:'1301', name:'台塑',     price:72.3, predChange:2.4,  confidence:68, signals:['油化原料回升','外資買進'],          sector:'塑膠',       volume:'1.4x' },
  { rank:8, symbol:'2412', name:'中華電',   price:124,  predChange:2.1,  confidence:66, signals:['防禦型股票','配息穩定'],            sector:'通信網路',   volume:'1.1x' },
  { rank:9, symbol:'2886', name:'兆豐金',   price:38.2, predChange:1.9,  confidence:63, signals:['公股銀行轉強','利差擴大'],          sector:'金融保險',   volume:'1.2x' },
  { rank:10,symbol:'1216', name:'統一',     price:68.5, predChange:1.7,  confidence:61, signals:['內需消費回溫','品牌溢價'],          sector:'食品',       volume:'1.0x' },
];

interface AnalysisResult {
  symbol: string;
  name: string;
  price: number;
  predPrice: number;
  predChange: number;
  confidence: number;
  verdict: 'strong_buy' | 'buy' | 'hold' | 'sell';
  technicals: { label: string; value: string; status: 'positive' | 'neutral' | 'negative' }[];
  factors: { label: string; detail: string; weight: number }[];
  risk: string;
}

const STOCK_DB: Record<string, AnalysisResult> = {
  '2330': {
    symbol:'2330', name:'台積電', price:878, predPrice:914, predChange:4.1, confidence:87,
    verdict:'strong_buy',
    technicals:[
      {label:'RSI(14)', value:'52.3', status:'positive'},
      {label:'MACD',    value:'正向交叉', status:'positive'},
      {label:'KD值',    value:'K65 D58', status:'positive'},
      {label:'布林通道', value:'中軌上方', status:'positive'},
      {label:'成交量',   value:'均量2.3倍', status:'positive'},
      {label:'MA20/60', value:'多頭排列', status:'positive'},
    ],
    factors:[
      {label:'AI晶片需求爆發', detail:'CoWoS先進封裝訂單滿載，3nm產能利用率>95%', weight:35},
      {label:'法人買超',       detail:'外資連續5日買超，合計買超12萬張',             weight:25},
      {label:'EPS上修',        detail:'Q1 EPS預估上修至9.8元，優於市場預期',         weight:20},
      {label:'技術突破',       detail:'站穩880元，突破前高頸線，目標看930',           weight:20},
    ],
    risk:'地緣政治風險、美中科技限制升溫可能壓抑評價',
  },
  '2454': {
    symbol:'2454', name:'聯發科', price:1320, predPrice:1370, predChange:3.8, confidence:82,
    verdict:'buy',
    technicals:[
      {label:'RSI(14)', value:'48.7', status:'positive'},
      {label:'MACD',    value:'翻正', status:'positive'},
      {label:'KD值',    value:'K55 D48', status:'neutral'},
      {label:'布林通道', value:'中軌整理', status:'neutral'},
      {label:'成交量',   value:'均量1.9倍', status:'positive'},
      {label:'MA20/60', value:'即將黃金交叉', status:'positive'},
    ],
    factors:[
      {label:'5G/AI應用晶片', detail:'天璣9400出貨亮眼，衛星通訊模組打入高階市場', weight:30},
      {label:'庫存去化完成',   detail:'Q1客戶庫存回到健康水位，Q2拉貨動能強',         weight:28},
      {label:'均線交叉訊號',   detail:'MA20即將上穿MA60，技術面確認轉多',             weight:22},
      {label:'外資認同',       detail:'外資目標價上調至1500元，評等維持買進',          weight:20},
    ],
    risk:'智慧手機市場回溫幅度不如預期，競爭對手追趕壓力',
  },
};

// ── Helpers to compute technicals from real OHLCV ───────────────────────────

function smaN(closes: number[], n: number): number | null {
  if (closes.length < n) return null;
  const sl = closes.slice(-n);
  return sl.reduce((a, b) => a + b, 0) / n;
}

function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(-(period + 1)).map((c, i, arr) => i > 0 ? c - arr[i - 1] : 0).slice(1);
  const avgGain = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const avgLoss = changes.filter(c => c < 0).reduce((a, b) => a + Math.abs(b), 0) / period;
  if (avgLoss === 0) return 100;
  return Math.round(100 - 100 / (1 + avgGain / avgLoss));
}

function buildAnalysisFromOHLCV(code: string, name: string, sector: string, ohlcv: {close:number}[]): AnalysisResult {
  const closes = ohlcv.map(d => d.close);
  const last = closes[closes.length - 1];
  const rsi = computeRSI(closes);
  const ma20 = smaN(closes, 20);
  const ma60 = smaN(closes, 60);

  let bulls = 0; let total = 0;
  if (rsi !== null) { total++; if (rsi > 30 && rsi < 70) bulls++; else if (rsi <= 30) bulls += 1.2; }
  if (ma20 !== null) { total++; if (last > ma20) bulls++; }
  if (ma20 !== null && ma60 !== null) { total++; if (ma20 > ma60) bulls++; }

  const ratio = total > 0 ? bulls / total : 0.5;
  const verdict = ratio >= 0.9 ? 'strong_buy' : ratio >= 0.65 ? 'buy' : ratio >= 0.4 ? 'hold' : 'sell';
  const confidence = Math.min(85, Math.round(45 + ratio * 38));

  const recentPct = closes.length >= 5
    ? ((closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5]) * 100
    : 0;
  const predChange = +Math.min(Math.max(recentPct * 0.4, -5), 5).toFixed(1);
  const predPrice = +(last * (1 + predChange / 100)).toFixed(1);

  const tech: AnalysisResult['technicals'] = [
    { label: 'RSI(14)', value: rsi !== null ? String(rsi) : '—',
      status: rsi === null ? 'neutral' : rsi > 70 ? 'negative' : rsi < 30 ? 'positive' : 'positive' },
    { label: 'MA20', value: ma20 !== null ? ma20.toFixed(1) : '—',
      status: ma20 !== null ? (last > ma20 ? 'positive' : 'negative') : 'neutral' },
    { label: 'MA60', value: ma60 !== null ? ma60.toFixed(1) : '—',
      status: ma60 !== null ? (last > ma60 ? 'positive' : 'negative') : 'neutral' },
    { label: 'MA20/60', value: ma20 !== null && ma60 !== null ? (ma20 > ma60 ? '多頭排列' : '空頭排列') : '—',
      status: ma20 !== null && ma60 !== null ? (ma20 > ma60 ? 'positive' : 'negative') : 'neutral' },
    { label: '52週最高', value: Math.max(...closes).toLocaleString(), status: 'neutral' },
    { label: '52週最低', value: Math.min(...closes).toLocaleString(), status: 'neutral' },
  ];

  const factors: AnalysisResult['factors'] = [
    { label: '趨勢動能', detail: `近5日累積${recentPct >= 0 ? '+' : ''}${recentPct.toFixed(1)}%，動能${Math.abs(recentPct) > 3 ? '明顯' : '平穩'}`, weight: 35 },
    { label: '均線關係', detail: ma20 !== null && ma60 !== null
        ? (ma20 > ma60 ? 'MA20站上MA60，多頭排列' : 'MA20低於MA60，空頭排列')
        : '歷史資料不足，無法計算', weight: 30 },
    { label: 'RSI訊號', detail: rsi !== null
        ? (rsi > 70 ? `RSI ${rsi}，超買區，注意回檔` : rsi < 30 ? `RSI ${rsi}，超賣區，關注反彈` : `RSI ${rsi}，中性區間`)
        : '歷史資料不足，無法計算', weight: 35 },
  ];

  return {
    symbol: code, name, price: last, predPrice, predChange, confidence,
    verdict: verdict as AnalysisResult['verdict'],
    technicals: tech, factors,
    risk: '本分析僅根據技術面指標計算，不含基本面及籌碼面資訊，僅供參考，不構成投資建議。',
  };
}

const VERDICT_LABEL: Record<string, string> = {
  strong_buy:'強烈買進', buy:'買進', hold:'觀望', sell:'賣出',
};
const VERDICT_VARIANT: Record<string, 'green'|'blue'|'yellow'|'red'> = {
  strong_buy:'green', buy:'blue', hold:'yellow', sell:'red',
};

// ── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? '#3fb950' : value >= 65 ? '#d29922' : '#f0883e';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 rounded-full overflow-hidden" style={{height:6,background:'var(--color-border)',minWidth:60}}>
        <div style={{width:`${value}%`, height:'100%', background:color, borderRadius:9999, transition:'width .3s'}} />
      </div>
      <span className="num text-xs font-semibold shrink-0" style={{color,minWidth:32}}>{value}%</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key:'top', label:'上漲預測排行' },
  { key:'single', label:'個股分析' },
];

export default function TwStockPredictionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('top');
  const [query, setQuery] = useState('');
  const [analysisCode, setAnalysisCode] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const code = query.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    setAnalysisCode(code);

    // Use rich mock data for curated stocks; fetch real data for everything else
    if (STOCK_DB[code]) {
      setTimeout(() => { setLoading(false); setResult(STOCK_DB[code]); }, 600);
      return;
    }

    try {
      const res = await getSymbolData('tw', code) as any;
      const ohlcv: {close:number}[] = res?.data?.ohlcv ?? [];
      if (!ohlcv.length) { setNotFound(true); return; }
      setResult(buildAnalysisFromOHLCV(code, code, '—', ohlcv));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Columns for ranking table ──────────────────────────────────────────────
  const cols: Column<PredStock>[] = [
    { key:'rank', header:'排名', render:(r)=>(
      <span className="num font-bold text-sm" style={{color: r.rank<=3?'#d29922':'var(--color-text-2)'}}># {r.rank}</span>
    )},
    { key:'symbol', header:'代號',
      render:(r)=>(
        <button onClick={()=>navigate(`/analytics/symbol/tw/${r.symbol}`)}
                style={{background:'none',border:'none',cursor:'pointer',color:'#58a6ff',fontWeight:700,fontSize:13}}>
          {r.symbol}
        </button>
      )},
    { key:'name',      header:'名稱',   render:(r)=><span className="text-xs" style={{color:'var(--color-text-2)'}}>{r.name}</span> },
    { key:'sector',    header:'產業',   render:(r)=><Badge variant="gray">{r.sector}</Badge> },
    { key:'price',     header:'現價',   align:'right', sortable:true, render:(r)=><span className="num">{r.price.toLocaleString()}</span> },
    { key:'predChange',header:'預測漲幅', align:'right', sortable:true, render:(r)=><PnlText value={r.predChange} suffix="%" /> },
    { key:'confidence',header:'信心度', render:(r)=><ConfidenceBar value={r.confidence} /> },
    { key:'volume',    header:'量比',   align:'right', render:(r)=><span className="num" style={{color:'#d29922'}}>{r.volume}</span> },
    { key:'signals',   header:'主要訊號',
      render:(r)=>(
        <div className="flex flex-wrap gap-1">
          {r.signals.slice(0,2).map((s)=><Badge key={s} variant="blue">{s}</Badge>)}
          {r.signals.length > 2 && <Badge variant="gray">+{r.signals.length-2}</Badge>}
        </div>
      )},
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="台股預測"
        subtitle="AI 驅動 · 技術面 + 籌碼面 + 基本面綜合分析"
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded text-xs"
               style={{background:'#58a6ff11',border:'1px solid #58a6ff33',color:'#58a6ff'}}>
            <Brain size={12}/> AI 模型已更新
          </div>
        }
      />

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-3 py-2 rounded text-xs"
           style={{background:'#d2992211',border:'1px solid #d2992244',color:'#d29922'}}>
        <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
        本頁面預測僅供參考，不構成投資建議。投資有風險，請自行評估風險承受能力。
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Tab: Top Predictions ─────────────────────────────────────────── */}
      {tab === 'top' && (
        <SectionCard
          title="最有可能上漲的台股 Top 10"
          actions={
            <div className="flex items-center gap-1.5 text-xs" style={{color:'var(--color-text-2)'}}>
              <Zap size={12}/> 每日開盤前更新
            </div>
          }
        >
          <DataTable
            columns={cols}
            data={TOP_PREDICTIONS}
            rowKey={(r)=>r.symbol}
            onRowClick={(r)=>navigate(`/analytics/symbol/tw/${r.symbol}`)}
            emptyText="暫無預測資料"
          />
        </SectionCard>
      )}

      {/* ── Tab: Single Stock Analysis ───────────────────────────────────── */}
      {tab === 'single' && (
        <div className="flex flex-col gap-4">
          {/* Search bar */}
          <SectionCard title="輸入股票代號">
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{color:'var(--color-text-2)'}}/>
                <input
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  onKeyDown={(e)=>e.key==='Enter'&&handleSearch()}
                  placeholder="例：2330、2454、0050"
                  className="w-full pl-8 pr-3 py-2 rounded text-sm num"
                  style={{
                    background:'var(--color-bg)',
                    border:'1px solid var(--color-border)',
                    color:'var(--color-text)',
                    outline:'none',
                  }}
                  onFocus={(e)=>e.currentTarget.style.borderColor='#58a6ff'}
                  onBlur={(e)=>e.currentTarget.style.borderColor='var(--color-border)'}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold"
                style={{background:'#58a6ff',color:'#fff',border:'none',cursor:loading?'wait':'pointer',opacity:loading?.7:1}}>
                {loading ? '分析中...' : <><TrendingUp size={13}/> 分析</>}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {['2330','2454','2382','2317','0050'].map((code)=>(
                <button key={code} onClick={()=>{setQuery(code);}}
                        className="px-2.5 py-1 rounded text-xs"
                        style={{background:'var(--color-bg)',border:'1px solid var(--color-border)',
                                color:'#58a6ff',cursor:'pointer'}}>
                  {code}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* Loading */}
          {loading && (
            <SectionCard title="">
              <div className="flex items-center justify-center gap-2 py-8" style={{color:'var(--color-text-2)'}}>
                <Brain size={18} className="animate-pulse" style={{color:'#58a6ff'}}/>
                <span className="text-sm">AI 分析中，請稍候…</span>
              </div>
            </SectionCard>
          )}

          {/* Not found */}
          {notFound && !loading && (
            <SectionCard title="">
              <div className="flex items-center justify-center gap-2 py-8" style={{color:'var(--color-text-2)'}}>
                <AlertTriangle size={16} style={{color:'#d29922'}}/>
                <span className="text-sm">找不到代號「{analysisCode}」，請確認代號是否為台股上市代號</span>
              </div>
            </SectionCard>
          )}

          {/* Result */}
          {result && !loading && (
            <>
              {/* Header card */}
              <SectionCard title={`${result.symbol} ${result.name}`}
                actions={
                  <div className="flex items-center gap-2">
                    <Badge variant={VERDICT_VARIANT[result.verdict]}>{VERDICT_LABEL[result.verdict]}</Badge>
                    <button onClick={()=>navigate(`/analytics/symbol/tw/${result.symbol}`)}
                            className="text-xs px-2.5 py-1 rounded"
                            style={{background:'transparent',border:'1px solid var(--color-border)',
                                    color:'#58a6ff',cursor:'pointer'}}>
                      詳細圖表 →
                    </button>
                  </div>
                }>
                <div className="grid gap-4" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
                  {[
                    {label:'現價',       value:`${result.price.toLocaleString()} 元`, color:'var(--color-text)'},
                    {label:'預測目標價', value:`${result.predPrice.toLocaleString()} 元`, color:'#3fb950'},
                    {label:'預測漲幅',   value:`+${result.predChange}%`,                  color:'#3fb950'},
                    {label:'AI 信心度',  value:`${result.confidence}%`,                   color: result.confidence>=80?'#3fb950':result.confidence>=65?'#d29922':'#f0883e'},
                  ].map(({label,value,color})=>(
                    <div key={label} className="flex flex-col gap-1 p-3 rounded"
                         style={{background:'var(--color-bg)',border:'1px solid var(--color-border)'}}>
                      <span className="text-xs" style={{color:'var(--color-text-2)'}}>{label}</span>
                      <span className="num font-bold text-base" style={{color}}>{value}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <div className="grid gap-4" style={{gridTemplateColumns:'1fr 1fr'}}>
                {/* Technical signals */}
                <SectionCard title="技術面指標">
                  <div className="flex flex-col gap-2">
                    {result.technicals.map((t)=>(
                      <div key={t.label} className="flex items-center justify-between text-sm">
                        <span style={{color:'var(--color-text-2)'}}>{t.label}</span>
                        <span className="num font-medium" style={{
                          color: t.status==='positive'?'#3fb950':t.status==='negative'?'#f85149':'var(--color-text)',
                        }}>
                          {t.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Contributing factors */}
                <SectionCard title="上漲因素分析">
                  <div className="flex flex-col gap-3">
                    {result.factors.map((f)=>(
                      <div key={f.label} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{color:'var(--color-text)'}}>{f.label}</span>
                          <span className="num text-xs" style={{color:'#58a6ff'}}>{f.weight}%</span>
                        </div>
                        <div className="w-full rounded-full overflow-hidden" style={{height:4,background:'var(--color-border)'}}>
                          <div style={{width:`${f.weight}%`,height:'100%',background:'#58a6ff',borderRadius:9999}} />
                        </div>
                        <span className="text-xs" style={{color:'var(--color-text-2)'}}>{f.detail}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* Risk note */}
              <div className="flex items-start gap-2 px-3 py-2 rounded text-xs"
                   style={{background:'#f8514911',border:'1px solid #f8514944',color:'#f85149'}}>
                <AlertTriangle size={13} className="shrink-0 mt-0.5"/>
                <span><strong>主要風險：</strong>{result.risk}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
