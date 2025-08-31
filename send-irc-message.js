import irc from 'irc';

const client = new irc.Client('clover.zeronode.net', 'LIT_Bot', {
  port: 6667,
  secure: false,
  autoRejoin: false,
  autoConnect: true,
  channels: ['#bowlafterbowl'],
  realName: 'LIT Bot',
  userName: 'lit_bot'
});

client.on('registered', () => {
  console.log('Connected to IRC');
  setTimeout(() => {
    client.say('#bowlafterbowl', 'fixed');
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