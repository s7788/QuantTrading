import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Plus, Settings, Trash2, GripVertical, TrendingUp, TrendingDown, BarChart2, Activity, DollarSign, List } from 'lucide-react';
import { PageHeader, SectionCard, PnlText, Badge } from '@/components/common';
import { useAppStore } from '@/stores/appStore';

// ── Widget definitions ────────────────────────────────────────
type WidgetType = 'equity' | 'pnl_bar' | 'positions' | 'watchlist' | 'stat' | 'alerts';

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  span: 1 | 2;
}

// ── Mock data ────────────────────────────────────────────────
const equityData = Array.from({ length: 30 }, (_, i) => ({
  d: `${i+1}`,
  v: Math.round(1_000_000 + i * 4800 + Math.sin(i*0.4)*25000),
}));

const pnlData = [
  {d:'1月',v:23000},{d:'2月',v:-8000},{d:'3月',v:41000},{d:'4月',v:12000},
  {d:'5月',v:-5000},{d:'6月',v:38000},
];

const watchlist = [
  { symbol:'2330', name:'台積電', price:878,  chg:3.8  },
  { symbol:'2454', name:'聯發科', price:1320, chg:3.2  },
  { symbol:'AMD',  name:'AMD',    price:165,  chg:5.3  },
  { symbol:'NVDA', name:'NVIDIA', price:875,  chg:-0.8 },
  { symbol:'2317', name:'鴻海',   price:112,  chg:-2.1 },
];

const alerts = [
  { id:1, msg:'TW動量策略：黃金交叉觸發 2330', level:'info',  time:'13:12' },
  { id:2, msg:'均值回歸策略：RSI超賣訊號 2382', level:'warn',  time:'11:45' },
  { id:3, msg:'資料同步完成：台股收盤資料',      level:'info',  time:'15:32' },
];

// ── Available widget types catalog ────────────────────────────
const WIDGET_CATALOG: { type: WidgetType; title: string; desc: string; icon: React.ElementType }[] = [
  { type:'equity',    title:'資產曲線',   desc:'30 日權益走勢',     icon:TrendingUp  },
  { type:'pnl_bar',   title:'月損益柱圖', desc:'近 6 個月損益',     icon:BarChart2   },
  { type:'positions', title:'持倉摘要',   desc:'當前持倉一覽',      icon:DollarSign  },
  { type:'watchlist', title:'自選清單',   desc:'追蹤標的即時報價',  icon:List        },
  { type:'stat',      title:'關鍵指標',   desc:'綜合績效數字',      icon:Activity    },
  { type:'alerts',    title:'最新通知',   desc:'策略與系統事件',    icon:Activity    },
];

const DEFAULT_WIDGETS: Widget[] = [
  { id:'w1', type:'equity',    title:'資產曲線', span:2 },
  { id:'w2', type:'stat',      title:'關鍵指標', span:1 },
  { id:'w3', type:'watchlist', title:'自選清單', span:1 },
  { id:'w4', type:'pnl_bar',   title:'月損益',  span:1 },
  { id:'w5', type:'alerts',    title:'最新通知', span:1 },
];

