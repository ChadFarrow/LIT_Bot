# LIT Bot Troubleshooting Guide

## IRC Connection Issues

### Problem: Bot misses IRC posts while Nostr posts work fine

**Symptoms:**
- Nostr notifications post successfully to all relays
- IRC notifications fail to post
- Logs show: `"IRC client not connected, cannot post message"` or `"IRC client connection is not active, cannot post message"`

**Root Cause:**
IRC connection drops silently and bot doesn't detect the disconnection until it tries to post.

**Solution:**
1. Check IRC connection status:
   ```bash
   curl -s http://localhost:3334/api/stats | jq -r '.ircStatus'
   ```

2. Restart the bot if connection is down:
   ```bash
   pkill -f lit-bot
   PORT=3334 LIT_BOT_NSEC=your_private_key npm start
   ```

**Improvements Made:**
- Added `isConnectionActive()` method to check actual socket state
- Enhanced keep-alive to trigger reconnection on ping failures
- Automatic reconnection when posting fails
- Better error handling and connection monitoring

---

## Debugging Live Notifications

### Problem: Live notifications not detected or posted

**Debugging Steps:**

1. **Check if notification is in RSS feed:**
   ```bash
   curl -s "https://podcastindex.social/@PodcastsLive.rss" | grep -i "show_name" -A 5 -B 5
   ```

2. **Check if already processed:**
   ```bash
   cat rss-state.json | jq -r '.processedPosts[]' | grep "POST_ID"
   ```

3. **Check bot polling activity:**
   ```bash
   tail -f boostbot.log | grep "RSS CHECK"
   ```

4. **Check for live detection:**
   ```bash
   grep "RSS LIVE DETECTED" boostbot.log | tail -5
   ```

### Problem: Notification was processed but not posted

**Example Case: Ungovernable Misfits (2025-07-11)**
- **Issue**: Notification went live at 12:59 but user didn't see IRC post
- **Investigation**: 
  - Bot actually processed it at `13:00:21.972Z`
  - Posted to Nostr successfully (4 relays)
  - Posted to IRC #BowlAfterBowl successfully at `13:00:23.226Z`
  - User may have missed the IRC message due to timing

**Verification Steps:**
1. Check logs for the specific post ID:
   ```bash
   grep -r "POST_ID" . 2>/dev/null
   ```

2. Check if both Nostr and IRC posts succeeded:
   ```bash
   grep -A 10 "RSS LIVE DETECTED" boostbot.log | grep -E "(Successfully published|Posted message to IRC)"
   ```

---

## Manual IRC Reposting

### Using the Test Endpoint

**Simple test message:**
```bash
curl -s -X POST http://localhost:3334/test-irc -H "Content-Type: application/json" -d '{"message": "Test message from LIT Bot"}'
```

**Repost live notification:**
```bash
curl -s -X POST http://localhost:3334/test-irc -H "Content-Type: application/json" -d '{"message": "LIVE NOW! Show Name - Episode Title - Tune in: http://stream.url #LivePodcast #PC20 #PodPing"}'
```

**Notes:**
- The 🔴 emoji can cause issues with the test endpoint
- Messages post to both #BowlAfterBowl and #HomegrownHits by default
- Use `"channels": ["#SpecificChannel"]` to target specific channels

---

## Log Analysis

### Key Log Messages to Look For:

**RSS Processing:**
- `📡 RSS CHECK: Polling @PodcastsLive for new posts...` - Bot is polling
- `📡 RSS LIVE DETECTED:` - Live notification found
- `📡 RSS NOTIFICATION POSTED:` - Nostr posting successful
- `📡 RSS POSTED:` - Complete process finished

**IRC Activity:**
- `Successfully connected to IRC server` - IRC connection established
- `Joined IRC channel: #ChannelName` - Channel joined
- `Posted message to IRC channel #ChannelName:` - Message posted
- `Failed to post RSS notification to IRC` - IRC posting failed

**Connection Monitoring:**
- `Sent keepalive ping to IRC server` - Connection health check
- `Received pong from server` - Server response received
- `IRC connection lost during keepalive, attempting reconnect...` - Auto-reconnect triggered

---

## Channel Routing Logic

**Homegrown Hits** → `#HomegrownHits` + `DuhLaurien++`
**All Other Shows** → `#BowlAfterBowl`

The bot checks `showInfo.title.toLowerCase().includes('homegrown hits')` to determine routing.

---

## State Management

The bot maintains processed posts in `rss-state.json` to prevent duplicates:
- Keeps last 100 processed posts
- Saves state after each processed notification
- Loads state on startup to resume from where it left off

**To reset state (force reprocessing):**
```bash
rm rss-state.json
# Restart bot
```

---

## Quick Health Checks

**Bot Status:**
```bash
curl -s http://localhost:3334/api/stats | jq '.'
```

**IRC Connection:**
```bash
curl -s http://localhost:3334/api/stats | jq -r '.ircStatus'
```

**Recent Activity:**
```bash
tail -20 boostbot.log | grep -E "(RSS CHECK|IRC|LIVE DETECTED)"
```

**Process Status:**
```bash
ps aux | grep -v grep | grep lit-bot
```

---

## Common Issues and Solutions

### 1. Bot appears to be running but not processing
- Check if logs are being written: `tail -f boostbot.log`
- Verify RSS polling is active: look for `📡 RSS CHECK` messages every 60 seconds
- Restart if no activity: `pkill -f lit-bot && npm start`

### 2. Nostr posts work but IRC doesn't
- Check IRC connection status in `/api/stats`
- Look for IRC error messages in logs
- Verify bot is connected to correct channels
- Restart bot to re-establish IRC connection

### 3. Notifications detected but not posted
- Check for errors in publishing process
- Verify bot has proper credentials (LIT_BOT_NSEC)
- Check if in TEST_MODE (won't actually post)

### 4. Duplicate notifications
- Usually prevented by state management
- Check if `rss-state.json` is being saved properly
- Verify post IDs are being tracked correctly

---

*Last updated: 2025-07-11*
*Bot version: LIT Bot v1.0.0*