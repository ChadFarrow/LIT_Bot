# LIT Bot - Live Podcast Notifications

## Repository Information
- **Main Repository**: Forked from BoostBot
- **Podcast Index**: https://github.com/Podcastindex-org
- **Purpose**: PodPing integration for posting live podcast notifications to Nostr

## PodPing Integration
- **Monitors**: Hive blockchain for PodPing events
- **Filters**: Only processes events with `reason=live`
- **Posts**: Live notifications to Nostr when shows go live
- **Real-time**: Notifications within ~20 seconds of going live

## Current Bot Configuration
- **Only posts live events**: reason === 'live'
- **Monitors Hive**: Uses @hiveio/dhive for blockchain monitoring
- **Auto-extracts titles**: Attempts to extract show names from feed URLs
- **Runs on port 3336**: Separate from BoostBot (port 3333) and BoostAfterBoost (port 3335)

## Nostr Configuration
- **Environment Variable**: `LIT_BOT_NSEC` (separate from BoostBot)
- **Default Relays**: relay.damus.io, relay.nostr.band, relay.primal.net
- **Post Format**: Live notification with show title and feed URL

## Key Features
- Real-time PodPing monitoring via Hive blockchain
- Automatic live podcast detection
- Clean Nostr notifications for live shows
- Separate identity from BoostBot
- Health monitoring and status endpoints

## Bot Management Commands

### Starting the Bot
```bash
cd /Users/chad-mini/Vibe/LIT_Bot
PORT=3336 LIT_BOT_NSEC=your_private_key npm start
```

### Environment Variables Needed
```bash
# Required
LIT_BOT_NSEC=your_private_key  # Your LIT Bot Nostr private key

# Optional
PORT=3336              # Default port
TEST_MODE=true         # For testing without posting
```

### Checking Bot Status
```bash
# Check if bot is running
ps aux | grep -v grep | grep lit-bot

# Check what's using port 3334
lsof -i :3336

# Health check
curl http://localhost:3336/health

# Status info
curl http://localhost:3336/status
```

### Stopping the Bot
```bash
# Find running processes
ps aux | grep -v grep | grep lit-bot

# Kill specific processes (replace PID with actual process ID)
kill [PID]

# Or kill all lit-bot processes
pkill -f lit-bot
```

## Important Notes
- **Separate Account**: Uses different Nostr account than BoostBot
- **Port 3336**: Runs on different port to avoid conflicts
- **PodPing Only**: Only monitors PodPing, no webhook integration
- **Live Focus**: Only posts when shows go live (reason=live)
- **Real-time**: Near-instant notifications via Hive blockchain monitoring

## Development Workflow

### Safe Development Process
1. **Test Mode**: Set `TEST_MODE=true` to log without posting
2. **Monitor Logs**: Watch console for PodPing events
3. **Test with Live Shows**: Verify notifications work

### Test Mode Setup
```bash
# Set test environment variable
export TEST_MODE=true

# Start bot in test mode
TEST_MODE=true PORT=3336 LIT_BOT_NSEC=your_private_key npm start
```

### Post Format
When a show goes live, LIT_Bot posts:
```
🔴 LIVE NOW!

🎧 [Show Title]
📻 Tune in now: [Feed URL]

#LivePodcast #PC20 #PodPing
```

## Technical Details
- **Hive Monitoring**: Streams operations from Hive blockchain
- **Operation Filtering**: Looks for custom_json with id='podping'
- **Live Detection**: Checks for reason='live' in PodPing data
- **Title Extraction**: Basic URL parsing to extract show names
- **Duplicate Prevention**: Tracks processed operations to avoid reposts