#!/bin/bash
# Auto-restart script for LIT Bot

cd /home/server/bots/LIT_Bot

while true; do
    echo "[$(date)] Starting LIT Bot..."
    npm start
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "[$(date)] LIT Bot exited cleanly (code 0), restarting..."
    else
        echo "[$(date)] LIT Bot crashed (code $EXIT_CODE), restarting in 5 seconds..."
        sleep 5
    fi
done