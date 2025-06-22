# Nostr Boost Bot - Important Information

## Repository Information
- **Main Repository**: https://github.com/Podcastindex-org/helipad
- **Purpose**: Helipad webhook integration for posting boosts to Nostr

## Helipad Action Values
From the Helipad documentation, webhook action field values are:
- `0`: error
- `1`: stream (streaming sats)
- `2`: boost (intentional boost payments)
- `3`: unknown
- `4`: automated boost

## Current Bot Configuration
- **Only posts boosts**: action === 2
- **Skips streaming sats**: action === 1
- **Groups splits**: Posts only the largest split from each boost session
- **Delay**: 30-second delay to collect all splits before posting
- **Session grouping**: 60-second time windows by sender/episode/podcast

## Nostr Relays
Default relays the bot posts to:
- `wss://relay.damus.io`
- `wss://relay.nostr.band`

## Key Features
- Deduplicates splits from the same boost
- Posts only the largest recipient's split
- Includes total boost amount in post
- Filters out streaming payments automatically
- Supports boosts with or without messages

## Bot Management Commands

### Starting the Bot
```bash
cd /Users/chad-mini/Vibe/BoostBot
PORT=3002 npm start
```

### Stopping the Bot
```bash
# Find running processes
ps aux | grep -v grep | grep helipad

# Kill specific processes (replace PID with actual process ID)
kill [PID]

# Or kill all helipad processes
pkill -f helipad-webhook
```

### Checking Bot Status
```bash
# Check if bot is running
ps aux | grep -v grep | grep helipad

# Check what's using port 3002
lsof -i :3002
```

### Restarting the Bot
```bash
# Stop all processes
pkill -f helipad-webhook

# Wait a moment then start
sleep 2 && cd /Users/chad-mini/Vibe/BoostBot && PORT=3002 npm start
```

### Important Notes
- Bot runs on port 3002 (changed from default 3001)
- Webhook URL: `http://localhost:3002/helipad-webhook`
- Health check: `http://localhost:3002/health`
- Only posts boosts ≥25 sats (filters out smaller streaming payments)
- Waits 30 seconds to collect all splits before posting largest one