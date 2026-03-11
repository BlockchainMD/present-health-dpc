---
description: Deploy the application to production by pushing to GitHub
---

Production deploy path:

1. **Local -> GitHub**
   - Preferred path: `launchd` autosync daemon `com.presenthealth.autosync`
   - Fallback:
   ```bash
   git add -A
   git commit -m "Your descriptive commit message here"
   git push origin master
   ```

2. **GitHub -> Cloud Run**
   - `.github/workflows/deploy-cloud-run.yml` deploys on every push.

3. **Verify deployment with gcloud**
   ```bash
   gcloud run services describe present-health-dpc --region=us-central1 --format='value(status.url)'
   ```
