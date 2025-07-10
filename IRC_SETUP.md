# IRC Setup Guide for LIT Bot

Your LIT Bot can now post live podcast notifications to IRC channels! Here's how to configure it.

## Environment Variables

Add these variables to your `.env` file:

```bash
# Enable IRC functionality
IRC_ENABLED=true

# IRC Server Configuration
IRC_SERVER=irc.libera.chat
IRC_PORT=6667
IRC_SECURE=false

# Bot Identity
IRC_NICKNAME=LITBot
IRC_USERNAME=litbot
IRC_REALNAME=LIT Bot - Live Podcast Notifications
IRC_PASSWORD=

# Channels to post to (comma-separated)
IRC_CHANNELS=#noagenda,#podcasting
```

## No Agenda Troll Room Setup

To post to the No Agenda Troll Room specifically:

```bash
IRC_ENABLED=true
IRC_SERVER=irc.noagenda.stream
IRC_PORT=6667
IRC_SECURE=false
IRC_NICKNAME=LITBot
IRC_USERNAME=litbot
IRC_REALNAME=LIT Bot - Live Podcast Notifications
IRC_CHANNELS=#noagenda
```

## Other Popular IRC Networks

### Libera.Chat
```bash
IRC_SERVER=irc.libera.chat
IRC_PORT=6667
IRC_CHANNELS=#podcasting,#livepodcast
```

### Freenode
```bash
IRC_SERVER=irc.freenode.net
IRC_PORT=6667
IRC_CHANNELS=#podcasting
```

## Security Notes

- Most IRC servers don't require passwords for public channels
- If you need to register your bot nickname, set `IRC_PASSWORD`
- Some networks require SASL authentication for registered nicknames

## Testing

1. Set `TEST_MODE=true` to prevent actual posting
2. Check the bot logs for IRC connection status
3. Visit `http://localhost:3334/api/stats` to see IRC status

## Troubleshooting

- Check that the IRC server and port are correct
- Ensure the channel names start with `#`
- Verify the bot nickname isn't already in use
- Check logs for connection errors

## Dashboard Integration

The bot dashboard now shows:
- IRC connection status
- Number of IRC posts made
- IRC server and channel information

Visit `http://localhost:3334` to see the updated dashboard. 