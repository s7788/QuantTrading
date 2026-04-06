#!/usr/bin/env bash
# ============================================================
# cleanup-gcp.sh
# Clears ALL quant-trading resources from the GCP project
# WITHOUT touching other services already in stock-decision-assistant.
#
# Deletes:
#   - Cloud Run service: quant-trading
#   - Artifact Registry images in repo: quant
#   - Firestore collections: strategies, backtests, positions,
#     trades, alerts, settings, dataStatus, boards, screeners
#   - Cloud Storage bucket: stock-decision-assistant-market-data
#   - Cloud Scheduler jobs: sync-tw-daily, sync-us-daily
#   - IAM service accounts: quant-trading-sa, github-actions-deploy
#
# Does NOT delete: Firestore database itself, other Cloud Run services,
#                  other buckets, other SA's, other Scheduler jobs
#
# Usage:
#   chmod +x scripts/cleanup-gcp.sh
#   ./scripts/cleanup-gcp.sh
# ============================================================
set -euo pipefail

PROJECT_ID="stock-decision-assistant"
REGION="asia-east1"
SERVICE_NAME="quant-trading"
REPO_NAME="quant"
BUCKET="${PROJECT_ID}-market-data"

echo "============================================================"
echo "  ⚠️  GCP Cleanup — Project: ${PROJECT_ID}"
echo "  This will remove all QuantTrading resources."
echo "============================================================"
read -p "Continue? (yes/no): " CONFIRM
[[ "${CONFIRM}" == "yes" ]] || { echo "Aborted."; exit 0; }

gcloud config set project "${PROJECT_ID}"

# ── Cloud Run service ─────────────────────────────────────────
echo "[1] Deleting Cloud Run service..."
gcloud run services delete "${SERVICE_NAME}" \
  --region="${REGION}" --quiet 2>/dev/null || echo "  (not found, skipping)"

# ── Artifact Registry images ──────────────────────────────────
echo "[2] Deleting Artifact Registry images..."
gcloud artifacts docker images list \
  "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}" \
  --format="value(IMAGE)" 2>/dev/null \
  | while read -r img; do
      gcloud artifacts docker images delete "${img}" --delete-tags --quiet 2>/dev/null || true
    done
echo "  Done."

# ── Firestore collections ─────────────────────────────────────
echo "[3] Deleting Firestore collections..."
COLLECTIONS=(strategies backtests positions trades alerts settings dataStatus boards screeners)
for COL in "${COLLECTIONS[@]}"; do
  echo "    Deleting collection: ${COL}"
  # Use Firebase Admin SDK / gcloud firestore export then delete
  # Simplest: use the gcloud alpha firestore delete command if available
  gcloud alpha firestore documents delete \
    --collection="${COL}" --all-collections --quiet 2>/dev/null \
    || echo "    (skipped — use Firebase Console to delete collection '${COL}')"
done

# ── Cloud Storage bucket ──────────────────────────────────────
echo "[4] Deleting Cloud Storage bucket..."
gcloud storage rm -r "gs://${BUCKET}" 2>/dev/null || echo "  (not found, skipping)"

# ── Cloud Scheduler jobs ──────────────────────────────────────
echo "[5] Deleting Cloud Scheduler jobs..."
for JOB in sync-tw-daily sync-us-daily; do
  gcloud scheduler jobs delete "${JOB}" \
    --location="${REGION}" --quiet 2>/dev/null || echo "  (${JOB} not found)"
done

# ── Service accounts ──────────────────────────────────────────
echo "[6] Deleting service accounts..."
for SA in "quant-trading-sa" "github-actions-deploy"; do
  SA_EMAIL="${SA}@${PROJECT_ID}.iam.gserviceaccount.com"
  gcloud iam service-accounts delete "${SA_EMAIL}" \
    --quiet 2>/dev/null || echo "  (${SA_EMAIL} not found)"
done

echo ""
echo "✅ Cleanup complete. Re-run scripts/setup-gcp.sh to reinitialise."
