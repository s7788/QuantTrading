import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Play, ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, History, Copy } from 'lucide-react';
import { PageHeader, SectionCard, Badge, TabBar } from '@/components/common';
import { useAppStore } from '@/stores/appStore';

interface Param {
  key: string; label: string; type: 'number' | 'boolean' | 'select';
  default: string; min?: string; max?: string; options?: string;
  desc: string;
}

const DEFAULT_PARAMS: Param[] = [
  { key:'fastPeriod', label:'快線週期', type:'number', default:'20', min:'5',  max:'60',  desc:'快速移動平均線週期' },
  { key:'slowPeriod', label:'慢線週期', type:'number', default:'60', min:'20', max:'200', desc:'慢速移動平均線週期' },
  { key:'sizePercent', label:'倉位比例%', type:'number', default:'10', min:'1', max:'100', desc:'每次進場佔資金百分比' },
];

const TW_CODE = `// TW 移動平均線交叉策略
const strategy = {
  name: 'MA Cross TW',
  params: {
    fastPeriod: { default: 20, min: 5,  max: 60  },
    slowPeriod: { default: 60, min: 20, max: 200 },
    sizePercent:{ default: 10, min: 1,  max: 100 },
  },

  init(ctx) {
    this.fast = ctx.indicator('SMA', this.params.fastPeriod);
    this.slow = ctx.indicator('SMA', this.params.slowPeriod);
  },

  onBar(bar, ctx) {
    const fast = this.fast.value;
    const slow = this.slow.value;
    if (fast === null || slow === null) return;

    if (fast > slow && !ctx.position) {
      // 黃金交叉 — 買入
      ctx.buy({ sizePercent: this.params.sizePercent });
    } else if (fast < slow && ctx.position > 0) {
      // 死亡交叉 — 賣出全部
      ctx.sell({ size: ctx.position });
    }
  },

  onEnd(ctx) {
    // 強制平倉
    if (ctx.position > 0) ctx.sell({ size: ctx.position });
  },
};`;

const VERSIONS = [
  { v: 3, date: '2024-03-15', note: '調整倉位比例上限至 100%' },
  { v: 2, date: '2024-02-10', note: '新增 onEnd 強制平倉' },
  { v: 1, date: '2024-01-05', note: '初始版本' },
];

const TABS = [
  { key:'code',    label:'程式碼' },
  { key:'params',  label:'參數定義' },
  { key:'version', label:'版本紀錄' },
];

const inputSt = {
  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '5px 8px', color: 'var(--color-text)',
  fontSize: 12, outline: 'none', width: '100%',
} as React.CSSProperties;

