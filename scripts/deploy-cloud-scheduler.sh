#!/bin/bash
set -eo pipefail

# =============================================================================
# Deploy Cloud Scheduler jobs for Present Health content automation.
#
# This script creates (or updates) four Cloud Scheduler jobs:
#
#   1. present-health-content-engine  — Runs content generation every 2 hours.
#      Enqueues and executes ContentSchedule entries (CONTENT, GSC_SYNC, etc.)
#      defined in the database.  Set up those entries first by running:
#          npx tsx scripts/setup-content-schedules.ts
#
#   2. present-health-gsc-sync        — Syncs Search Console metrics daily at
#      6:30am CT, independent of the main content schedule.
#
#   3. present-health-refresh-detect  — Detects declining articles that need
#      a content refresh, runs daily at 8am CT.
#
#   4. present-health-refresh-strategy — Recomputes CTR-weighted cluster
#      strategy, runs every Monday at 7am CT.
#
# Usage:
#   CONTENT_ENGINE_CRON_SECRET=<secret> bash scripts/deploy-cloud-scheduler.sh
#   (Omit the env var to be prompted or auto-generate a secret)
#
# After first run, add CONTENT_ENGINE_CRON_SECRET to Cloud Run env vars.
# =============================================================================

echo "Deploying Cloud Scheduler jobs for Present Health Content Engine"
echo ""

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_URL="https://presenthealthmd.com"
CRON_ENDPOINT="${SERVICE_URL}/api/admin/content-cron"

echo "Project : $PROJECT_ID"
echo "Region  : $REGION"
echo "Endpoint: $CRON_ENDPOINT"
echo ""

# ── Secret resolution ─────────────────────────────────────────────────────────
if [ -z "$CONTENT_ENGINE_CRON_SECRET" ]; then
    read -rp "Enter CONTENT_ENGINE_CRON_SECRET (press Enter to auto-generate): " user_secret
    if [ -z "$user_secret" ]; then
        CONTENT_ENGINE_CRON_SECRET=$(openssl rand -hex 32)
        echo "Generated secret: $CONTENT_ENGINE_CRON_SECRET"
        echo ""
        echo "⚠️  Copy this secret — you will need to add it to Cloud Run env vars!"
        echo ""
    else
        CONTENT_ENGINE_CRON_SECRET="$user_secret"
    fi
fi

HEADERS="x-cron-secret=${CONTENT_ENGINE_CRON_SECRET},Content-Type=application/json"

# ── Helper: create or update a scheduler job ─────────────────────────────────
create_or_update() {
    local JOB_NAME="$1"
    local SCHEDULE="$2"
    local TZ="$3"
    local BODY="$4"
    local DESC="$5"

    echo "  → $JOB_NAME  ($SCHEDULE $TZ)"

    gcloud scheduler jobs create http "$JOB_NAME" \
        --location="$REGION" \
        --schedule="$SCHEDULE" \
        --time-zone="$TZ" \
        --uri="$CRON_ENDPOINT" \
        --http-method=POST \
        --headers="$HEADERS" \
        --message-body="$BODY" \
        --description="$DESC" \
        2>/dev/null || \
    gcloud scheduler jobs update http "$JOB_NAME" \
        --location="$REGION" \
        --schedule="$SCHEDULE" \
        --time-zone="$TZ" \
        --uri="$CRON_ENDPOINT" \
        --http-method=POST \
        --headers="$HEADERS" \
        --message-body="$BODY" \
        --description="$DESC"
}

# ── Job 1: Content generation — every 2 hours ─────────────────────────────────
# Enqueues and runs ContentSchedule entries from the database.
# Limit to 5 jobs per invocation to keep Cloud Run request times reasonable.
create_or_update \
    "present-health-content-engine" \
    "0 */2 * * *" \
    "America/Chicago" \
    '{"jobLimit":5}' \
    "Present Health: content generation every 2 hours"

# ── Job 2: GSC sync — daily at 6:30am CT ─────────────────────────────────────
# Syncs the last 7 days of Google Search Console metrics for all articles.
# Stored in ArticleMetric and used for refresh strategy and SEO health.
create_or_update \
    "present-health-gsc-sync" \
    "30 6 * * *" \
    "America/Chicago" \
    '{"jobLimit":1,"jobType":"GSC_SYNC","days":7,"refreshStrategy":true}' \
    "Present Health: daily Google Search Console metrics sync"

# ── Job 3: Content refresh detection — daily at 8am CT ───────────────────────
# Scans published articles for declining CTR/position and flags them for refresh.
create_or_update \
    "present-health-refresh-detect" \
    "0 8 * * *" \
    "America/Chicago" \
    '{"jobLimit":1,"jobType":"CONTENT_REFRESH_DETECT"}' \
    "Present Health: daily content refresh detection scan"

# ── Job 4: Refresh strategy — every Monday at 7am CT ─────────────────────────
# Recomputes CTR-weighted cluster scores so the content engine prioritises
# topics that are driving the most engagement.
create_or_update \
    "present-health-refresh-strategy" \
    "0 7 * * 1" \
    "America/Chicago" \
    '{"jobLimit":1,"jobType":"REFRESH_STRATEGY","strategyDays":30}' \
    "Present Health: weekly CTR-weighted cluster strategy refresh"

echo ""
echo "✅  All Cloud Scheduler jobs deployed successfully."
echo ""
echo "Next steps:"
echo "  1. Add CONTENT_ENGINE_CRON_SECRET=$CONTENT_ENGINE_CRON_SECRET"
echo "     to your Cloud Run service environment variables."
echo ""
echo "  2. Seed the ContentSchedule table so the engine knows what to run:"
echo "     npx tsx scripts/setup-content-schedules.ts"
echo ""
echo "  3. Optionally trigger a manual run to verify everything works:"
echo "     gcloud scheduler jobs run present-health-content-engine --location=$REGION"
echo ""
