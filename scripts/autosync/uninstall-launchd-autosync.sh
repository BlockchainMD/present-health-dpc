#!/usr/bin/env bash

set -euo pipefail

LABEL="com.presenthealth.autosync"

usage() {
  cat <<'EOF'
Usage: uninstall-launchd-autosync.sh [--label <name>]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
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

PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl disable "gui/$UID/$LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || true

if [[ -f "$PLIST_PATH" ]]; then
  rm -f "$PLIST_PATH"
fi

echo "Removed launchd autosync: $LABEL"
