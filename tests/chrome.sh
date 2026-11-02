#!/bin/sh
# Start the headless Chrome the E2E test drives (CDP on 127.0.0.1:9333).
#
#   ./tests/chrome.sh          # start
#   ./tests/chrome.sh status   # print the CDP endpoint
#   ./tests/chrome.sh stop     # stop the instance started here
#
# --no-sandbox is required when Chrome runs inside another sandbox (for example
# under the DSH agent's file sandbox): its own sandbox cannot initialise there.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROFILE="$HERE/.chrome-profile"
PORT=9333
if [ -n "${CHROME_PATH:-}" ]; then
  CHROME="$CHROME_PATH"
else
  CHROME=""
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    /usr/bin/google-chrome \
    /usr/bin/google-chrome-stable \
    /usr/bin/chromium \
    /usr/bin/chromium-browser \
    /snap/bin/chromium; do
    if [ -x "$candidate" ]; then CHROME="$candidate"; break; fi
  done
  if [ -z "$CHROME" ]; then
    echo "No Chrome/Chromium found. Set CHROME_PATH." >&2
    exit 1
  fi
fi

case "${1:-start}" in
  status)
    curl -s -m 3 "http://127.0.0.1:$PORT/json/version" || true
    ;;
  stop)
    if [ -f "$PROFILE/pid" ]; then
      kill "$(cat "$PROFILE/pid")" 2>/dev/null || true
      rm -f "$PROFILE/pid"
    fi
    ;;
  start)
    mkdir -p "$PROFILE"
    "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
      --disable-crash-reporter --disable-breakpad --hide-scrollbars \
      --remote-debugging-port="$PORT" --user-data-dir="$PROFILE" \
      --no-first-run --no-default-browser-check --window-size=1600,1000 \
      about:blank >"$PROFILE/chrome.log" 2>&1 &
    echo $! > "$PROFILE/pid"
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 0.5
      if curl -s -m 2 "http://127.0.0.1:$PORT/json/version" >/dev/null; then
        echo "chrome ready on 127.0.0.1:$PORT"
        exit 0
      fi
    done
    echo "chrome did not start; see $PROFILE/chrome.log" >&2
    exit 1
    ;;
  *)
    echo "usage: $0 [start|status|stop]" >&2
    exit 2
    ;;
esac
