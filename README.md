# QuantTrader — 個人量化交易平台

台股 & 美股量化交易研究平台，包含儀表板、回測、策略管理、數據分析四大模組。

**技術棧**: React 18 + TypeScript / Node.js + TypeScript / Firestore / Cloud Run

---

## 目錄

- [快速開始（本機開發）](#快速開始本機開發)
- [首次 GCP 部署流程](#首次-gcp-部署流程)
- [專案結構](#專案結構)
- [操作手冊](#操作手冊)
  - [儀表板模組](#儀表板模組)
  - [策略管理模組](#策略管理模組)
  - [回測模組](#回測模組)
  - [數據分析模組](#數據分析模組)
  - [系統設定模組](#系統設定模組)
- [API 參考](#api-參考)
- [數據來源](#數據來源)
- [月費估算](#月費估算預算-nt1000)
- [自動交易（TODO）](#自動交易todo)

---

## 快速開始（本機開發）

### 前置需求
- Node.js 20+
- Google Cloud SDK (`gcloud` CLI)
- GCP 帳號，且對 `stock-decision-assistant` 專案有存取權

### 1. Clone 並安裝

```bash
git clone https://github.com/<your-username>/QuantTrading.git
cd QuantTrading
npm install
```

### 2. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env 填入 GCP 設定
```

`.env` 可設定的變數：

| 變數名稱 | 說明 | 預設值 |
|----------|------|--------|
| `GCP_PROJECT_ID` | GCP 專案 ID | `stock-decision-assistant` |
| `GCP_REGION` | 部署地區 | `asia-east1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | 服務帳號 JSON 路徑 | `./service-account-key.json` |
| `NODE_ENV` | 執行環境 | `development` |
| `PORT` | 後端監聽埠 | `8080` |
| `LOG_LEVEL` | 日誌等級 | `debug` |
| `FINMIND_API_TOKEN` | FinMind API Token（選填） | — |
| `ALPHA_VANTAGE_KEY` | Alpha Vantage API Key（選填） | — |

> 台股使用 TWSE OpenAPI（免費，無需 Key）；美股使用 Yahoo Finance（免費，無需 Key）。FinMind 與 Alpha Vantage 為加強數據用途，可選設定。

### 3. 本機 GCP 認證

```bash
gcloud auth application-default login
gcloud config set project stock-decision-assistant
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

| 服務 | URL |
|------|-----|
| 前端（React） | http://localhost:3000 |
| 後端 API（Express） | http://localhost:8080 |
| 健康檢查 | http://localhost:8080/api/health |

**其他常用指令：**

```bash
npm run dev:client   # 只啟動前端
npm run dev:server   # 只啟動後端
npm run build        # 完整建置（shared → client → server）
npm run lint         # ESLint 檢查
npm run test         # 執行所有單元測試
npm run clean        # 清除所有 dist/ 與 node_modules/
```

---

## 首次 GCP 部署流程

### Step 1 — 清除舊有資料（選用）

```bash
chmod +x scripts/cleanup-gcp.sh
./scripts/cleanup-gcp.sh
```

### Step 2 — 初始化 GCP 資源

```bash
chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh
```

這個指令會自動：
- 啟用所需的 GCP API
- 建立 Artifact Registry repository
- 建立 Firestore database
- 建立 Cloud Storage bucket (市場數據)
- 建立服務帳號並設定 IAM 角色
- 建立 GitHub Actions 部署用的 service account key
- 建立 Cloud Scheduler 排程（台股每日 15:30、美股每日 21:30 UTC）

### Step 3 — 設定 GitHub Secrets

進入 GitHub Repo → Settings → Secrets and variables → Actions，新增：

| Secret 名稱 | 值 |
|-------------|---|
| `GCP_SA_KEY` | `github-actions-key.json` 的完整 JSON 內容 |

加完後刪除本機的 key 檔：
```bash
rm github-actions-key.json
```

### Step 4 — 推送到 main 觸發部署

```bash
git add .
git commit -m "feat: initial setup"
git push origin main
```

GitHub Actions 會自動執行（4 個 Job）：
1. **Lint & Type Check** — TypeScript 型別檢查（所有 packages）
2. **Build Docker Image** — Multi-stage build，推送到 Artifact Registry
3. **Deploy to Cloud Run** — 部署到 `asia-east1`，更新 Cloud Scheduler 目標 URL
4. **Smoke Test** — 健康檢查 `/api/health`（最多重試 3 次）

**Cloud Run 服務規格：**
- 最小實例：0（閒置時自動縮減為零）
- 最大實例：2
- 記憶體：512Mi，CPU：1
- 請求逾時：300 秒

---

## 專案結構

```
QuantTrading/
├── packages/
│   ├── shared/          # 共用型別定義與常數（前後端共用）
│   │   └── src/
│   │       ├── types/        # Market, Strategy, Position, Trade, OHLCV...
│   │       └── constants/    # 市場設定、費率常數
│   ├── client/          # React SPA 前端
│   │   └── src/
│   │       ├── components/   # UI 元件（layout, dashboard, ...）
│   │       ├── pages/        # 頁面元件（13 個路由）
│   │       ├── stores/       # Zustand 全域狀態
│   │       ├── services/     # API 呼叫 & Socket.io
│   │       └── styles/       # 全域 CSS / Tailwind
│   └── server/          # Express + Socket.IO 後端
│       └── src/
│           ├── routes/       # REST API 路由（6 個模組）
│           ├── services/     # 業務邏輯（DataSync, Firestore, WebSocket）
│           └── utils/        # Logger 等工具
├── deploy/
│   ├── cloud-run.yaml   # Cloud Run 服務定義
│   └── scheduler.yaml   # Cloud Scheduler 排程說明
├── scripts/
│   ├── setup-gcp.sh     # 一次性 GCP 資源初始化
│   └── cleanup-gcp.sh   # 清除所有 QuantTrading GCP 資源
├── .github/workflows/
│   └── deploy.yml       # GitHub Actions CI/CD（4 個 Job）
├── Dockerfile            # Multi-stage build
├── .env.example         # 環境變數範本
├── SPEC.md              # 完整功能需求規格書
└── UI-WIREFRAME.md      # UI 線框圖說明
```

---

## 操作手冊

### 儀表板模組

**路由：`/`**

儀表板是平台的主畫面，提供投資組合整體概覽。

#### 畫面區塊

| 區塊 | 說明 |
|------|------|
| 績效指標卡 | 總報酬、年化報酬、最大回撤、Sharpe、Sortino、Calmar |
| 資產曲線圖 | 投資組合淨值走勢，可疊加基準指標比較 |
| 持倉列表 | 當前所有持倉，含方向、數量、成本、損益、對應策略 |
| 近期交易 | 最近執行的買賣記錄 |
| 警示訊息 | 系統錯誤、警告、資訊通知 |

#### 時間區間篩選

儀表板頂部提供快速切換按鈕：`1d` / `1w` / `1m` / `3m` / `1y`

#### 市場切換

頂部導覽列可切換 **台股（TW）** 或 **美股（US）**，切換後所有數據隨之更新。

#### 立即更新數據

點擊頂部「立即更新」按鈕可手動觸發數據同步，等同呼叫 `POST /api/data/sync`。

#### 警示訊息管理

- 警示依嚴重程度分為：錯誤（紅）、警告（黃）、資訊（藍）
- 點擊警示可標記為已讀
- 未讀數量顯示於導覽列圖示上

---

### 策略管理模組

**路由：`/strategy`**

策略模組用於建立、編輯、執行和監控量化策略。

#### 策略狀態說明

| 狀態 | 說明 |
|------|------|
| `draft` | 草稿，尚未驗證 |
| `backtesting` | 正在執行回測 |
| `ready` | 回測完成，可部署執行 |
| `running` | 執行中，持續產生訊號 |
| `paused` | 暫停，保留持倉但不產生新訊號 |
| `stopped` | 已停止 |
| `error` | 執行錯誤，需人工介入 |

#### 策略類型

| 類型 | 說明 |
|------|------|
| `momentum` | 動能策略 |
| `mean-reversion` | 均值回歸 |
| `arbitrage` | 套利策略 |
| `breakout` | 突破策略 |
| `trend` | 趨勢追蹤 |
| `custom` | 自訂策略 |

---

#### 策略列表（`/strategy`）

- **搜尋**：頂部搜尋欄位，依策略名稱過濾
- **分頁標籤**：全部 / 執行中 / 已暫停 / 草稿
- **策略卡片**：顯示今日損益、標的列表、最後修改時間、迷你績效圖
- **操作按鈕**（每張卡片）：
  - 編輯 — 進入策略編輯器
  - 開始 / 暫停 / 停止 — 控制執行狀態
  - 回測 — 跳轉至回測設定頁（帶入此策略）
  - 複製 — 建立策略副本
  - 刪除 — 永久刪除（需確認）

---

#### 策略編輯器（`/strategy/edit/:id`）

策略編輯器分三個分頁：

**① 程式碼分頁**

使用 Monaco Editor（等同 VS Code）撰寫策略邏輯。策略需實作以下介面：

```typescript
{
  name: '策略名稱',
  params: {
    // 可自訂參數（在「參數分頁」定義後會出現在此）
    fastPeriod: 10,
    slowPeriod: 30,
  },
  init(ctx) {
    // 初始化：預先計算指標
    ctx.indicator('SMA', { period: this.params.fastPeriod })
    ctx.indicator('SMA', { period: this.params.slowPeriod })
  },
  onBar(ctx) {
    // 每根 K 棒觸發：撰寫進出場邏輯
    const fast = ctx.indicator('SMA', { period: this.params.fastPeriod })
    const slow = ctx.indicator('SMA', { period: this.params.slowPeriod })

    if (fast.value > slow.value && !ctx.position) {
      ctx.buy({ quantity: 1000 })
    } else if (fast.value < slow.value && ctx.position) {
      ctx.sell({ quantity: ctx.position.quantity })
    }
  },
  onEnd(ctx) {
    // 回測結束：清倉等收尾動作（選用）
  }
}
```

**可用 API：**

| 方法 | 說明 |
|------|------|
| `ctx.indicator(name, params)` | 取得技術指標值（SMA、EMA、RSI、MACD、Bollinger Bands） |
| `ctx.buy({ quantity, price? })` | 買入（市價或限價） |
| `ctx.sell({ quantity, price? })` | 賣出 |
| `ctx.position` | 當前持倉資訊（null 代表無倉位） |
| `ctx.bar` | 當根 K 棒資料（open, high, low, close, volume） |
| `ctx.capital` | 可用資金 |

**② 參數分頁**

以視覺化介面定義策略的可調參數，不需在程式碼中硬編碼數值：

| 欄位 | 說明 |
|------|------|
| 名稱 | 參數識別名稱（camelCase） |
| 類型 | `number` / `boolean` / `select` |
| 預設值 | 初始值 |
| 最小值 / 最大值 / 步進 | 適用於 `number` 類型 |
| 選項 | 適用於 `select` 類型 |
| 說明 | 參數用途說明 |

**③ 版本歷程分頁**

每次儲存策略會自動建立新版本：
- 列出所有歷史版本及修改時間
- 點選任意版本可預覽程式碼差異
- 點選「還原」可回滾至該版本（不影響當前執行中的策略）

---

#### 策略監控（`/strategy/monitor/:id`）

執行中的策略可進入監控畫面：
- 即時損益曲線
- 此策略的持倉明細
- 最近成交記錄
- 執行控制：暫停 / 停止

---

### 回測模組

**路由：`/backtest`**

回測模組用於驗證策略的歷史績效，是部署前的必要步驟。

#### 新建回測（`/backtest/new`）

**步驟 1：選擇策略或模板**

| 內建模板 | 說明 |
|----------|------|
| MA Crossover | 移動平均線交叉 |
| RSI Reversal | RSI 超買超賣反轉 |
| Bollinger Bands | 布林通道均值回歸 |
| Momentum | 動能策略 |
| Pairs Trading | 配對交易（統計套利） |
| Blank | 空白模板，從零撰寫 |

**步驟 2：設定回測參數**

| 參數 | 說明 | 預設值 |
|------|------|--------|
| 開始日期 | 回測起始日 | — |
| 結束日期 | 回測結束日 | — |
| 初始資金 | 台股：NT$100 萬 / 美股：$50,000 | 依市場而定 |
| 手續費率 | 每筆交易費率 | 0.1425%（台股）|
| 滑價 | 模擬市場衝擊（bps） | 5 bps |
| 標的 | 可多選，輸入股票代碼 | — |
| K 棒頻率 | daily / weekly / monthly / hourly / 15min / 5min | daily |
| 基準指標 | 台股：加權指數、0050 / 美股：SPY、QQQ | 依市場而定 |

**步驟 3：執行回測**

點擊「執行回測」後：
1. 系統建立非同步回測任務（enqueue）
2. 跳轉至回測結果頁，即時顯示進度
3. 完成後顯示完整績效報告

---

#### 回測結果（`/backtest/result/:id`）

結果頁面包含：

**績效指標：**

| 指標 | 說明 |
|------|------|
| 總報酬率 | 回測期間總損益 / 初始資金 |
| 年化報酬率 | 換算為年化後的報酬 |
| 最大回撤 | 高點到低點的最大跌幅 |
| Sharpe Ratio | 風險調整後報酬（建議 > 1） |
| Sortino Ratio | 僅計算下行風險的 Sharpe 變體 |
| Calmar Ratio | 年化報酬 / 最大回撤 |
| 勝率 | 獲利交易次數 / 總交易次數 |
| 盈虧比 | 平均獲利 / 平均虧損 |

**圖表：**
- 資產曲線（含基準指標比較）
- 月份報酬熱圖
- 回撤分析圖

**交易明細：**
- 完整逐筆交易記錄（日期、標的、方向、數量、價格、損益）

---

#### 回測歷史（`/backtest/history`）

- 列出所有歷史回測任務
- 狀態篩選：pending / running / completed / failed / cancelled
- 點擊任意記錄進入結果頁
- 可刪除不需要的記錄

#### 回測比較（`/backtest/compare`）

- 勾選多筆回測記錄後點擊「比較」
- 並排展示各策略的績效指標
- 資產曲線疊加顯示，便於視覺化比較

---

### 數據分析模組

**路由：`/analytics`**

#### 市場總覽（`/analytics/market-overview`）

**① 指數卡片**

| 市場 | 顯示指數 |
|------|----------|
| 台股 | 加權指數、台灣50、電子指數、金融指數 |
| 美股 | S&P 500、NASDAQ、Dow Jones、VIX |

每張卡片顯示：現價、漲跌點數、漲跌幅、當日走勢迷你圖。

**② 類股熱圖**

以顏色深淺反映各類股當日漲跌幅：
- 深綠 = 大漲（> +3%）
- 淺綠 = 小漲
- 灰色 = 持平
- 淺紅 = 小跌
- 深紅 = 大跌（< -3%）

**③ 漲跌排行**

| 欄位 | 說明 |
|------|------|
| 代碼 / 名稱 | 股票識別 |
| 現價 | 當前報價 |
| 漲跌幅 | 百分比變化 |
| 成交量比 | 當日成交量 / 近 20 日均量 |

---

#### 選股器（`/analytics/screener`）

**建立篩選條件：**

點擊「+ 新增條件」後可選擇：

| 條件類型 | 說明 | 範例 |
|----------|------|------|
| RSI < | RSI 低於閾值（超賣） | RSI < 30 |
| RSI > | RSI 高於閾值（超買） | RSI > 70 |
| 成交量比 | 成交量相對均量倍數 | > 2x |
| 漲跌幅 | 當日漲跌百分比 | > 5% |
| 價格 < | 股價低於指定值 | < 50 |
| 價格 > | 股價高於指定值 | > 100 |
| 均線交叉 | 短期均線上穿長期均線 | MA5 > MA20 |

條件以 AND 關係組合。建立後以標籤（Chip）形式顯示，可單獨刪除。

**結果欄位：**

| 欄位 | 說明 |
|------|------|
| 代碼 / 名稱 | 股票識別 |
| 現價 | 當前報價 |
| 漲跌幅 | 百分比 |
| RSI | 當前 RSI 值 |
| 成交量比 | 相對均量 |
| 訊號 | 觸發的訊號標籤 |

點擊「儲存選股條件」可儲存目前設定，下次直接載入。

---

#### 個股分析（`/analytics/symbol/:market/:code`）

前往方式：在選股器結果或任何股票代碼上點擊。

**URL 格式：**
- 台股：`/analytics/symbol/tw/2330`（台積電）
- 美股：`/analytics/symbol/us/AAPL`

**分頁說明：**

**① K 線圖**
- OHLCV 標準 K 線（使用 Lightweight Charts 渲染）
- 日期區間切換：1m / 3m / 6m / 1y
- 可添加至觀察名單（右上角書籤圖示）

**② 技術分析**
- RSI 指標圖（預設 14 日）
- MACD 指標圖（12 / 26 / 9）

**③ 基本面分析**

| 指標 | 說明 |
|------|------|
| PE Ratio | 本益比 |
| PB Ratio | 股價淨值比 |
| EPS | 每股盈餘 |
| 殖利率 | 現金股利殖利率 |
| 市值 | 總市值 |
| 類股 | 所屬產業類別 |

**④ 新聞情緒**
- 近期新聞摘要
- 情緒標籤：正面（綠）/ 中性（灰）/ 負面（紅）

---

### 系統設定模組

**路由：`/settings`**

設定頁面分為五個分頁：

#### ① 一般設定（General）

| 設定項目 | 選項 |
|----------|------|
| 語言 | 繁體中文（zh-TW）/ English（en-US） |
| 主題 | 深色模式 / 淺色模式 |
| 日期格式 | YYYY-MM-DD / MM/DD/YYYY / DD/MM/YYYY |
| 時區 | Asia/Taipei / America/New_York 等 |
| 幣別顯示 | TWD / USD |
| 預設市場 | 台股 / 美股 |

---

#### ② 數據來源（Data Sources）

| 欄位 | 說明 |
|------|------|
| TWSE OpenAPI | 台股官方數據，免費無需 Key |
| FinMind | 台股補強數據（每小時 600 次免費） |
| Yahoo Finance | 美股數據，免費無需 Key |
| Alpha Vantage | 美股補強數據（每日 500 次免費） |

- 每個來源顯示當前狀態（正常 / 異常 / 未設定）
- 可輸入 API Key 並點擊「測試連線」驗證
- **同步間隔**：可設定自動同步頻率（1h / 4h / 8h / 12h / 24h）

---

#### ③ 通知設定（Notifications）

**通知事件：**

| 事件 | 說明 |
|------|------|
| 策略執行錯誤 | 策略狀態變為 error |
| 策略停止 | 策略因異常自動停止 |
| 回測完成 | 回測任務完成 |
| 價格警示 | 標的到達設定價格 |
| 數據同步失敗 | 定期數據同步發生錯誤 |

**通知管道：**

| 管道 | 說明 |
|------|------|
| 瀏覽器通知 | Web Push（需授權） |
| Email | 填入 Email 地址 |
| LINE | 填入 LINE Notify Token |

---

#### ④ 交易設定（Trading）

| 設定項目 | 說明 |
|----------|------|
| 最大持倉數 | 同時最多持有幾個標的 |
| 預設停損 % | 自動停損觸發百分比 |
| 預設停利 % | 自動停利觸發百分比 |
| 模擬交易模式 | 開啟後所有交易為紙上交易，不連接券商 |
| 交易手續費率 | 每筆買賣手續費（台股預設 0.1425%） |
| 交易稅 | 證交稅（台股賣出 0.3%，ETF 0.1%） |

---

#### ⑤ 系統資訊（System）

| 資訊項目 | 說明 |
|----------|------|
| 平台版本 | 目前部署的版本號 |
| 執行環境 | production / development |
| GCP 地區 | 服務部署地區 |
| GCP 專案 ID | 對應的 Cloud 專案 |
| Firestore 用量 | 文件數 / 儲存量 |
| Cloud Storage 用量 | 已使用容量 |
| 健康狀態 | API 伺服器、Firestore 連線狀態 |

---

## API 參考

所有 API 皆以 `/api` 為前綴，回傳 JSON 格式。

### 儀表板 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/dashboard/summary` | 投資組合摘要（總淨值、損益、持倉數、活躍策略數） |
| GET | `/api/dashboard/equity-curve?period=month` | 資產曲線數據 |
| GET | `/api/dashboard/positions?market=tw` | 當前持倉列表 |
| GET | `/api/dashboard/trades?market=tw&limit=50` | 交易歷史 |
| GET | `/api/dashboard/alerts?unread=true` | 警示列表 |
| PATCH | `/api/dashboard/alerts/:id/read` | 標記警示為已讀 |

### 策略 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/strategy` | 策略列表（支援 `?market=tw&status=running`） |
| GET | `/api/strategy/:id` | 單一策略詳情 |
| POST | `/api/strategy` | 建立新策略 |
| PUT | `/api/strategy/:id` | 更新策略（自動新增版本） |
| DELETE | `/api/strategy/:id` | 刪除策略 |
| POST | `/api/strategy/:id/start` | 啟動策略 |
| POST | `/api/strategy/:id/pause` | 暫停策略 |
| POST | `/api/strategy/:id/stop` | 停止策略 |
| GET | `/api/strategy/:id/versions` | 版本歷程列表 |
| POST | `/api/strategy/:id/versions/:version/restore` | 還原至指定版本 |
| GET | `/api/strategy/meta/templates` | 取得內建模板列表 |

### 回測 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/backtest/run` | 建立並執行回測任務 |
| GET | `/api/backtest` | 回測歷史列表 |
| GET | `/api/backtest/:id` | 單一回測結果 |
| DELETE | `/api/backtest/:id` | 刪除回測記錄 |
| POST | `/api/backtest/:id/cancel` | 取消執行中的回測 |
| GET | `/api/backtest/meta/compare?ids=id1,id2` | 多回測比較數據 |

### 分析 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/analytics/market-overview?market=tw` | 指數、漲跌榜、類股熱圖 |
| GET | `/api/analytics/symbol/:market/:code` | 個股 OHLCV 與統計數據 |
| POST | `/api/analytics/screener` | 執行選股篩選 |
| GET | `/api/analytics/screener/saved` | 已儲存的選股條件 |
| POST | `/api/analytics/screener/saved` | 儲存選股條件 |

### 數據 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/data/sync?market=tw` | 手動觸發數據同步 |
| GET | `/api/data/status` | 各市場最後同步時間與狀態 |
| GET | `/api/data/ohlcv/:market/:symbol?from=&to=&freq=daily` | 歷史 K 棒數據 |
| GET | `/api/data/symbols/:market` | 可用標的列表 |

### 設定 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/settings` | 取得使用者設定 |
| PUT | `/api/settings` | 更新設定 |
| GET | `/api/settings/data-sources` | 數據來源狀態 |

### 健康檢查

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/health` | 伺服器健康檢查（Cloud Run liveness probe） |

---

## 數據來源

| 市場 | 數據源 | 更新頻率 | 費用 |
|------|--------|---------|------|
| 台股 | TWSE OpenAPI + FinMind | 每日 15:30（收盤後）自動 | 免費 |
| 美股 | Yahoo Finance (yfinance) | 每日 21:30 UTC（收盤後）自動 | 免費 |
| 手動更新 | UI 頂部「立即更新」按鈕 | 隨時 | 免費 |

**Cloud Scheduler 排程：**

| 排程 | Cron | 說明 |
|------|------|------|
| 台股每日同步 | `30 7 * * 1-5` | 台灣時間 15:30（週一至週五） |
| 美股每日同步 | `30 21 * * 1-5` | UTC 21:30（美股收盤後，週一至週五） |

---

## 月費估算（預算 NT$1,000）

| 服務 | 預估費用 |
|------|---------|
| Cloud Run (scale-to-zero) | ~$0 |
| Firestore | ~$0 |
| Cloud Storage | ~$0 |
| Cloud Scheduler (2 jobs) | ~$0 |
| **合計** | **~NT$0–50/月** |

---

## 自動交易（TODO）

未來計畫串接**富邦證券 API**，目前所有交易操作以「模擬」模式運行。
API 模組介面已預留，待券商 API 申請後實作。
