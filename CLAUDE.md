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
A container in the `/opt/bots` stack on the candr VPS. Deployed from the
`thelounge-candr` repo with `./deploy-bots.sh 104.237.150.197`:
```bash
ssh root@104.237.150.197 'cd /opt/bots && docker compose up -d lit-bot'
```
All the non-secret IRC settings live in `bots/docker-compose.yml`; `LIT_BOT_NSEC`
and `IRC_PASSWORD` live in `/opt/bots/env/lit.env`, mode 600, and nowhere in git.

To run from a checkout locally:
```bash
LIT_BOT_NSEC=... IRC_ENABLED=true IRC_SERVER=irc.zeronode.net npm start
```

### Environment Variables Needed
```bash
# Required -- set in /opt/bots/env/lit.env, never committed
LIT_BOT_NSEC=nsec1...  # Your LIT Bot Nostr private key

# Optional
PORT=3334              # Default port (changed from 3336)
TEST_MODE=true         # For testing without posting

# IRC Configuration (required for ZeroNode IRC posting)
IRC_ENABLED=true
IRC_SERVER=znc              # the shared ZNC container, NOT ZeroNode directly
IRC_PORT=6667               # ZNC's bridge-network listener
IRC_SECURE=false            # plaintext: the bridge network never leaves the box
IRC_USERNAME=ircbots        # IRC username
IRC_NICKNAME=LIT_Bot        # IRC nickname (displayed in channels)
IRC_PASSWORD=ircbots@lit/zeronode:<znc password>   # clientid form -- see below
IRC_CHANNELS="#BowlAfterBowl,#HomegrownHits,#DoerfelVerse,#SirLibre,#podcasting20,#greenroom"  # Channels to join
IRC_NICKSERV_PASSWORD=      # NickServ password — ghosts stale sessions and identifies on connect
```

### Checking Bot Status
```bash
# Check if bot is running
ssh root@104.237.150.197 'cd /opt/bots && docker compose ps lit-bot'

# Health check
curl http://localhost:3334/health

# Status info (includes IRC status)
curl http://localhost:3334/api/stats

# Test IRC posting
curl -X POST http://localhost:3334/test-irc -H "Content-Type: application/json" -d '{"message": "Test message", "channels": ["#BowlAfterBowl"]}'
```

### Stopping the Bot
```bash
ssh root@104.237.150.197 'cd /opt/bots && docker compose stop lit-bot'
# Do NOT docker kill it: restart: unless-stopped brings it straight back.
```

## Important Notes
- **Separate Account**: Uses different Nostr account than BoostBot
- **Port 3334**: Published on loopback only. The code default was 3336, which disagreed with the docs and pm2 and collided with LibreRelayBot; it is 3334 everywhere now.
- **RSS Monitoring**: Monitors @PodcastsLive@podcastindex.social RSS feed for live notifications
- **IRC Integration**: Posts to ZeroNode via the shared ZNC container, with smart channel routing
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

# On the VPS: add TEST_MODE=true to /opt/bots/env/lit.env and restart the container.
ssh root@104.237.150.197 'cd /opt/bots && docker compose restart lit-bot'

# From a local checkout:
TEST_MODE=true IRC_ENABLED=true IRC_SERVER=irc.zeronode.net LIT_BOT_NSEC=... npm start
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
- **Duplicate Prevention**: Tracks processed posts in `rss-state.json`, located via
  `STATE_DIR` (the container bind-mounts `/opt/bots/lit-data` there). **This is the
  only real application state in the whole bots stack** — lose it and the bot reposts
  every live notification it has ever seen. Carry it over on any host move and back
  it up.
- **IRC Integration**: Maintains a persistent connection to the shared ZNC container,
  which in turn holds the single ZeroNode connection for all three bots
- **NickServ Authentication**: If `IRC_NICKSERV_PASSWORD` is set, the bot identifies to NickServ on connect and ghosts any stale session holding its nick. The `LIT_Bot` nick is registered to the ChadF NickServ account on ZeroNode.
- **Nick Mismatch Handling**: IRC client compares against `this.client.nick` (actual server-assigned nick), not the configured nickname. This ensures `joinedChannels` is populated even if the server assigns a different nick (e.g., `LIT_Bot1`).

## Current Status (March 19, 2026)

### Bot Health ✅ HEALTHY
- **Process**: Running (PID varies)
- **Port**: 3334
- **IRC**: Connected to irc.zeronode.net with persistent connection + NickServ auth
- **RSS**: Polling @PodcastsLive every 60 seconds
- **Nostr**: Ready for posting to 4 relays
- **Channels**: #BowlAfterBowl, #HomegrownHits, #DoerfelVerse, #SirLibre, #podcasting20, #greenroom

