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

## Development Workflow

### Safe Development Process
1. **Create a backup branch**: `git checkout -b backup-working-version`
2. **Create development branch**: `git checkout -b feature-new-post-format`
3. **Test changes locally** before deploying
4. **Use test mode** for development (see below)

### Test Mode Setup
Create a test configuration to avoid posting to live relays during development:
```bash
# Set test environment variable
export TEST_MODE=true

# Start bot in test mode
TEST_MODE=true PORT=3002 npm start
```

### Quick Rollback
If something breaks:
```bash
# Stop the bot
pkill -f helipad-webhook

# Switch back to working version
git checkout backup-working-version

# Restart bot
PORT=3002 npm start
```

### Starting Development Session
```bash
# Stop any running bot
pkill -f helipad-webhook

# Wait a moment
sleep 2

# Start in test mode on development branch
TEST_MODE=true PORT=3002 npm start
```

### Port Already in Use Fix
If you get "EADDRINUSE" error:
```bash
# Kill all helipad processes
pkill -f helipad-webhook

# Wait and try again
sleep 2 && TEST_MODE=true PORT=3002 npm start
```

### Current Branch Status
- **backup-working-version**: Safe working copy pushed to GitHub
- **improve-nostr-posts**: Development branch for experimenting
- **main**: Original branch

### Test Mode Features
When `TEST_MODE=true`:
- ✅ Processes webhooks normally
- ✅ Shows what would be posted (content, tags, relays)
- ❌ Does NOT actually post to Nostr relays
- 🧪 Logs start with "TEST MODE" indicator