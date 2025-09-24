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
cd /home/server/bots/LIT_Bot
PORT=3334 IRC_ENABLED=true IRC_SERVER=localhost IRC_PORT=6697 IRC_SECURE=true IRC_USERNAME=ircbots IRC_NICKNAME=LIT_Bot IRC_PASSWORD="ircbots/zeronode:bassist89" IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre" LIT_BOT_NSEC=nsec1l8e9jjgwx6h7a6rjxn5r7hrlx5qvqr2fkqxhgc44vc9qhqmfhk2qmxnhkm npm start
```

### Environment Variables Needed
```bash
# Required
LIT_BOT_NSEC=nsec1l8e9jjgwx6h7a6rjxn5r7hrlx5qvqr2fkqxhgc44vc9qhqmfhk2qmxnhkm  # Your LIT Bot Nostr private key

# Optional
PORT=3334              # Default port (changed from 3336)
TEST_MODE=true         # For testing without posting

# IRC Configuration (required for ZeroNode IRC posting)
IRC_ENABLED=true
IRC_SERVER=localhost         # ZNC bouncer on localhost
IRC_PORT=6697               # ZNC SSL port
IRC_SECURE=true             # Use SSL for ZNC connection
IRC_USERNAME=ircbots        # ZNC username
IRC_NICKNAME=LIT_Bot        # IRC nickname (displayed in channels)
IRC_PASSWORD="ircbots/zeronode:bassist89"  # ZNC password format: username/network:password
IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre"  # Channels to join
```

### Checking Bot Status
```bash
# Check if bot is running
ps aux | grep -v grep | grep lit-bot

# Check what's using port 3334
lsof -i :3334

# Health check
curl http://localhost:3334/health

# Status info (includes IRC status)
curl http://localhost:3334/api/stats

# Test IRC posting
curl -X POST http://localhost:3334/test-irc -H "Content-Type: application/json" -d '{"message": "Test message", "channels": ["#BowlAfterBowl"]}'
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
- **Port 3334**: Runs on port 3334 (changed from 3336)
- **RSS Monitoring**: Monitors @PodcastsLive@podcastindex.social RSS feed for live notifications
- **IRC Integration**: Posts to ZeroNode IRC via ZNC bouncer with smart channel routing
- **Live Focus**: Only posts when shows go live
- **Real-time**: Near-instant notifications via RSS monitoring every minute

## IRC Channel Routing Rules
- **Lightning Thrashes** → `#SirLibre`
- **Homegrown Hits/Poetry on Tape/BitPunk.fm Unwound** → `#HomegrownHits` + `#BowlAfterBowl` (with "DuhLaurien++" tag)
- **Into The Doerfel-Verse** → `#DoerfelVerse` + `#BowlAfterBowl`
- **Mutton, Mead & Music** → `#DoerfelVerse` + `#HomegrownHits` + `#BowlAfterBowl`
- **All other shows** → `#BowlAfterBowl`

## Development Workflow

### Safe Development Process
1. **Test Mode**: Set `TEST_MODE=true` to log without posting
2. **Monitor Logs**: Watch console for PodPing events
3. **Test with Live Shows**: Verify notifications work

### Test Mode Setup
```bash
# Set test environment variable
export TEST_MODE=true

# Start bot in test mode (with all IRC settings)
TEST_MODE=true PORT=3334 IRC_ENABLED=true IRC_SERVER=localhost IRC_PORT=6697 IRC_SECURE=true IRC_USERNAME=ircbots IRC_NICKNAME=LIT_Bot IRC_PASSWORD="ircbots/zeronode:bassist89" IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre" LIT_BOT_NSEC=nsec1l8e9jjgwx6h7a6rjxn5r7hrlx5qvqr2fkqxhgc44vc9qhqmfhk2qmxnhkm npm start
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