// ── Individual widget renderers ───────────────────────────────
function EquityWidget() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={equityData} margin={{ top:4, right:4, bottom:0, left:0 }}>
        <defs>
          <linearGradient id="bEq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="d" stroke="var(--color-text-2)" tick={{ fontSize:10 }} interval={6} />
        <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={48}
               tickFormatter={(v) => `${(v/10000).toFixed(0)}萬`} />
        <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
                 formatter={(v:number) => [`NT$${v.toLocaleString()}`, '資產']} />
        <Area type="monotone" dataKey="v" stroke="#58a6ff" fill="url(#bEq)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PnlBarWidget() {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={pnlData} margin={{ top:4, right:4, bottom:0, left:0 }}>
        <XAxis dataKey="d" stroke="var(--color-text-2)" tick={{ fontSize:10 }} />
        <YAxis stroke="var(--color-text-2)" tick={{ fontSize:10 }} width={42}
               tickFormatter={(v) => `${v/1000}K`} />
        <Tooltip contentStyle={{ background:'var(--color-card)', border:'1px solid var(--color-border)', borderRadius:6, fontSize:12 }}
                 formatter={(v:number) => [`NT$${v.toLocaleString()}`, '損益']} />
        <Bar dataKey="v" radius={[3,3,0,0]}>
          {pnlData.map((d, i) => <Cell key={i} fill={d.v>=0?'#3fb950':'#f85149'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatWidget({ market }: { market: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label:'今日損益',   value:'+NT$8,230', up:true  },
        { label:'總報酬率',   value:'+12.3%',    up:true  },
        { label:'運行策略',   value:'2 個',      up:null  },
        { label:'Sharpe',    value:'1.45',      up:null  },
        { label:'最大回撤',   value:'-12.3%',   up:false },
        { label:'勝率',      value:'65.2%',     up:true  },
      ].map((s) => (
        <div key={s.label} className="p-2 rounded" style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
          <div className="text-xs" style={{ color:'var(--color-text-2)' }}>{s.label}</div>
          <div className={`text-sm font-semibold num ${s.up===true?'text-up':s.up===false?'text-down':''}`}
               style={{ color: s.up===null ? 'var(--color-text)' : undefined }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchlistWidget({ market }: { market: string }) {
  return (
    <div className="flex flex-col gap-1">
      {watchlist.filter((_, i) => i < 5).map((w) => (
        <div key={w.symbol} className="flex items-center px-2 py-1.5 rounded"
             style={{ background:'var(--color-bg)' }}>
          <div className="flex-1">
            <span className="text-xs font-semibold" style={{ color:'#58a6ff' }}>{w.symbol}</span>
            <span className="text-xs ml-1.5" style={{ color:'var(--color-text-2)' }}>{w.name}</span>
          </div>
          <span className="text-sm font-semibold num mr-2" style={{ color:'var(--color-text)' }}>
            {w.price.toLocaleString()}
          </span>
          <PnlText value={w.chg} suffix="%" className="text-xs" />
        </div>
      ))}
    </div>
  );
}

function AlertsWidget() {
  const LEVEL_COLOR: Record<string,string> = { info:'var(--color-text-2)', warn:'#d29922', error:'#f85149' };
  return (
    <div className="flex flex-col gap-1.5">
      {alerts.map((a) => (
        <div key={a.id} className="flex gap-2 px-2 py-2 rounded text-xs"
             style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
          <span className="num shrink-0" style={{ color:'var(--color-text-2)' }}>{a.time}</span>
          <span style={{ color: LEVEL_COLOR[a.level] }}>{a.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { market } = useAppStore();
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [showCatalog, setShowCatalog] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const addWidget = (type: WidgetType) => {
    const catalog = WIDGET_CATALOG.find((c) => c.type === type)!;
    setWidgets((prev) => [
      ...prev,
      { id: `w${Date.now()}`, type, title: catalog.title, span: 1 },
    ]);
    setShowCatalog(false);
  };

  const removeWidget = (wid: string) =>
    setWidgets((prev) => prev.filter((w) => w.id !== wid));

  const renderWidget = (w: Widget) => {
    switch (w.type) {
      case 'equity':    return <EquityWidget />;
      case 'pnl_bar':   return <PnlBarWidget />;
      case 'stat':      return <StatWidget market={market} />;
      case 'watchlist': return <WatchlistWidget market={market} />;
      case 'alerts':    return <AlertsWidget />;
      default: return <p className="text-xs" style={{ color:'var(--color-text-2)' }}>未知 Widget</p>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`看板 #${id ?? '1'}`}
        subtitle="自訂資訊看板 — 拖曳重排 Widget"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setEditMode(!editMode)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{
                      background: editMode ? '#58a6ff' : 'transparent',
                      color: editMode ? '#fff' : 'var(--color-text-2)',
                      border: `1px solid ${editMode ? '#58a6ff' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                    }}>
              <Settings size={12} /> {editMode ? '完成編輯' : '編輯'}
            </button>
            <button onClick={() => setShowCatalog(!showCatalog)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-semibold"
                    style={{ background:'#58a6ff', color:'#fff', border:'none', cursor:'pointer' }}>
              <Plus size={12} /> 新增 Widget
            </button>
          </div>
        }
      />

      {/* Widget catalog */}
      {showCatalog && (
        <SectionCard title="選擇 Widget">
          <div className="grid gap-2" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
            {WIDGET_CATALOG.map((cat) => {
              const Icon = cat.icon;
              return (
                <button key={cat.type} onClick={() => addWidget(cat.type)}
                        className="flex items-start gap-3 p-3 rounded text-left"
                        style={{
                          background:'var(--color-bg)', border:'1px solid var(--color-border)',
                          cursor:'pointer',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#58a6ff'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}>
                  <Icon size={16} style={{ color:'#58a6ff', marginTop:1, flexShrink:0 }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color:'var(--color-text)' }}>{cat.title}</div>
                    <div className="text-xs" style={{ color:'var(--color-text-2)' }}>{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Widget grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns:'repeat(2, 1fr)' }}>
        {widgets.map((w) => (
          <div key={w.id}
               style={{ gridColumn: w.span === 2 ? 'span 2' : 'span 1' }}>
            <SectionCard
              title={
                <div className="flex items-center gap-2">
                  {editMode && (
                    <GripVertical size={13} style={{ color:'var(--color-text-2)', cursor:'grab' }} />
                  )}
                  {w.title}
                </div>
              }
              actions={
                editMode ? (
                  <div className="flex gap-1">
                    <button onClick={() => setWidgets((prev) => prev.map((x) =>
                      x.id === w.id ? { ...x, span: x.span === 2 ? 1 : 2 } : x))}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ border:'1px solid var(--color-border)', color:'var(--color-text-2)', background:'transparent', cursor:'pointer' }}>
                      {w.span === 2 ? '縮小' : '展開'}
                    </button>
                    <button onClick={() => removeWidget(w.id)}
                            style={{ background:'none', border:'none', color:'#f85149', cursor:'pointer', padding:4 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : null
              }>
              {renderWidget(w)}
            </SectionCard>
          </div>
        ))}
      </div>

      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16"
             style={{ border:'2px dashed var(--color-border)', borderRadius:8 }}>
          <Plus size={32} style={{ color:'var(--color-text-2)', marginBottom:8 }} />
          <p className="text-sm" style={{ color:'var(--color-text-2)' }}>看板是空的 — 點「新增 Widget」開始</p>
        </div>
      )}
    </div>
  );
}
