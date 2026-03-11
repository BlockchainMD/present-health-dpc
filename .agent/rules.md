# Operational Rules

1. **Continuous Deployment Is Mandatory**
   - Local -> GitHub is handled by the `launchd` autosync daemon `com.presenthealth.autosync`.
   - Repo: `/Users/jonathanrouwhorst/presenthealthdpc`
   - Remote: private `origin/master`
   - Daemon script: `scripts/autosync/git-autosync-daemon.sh`

2. **GitHub -> Cloud Run Is Mandatory**
   - Every push triggers `.github/workflows/deploy-cloud-run.yml`.
   - Target service: `present-health-dpc`
   - Project: `present-health-dpc-2025`
   - Region: `us-central1`

3. **Cloud Verification Uses gcloud**
   - Use `gcloud` for deploy verification and cloud-state inspection instead of assuming CI/CD status.

4. **Mistake Memory**
   - Every fixed mistake must be added concisely to `AGENTS.md` as `symptom -> fix`.
