---
description: Automatically commit and deploy after making code changes
---

After completing any code modifications, ALWAYS follow these steps to ensure changes are deployed:

// turbo-all

1. **Stage all modified files**
   ```bash
   git add -A
   ```

2. **Commit with a descriptive message**
   ```bash
   git commit -m "feat: [Brief description of changes]"
   ```

3. **Push to master to trigger Cloud Build**
   ```bash
   git push origin master
   ```

4. **Wait for deployment** (2-3 minutes for Cloud Build to complete)

5. **Verify deployment via browser**
   - Use the `browser_subagent` tool to navigate to the production URL and verify:
     - The page loads without errors
     - Any new API endpoints return expected responses
     - Any UI changes are visible
   - Example: If you added `/api/admin/migrate`, navigate to `https://presenthealthmd.com/api/admin/migrate` and confirm it returns the expected JSON.

6. **Confirm to user** that changes have been deployed AND verified working in production.

> **IMPORTANT**: This workflow should be executed at the END of every coding task. Do NOT conclude a task until you have verified the deployment is working via browser. If verification fails, debug and redeploy before notifying the user.
