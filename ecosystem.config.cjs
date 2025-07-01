module.exports = {
  apps: [{
    name: 'lit-bot',
    script: 'lit-bot.js',
    interpreter: 'node',
    env: {
      PORT: 3334,
      LIT_BOT_NSEC: process.env.LIT_BOT_NSEC,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/lit-bot-error.log',
    out_file: './logs/lit-bot-out.log',
    log_file: './logs/lit-bot-combined.log',
    time: true
  }]
};