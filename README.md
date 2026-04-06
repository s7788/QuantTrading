# QuantTrader — 個人量化交易平台

台股 & 美股量化交易研究平台，包含儀表板、回測、策略管理、數據分析四大模組。

**技術棧**: React 18 + TypeScript / Node.js + TypeScript / Firestore / Cloud Run

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

### 3. 本機 GCP 認證

```bash
gcloud auth application-default login
gcloud config set project stock-decision-assistant
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

- 前端: http://localhost:3000
- 後端 API: http://localhost:8080

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

GitHub Actions 會自動執行：
1. TypeScript 型別檢查
2. Docker multi-stage build
3. 推送 image 到 Artifact Registry
4. 部署到 Cloud Run
5. 更新 Cloud Scheduler 的目標 URL
6. Smoke test

---

## 專案結構

```
QuantTrading/
├── packages/
│   ├── shared/          # 共用型別定義與常數（前後端共用）
│   ├── client/          # React SPA 前端
│   │   └── src/
│   │       ├── components/   # UI 元件（layout, dashboard, ...）
│   │       ├── pages/        # 頁面元件（13 個路由）
│   │       ├── stores/       # Zustand 狀態
│   │       ├── services/     # API 呼叫 & Socket
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
│   └── deploy.yml       # GitHub Actions CI/CD
├── Dockerfile            # Multi-stage build
├── SPEC.md              # 完整功能需求規格書
└── UI-WIREFRAME.md      # UI 線框圖說明
```

---

## 數據來源

| 市場 | 數據源 | 更新頻率 | 費用 |
|------|--------|---------|------|
| 台股 | TWSE OpenAPI + FinMind | 每日 15:30 自動 | 免費 |
| 美股 | Yahoo Finance (yfinance) | 每日 21:30 UTC 自動 | 免費 |
| 手動更新 | UI 頂部「立即更新」按鈕 | 隨時 | 免費 |

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
