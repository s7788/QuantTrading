import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, GitCompare, Trash2, RefreshCw, Download } from 'lucide-react';
import { PageHeader, SectionCard, DataTable, PnlText, Badge } from '@/components/common';
import type { Column } from '@/components/common/DataTable';

interface BacktestRow {
  id: string;
  strategy: string;
  market: 'tw' | 'us';
  dateRange: string;
  capital: string;
  freq: string;
  status: 'done' | 'running' | 'failed';
  totalReturn: number;
  sharpe: number;
  maxDD: number;
  trades: number;
  createdAt: string;
  duration: string;
}

const MOCK: BacktestRow[] = [
  {
    id:'bt1', strategy:'TW動量策略', market:'tw', dateRange:'2024-01 ~ 2025-12',
    capital:'NT$1,000,000', freq:'日線', status:'done',
    totalReturn:28.5, sharpe:1.45, maxDD:-12.3, trades:196, createdAt:'2025-03-15 14:32', duration:'3.2秒',
  },
  {
    id:'bt2', strategy:'均值回歸', market:'tw', dateRange:'2023-01 ~ 2024-12',
    capital:'NT$500,000', freq:'日線', status:'done',
    totalReturn:-4.2, sharpe:0.31, maxDD:-21.7, trades:84, createdAt:'2025-03-12 09:15', duration:'2.1秒',
  },
  {
    id:'bt3', strategy:'US Momentum', market:'us', dateRange:'2024-01 ~ 2025-12',
    capital:'$100,000', freq:'日線', status:'done',
    totalReturn:41.8, sharpe:1.82, maxDD:-8.9, trades:143, createdAt:'2025-03-10 17:45', duration:'4.8秒',
  },
  {
    id:'bt4', strategy:'Bollinger US', market:'us', dateRange:'2024-06 ~ 2025-06',
    capital:'$50,000', freq:'1小時', status:'done',
    totalReturn:12.3, sharpe:0.95, maxDD:-15.4, trades:421, createdAt:'2025-03-08 11:20', duration:'12.3秒',
  },
  {
    id:'bt5', strategy:'配對交易 v2', market:'tw', dateRange:'2025-01 ~ 2025-03',
    capital:'NT$2,000,000', freq:'日線', status:'running',
    totalReturn:0, sharpe:0, maxDD:0, trades:0, createdAt:'2025-03-15 15:01', duration:'—',
  },
  {
    id:'bt6', strategy:'TW動量策略 (參數優化)', market:'tw', dateRange:'2022-01 ~ 2024-12',
    capital:'NT$1,000,000', freq:'週線', status:'failed',
    totalReturn:0, sharpe:0, maxDD:0, trades:0, createdAt:'2025-03-05 10:30', duration:'—',
  },
];

const STATUS_CONF = {
  done:    { label:'完成',   variant:'green'  as const },
  running: { label:'執行中', variant:'blue'   as const },
  failed:  { label:'失敗',   variant:'red'    as const },
};

