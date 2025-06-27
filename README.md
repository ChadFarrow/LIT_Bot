# LIT_Bot - Live Podcast Notifications

LIT_Bot monitors PodPing events on the Hive blockchain and automatically posts live podcast notifications to Nostr when shows go live.

## Features

- 🔴 **Real-time Live Detection** - Monitors Hive blockchain for PodPing events with `reason=live`
- 📱 **Nostr Integration** - Posts live notifications directly to Nostr
- 🛡️ **Separate Identity** - Uses dedicated Nostr account for live notifications
- ⚡ **Fast Response** - Notifications within ~20 seconds of shows going live
- 🔧 **Easy Setup** - Simple configuration with environment variables

## Quick Start

1. **Clone and Install**
   ```bash
   git clone [your-repo-url]
   cd LIT_Bot
   npm install
   ```

2. **Generate Nostr Key**
   ```bash
   # Install noscl if needed
   go install github.com/fiatjaf/noscl@latest
   
   # Generate key pair
   noscl key-gen
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your LIT_BOT_NSEC
   ```

4. **Run LIT_Bot**
   ```bash
   npm start
   ```

## Configuration

Create a `.env` file with:

```bash
# Required: Your Nostr private key
LIT_BOT_NSEC=your_nostr_private_key_here

# Optional: Port (default: 3334)
PORT=3334

# Optional: Test mode
TEST_MODE=false
```

## How It Works

1. **PodPing Monitoring** - LIT_Bot connects to the Hive blockchain and streams operations
2. **Live Detection** - Filters for `custom_json` operations with `id='podping'` and `reason='live'`
3. **Nostr Posting** - When a live event is detected, posts notification to Nostr relays
4. **Show Discovery** - Extracts show titles from feed URLs for clean notifications

## Post Format

When a show goes live, LIT_Bot posts:

```
🔴 LIVE NOW!

🎧 [Show Title]
📻 Tune in now: [Feed URL]

#LivePodcast #PC20 #PodPing
```

## Commands

```bash
npm start          # Start LIT_Bot
npm run dev        # Start with file watching
npm run health     # Check if running
npm run status     # Get status info
```

## Technical Details

- **Built with**: Node.js, Express, @hiveio/dhive, nostr-tools
- **Monitoring**: Hive blockchain operations stream
- **Relays**: relay.damus.io, relay.nostr.band, nostr.mom, relay.primal.net
- **Port**: 3334 (configurable)

## Development

1. **Test Mode**: Set `TEST_MODE=true` to log without posting
2. **Local Testing**: Bot runs on `http://localhost:3334`
3. **Health Check**: `curl http://localhost:3334/health`
4. **Status**: `curl http://localhost:3334/status`

## Security

- ✅ `.env` file is gitignored to protect your nsec
- ✅ Use `.env.example` as template
- ✅ Never commit private keys to version control

## About PodPing

PodPing is a notification system for podcast updates built on the Hive blockchain. When podcasters publish new episodes or go live, they can send a PodPing notification that apps and services can monitor in real-time.

Learn more: [Podcast Index](https://podcastindex.org)

## License

MIT