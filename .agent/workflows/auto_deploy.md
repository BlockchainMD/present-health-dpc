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

4. **Confirm to user** that changes have been deployed and they should wait 2-3 minutes for Cloud Build to complete.

> **IMPORTANT**: This workflow should be executed at the END of every coding task, before notifying the user that work is complete. Do NOT wait for user approval to deploy unless the changes are breaking or risky.