export default function BacktestHistoryPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all'|'done'|'running'|'failed'>('all');

  const filtered = MOCK.filter((r) => filter === 'all' || r.status === filter);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cols: Column<BacktestRow>[] = [
    {
      key: 'id', header: '',
      render: (r) => (
        <input type="checkbox" checked={selected.has(r.id)}
               onChange={() => toggleSelect(r.id)}
               style={{ cursor:'pointer', accentColor:'#58a6ff' }} />
      ),
    },
    {
      key: 'strategy', header: '策略',
      render: (r) => (
        <div>
          <span className="font-semibold text-sm" style={{ color:'var(--color-text)' }}>{r.strategy}</span>
          <div className="flex gap-1.5 mt-0.5">
            <Badge variant={r.market==='tw'?'blue':'yellow'}>{r.market==='tw'?'台股':'美股'}</Badge>
            <span className="text-xs" style={{ color:'var(--color-text-2)' }}>{r.freq}</span>
          </div>
        </div>
      ),
    },
    { key:'dateRange', header:'回測期間', render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.dateRange}</span> },
    { key:'capital',   header:'初始資金', render:(r)=><span className="num text-xs">{r.capital}</span> },
    {
      key:'totalReturn', header:'總報酬', align:'right', sortable:true,
      render:(r)=> r.status==='done' ? <PnlText value={r.totalReturn} suffix="%" className="font-semibold" /> : <span className="text-xs" style={{color:'var(--color-text-2)'}}>—</span>,
    },
    {
      key:'sharpe', header:'Sharpe', align:'right', sortable:true,
      render:(r)=> r.status==='done'
        ? <span className="num font-medium" style={{color:r.sharpe>=1?'#3fb950':r.sharpe>=0.5?'#d29922':'#f85149'}}>{r.sharpe.toFixed(2)}</span>
        : <span className="text-xs" style={{color:'var(--color-text-2)'}}>—</span>,
    },
    {
      key:'maxDD', header:'最大回撤', align:'right', sortable:true,
      render:(r)=> r.status==='done' ? <PnlText value={r.maxDD} suffix="%" /> : <span className="text-xs" style={{color:'var(--color-text-2)'}}>—</span>,
    },
    {
      key:'trades', header:'交易次數', align:'right',
      render:(r)=> r.status==='done' ? <span className="num text-xs">{r.trades}</span> : <span className="text-xs" style={{color:'var(--color-text-2)'}}>—</span>,
    },
    {
      key:'status', header:'狀態',
      render:(r)=>(
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_CONF[r.status].variant}>{STATUS_CONF[r.status].label}</Badge>
          {r.status==='running' && <RefreshCw size={11} style={{color:'#58a6ff', animation:'spin 1s linear infinite'}} />}
        </div>
      ),
    },
    { key:'createdAt', header:'建立時間', render:(r)=><span className="num text-xs" style={{color:'var(--color-text-2)'}}>{r.createdAt}</span> },
    {
      key:'id', header:'操作',
      render:(r)=>(
        <div className="flex gap-1.5">
          {r.status==='done' && (
            <>
              <button onClick={(e)=>{e.stopPropagation(); navigate(`/backtest/result/${r.id}`)}}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{border:'1px solid var(--color-border)',color:'#58a6ff',background:'transparent',cursor:'pointer'}}>
                <Eye size={11}/> 查看
              </button>
              <button onClick={(e)=>{e.stopPropagation(); navigate('/backtest/compare')}}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{border:'1px solid var(--color-border)',color:'var(--color-text-2)',background:'transparent',cursor:'pointer'}}>
                <GitCompare size={11}/> 比較
              </button>
            </>
          )}
          {r.status==='failed' && (
            <button className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{border:'1px solid var(--color-border)',color:'#d29922',background:'transparent',cursor:'pointer'}}>
              <RefreshCw size={11}/> 重跑
            </button>
          )}
        </div>
      ),
    },
  ];

  const doneCount   = MOCK.filter(r=>r.status==='done').length;
  const avgReturn   = MOCK.filter(r=>r.status==='done').reduce((s,r)=>s+r.totalReturn,0) / doneCount;
  const bestReturn  = Math.max(...MOCK.filter(r=>r.status==='done').map(r=>r.totalReturn));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="回測歷史"
        subtitle={`共 ${MOCK.length} 筆 · ${doneCount} 完成`}
        actions={
          <button onClick={() => navigate('/backtest/new')}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                  style={{ background:'#58a6ff', color:'#fff', border:'none', cursor:'pointer' }}>
            <Plus size={14} /> 新增回測
          </button>
        }
      />

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px] px-4 py-3 rounded-lg"
             style={{ background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <div className="text-xs mb-1" style={{ color:'var(--color-text-2)' }}>已完成回測</div>
          <div className="text-xl font-bold" style={{ color:'var(--color-text)' }}>{doneCount}</div>
        </div>
        <div className="flex-1 min-w-[140px] px-4 py-3 rounded-lg"
             style={{ background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <div className="text-xs mb-1" style={{ color:'var(--color-text-2)' }}>平均報酬率</div>
          <PnlText value={avgReturn} suffix="%" className="text-xl font-bold" />
        </div>
        <div className="flex-1 min-w-[140px] px-4 py-3 rounded-lg"
             style={{ background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          <div className="text-xs mb-1" style={{ color:'var(--color-text-2)' }}>最佳報酬率</div>
          <PnlText value={bestReturn} suffix="%" className="text-xl font-bold" />
        </div>
      </div>

      {/* Filter + actions */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 p-1 rounded" style={{ background:'var(--color-card)', border:'1px solid var(--color-border)' }}>
          {(['all','done','running','failed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
                    className="text-xs px-3 py-1 rounded"
                    style={{
                      background: filter===f ? '#58a6ff' : 'transparent',
                      color: filter===f ? '#fff' : 'var(--color-text-2)',
                      border: 'none', cursor: 'pointer',
                    }}>
              {f==='all'?'全部':f==='done'?'完成':f==='running'?'執行中':'失敗'}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color:'var(--color-text-2)' }}>已選 {selected.size} 筆</span>
            <button onClick={() => navigate('/backtest/compare')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border:'1px solid #58a6ff44', color:'#58a6ff', background:'transparent', cursor:'pointer' }}>
              <GitCompare size={12}/> 比較所選
            </button>
            <button onClick={() => {}}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border:'1px solid var(--color-border)', color:'var(--color-text-2)', background:'transparent', cursor:'pointer' }}>
              <Download size={12}/> 匯出 CSV
            </button>
            <button onClick={() => setSelected(new Set())}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
                    style={{ border:'1px solid #f8514944', color:'#f85149', background:'transparent', cursor:'pointer' }}>
              <Trash2 size={12}/> 刪除所選
            </button>
          </div>
        )}
      </div>

      <SectionCard>
        <DataTable
          columns={cols}
          data={filtered}
          rowKey={(r) => r.id}
          onRowClick={(r) => { if (r.status === 'done') navigate(`/backtest/result/${r.id}`); }}
          emptyText="無回測記錄"
        />
      </SectionCard>
    </div>
  );
}
