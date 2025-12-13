# Operational Rules

1. **Continuous Deployment:**
   - AFTER every significant code change or feature completion, you MUST stage, commit, and push changes to `master`.
   - This ensures the Cloud Build pipeline is triggered immediately.
   - Command sequence:
     ```bash
     git add .
     git commit -m "Description"
     git push origin master
     ```
