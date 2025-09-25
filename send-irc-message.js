import irc from 'irc';

const client = new irc.Client('irc.zeronode.net', 'LITBot', {
  port: 6667,
  secure: false,
  password: '',
  autoRejoin: false,
  autoConnect: true,
  channels: ['#BowlAfterBowl'],
  realName: 'LIT Bot Test',
  userName: 'lit_bot'
});

client.on('registered', () => {
  console.log('Connected to IRC');
  setTimeout(() => {
    const message = process.argv[2] || '🔴 TEST: LIT_Bot IRC connection through ZNC working!';
    client.say('#BowlAfterBowl', message);
    console.log('Message sent');
    setTimeout(() => {
      client.disconnect();
      process.exit(0);
    }, 1000);
  }, 1000);
});

client.on('error', (error) => {
  console.error('IRC Error:', error);
  process.exit(1);
});