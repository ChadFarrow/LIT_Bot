module.exports = {
  apps: [{
    name: 'lit-bot',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3337,
      IRC_ENABLED: 'true',
      IRC_SERVER: 'irc.zeronode.net',
      IRC_CHANNELS: '#BowlAfterBowl,#HomegrownHits,#SirLibre,#DoerfelVerse',
      LIT_BOT_NSEC: process.env.LIT_BOT_NSEC
    }
  }]
};