### Recent Fixes (July 10, 2026)
- **IRC Channel Case Bug**: `irc-client.js` tracked `joinedChannels` in a case-sensitive `Set`. ZeroNode/ZNC echoes JOINs back lowercased (e.g. `#homegrownhits`) while the code requests `#HomegrownHits`, so `joinedChannels.has('#HomegrownHits')` returned false, the bot tried to re-join a channel it was already in, hit the 15s `joinChannels` timeout, and failed the post. This silently killed IRC posts to #HomegrownHits (the Thursday DuhLaurien++ reminder and the Homegrown Hits live notification) — Nostr posting was unaffected. **Trigger:** a ZeroNode server reset forced the first channel rejoin in weeks, exposing the latent bug. **Fix:** added `markJoined`/`markLeft`/`hasJoined` helpers that lowercase-normalize channel names, and routed all joined-state tracking through them so channel matching is case-insensitive. Note: `joinedChannels` is now stored lowercased.

### Recent Fixes (March 19, 2026)
- **IRC Nick Mismatch Bug**: Fixed `irc-client.js` to use `this.client.nick` instead of `this.config.nickname` in join/part/kick handlers. When the server assigned a different nick (e.g., `LIT_Bot1`), `joinedChannels` was never populated, causing the bot to timeout trying to re-join channels it was already in.
- **NickServ Authentication**: Added NickServ GHOST + IDENTIFY on connect to reclaim the `LIT_Bot` nick from stale sessions and protect it from being taken.

### Previous Fixes (December 18, 2025)
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

## Migration to the candr VPS (September 2026)

Moved off the local Ubuntu server (`/home/server/LIT_Bot`, pm2 + a direct ZeroNode
connection) to the candr VPS as a container in the `/opt/bots` stack.

**Why:** the home IP had hit ZeroNode's per-IP connection limit and connections were
being dropped — the reason `MONITOR_PPWATCH` and the IRC Monitor were both disabled.
This bot connected *directly* to ZeroNode; it now goes through a shared ZNC, so all
three bots together cost the VPS one ZeroNode connection instead of three.

```
VPS IP ──1 connection (ZNC user ircbots, nick LIT_Bot)──> ZeroNode
          ├── lit-bot            ircbots@lit/zeronode   — posts
          ├── boost-after-boost  ircbots@bab/zeronode   — read-only
          └── libre-relay-bot    ircbots@lrb/zeronode   — read-only
```

Because the two reader bots are read-only, sharing this bot's nick is invisible to
the network. The `@lit` clientid in `IRC_PASSWORD` is what keeps them distinct ZNC
clients rather than three sessions fighting over one.

**What changed in this repo:**
- `Dockerfile` + `.dockerignore`. Unlike the other two bots this image installs dev
  dependencies (`npm ci`, not `--omit=dev`): `npm start` is `tsx lit-bot.js` because
  `lib/nostr-bot.ts` is TypeScript, and `tsx` is a devDependency. The builder stage
  carries `build-essential`/`python3` for `@hiveio/dhive`'s `secp256k1 ^3.8.0`, which
  is old enough that Node 20 prebuilds are unlikely.
- `lit-bot.js`: `rss-state.json` now resolves via `STATE_DIR` (defaulting to
  `__dirname`, so running from a checkout is unchanged) so the dedupe record lives on
  a bind mount and survives image rebuilds and container recreation.
- `lit-bot.js`: `IRC_SERVER` default `irc.libera.chat` → `irc.zeronode.net`. The old
  default was harmless only because the env always set it — a live footgun for any
  new deployment that forgets to.
- `lit-bot.js`: `PORT` default 3336 → **3334**, matching the docs, `package.json`'s
  health script and compose. 3336 also collided with LibreRelayBot.
- `lib/irc-client.js`: dropped `encoding: 'utf8'`, the fix BoostAfterBoost already
  took. It makes the `irc` library `require('node-icu-charset-detector')` on every
  message; removing it means one fewer native module in the image. It was silent here
  only because `debug: false`.
- Deleted stale launchers: `start-znc.sh` (byte-identical in all three bot repos, all
  writing the same pidfile), `start-with-restart.sh` (`cd /home/server/bots/LIT_Bot`),
  and `check-bot.sh`, `setup-aliases.sh`, `monitor-boostbot.command` (all pointing at
  `/Users/chad-mini/Vibe/BoostBot` on a long-gone laptop).
- Two `LIT_BOT_NSEC` **private keys** were committed in cleartext in this file, in the
  example command lines. They have been removed. Removing them here does **not**
  remove them from git history, so treat both as exposed. Rotating a Nostr key means
  a new npub and a lost follower graph, so that is a deliberate decision, not a
  cleanup — but these keys should be considered public until it happens.

**Cutover note:** copy `rss-state.json` from the old host into `/opt/bots/lit-data/`
*before* the first non-test start, or the bot reposts its whole backlog. Sequence the
nick carefully too: stop the old LIT_Bot before ZNC claims the `LIT_Bot` nick, or let
NickServ GHOST reclaim it (`IRC_NICKSERV_PASSWORD`).

**Rollback:** `ecosystem.config.cjs` is deliberately left in place, so the old host
can take this bot back with `pm2 start ecosystem.config.cjs` once `IRC_SERVER` points
back at ZeroNode directly.
