# Automation Setup

This repo now supports:

1. Local autosync (`launchd`) to automatically `git add`, `commit`, and `push` after a debounce window.
2. GitHub Actions CI/CD to build and deploy to Cloud Run on pushes to `main`.

## 1) Local -> GitHub Autosync (macOS launchd)

### What was added
- `scripts/autosync/git-autosync-daemon.sh`
- `scripts/autosync/install-launchd-autosync.sh`
- `scripts/autosync/uninstall-launchd-autosync.sh`

### Install and start
From repo root:

```bash
./scripts/autosync/install-launchd-autosync.sh \
  --repo "$(pwd)" \
  --branch "main" \
  --remote "origin" \
  --debounce-seconds 20 \
  --poll-seconds 5
```

### Check status/logs
```bash
launchctl print "gui/$UID/com.presenthealth.autosync" | head -100

tail -f "$HOME/Library/Logs/com.presenthealth.autosync.log"
```

### Stop/remove
```bash
./scripts/autosync/uninstall-launchd-autosync.sh
```

### Notes
- Commits include all tracked/untracked changes via `git add -A`.
- Sync is skipped during merge/rebase/cherry-pick operations.
- If push/auth fails, daemon retries after the next debounce window.

## 2) GitHub -> Cloud Run CI/CD

### What was added
- `.github/workflows/deploy-cloud-run.yml`

Workflow behavior:
- Trigger: every push to GitHub (and manual `workflow_dispatch`)
- Build: Docker image using repo `Dockerfile`
- Push: Artifact Registry image
- Deploy: Cloud Run service `present-health-dpc` in `us-central1`
- Base env vars injected each deploy:
  - `NEXTAUTH_URL=https://presenthealthmd.com`
  - `SITE_URL=https://presenthealthmd.com`
  - `NEXT_PUBLIC_SITE_URL=https://presenthealthmd.com`

### Required GitHub secrets
Configure these in: `Settings -> Secrets and variables -> Actions -> Secrets`

Required:
- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

Optional:
- `CLOUD_SQL_INSTANCE` (example: `project:region:instance`)
- `CLOUD_RUN_ENV_VARS` (comma-separated `KEY=VALUE` pairs)
- `CLOUD_RUN_RUNTIME_SERVICE_ACCOUNT`

## 3) Domain: presenthealthmd.com

The workflow deploys the service continuously. Domain mapping is usually a one-time GCP setup:

```bash
gcloud run domain-mappings create \
  --service present-health-dpc \
  --domain presenthealthmd.com \
  --region us-central1
```

If you also serve `www.presenthealthmd.com`, create a second mapping for that host.
