---
description: Deploy the application to production by pushing to GitHub
---

To deploy the application to Google Cloud Run (via Cloud Build), follow these steps:

1.  **Stage all changes**
    ```bash
    git add .
    ```

2.  **Commit changes**
    *   Use a descriptive commit message explaining what features or fixes are included.
    ```bash
    git commit -m "Your descriptive commit message here"
    ```

3.  **Push to master**
    *   This automatically triggers the Cloud Build pipeline defined in `cloudbuild.yaml`.
    ```bash
    git push origin master
    ```

4.  **Verify Deployment**
    *   You can check the build status in the Google Cloud Console or by running:
    ```bash
    gcloud builds list --limit=1
    ```
