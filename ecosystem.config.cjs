module.exports = {
  apps: [{
    name: 'lit-bot',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3334,
      IRC_ENABLED: 'true',
      IRC_SERVER: 'irc.zeronode.net',
      IRC_PORT: 6667,
      IRC_SECURE: 'false',
      IRC_USERNAME: 'ircbots',
      IRC_NICKNAME: 'LIT_Bot',
      IRC_PASSWORD: '',
      IRC_CHANNELS: '#BowlAfterBowl,#HomegrownHits,#SirLibre,#DoerfelVerse',
      LIT_BOT_NSEC: process.env.LIT_BOT_NSEC
    }
  }]
};
