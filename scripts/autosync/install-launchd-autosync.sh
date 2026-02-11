#!/usr/bin/env bash

set -euo pipefail

LABEL="com.presenthealth.autosync"
DEBOUNCE_SECONDS=20
POLL_SECONDS=5
REMOTE_NAME="origin"
TARGET_BRANCH=""

usage() {
  cat <<'EOF'
Usage: install-launchd-autosync.sh [options]

Options:
  --repo <path>               Repo path (default: current git root)
  --branch <name>             Branch to autosync (default: current branch)
  --remote <name>             Remote name (default: origin)
  --debounce-seconds <n>      Debounce seconds before sync (default: 20)
  --poll-seconds <n>          Poll interval seconds (default: 5)
  --label <name>              launchd label (default: com.presenthealth.autosync)
  --help                      Show this help
EOF
}

REPO_DIR=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_DIR="$2"
      shift 2
      ;;
    --branch)
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --remote)
      REMOTE_NAME="$2"
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
    --label)
      LABEL="$2"
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
  REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
fi

if [[ -z "$REPO_DIR" ]]; then
  echo "Unable to determine repo directory. Pass --repo." >&2
  exit 1
fi

REPO_DIR="$(cd "$REPO_DIR" && pwd)"

if [[ ! -d "$REPO_DIR/.git" ]]; then
  echo "Not a git repository: $REPO_DIR" >&2
  exit 1
fi

if [[ -z "$TARGET_BRANCH" ]]; then
  TARGET_BRANCH="$(cd "$REPO_DIR" && git rev-parse --abbrev-ref HEAD)"
fi

if [[ "$TARGET_BRANCH" == "HEAD" ]]; then
  echo "Detached HEAD is not supported. Checkout a branch and retry." >&2
  exit 1
fi

DAEMON_SCRIPT="$REPO_DIR/scripts/autosync/git-autosync-daemon.sh"
if [[ ! -x "$DAEMON_SCRIPT" ]]; then
  echo "Autosync daemon script not found or not executable: $DAEMON_SCRIPT" >&2
  exit 1
fi

LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENTS_DIR/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/$LABEL.log"

mkdir -p "$LAUNCH_AGENTS_DIR" "$LOG_DIR"

cat >"$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/bash</string>
      <string>$DAEMON_SCRIPT</string>
      <string>--repo</string>
      <string>$REPO_DIR</string>
      <string>--debounce-seconds</string>
      <string>$DEBOUNCE_SECONDS</string>
      <string>--poll-seconds</string>
      <string>$POLL_SECONDS</string>
      <string>--remote</string>
      <string>$REMOTE_NAME</string>
      <string>--branch</string>
      <string>$TARGET_BRANCH</string>
      <string>--log-file</string>
      <string>$LOG_FILE</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$LOG_FILE</string>

    <key>StandardErrorPath</key>
    <string>$LOG_FILE</string>
  </dict>
</plist>
EOF

# Reload safely if already present
launchctl bootout "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST_PATH"
launchctl enable "gui/$UID/$LABEL"
launchctl kickstart -k "gui/$UID/$LABEL"

echo "Installed and started launchd autosync: $LABEL"
echo "Plist: $PLIST_PATH"
echo "Log:   $LOG_FILE"
echo "Repo:  $REPO_DIR"
echo "Branch:$TARGET_BRANCH"
