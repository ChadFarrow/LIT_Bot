# Nostr Boost Bot - Important Information

## Repository Information
- **Main Repository**: https://github.com/Podcastindex-org/helipad
- **Podcast Index**: https://github.com/Podcastindex-org
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

## Persistent Operation (macOS)

### Launch Agent Setup
The bot is now configured to run persistently using macOS launch agents:
- **Auto-start**: Starts automatically when you log in
- **Keep alive**: Continues running when Mac is locked or sleeping
- **Auto-restart**: Automatically recovers from crashes
- **Background operation**: No need to keep Terminal open

### Service Management Commands
```bash
# Check if persistent service is running
npm run service-status

# View service logs
npm run service-logs

# Stop persistent service (if needed)
npm run uninstall-service

# Reinstall persistent service
npm run install-service
```

### Service Details
- **Launch Agent**: `com.boostbot.helipad`
- **Plist Location**: `/Users/chad-mini/Library/LaunchAgents/com.boostbot.helipad.plist`
- **Log File**: `logs/launch-agent.log`
- **Auto-restart Script**: `scripts/auto-restart.js`

### Benefits
✅ Bot runs 24/7 without manual intervention  
✅ Survives Mac sleep, lock, and restarts  
✅ Automatic crash recovery  
✅ No need to keep Terminal open  
✅ Starts automatically when you log in  

## Bot Management Commands

### Starting the Bot
```bash
cd /Users/chad-mini/Vibe/BoostBot
PORT=3333 npm start
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

# Check what's using port 3333
lsof -i :3333

# Check persistent service status
npm run service-status
```

### Restarting the Bot
```bash
# Stop all processes
pkill -f helipad-webhook

# Wait a moment then start
sleep 2 && cd /Users/chad-mini/Vibe/BoostBot && PORT=3333 npm start
```

### Important Notes
- Bot runs on port 3333 (changed from default 3001)
- Webhook URL: `http://localhost:3333/helipad-webhook`
- Health check: `http://localhost:3333/health`
- Only posts boosts ≥25 sats (filters out smaller streaming payments)
- Waits 30 seconds to collect all splits before posting largest one
- **Persistent service**: Now runs automatically via macOS launch agent

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
TEST_MODE=true PORT=3333 npm start
```

### Quick Rollback
If something breaks:
```bash
# Stop the bot
pkill -f helipad-webhook

# Switch back to working version
git checkout backup-working-version

# Restart bot
PORT=3333 npm start
```

### Starting Development Session
```bash
# Stop any running bot
pkill -f helipad-webhook

# Wait a moment
sleep 2

# Start in test mode on development branch
TEST_MODE=true PORT=3333 npm start
```

### Port Already in Use Fix
If you get "EADDRINUSE" error:
```bash
# Kill all helipad processes
pkill -f helipad-webhook

# Wait and try again
sleep 2 && TEST_MODE=true PORT=3333 npm start
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

## Recent Enhancements Completed

### Persistent Operation Setup (January 2025)
✅ **macOS Launch Agent** - Created system service for 24/7 operation  
✅ **Auto-start on Login** - Bot starts automatically when you log in  
✅ **Sleep/Lock Survival** - Continues running when Mac is locked or sleeping  
✅ **Auto-restart on Crashes** - Automatically recovers from failures  
✅ **Background Operation** - No need to keep Terminal open  
✅ **Comprehensive Logging** - All activity logged to `logs/launch-agent.log`  

### Implementation Details
- **Launch Agent Script**: `scripts/install-launch-agent.js`
- **Setup Script**: `setup-persistent-bot.sh`
- **Service Label**: `com.boostbot.helipad`
- **Plist Location**: `/Users/chad-mini/Library/LaunchAgents/com.boostbot.helipad.plist`
- **Auto-restart Monitor**: Uses existing `scripts/auto-restart.js`

### New Commands Added
```bash
npm run install-service    # Install persistent service
npm run service-status     # Check service status
npm run service-logs       # View service logs
npm run uninstall-service  # Remove service
./setup-persistent-bot.sh  # Guided setup
```

### Enhanced Nostr Post Features (June 2025)
✅ **Fixed split spam** - Only posts largest split per boost session  
✅ **Blocked streaming sats** - Filters out payments under 25 sats  
✅ **Added show links** - Reliable Podcast Index links with app chooser  
✅ **Safe development** - Test mode + git branches for future changes  
✅ **Clean posts** - Professional formatting with all relevant info  

### Current Post Format
```
📤 Boost Sent!

👤 Sender: ChadF
💬 Message: [boost message if present]
🎧 Podcast: Lightning Thrashes
📻 Episode: 94 - Lightning Thrashes
💸 Amount: 333 sats
📱 App: CurioCaster
🕒 Time: [timestamp]
🎧 Listen: https://podcastindex.org/podcast/6602332

#Boostagram #Podcasting20 #V4V
```

### Successful Git Workflow Used
1. Created `backup-working-version` branch (pushed to GitHub)
2. Created `improve-nostr-posts` development branch
3. Used `TEST_MODE=true` for safe testing
4. Committed final working version

### Key Technical Details
- **Session grouping**: 60-second time windows by sender/episode/podcast
- **Split detection**: Uses `value_msat` vs `value_msat_total` to find largest
- **Link building**: Extracts `feedID` from TLV data for Podcast Index URLs
- **Amount filtering**: `value_msat_total < 25000` blocks streaming sats
- **Action filtering**: Only processes `action === 2` (boosts)