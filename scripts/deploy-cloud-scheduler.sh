#!/bin/bash
set -eo pipefail

echo "Deploying Cloud Scheduler Job for Present Health Content Engine"

PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
SERVICE_URL="https://presenthealthmd.com"

echo "Using Project ID: $PROJECT_ID"
echo "Creating/Updating Cloud Scheduler job to hit: $SERVICE_URL/api/admin/content-cron"

if [ -z "$CONTENT_ENGINE_CRON_SECRET" ]; then
    read -p "Enter the CONTENT_ENGINE_CRON_SECRET (hit enter to randomly generate one): " user_secret
    if [ -z "$user_secret" ]; then
        CONTENT_ENGINE_CRON_SECRET=$(openssl rand -hex 32)
        echo "Generated secret: $CONTENT_ENGINE_CRON_SECRET"
    else
        CONTENT_ENGINE_CRON_SECRET=$user_secret
    fi
fi

# Create/Update Cloud Scheduler Job
gcloud scheduler jobs create http present-health-content-engine \
    --location="$REGION" \
    --schedule="0 * * * *" \
    --time-zone="America/Chicago" \
    --uri="$SERVICE_URL/api/admin/content-cron" \
    --http-method=POST \
    --headers="x-cron-secret=$CONTENT_ENGINE_CRON_SECRET,Content-Type=application/json" \
    --message-body='{"jobLimit":5}' || \
gcloud scheduler jobs update http present-health-content-engine \
    --location="$REGION" \
    --schedule="0 * * * *" \
    --uri="$SERVICE_URL/api/admin/content-cron" \
    --http-method=POST \
    --headers="x-cron-secret=$CONTENT_ENGINE_CRON_SECRET,Content-Type=application/json" \
    --message-body='{"jobLimit":5}'

echo ""
echo "Deployment successful."
echo "CRITICAL: You must add CONTENT_ENGINE_CRON_SECRET=$CONTENT_ENGINE_CRON_SECRET to your Cloud Run environment variables for the authentication to pass."
