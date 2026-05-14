# Core Principles

- Local -> GitHub is automatic for this repo. Keep the `launchd` agent `com.presenthealth.autosync` installed and running. It autosyncs `/Users/jonathanrouwhorst/presenthealthmd` to `origin/master` via `scripts/autosync/git-autosync-daemon.sh`.
- `/Users/jonathanrouwhorst/presenthealthdpcbackup` is the legacy DPC workspace. Do not treat it as the active source of truth unless explicitly asked to work on the old DPC version.
- GitHub -> Cloud is automatic. Every push triggers `.github/workflows/deploy-cloud-run.yml`, which builds and deploys Cloud Run service `present-health-dpc` in project `present-health-dpc-2025`, region `us-central1`. The Cloud Run/GitHub resource names still contain `dpc` for historical continuity, but the active product strategy is Present Health MD / insurance-first virtual primary care.
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
- Internal signal tooling can bleed into member UX -> keep trend discovery and SEO workflows in admin, not the membership dashboard.
- X bearer tokens can still fail on v2 search -> mint a fresh app-only token from API key/secret and confirm the app is attached to a Project with the required API access level.
- Batch media export loops can silently mangle hero asset names -> generate final clip filenames explicitly and verify the output directory before wiring UI.
- Hero media effects can trip React lint with synchronous resets -> derive video rendering from capability state and only flip readiness from async callbacks.
- Cloud Run deploys from Apple Silicon can fail with `exec format error` -> use GitHub Actions or Cloud Build for linux/amd64 images instead of local arm64 Docker pushes.
- Local review screenshots can leak into autosync commits -> ignore `/.tmp/` and untrack temporary captures before using browser screenshot tools.
- Broad `__pycache__` cleanup can delete tracked bundled SDK files -> restore tracked files first, then remove only untracked cache files shown by `git status`.
- Autosync can keep watching the retired DPC folder after a strategy shift -> reinstall `com.presenthealth.autosync` with `--repo /Users/jonathanrouwhorst/presenthealthmd --branch master`.
- Repointing autosync can commit local Codex config -> ignore `/.codex/` and untrack any `.codex` files before leaving autosync running.
