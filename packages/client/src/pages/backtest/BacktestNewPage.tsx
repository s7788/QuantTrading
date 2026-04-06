import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader, SectionCard, TabBar } from '@/components/common';
import { useAppStore } from '@/stores/appStore';

const STRATEGIES = [
  { id:'s1', name:'TW動量策略' }, { id:'s2', name:'US Momentum' },
  { id:'s3', name:'均值回歸' }, { id:'s4', name:'配對交易 v2' },
];

const TEMPLATES = [
  { id:'ma-crossover',   name:'移動平均線交叉', desc:'快慢均線黃金/死亡交叉' },
  { id:'rsi-reversal',   name:'RSI 超買超賣',  desc:'RSI 均值回歸' },
  { id:'bollinger',      name:'布林通道突破',   desc:'波動率突破' },
  { id:'momentum',       name:'動量策略',       desc:'趨勢動量追蹤' },
  { id:'blank',          name:'空白模板',       desc:'從頭開始' },
];

const FREQS = ['日線','週線','月線','1小時','15分鐘','5分鐘'];
const BENCHMARKS_TW = ['加權指數(TWII)','台灣50(0050)','不使用基準'];
const BENCHMARKS_US = ['S&P 500(SPY)','NASDAQ(QQQ)','DJI','不使用基準'];

const DEFAULT_CODE_TW = `// TW 移動平均線交叉策略
const strategy = {
  name: 'MA Cross TW',
  params: {
    fastPeriod: { default: 20, min: 5,  max: 60  },
    slowPeriod: { default: 60, min: 20, max: 200 },
  },

  init(ctx) {
    this.fast = ctx.indicator('SMA', this.params.fastPeriod);
    this.slow = ctx.indicator('SMA', this.params.slowPeriod);
  },

  onBar(bar, ctx) {
    const fast = this.fast.value;
    const slow = this.slow.value;
    if (fast > slow && !ctx.position) {
      ctx.buy({ sizePercent: 0.1 });
    } else if (fast < slow && ctx.position > 0) {
      ctx.sell({ size: ctx.position });
    }
  },
};`;

export default function BacktestNewPage() {
  const navigate = useNavigate();
  const { market } = useAppStore();
  const [tab, setTab] = useState<'strategy'|'template'>('strategy');
  const [selectedStrategy, setSelectedStrategy] = useState('s1');
  const [selectedTemplate, setSelectedTemplate] = useState('ma-crossover');
  const [code, setCode] = useState(DEFAULT_CODE_TW);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [running, setRunning] = useState(false);

  const [form, setForm] = useState({
    startDate: '2024-01-01',
    endDate:   '2025-12-31',
    capital:   market === 'tw' ? '1000000' : '100000',
    feeRate:   market === 'tw' ? '0.1425' : '0',
    slippage:  '0',
    symbols:   market === 'tw' ? '2330, 2454' : 'AAPL, NVDA',
    freq:      '日線',
    benchmark: market === 'tw' ? '加權指數(TWII)' : 'S&P 500(SPY)',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => { setRunning(false); navigate('/backtest/result/demo'); }, 1800);
  };

  const inputCls = {
    background:'var(--color-bg)', border:'1px solid var(--color-border)',
    borderRadius:6, padding:'6px 10px', color:'var(--color-text)',
    fontSize:13, width:'100%', outline:'none',
  } as React.CSSProperties;

  const BENCHMARKS = market === 'tw' ? BENCHMARKS_TW : BENCHMARKS_US;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="新增回測"
        subtitle={`${market === 'tw' ? '台股' : '美股'} · 設定策略與回測參數`}
        actions={
          <button onClick={handleRun} disabled={running}
                  className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold"
                  style={{ background: running ? '#58a6ff88' : '#58a6ff', color:'#fff', border:'none', cursor: running?'wait':'pointer' }}>
            <Play size={14} /> {running ? '回測中...' : '開始回測'}
          </button>
        } />

      <div className="flex gap-4">
        {/* Left: params */}
        <SectionCard title="參數設定" style={{ width:280, flexShrink:0 }}>
          <div className="flex flex-col gap-3">
            {[
              ['回測開始', 'startDate', 'date'],
              ['回測結束', 'endDate',   'date'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} style={inputCls} />
              </div>
            ))}
            <div>
              <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>初始資金 ({market==='tw'?'NT$':'$'})</label>
              <input type="number" value={form.capital} onChange={set('capital')} style={inputCls} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>標的（逗號分隔）</label>
              <input value={form.symbols} onChange={set('symbols')} placeholder="2330, 2454..." style={inputCls} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>K線頻率</label>
              <select value={form.freq} onChange={set('freq')} style={inputCls}>
                {FREQS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>基準指數</label>
              <select value={form.benchmark} onChange={set('benchmark')} style={inputCls}>
                {BENCHMARKS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* Advanced */}
            <button onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs"
                    style={{ color:'#58a6ff', background:'none', border:'none', cursor:'pointer', padding:0 }}>
              {showAdvanced ? <ChevronDown size={13}/> : <ChevronRight size={13}/>} 進階參數
            </button>
            {showAdvanced && (
              <>
                <div>
                  <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>手續費率 (%)</label>
                  <input type="number" step="0.001" value={form.feeRate} onChange={set('feeRate')} style={inputCls} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>滑價 (點數)</label>
                  <input type="number" value={form.slippage} onChange={set('slippage')} style={inputCls} />
                </div>
              </>
            )}
          </div>
        </SectionCard>

        {/* Right: code editor */}
        <SectionCard style={{ flex:1 }}>
          <TabBar
            tabs={[{key:'strategy',label:'選擇策略'},{key:'template',label:'使用模板'}]}
            active={tab} onChange={(k) => setTab(k as typeof tab)} />

          {tab === 'strategy' && (
            <div className="flex flex-col gap-2 mb-3">
              {STRATEGIES.map((s) => (
                <button key={s.id} onClick={() => setSelectedStrategy(s.id)}
                        className="flex items-center px-3 py-2 rounded-md text-sm text-left w-full transition-colors"
                        style={{
                          background: selectedStrategy===s.id ? '#58a6ff22' : 'transparent',
                          border: `1px solid ${selectedStrategy===s.id ? '#58a6ff' : 'var(--color-border)'}`,
                          color: selectedStrategy===s.id ? '#58a6ff' : 'var(--color-text)',
                          cursor:'pointer',
                        }}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {tab === 'template' && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                        className="flex flex-col gap-0.5 p-3 rounded-md text-left transition-colors"
                        style={{
                          background: selectedTemplate===t.id ? '#58a6ff22' : 'var(--color-bg)',
                          border: `1px solid ${selectedTemplate===t.id ? '#58a6ff' : 'var(--color-border)'}`,
                          cursor:'pointer',
                        }}>
                  <span className="text-xs font-medium" style={{ color:'var(--color-text)' }}>{t.name}</span>
                  <span className="text-xs" style={{ color:'var(--color-text-2)' }}>{t.desc}</span>
                </button>
              ))}
            </div>
          )}

          <label className="text-xs mb-1 block" style={{ color:'var(--color-text-2)' }}>策略程式碼</label>
          <textarea
            value={code} onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            style={{
              width:'100%', minHeight:400, resize:'vertical',
              background:'var(--color-bg)', border:'1px solid var(--color-border)',
              borderRadius:6, padding:'12px 14px',
              color:'var(--color-text)', fontSize:13,
              fontFamily:"'JetBrains Mono', monospace", lineHeight:1.7,
              outline:'none',
            }} />
        </SectionCard>
      </div>
    </div>
  );
}
