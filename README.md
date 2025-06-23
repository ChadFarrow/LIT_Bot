# Nostr Boost Bot

A sophisticated webhook receiver that connects [Helipad](https://github.com/Podcastindex-org/helipad) to Nostr, intelligently posting boost announcements and daily Value4Value summaries.

> **⚠️ PROOF OF CONCEPT NOTICE**  
> This project is a proof of concept that has been heavily modified for personal use. While functional, it may require significant customization for your specific setup. Your mileage may vary. Contributions and improvements are welcome!

## Getting Started from Scratch

### Prerequisites

You'll need Node.js (18+ recommended) and a Nostr identity. Here's how to get everything set up on your platform:

#### Install Node.js

**Windows:**
```powershell
# Download and install from https://nodejs.org
# Or use Chocolatey package manager
choco install nodejs

# Verify installation
node --version
npm --version
```

**macOS:**
```bash
# Download from https://nodejs.org
# Or use Homebrew
brew install node

# Verify installation
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Linux (CentOS/RHEL):**
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

#### Get a Nostr Identity

1. **Generate keys** using any Nostr client (Damus, Amethyst, Iris, etc.)
2. **Online tools**: https://nostrtool.com or https://rana.lt
3. **Save your nsec private key** securely - you'll need it for the bot

#### Set Up Helipad

Follow the [Helipad installation guide](https://github.com/Podcastindex-org/helipad) to set up your Lightning payment processor.

### Quick Start

**Windows (PowerShell):**
```powershell
# Clone and setup
git clone https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git
cd Helipad-to-Nostr-BoostBot
npm install

# Create environment file
New-Item .env -ItemType File
notepad .env

# Add your configuration (see below)
# Start the bot
$env:PORT=3002; npm start
```

**macOS/Linux:**
```bash
# Clone and setup
git clone https://github.com/ChadFarrow/Helipad-to-Nostr-BoostBot.git
cd Helipad-to-Nostr-BoostBot
npm install

# Create environment file
touch .env
nano .env  # or vim, code, etc.

# Add your configuration (see below)
# Start the bot
PORT=3002 npm start
```

### Environment Configuration

Add this to your `.env` file:

```env
# Your Nostr private key (keep this secret!)
NOSTR_BOOST_BOT_NSEC=nsec1your_actual_private_key_here

# Port for the webhook
PORT=3002

# Random secret token (generate a strong one)
HELIPAD_WEBHOOK_TOKEN=your_random_secret_like_abc123xyz789

# Optional: Enable test mode (prevents actual Nostr posts)
# TEST_MODE=true
```

### Configure Helipad Webhook

In your Helipad settings:
- **Webhook URL**: `http://your-server-ip:3002/helipad-webhook`
- **Authorization Token**: Your `HELIPAD_WEBHOOK_TOKEN` value
- **Triggers**: Enable "New sent boosts" only

### Testing Your Setup

**Health Check:**
```bash
# Windows (PowerShell)
Invoke-WebRequest http://localhost:3002/health

# macOS/Linux
curl http://localhost:3002/health
```

**Test Daily Summary:**
```bash
# Windows (PowerShell)
Invoke-WebRequest http://localhost:3002/test-daily-summary

# macOS/Linux  
curl http://localhost:3002/test-daily-summary
```

### Production Deployment

#### Using PM2 (Recommended)

**Install PM2:**
```bash
# All platforms
npm install -g pm2
```

**Windows:**
```powershell
# Start bot with PM2
pm2 start npm --name "nostr-boost-bot" -- start
pm2 save
pm2-windows-startup install
```

**macOS/Linux:**
```bash
# Start bot with PM2
pm2 start "PORT=3002 npm start" --name nostr-boost-bot
pm2 save
pm2 startup
# Follow the displayed instructions
```

#### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
USER node
CMD ["npm", "start"]
```

**Build and run:**
```bash
# All platforms
docker build -t nostr-boost-bot .
docker run -d --name nostr-boost-bot -p 3002:3002 --env-file .env nostr-boost-bot
```

### Troubleshooting Setup

**Node.js Issues:**
- Ensure you have Node.js 18 or higher
- Try clearing npm cache: `npm cache clean --force`
- On Windows, you might need Visual Studio Build Tools

**Port Issues:**
```bash
# Windows - Check port usage
netstat -ano | findstr :3002

# macOS/Linux - Check port usage  
lsof -i :3002

# Use different port if needed
PORT=3003 npm start
```

**Permission Issues (Linux/macOS):**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

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

### Default Nostr Relays
The bot posts to these relays by default:
- `wss://relay.damus.io` - Damus relay
- `wss://relay.nostr.band` - Nostr.band relay  
- `wss://relay.primal.net` - Primal relay
- `wss://7srr7chyc6vlhzpc2hl6lyungvluohzrmt76kbs4kmydhrxoakkbquad.local/` - ChadF's personal Tor relay
- `wss://chadf.nostr1.com/` - ChadF's personal relay

**Note**: The personal relays are specific to this configuration. You may want to replace them with your own relays or remove them from the default list.

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