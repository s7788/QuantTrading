import { useState } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Database, Bell, Shield, Palette, Globe, Clock } from 'lucide-react';
import { PageHeader, SectionCard, TabBar, Badge } from '@/components/common';
import { useAppStore } from '@/stores/appStore';

const TABS = [
  { key:'general',  label:'一般' },
  { key:'data',     label:'資料來源' },
  { key:'notify',   label:'通知' },
  { key:'trading',  label:'交易' },
  { key:'system',   label:'系統' },
];

const inputSt = {
  background: 'var(--color-bg)', border: '1px solid var(--color-border)',
  borderRadius: 6, padding: '7px 10px', color: 'var(--color-text)',
  fontSize: 13, outline: 'none', width: '100%',
} as React.CSSProperties;

interface ToggleProps { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; }
function Toggle({ label, desc, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3"
         style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div>
        <div className="text-sm" style={{ color: 'var(--color-text)' }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)}
              className="relative rounded-full transition-colors"
              style={{
                width: 40, height: 22, flexShrink: 0,
                background: value ? '#58a6ff' : 'var(--color-border)',
                border: 'none', cursor: 'pointer',
              }}>
        <span className="absolute top-1 rounded-full transition-all"
              style={{
                width: 14, height: 14, background: '#fff',
                left: value ? 22 : 4,
              }} />
      </button>
    </div>
  );
}