export default function StrategyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { market } = useAppStore();
  const isNew = id === 'new';

  const [tab, setTab] = useState('code');
  const [code, setCode] = useState(TW_CODE);
  const [params, setParams] = useState<Param[]>(DEFAULT_PARAMS);
  const [showParamAdd, setShowParamAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAdvMeta, setShowAdvMeta] = useState(false);

  const [meta, setMeta] = useState({
    name: isNew ? '' : 'TW動量策略',
    desc: isNew ? '' : '台股趨勢動量追蹤',
    type: 'momentum',
    symbols: market === 'tw' ? '2330, 2454, 2317' : 'AAPL, NVDA',
  });

  const setM = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setMeta((m) => ({ ...m, [k]: e.target.value }));

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 800);
  };

  const updateParam = (idx: number, field: keyof Param, val: string) =>
    setParams((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p));

  const removeParam = (idx: number) => setParams((prev) => prev.filter((_, i) => i !== idx));

  const addParam = () => {
    setParams((prev) => [...prev, {
      key: `param${Date.now()}`, label: '新參數', type: 'number',
      default: '10', min: '1', max: '100', desc: '',
    }]);
    setShowParamAdd(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/strategy')}
                className="flex items-center gap-1.5 text-sm"
                style={{ color: 'var(--color-text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={15} /> 返回
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            {isNew ? '新增策略' : meta.name}
          </h1>
          <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
            {isNew ? '從頭建立新策略' : `v${VERSIONS[0].v} · 最後修改 ${VERSIONS[0].date}`}
          </p>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Badge variant="green">運行中</Badge>
          )}
          <button onClick={() => navigate('/backtest/new')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                  style={{ color: '#3fb950', border: '1px solid #3fb95044', background: 'transparent', cursor: 'pointer' }}>
            <Play size={12} /> 回測
          </button>
          <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded font-semibold"
                  style={{ background: saved ? '#3fb950' : '#58a6ff', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Save size={12} /> {saving ? '儲存中...' : saved ? '已儲存 ✓' : '儲存'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Left: metadata */}
        <SectionCard title="策略資訊" style={{ width: 260, flexShrink: 0 }}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>策略名稱 *</label>
              <input value={meta.name} onChange={setM('name')}
                     placeholder="例：TW動量策略" style={inputSt} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>描述</label>
              <input value={meta.desc} onChange={setM('desc')}
                     placeholder="簡短描述策略邏輯" style={inputSt} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>策略類型</label>
              <select value={meta.type} onChange={setM('type')} style={inputSt}>
                {[['momentum','動量'],['mean-reversion','均值回歸'],['breakout','突破'],
                  ['arbitrage','套利'],['trend','趨勢'],['custom','自訂']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>標的（逗號分隔）</label>
              <input value={meta.symbols} onChange={setM('symbols')}
                     placeholder={market === 'tw' ? '2330, 2454...' : 'AAPL, NVDA...'} style={inputSt} />
            </div>

            <button onClick={() => setShowAdvMeta(!showAdvMeta)}
                    className="flex items-center gap-1 text-xs"
                    style={{ color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showAdvMeta ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} 進階設定
            </button>
            {showAdvMeta && (
              <div className="flex flex-col gap-2 p-3 rounded"
                   style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                {[
                  ['最大持倉數', '5'],
                  ['停損 %', '5'],
                  ['停利 %', '15'],
                ].map(([label, placeholder]) => (
                  <div key={label}>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>{label}</label>
                    <input type="number" placeholder={placeholder} style={inputSt} />
                  </div>
                ))}
              </div>
            )}

            {!isNew && (
              <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="text-xs mb-2" style={{ color: 'var(--color-text-2)' }}>快速操作</div>
                <div className="flex flex-col gap-1.5">
                  <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded w-full"
                          style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                                   color: 'var(--color-text-2)', cursor: 'pointer', justifyContent:'flex-start' }}>
                    <Copy size={11} /> 複製策略
                  </button>
                  <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded w-full"
                          style={{ background: 'var(--color-bg)', border: '1px solid #f8514944',
                                   color: '#f85149', cursor: 'pointer', justifyContent:'flex-start' }}>
                    <Trash2 size={11} /> 刪除策略
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Right: code / params / versions */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <TabBar tabs={TABS} active={tab} onChange={setTab} />

          {tab === 'code' && (
            <SectionCard>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>策略程式碼 (JavaScript)</span>
                <span className="text-xs" style={{ color: 'var(--color-text-2)' }}>{code.split('\n').length} 行</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  width: '100%', minHeight: 460, resize: 'vertical',
                  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
                  borderRadius: 6, padding: '12px 14px',
                  color: 'var(--color-text)', fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.7,
                  outline: 'none',
                }} />
              <div className="mt-2 p-3 rounded text-xs" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="font-medium mb-1" style={{ color: '#58a6ff' }}>可用 API</div>
                <div style={{ color: 'var(--color-text-2)', lineHeight: 1.8 }}>
                  <code style={{ color: '#d29922' }}>ctx.indicator(type, period)</code> — 建立技術指標&emsp;
                  <code style={{ color: '#d29922' }}>ctx.buy({'{ sizePercent }'})</code> — 買入&emsp;
                  <code style={{ color: '#d29922' }}>ctx.sell({'{ size }'})</code> — 賣出&emsp;
                  <code style={{ color: '#d29922' }}>ctx.position</code> — 當前持倉數量
                </div>
              </div>
            </SectionCard>
          )}

          {tab === 'params' && (
            <SectionCard title="參數定義"
              actions={
                <button onClick={addParam}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                        style={{ background: '#58a6ff22', color: '#58a6ff', border: '1px solid #58a6ff44', cursor: 'pointer' }}>
                  <Plus size={12} /> 新增參數
                </button>
              }>
              <div className="flex flex-col gap-2">
                {/* Header row */}
                <div className="grid text-xs font-medium" style={{ gridTemplateColumns: '1fr 1fr 80px 70px 70px 2fr 32px', gap: 8, color: 'var(--color-text-2)', paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
                  <span>Key</span><span>顯示名稱</span><span>預設值</span><span>最小</span><span>最大</span><span>說明</span><span></span>
                </div>
                {params.map((p, idx) => (
                  <div key={idx} className="grid items-center" style={{ gridTemplateColumns: '1fr 1fr 80px 70px 70px 2fr 32px', gap: 8 }}>
                    <input value={p.key} onChange={(e) => updateParam(idx, 'key', e.target.value)}
                           style={inputSt} placeholder="key" />
                    <input value={p.label} onChange={(e) => updateParam(idx, 'label', e.target.value)}
                           style={inputSt} placeholder="顯示名稱" />
                    <input value={p.default} onChange={(e) => updateParam(idx, 'default', e.target.value)}
                           style={inputSt} type="number" />
                    <input value={p.min ?? ''} onChange={(e) => updateParam(idx, 'min', e.target.value)}
                           style={inputSt} type="number" placeholder="-" />
                    <input value={p.max ?? ''} onChange={(e) => updateParam(idx, 'max', e.target.value)}
                           style={inputSt} type="number" placeholder="-" />
                    <input value={p.desc} onChange={(e) => updateParam(idx, 'desc', e.target.value)}
                           style={inputSt} placeholder="說明文字" />
                    <button onClick={() => removeParam(idx)}
                            style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {params.length === 0 && (
                  <p className="text-xs py-6 text-center" style={{ color: 'var(--color-text-2)' }}>
                    尚無參數 — 點「新增參數」開始定義
                  </p>
                )}
              </div>
              <div className="mt-3 text-xs" style={{ color: 'var(--color-text-2)' }}>
                在程式碼中使用 <code style={{ color: '#d29922' }}>this.params.key</code> 存取參數值
              </div>
            </SectionCard>
          )}

          {tab === 'version' && (
            <SectionCard title="版本紀錄"
              actions={
                <Badge variant="blue">v{VERSIONS[0].v} (目前)</Badge>
              }>
              <div className="flex flex-col gap-2">
                {VERSIONS.map((v, i) => (
                  <div key={v.v} className="flex items-center gap-4 px-4 py-3 rounded"
                       style={{
                         background: i === 0 ? '#58a6ff11' : 'var(--color-bg)',
                         border: `1px solid ${i === 0 ? '#58a6ff44' : 'var(--color-border)'}`,
                       }}>
                    <History size={14} style={{ color: i === 0 ? '#58a6ff' : 'var(--color-text-2)', flexShrink: 0 }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: i === 0 ? '#58a6ff' : 'var(--color-text)' }}>
                          v{v.v}
                        </span>
                        {i === 0 && <Badge variant="blue">目前版本</Badge>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>{v.note}</p>
                    </div>
                    <span className="text-xs num" style={{ color: 'var(--color-text-2)' }}>{v.date}</span>
                    {i > 0 && (
                      <button className="text-xs px-2 py-1 rounded"
                              style={{ background: 'transparent', border: '1px solid var(--color-border)',
                                       color: 'var(--color-text-2)', cursor: 'pointer' }}>
                        還原
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-2)' }}>
                每次儲存自動建立新版本，最多保留 20 個版本
              </p>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
