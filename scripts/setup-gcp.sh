#!/usr/bin/env bash
# ============================================================
# setup-gcp.sh
# One-time GCP project setup for quant-trading platform
# Run locally ONCE before first deploy.
#
# Prerequisites:
#   - gcloud CLI installed & authenticated (gcloud auth login)
#   - Owner/Editor role on stock-decision-assistant project
#
# Usage:
#   chmod +x scripts/setup-gcp.sh
#   ./scripts/setup-gcp.sh
# ============================================================
set -euo pipefail

PROJECT_ID="stock-decision-assistant"
REGION="asia-east1"
SERVICE_NAME="quant-trading"
SA_NAME="quant-trading-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
REPO_NAME="quant"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}"

echo "============================================================"
echo "  GCP Setup — Project: ${PROJECT_ID}"
echo "============================================================"

# ── 0. Set project ────────────────────────────────────────────
gcloud config set project "${PROJECT_ID}"

# ── 1. Enable required APIs ───────────────────────────────────
echo "[1/8] Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com

# ── 2. Create Artifact Registry repository ───────────────────
echo "[2/8] Creating Artifact Registry repository..."
gcloud artifacts repositories describe "${REPO_NAME}" \
  --location="${REGION}" 2>/dev/null \
  || gcloud artifacts repositories create "${REPO_NAME}" \
       --repository-format=docker \
       --location="${REGION}" \
       --description="QuantTrading Docker images"

# ── 3. Create service account ────────────────────────────────
echo "[3/8] Creating service account..."
gcloud iam service-accounts describe "${SA_EMAIL}" 2>/dev/null \
  || gcloud iam service-accounts create "${SA_NAME}" \
       --display-name="QuantTrading Service Account"

# Grant necessary roles to service account
for ROLE in \
  roles/datastore.user \
  roles/storage.objectAdmin \
  roles/secretmanager.secretAccessor \
  roles/run.invoker; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
done

# ── 4. Create Firestore database ─────────────────────────────
echo "[4/8] Setting up Firestore..."
gcloud firestore databases describe --database="(default)" 2>/dev/null \
  || gcloud firestore databases create \
       --location="${REGION}" \
       --type=firestore-native

# ── 5. Create Cloud Storage bucket for market data ───────────
BUCKET="${PROJECT_ID}-market-data"
echo "[5/8] Creating Cloud Storage bucket: ${BUCKET}..."
gcloud storage buckets describe "gs://${BUCKET}" 2>/dev/null \
  || gcloud storage buckets create "gs://${BUCKET}" \
       --location="${REGION}" \
       --uniform-bucket-level-access

# ── 6. Create GitHub Actions service account ─────────────────
echo "[6/8] Creating GitHub Actions service account..."
GH_SA_NAME="github-actions-deploy"
GH_SA_EMAIL="${GH_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts describe "${GH_SA_EMAIL}" 2>/dev/null \
  || gcloud iam service-accounts create "${GH_SA_NAME}" \
       --display-name="GitHub Actions Deploy SA"

for ROLE in \
  roles/run.developer \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${GH_SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
done

# Create and download key for GitHub Actions secret
KEY_FILE="github-actions-key.json"
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${GH_SA_EMAIL}"
echo ""
echo "⚠️  Key saved to ${KEY_FILE}"
echo "    Add its contents as GitHub secret: GCP_SA_KEY"
echo "    Then DELETE this file: rm ${KEY_FILE}"
echo ""

# ── 7. Set up Cloud Schedulers ───────────────────────────────
echo "[7/8] Setting up Cloud Schedulers..."
# Get the Cloud Run URL (empty on first run — update after first deploy)
CLOUD_RUN_URL="https://${SERVICE_NAME}-HASH-${REGION}.a.run.app"
echo "  ⚠️  Update CLOUD_RUN_URL in this script after first deploy."

for JOB_NAME in sync-tw-daily sync-us-daily; do
  gcloud scheduler jobs describe "${JOB_NAME}" \
    --location="${REGION}" 2>/dev/null \
    && gcloud scheduler jobs delete "${JOB_NAME}" \
         --location="${REGION}" --quiet || true
done

# Taiwan stocks — weekdays 15:30 UTC+8 = 07:30 UTC
gcloud scheduler jobs create http sync-tw-daily \
  --location="${REGION}" \
  --schedule="30 7 * * 1-5" \
  --uri="${CLOUD_RUN_URL}/api/data/sync?market=tw" \
  --http-method=POST \
  --oidc-service-account-email="${SA_EMAIL}" \
  --description="Daily TW stock sync after market close" \
  --time-zone="UTC"

# US stocks — weekdays 21:30 UTC (= 05:30 UTC+8 next day, after NYSE close)
gcloud scheduler jobs create http sync-us-daily \
  --location="${REGION}" \
  --schedule="30 21 * * 1-5" \
  --uri="${CLOUD_RUN_URL}/api/data/sync?market=us" \
  --http-method=POST \
  --oidc-service-account-email="${SA_EMAIL}" \
  --description="Daily US stock sync after market close" \
  --time-zone="UTC"

echo "[8/8] Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add GitHub secret GCP_SA_KEY = contents of ${KEY_FILE}"
echo "  2. Delete ${KEY_FILE}"
echo "  3. Push to main branch to trigger first deploy"
echo "  4. After first deploy, update CLOUD_RUN_URL in scheduler jobs:"
echo "     gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)'"