interface DataSourceRowProps { name: string; desc: string; status: 'ok'|'error'|'warning'; lastSync?: string; onTest: () => void; }
function DataSourceRow({ name, desc, status, lastSync, onTest }: DataSourceRowProps) {
  return (
    <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{name}</span>
          <Badge variant={status==='ok'?'green':status==='error'?'red':'yellow'}>
            {status==='ok'?'正常':status==='error'?'異常':'警告'}
          </Badge>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-2)' }}>
          {desc}{lastSync && ` · 上次同步 ${lastSync}`}
        </div>
      </div>
      <button onClick={onTest}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-2)', background: 'transparent', cursor: 'pointer' }}>
        <RefreshCw size={11} /> 測試連線
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme } = useAppStore();
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const [general, setGeneral] = useState({
    timezone: 'Asia/Taipei',
    currency: 'TWD',
    dateFormat: 'YYYY-MM-DD',
    language: 'zh-TW',
    defaultMarket: 'tw',
  });

  const [dataSettings, setDataSettings] = useState({
    twseEnabled: true,
    finmindEnabled: true,
    yahooEnabled: true,
    finmindToken: '',
    alphavantageKey: '',
    syncInterval: '24',
    autoSync: true,
  });

  const [notify, setNotify] = useState({
    strategyError: true,
    strategyStop: true,
    backtestDone: true,
    priceAlert: false,
    syncFail: true,
    emailEnabled: false,
    email: '',
    lineToken: '',
  });

  const [trading, setTrading] = useState({
    maxPositions: '10',
    defaultStopLoss: '5',
    defaultTakeProfit: '15',
    paperMode: true,
    autoTrade: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setGen = (k: keyof typeof general) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGeneral((prev) => ({ ...prev, [k]: e.target.value }));

  const setData = (k: keyof typeof dataSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDataSettings((prev) => ({ ...prev, [k]: e.target.value }));

  const setTrad = (k: keyof typeof trading) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setTrading((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="設定"
        subtitle="系統偏好與資料來源設定"
        actions={
          <button onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold"
                  style={{ background: saved ? '#3fb950' : '#58a6ff', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Save size={14} /> {saved ? '已儲存 ✓' : '儲存設定'}
          </button>
        }
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* General */}
      {tab === 'general' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SectionCard title="外觀與語言">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>介面語言</label>
                <select value={general.language} onChange={setGen('language')} style={inputSt}>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <Toggle label="深色模式" desc="切換深色/淺色主題"
                      value={theme === 'dark'} onChange={() => toggleTheme()} />
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>日期格式</label>
                <select value={general.dateFormat} onChange={setGen('dateFormat')} style={inputSt}>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="區域設定">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>時區</label>
                <select value={general.timezone} onChange={setGen('timezone')} style={inputSt}>
                  <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
                  <option value="America/New_York">America/New_York (UTC-5/4)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>預設貨幣</label>
                <select value={general.currency} onChange={setGen('currency')} style={inputSt}>
                  <option value="TWD">TWD 新台幣</option>
                  <option value="USD">USD 美元</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>預設市場</label>
                <select value={general.defaultMarket} onChange={setGen('defaultMarket')} style={inputSt}>
                  <option value="tw">台股</option>
                  <option value="us">美股</option>
                </select>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Data sources */}
      {tab === 'data' && (
        <div className="flex flex-col gap-4">
          <SectionCard title="資料來源狀態">
            <DataSourceRow name="TWSE OpenAPI" desc="台股日線資料 · 免費 · 無需金鑰"
                           status="ok" lastSync="2025-03-15 15:30" onTest={() => {}} />
            <DataSourceRow name="FinMind" desc="台股歷史資料補充 · 社群版 600 req/hr"
                           status={dataSettings.finmindToken ? 'ok' : 'warning'}
                           lastSync="2025-03-15 15:32" onTest={() => {}} />
            <DataSourceRow name="Yahoo Finance" desc="美股日線資料 · 免費 · npm yahoo-finance2"
                           status="ok" lastSync="2025-03-16 06:02" onTest={() => {}} />
            <DataSourceRow name="Alpha Vantage" desc="美股補充資料 · 需 API Key · 25 req/day (免費)"
                           status={dataSettings.alphavantageKey ? 'ok' : 'warning'}
                           onTest={() => {}} />
          </SectionCard>

          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <SectionCard title="API 金鑰設定">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>FinMind Token</label>
                  <input type="password" value={dataSettings.finmindToken}
                         onChange={setData('finmindToken')}
                         placeholder="留空使用社群版（有速率限制）" style={inputSt} />
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-2)' }}>
                    <a href="https://finmindtrade.com" target="_blank" rel="noopener noreferrer"
                       style={{ color: '#58a6ff' }}>finmindtrade.com</a> 申請
                  </p>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>Alpha Vantage Key</label>
                  <input type="password" value={dataSettings.alphavantageKey}
                         onChange={setData('alphavantageKey')}
                         placeholder="選填 — 用於美股補充資料" style={inputSt} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="同步設定">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>資料更新間隔 (小時)</label>
                  <select value={dataSettings.syncInterval}
                          onChange={(e) => setDataSettings(p => ({ ...p, syncInterval: e.target.value }))}
                          style={inputSt}>
                    {['1','4','8','12','24'].map(v => <option key={v} value={v}>{v} 小時</option>)}
                  </select>
                </div>
                <Toggle label="自動同步" desc="依排程自動更新市場資料"
                        value={dataSettings.autoSync}
                        onChange={(v) => setDataSettings(p => ({ ...p, autoSync: v }))} />
                <div className="text-xs p-3 rounded" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                  <div className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>Cloud Scheduler 排程</div>
                  <div style={{ color: 'var(--color-text-2)', lineHeight: 1.8 }}>
                    台股：工作日 15:30 (UTC+8)<br/>
                    美股：工作日 06:00 (UTC+8 次日)
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notify' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SectionCard title="事件通知">
            <Toggle label="策略錯誤" desc="策略發生異常時通知"
                    value={notify.strategyError} onChange={(v) => setNotify(p => ({ ...p, strategyError: v }))} />
            <Toggle label="策略停止" desc="策略自動停止時通知"
                    value={notify.strategyStop} onChange={(v) => setNotify(p => ({ ...p, strategyStop: v }))} />
            <Toggle label="回測完成" desc="回測執行完畢時通知"
                    value={notify.backtestDone} onChange={(v) => setNotify(p => ({ ...p, backtestDone: v }))} />
            <Toggle label="價格警報" desc="自訂價格觸發條件時通知"
                    value={notify.priceAlert} onChange={(v) => setNotify(p => ({ ...p, priceAlert: v }))} />
            <Toggle label="資料同步失敗" desc="自動同步失敗時通知"
                    value={notify.syncFail} onChange={(v) => setNotify(p => ({ ...p, syncFail: v }))} />
          </SectionCard>

          <SectionCard title="通知管道">
            <div className="flex flex-col gap-3">
              <Toggle label="Email 通知"
                      value={notify.emailEnabled} onChange={(v) => setNotify(p => ({ ...p, emailEnabled: v }))} />
              {notify.emailEnabled && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>Email 地址</label>
                  <input type="email" value={notify.email}
                         onChange={(e) => setNotify(p => ({ ...p, email: e.target.value }))}
                         placeholder="your@email.com" style={inputSt} />
                </div>
              )}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>LINE Notify Token（選填）</label>
                <input type="password" value={notify.lineToken}
                       onChange={(e) => setNotify(p => ({ ...p, lineToken: e.target.value }))}
                       placeholder="LINE Notify 存取權杖" style={inputSt} />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-2)' }}>
                  <a href="https://notify-bot.line.me" target="_blank" rel="noopener noreferrer"
                     style={{ color: '#58a6ff' }}>notify-bot.line.me</a> 取得權杖
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Trading */}
      {tab === 'trading' && (
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SectionCard title="風險控制預設值">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>最大同時持倉數</label>
                <input type="number" value={trading.maxPositions} onChange={setTrad('maxPositions')}
                       min={1} max={50} style={inputSt} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>預設停損 %</label>
                <input type="number" value={trading.defaultStopLoss} onChange={setTrad('defaultStopLoss')}
                       min={0.5} max={50} step={0.5} style={inputSt} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--color-text-2)' }}>預設停利 %</label>
                <input type="number" value={trading.defaultTakeProfit} onChange={setTrad('defaultTakeProfit')}
                       min={1} max={200} step={0.5} style={inputSt} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="交易模式">
            <Toggle label="模擬模式（Paper Trading）"
                    desc="開啟後策略僅模擬交易，不實際下單"
                    value={trading.paperMode}
                    onChange={(v) => setTrading(p => ({ ...p, paperMode: v }))} />
            <div className="mt-3 p-3 rounded" style={{ background: '#d2992211', border: '1px solid #d2992233' }}>
              <div className="text-xs font-medium" style={{ color: '#d29922' }}>⚠️ 自動交易 (TODO)</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text-2)' }}>
                自動交易功能開發中，預計接入富邦證券 API。
                目前僅支援模擬模式。
              </div>
            </div>
            <div className="mt-3 p-3 rounded" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-text)' }}>交易費用設定</div>
              <div className="flex flex-col gap-1.5">
                {[
                  ['台股手續費率', '0.1425%'],
                  ['台股證交稅', '0.3%'],
                  ['美股手續費', '免費（Interactive Brokers）'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span style={{ color:'var(--color-text-2)' }}>{k}</span>
                    <span style={{ color:'var(--color-text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* System */}
      {tab === 'system' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <SectionCard title="系統資訊">
              {[
                ['版本', 'v0.1.0-alpha'],
                ['環境', 'Google Cloud Run'],
                ['區域', 'asia-east1'],
                ['專案 ID', 'stock-decision-assistant'],
                ['資料庫', 'Cloud Firestore'],
                ['儲存', 'Cloud Storage'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2"
                     style={{ borderBottom:'1px solid var(--color-border)' }}>
                  <span className="text-xs" style={{ color:'var(--color-text-2)' }}>{k}</span>
                  <span className="text-xs font-medium" style={{ color:'var(--color-text)' }}>{v}</span>
                </div>
              ))}
            </SectionCard>

            <SectionCard title="資料管理">
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded" style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color:'var(--color-text)' }}>Firestore 使用量</div>
                  <div className="text-xs" style={{ color:'var(--color-text-2)' }}>
                    讀取：12,450 / 50,000 次/天<br/>
                    寫入：3,210 / 20,000 次/天<br/>
                    儲存：0.24 GB / 1 GB
                  </div>
                </div>
                <div className="p-3 rounded" style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color:'var(--color-text)' }}>Cloud Storage</div>
                  <div className="text-xs" style={{ color:'var(--color-text-2)' }}>
                    市場資料：1.2 GB / 5 GB (免費)
                  </div>
                </div>
                <button className="text-xs px-3 py-2 rounded w-full"
                        style={{ border:'1px solid #f8514944', color:'#f85149', background:'transparent', cursor:'pointer' }}>
                  清除快取資料
                </button>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="健康檢查">
            <div className="flex flex-col gap-2">
              {[
                { name:'API 伺服器', status:'ok', latency:'12ms' },
                { name:'Firestore', status:'ok', latency:'45ms' },
                { name:'Cloud Storage', status:'ok', latency:'89ms' },
                { name:'TWSE OpenAPI', status:'ok', latency:'230ms' },
                { name:'Yahoo Finance', status:'ok', latency:'410ms' },
              ].map((s) => (
                <div key={s.name} className="flex items-center gap-3 px-3 py-2 rounded"
                     style={{ background:'var(--color-bg)', border:'1px solid var(--color-border)' }}>
                  {s.status === 'ok'
                    ? <CheckCircle size={14} style={{ color:'#3fb950' }} />
                    : <AlertCircle size={14} style={{ color:'#f85149' }} />}
                  <span className="flex-1 text-sm" style={{ color:'var(--color-text)' }}>{s.name}</span>
                  <Badge variant={s.status==='ok'?'green':'red'}>{s.status==='ok'?'正常':'異常'}</Badge>
                  <span className="text-xs num" style={{ color:'var(--color-text-2)' }}>{s.latency}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
