#!/bin/bash

echo "=== IRC Connection Monitor ==="
echo "Press Ctrl+C to stop"
echo ""

# Function to check IRC status
check_status() {
    STATUS=$(curl -s http://localhost:3334/api/stats | jq -r '.ircStatus | "Connected: \(.connected), Active: \(.connectionActive), Attempts: \(.reconnectAttempts), Server: \(.server)"')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $STATUS"
}

# Initial status
check_status

# Monitor logs and check status periodically
tail -f boostbot.log.5 | while read line; do
    if echo "$line" | grep -qiE "IRC|reconnect|attempting|max.*reached|connected|joined"; then
        echo "$line"
        # Check status after important events
        if echo "$line" | grep -qiE "connected|attempting|max.*reached"; then
            sleep 1
            check_status
        fi
    fi
done