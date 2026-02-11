#!/usr/bin/env bash

set -euo pipefail

REPO_DIR=""
DEBOUNCE_SECONDS=20
POLL_SECONDS=5
REMOTE_NAME="origin"
TARGET_BRANCH=""
COMMIT_PREFIX="chore(autosync): checkpoint"
LOG_FILE=""

usage() {
  cat <<'EOF'
Usage: git-autosync-daemon.sh [options]

Options:
  --repo <path>               Git repo path (required)
  --debounce-seconds <n>      Seconds to wait after last detected change (default: 20)
  --poll-seconds <n>          Poll interval in seconds (default: 5)
  --remote <name>             Git remote name to push to (default: origin)
  --branch <name>             Branch to push (default: current branch)
  --commit-prefix <text>      Prefix for commit message
  --log-file <path>           Optional log file path
  --help                      Show this help
EOF
}

log() {
  local message="$1"
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  if [[ -n "$LOG_FILE" ]]; then
    printf '%s %s\n' "$ts" "$message" >>"$LOG_FILE"
  else
    printf '%s %s\n' "$ts" "$message"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_DIR="$2"
      shift 2
      ;;
    --debounce-seconds)
      DEBOUNCE_SECONDS="$2"
      shift 2
      ;;
    --poll-seconds)
      POLL_SECONDS="$2"
      shift 2
      ;;
    --remote)
      REMOTE_NAME="$2"
      shift 2
      ;;
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --commit-prefix)
      COMMIT_PREFIX="$2"
      shift 2
      ;;
    --log-file)
      LOG_FILE="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REPO_DIR" ]]; then
  echo "--repo is required" >&2
  usage
  exit 1
fi

if ! [[ "$DEBOUNCE_SECONDS" =~ ^[0-9]+$ ]] || ! [[ "$POLL_SECONDS" =~ ^[0-9]+$ ]]; then
  echo "--debounce-seconds and --poll-seconds must be integers" >&2
  exit 1
fi

if (( DEBOUNCE_SECONDS < 1 )); then
  echo "--debounce-seconds must be >= 1" >&2
  exit 1
fi

if (( POLL_SECONDS < 1 )); then
  echo "--poll-seconds must be >= 1" >&2
  exit 1
fi

REPO_DIR="$(cd "$REPO_DIR" && pwd)"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Not a git repository: $REPO_DIR" >&2
  exit 1
fi

if [[ -n "$LOG_FILE" ]]; then
  mkdir -p "$(dirname "$LOG_FILE")"
fi

cd "$REPO_DIR"

if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi

if [[ -z "$TARGET_BRANCH" || "$TARGET_BRANCH" == "HEAD" ]]; then
  log "Autosync disabled: detached HEAD"
  exit 1
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  log "Autosync disabled: remote '$REMOTE_NAME' does not exist"
  exit 1
fi

log "Autosync daemon started (repo=$REPO_DIR, branch=$TARGET_BRANCH, debounce=${DEBOUNCE_SECONDS}s, poll=${POLL_SECONDS}s)"

last_status_fingerprint=""
last_change_epoch=0
has_pending_changes=0

sync_once() {
  if [[ -f .git/MERGE_HEAD ]] || [[ -f .git/CHERRY_PICK_HEAD ]] || [[ -f .git/REVERT_HEAD ]] || [[ -d .git/rebase-merge ]] || [[ -d .git/rebase-apply ]]; then
    log "Skipping sync: git operation in progress"
    return 1
  fi

  if [[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)" != "$TARGET_BRANCH" ]]; then
    log "Skipping sync: current branch changed"
    return 1
  fi

  git add -A

  if git diff --cached --quiet; then
    return 0
  fi

  local commit_message
  commit_message="$COMMIT_PREFIX $(date '+%Y-%m-%d %H:%M:%S')"

  if ! git commit -m "$commit_message" >/dev/null 2>&1; then
    log "Commit failed (hooks or conflicts may need attention)"
    return 1
  fi

  if git rev-parse --abbrev-ref "${TARGET_BRANCH}@{upstream}" >/dev/null 2>&1; then
    if git push "$REMOTE_NAME" "$TARGET_BRANCH" >/dev/null 2>&1; then
      log "Pushed commit to $REMOTE_NAME/$TARGET_BRANCH"
      return 0
    fi
    log "Push failed (network/auth/remote issue)"
    return 1
  fi

  if git push -u "$REMOTE_NAME" "$TARGET_BRANCH" >/dev/null 2>&1; then
    log "Pushed commit and set upstream to $REMOTE_NAME/$TARGET_BRANCH"
    return 0
  fi

  log "Push failed while setting upstream"
  return 1
}

while true; do
  status_output="$(git status --porcelain=v1 --untracked-files=all)"

  if [[ -n "$status_output" ]]; then
    has_pending_changes=1
    current_fingerprint="$(printf '%s' "$status_output" | shasum | awk '{print $1}')"

    if [[ "$current_fingerprint" != "$last_status_fingerprint" ]]; then
      last_status_fingerprint="$current_fingerprint"
      last_change_epoch="$(date +%s)"
      log "Change detected; waiting for debounce window"
    fi

    now_epoch="$(date +%s)"
    elapsed=$(( now_epoch - last_change_epoch ))

    if (( elapsed >= DEBOUNCE_SECONDS )); then
      if sync_once; then
        has_pending_changes=0
        last_status_fingerprint=""
        last_change_epoch=0
      else
        # Retry on next loop after another debounce window
        last_change_epoch="$(date +%s)"
      fi
    fi
  else
    if (( has_pending_changes == 1 )); then
      log "Working tree clean"
    fi
    has_pending_changes=0
    last_status_fingerprint=""
    last_change_epoch=0
  fi

  sleep "$POLL_SECONDS"
done
