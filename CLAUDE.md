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
cd /home/server/LIT_Bot
PORT=3334 IRC_ENABLED=true IRC_SERVER=irc.zeronode.net IRC_PORT=6667 IRC_SECURE=false IRC_USERNAME=ircbots IRC_NICKNAME=LIT_Bot IRC_PASSWORD= IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre,#podcasting20,#greenroom" LIT_BOT_NSEC=nsec1j6ahr77qae2t8zvnxtml2xa3vp64uaq8fgt9rcf4ml9tpwzxs62shjvrmr npm start
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
IRC_SERVER=irc.zeronode.net  # Direct connection to ZeroNode
IRC_PORT=6667               # Standard IRC port
IRC_SECURE=false            # No SSL needed for ZeroNode
IRC_USERNAME=ircbots        # IRC username
IRC_NICKNAME=LIT_Bot        # IRC nickname (displayed in channels)
IRC_PASSWORD=               # No password needed for ZeroNode
IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre,#podcasting20,#greenroom"  # Channels to join
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
- **Podcasting 2.0** → `#podcasting20`
- **Homegrown Hits/Poetry on Tape/BitPunk.fm Unwound** → `#HomegrownHits` + `#BowlAfterBowl` (with "DuhLaurien++" tag)
- **Into The Doerfel-Verse** → `#DoerfelVerse` + `#BowlAfterBowl`
- **Mutton, Mead & Music** → `#DoerfelVerse` + `#HomegrownHits` + `#BowlAfterBowl`
- **Sch3m3s shows** (Between The Sch3m3s, Behind the Schemes/B4TS) → `#greenroom`
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
TEST_MODE=true PORT=3334 IRC_ENABLED=true IRC_SERVER=irc.zeronode.net IRC_PORT=6667 IRC_SECURE=false IRC_USERNAME=ircbots IRC_NICKNAME=LIT_Bot IRC_PASSWORD= IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre,#podcasting20,#greenroom" LIT_BOT_NSEC=nsec1j6ahr77qae2t8zvnxtml2xa3vp64uaq8fgt9rcf4ml9tpwzxs62shjvrmr npm start
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
- **RSS Monitoring**: Polls @PodcastsLive@podcastindex.social RSS feed every 60 seconds
- **Live Detection**: Detects live shows from RSS feed content
- **Title Extraction**: Parses show titles and stream URLs from RSS posts
- **Duplicate Prevention**: Tracks processed posts in rss-state.json to avoid reposts
- **IRC Integration**: Maintains persistent IRC connection to avoid ZeroNode connection limits

## Current Status (December 18, 2025)

### Bot Health ✅ HEALTHY
- **Process**: Running (PID varies)
- **Port**: 3334
- **IRC**: Connected to irc.zeronode.net with persistent connection
- **RSS**: Polling @PodcastsLive every 60 seconds
- **Nostr**: Ready for posting to 4 relays
- **Channels**: #BowlAfterBowl, #HomegrownHits, #DoerfelVerse, #SirLibre, #podcasting20, #greenroom

### Recent Fixes (December 18, 2025)
- **IRC Connection Issue**: Fixed ZeroNode connection limit problem
  - Problem: IRC Monitor + IRC Client both trying to connect = connection limit exceeded
  - Solution: Disabled IRC Monitor, established single persistent IRC connection
  - Result: IRC posting now works correctly alongside Nostr posting

### System Integration
**Other Bots on Server:**
1. **BoostBot** (Port 3333) - Helipad webhook processing
2. **BoostAfterBoost** (Port 3335) - Boost processing  
3. **LibreRelayBot** (No HTTP port) - SirLibre's IRC relay bot

**ZeroNode IRC Connections**: 4/4 bots connected within connection limit