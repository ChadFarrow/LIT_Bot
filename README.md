# Nostr Boost Bot

A sophisticated webhook receiver that connects [Helipad](https://github.com/Podcastindex-org/helipad) to Nostr, intelligently posting boost announcements and daily Value4Value summaries.

## Features

### 🚀 Smart Boost Posts
- **Individual boost announcements** with sender, amount, message, and podcast info
- **App promotion** - Clickable links to boost-supporting podcast apps
- **Show discovery** - Links to podcast pages via Podcast Index
- **Split intelligence** - Groups splits and posts only the largest recipient
- **Stream filtering** - Blocks small streaming payments to prevent spam

### 📊 Daily V4V Summaries
- **Automatic daily reports** posted at midnight
- **Comprehensive tracking** of all streams and boosts
- **Show breakdown** - Lists all podcasts/tracks supported
- **Persistent data** - Survives bot restarts with smart save strategy
- **Manual testing** - Preview daily summaries anytime

### 🛡️ Advanced Filtering
- **Action-based filtering** - Distinguishes boosts from streams using Helipad data
- **Session grouping** - Prevents duplicate posts from split payments
- **Smart delays** - Waits to collect all splits before posting
- **Clean formatting** - Hides empty fields and placeholder values

## Example Posts

### Boost Post
```
📤 Boost Sent!

👤 Sender: ChadF
💬 Message: Great episode about Lightning!
🎧 Podcast: Lightning Thrashes
📻 Episode: 94 - Lightning Thrashes  
💸 Amount: 1,000 sats
📱 App: https://fountain.fm
🎧 Listen: https://podcastindex.org/podcast/6602332

#Boostagram #Podcasting20 #PC20 #V4V
```

### Daily Summary
```
📊 Daily V4V Summary - 2025-06-22

🌊 Streamed: 1,250 sats
📤 Boosted: 500 sats
💰 Total: 1,750 sats

🎧 Streamed to:
• Lightning Thrashes
• The Wait Is Over
• Underwater - Single

🚀 Boosted:
• Lightning Thrashes
• Mike's Mixtape

#V4V #Podcasting20 #PC20 #ValueStreaming #Boostagram
```

## Setup and Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git
cd BoostBot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
Create a `.env` file in the root directory:

```env
# Nostr Bot's private key (starts with npub...)
NOSTR_BOOST_BOT_NSEC=your_private_key_here

# The port your webhook receiver will listen on (default: 3002)
PORT=3002

# A strong, random secret token to share with Helipad
HELIPAD_WEBHOOK_TOKEN=your_webhook_token_here

# Optional: Enable test mode (prevents actual Nostr posts)
# TEST_MODE=true
```

### 4. Run the Server
```bash
# Production
PORT=3002 npm start

# Development/Testing
TEST_MODE=true PORT=3002 npm start
```

### 5. Configure Helipad
- **Webhook URL**: `http://<your-server-ip>:3002/helipad-webhook`
- **Authorization Token**: Your `HELIPAD_WEBHOOK_TOKEN` value
- **Triggers**: Enable "New sent boosts" (received boosts are filtered out)

## Bot Management

### Starting the Bot
```bash
cd /path/to/BoostBot
PORT=3002 npm start
```

### Stopping the Bot
```bash
# Kill all helipad processes
pkill -f helipad-webhook

# Or kill specific process
kill [PID]
```

### Restarting the Bot
```bash
pkill -f helipad-webhook && sleep 2 && PORT=3002 npm start
```

### Health Check
Visit `http://localhost:3002/health` to verify the bot is running.

### Test Daily Summary
Visit `http://localhost:3002/test-daily-summary` to post a test daily summary.

## Configuration

### Supported Podcast Apps
The bot automatically links to these boost-supporting apps:
- CurioCaster, Fountain, Podverse, Castamatic
- Breez, Sphinx, LNBeats, Alby, TrueFans
- And more... (see `lib/nostr-bot.ts` for full list)

### Data Persistence
- Daily stats saved to `daily-stats.json`
- **Auto-save triggers**: Payments ≥1000 sats, payments with messages
- **Scheduled saves**: Hourly backups, daily resets
- **Crash recovery**: Loads previous data on restart

### Filtering Logic
- **Streams** (action=1): Tracked for daily summary, no individual posts
- **Boosts** (action=2): Individual posts + daily summary tracking
- **Split handling**: 2-minute session windows, posts largest split only
- **Empty fields**: Hides "Nameless" placeholders and empty podcast/episode info

## Development

### Test Mode
```bash
TEST_MODE=true PORT=3002 npm start
```
Shows what would be posted without actually posting to Nostr relays.

### Safe Development Workflow
```bash
# Create backup
git checkout -b backup-working-version
git push origin backup-working-version

# Create feature branch
git checkout -b feature-name

# Test changes
TEST_MODE=true PORT=3002 npm start

# Deploy when ready
PORT=3002 npm start
```

### Available Endpoints
- `GET /health` - Health check
- `POST /helipad-webhook` - Main webhook receiver
- `GET /test-daily-summary` - Post test daily summary

## Troubleshooting

### Port Already in Use
```bash
# Find and kill processes using port 3002
lsof -i :3002
kill [PID]

# Or use different port
PORT=3003 npm start
```

### Bot Not Posting
1. Check Helipad webhook configuration
2. Verify `.env` file has correct `NOSTR_BOOST_BOT_NSEC`
3. Ensure Helipad is sending "sent boosts" not "received boosts"
4. Check terminal logs for errors

### Missing Daily Summary
- Daily summaries post at midnight local time
- Use `/test-daily-summary` endpoint to preview
- Check `daily-stats.json` file exists and has data

### Split Posts Still Appearing
- Verify 2-minute session grouping is working
- Check terminal logs for session IDs
- Ensure all splits have same sender/episode/podcast names

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test thoroughly with `TEST_MODE=true`
4. Submit a pull request

## Security Notice

**NEVER** commit your `.env` file to any repository. It contains your private Nostr keys. The project is configured to ignore `.env` files via `.gitignore`.

## Related Projects

- [Helipad](https://github.com/Podcastindex-org/helipad) - Lightning payment processor
- [Podcast Index](https://podcastindex.org) - Podcast discovery and metadata
- [Podcasting 2.0](https://podcasting2.org) - Next generation podcasting

## License

MIT License - see LICENSE file for details.