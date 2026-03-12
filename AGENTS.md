# Core Principles

- Local -> GitHub is automatic for this repo. Keep the `launchd` agent `com.presenthealth.autosync` installed and running. It autosyncs `/Users/jonathanrouwhorst/presenthealthdpc` to private `origin/master` via `scripts/autosync/git-autosync-daemon.sh`.
- GitHub -> Cloud is automatic. Every push triggers `.github/workflows/deploy-cloud-run.yml`, which builds and deploys Cloud Run service `present-health-dpc` in project `present-health-dpc-2025`, region `us-central1`.
- Use `gcloud` whenever cloud state matters: verify Cloud Run, Artifact Registry, service accounts, deploy status, and runtime config directly instead of guessing.
- After fixing any mistake, append one concise `symptom -> fix` note to `Mistake Memory` in this file.

# Mistake Memory

- Source/runtime mismatch -> run `npm run build`, fix every blocking type/prerender error, then restart the fresh built server before trusting the UI.
- Page copy fixed but browser title still stale -> update route metadata/layout files, not just the page component.
- Register checkout can inherit a logged-in admin session -> prefer submitted guest identity on `/register`; do not trust session email for that form.
- Legacy auth rows can carry non-email values in `User.email` -> normalize the row in Postgres and let session hydration refresh from the canonical DB email.
- `gcloud` verification can dirty the repo via `.gcloud-tmp` -> ignore and untrack that cache before using Cloud Run checks in this workspace.
- `next build` can fail on a stale `.next/lock` -> clear the orphaned build process before retrying.
- `next/font/google` can fail builds on network fetches -> use local CSS font variables in the root layout when build determinism matters.
- Turbopack can panic during production build in this repo -> rerun with `next build --webpack` if the default build path flakes.
- Dashboard features can look production-ready while still shipping seeded mock data -> replace mock feeds with live sources or an explicit unavailable state before exposing them to members.
