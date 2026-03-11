---
description: Automatically commit and deploy after making code changes
---

After completing code changes, deployment should happen through the existing automation chain:

1. **Local -> GitHub**
   - Keep `launchd` agent `com.presenthealth.autosync` active.
   - It autosyncs this repo to private `origin/master`.

2. **GitHub -> Cloud Run**
   - `.github/workflows/deploy-cloud-run.yml` runs on every push.
   - It builds and deploys Cloud Run service `present-health-dpc`.

3. **Verify with gcloud**
   - Check deploy state directly:
   ```bash
   gcloud run services describe present-health-dpc --region=us-central1
   ```

4. **If autosync is unavailable**
   - Fallback:
   ```bash
   git add -A
   git commit -m "feat: [Brief description]"
   git push origin master
   ```
