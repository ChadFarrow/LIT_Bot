import irc from 'irc';

console.log('🔍 Detailed IRC connection test for irc.zeronode.net...\n');

const client = new irc.Client('irc.zeronode.net', 'LIT_Bot', {
  port: 6667,
  secure: false,
  autoRejoin: false,
  autoConnect: true,
  channels: ['#BowlAfterBowl'],
  realName: 'LIT Bot Test',
  userName: 'lit_bot',
  retryCount: 1,
  retryDelay: 2000,
  floodProtection: true,
  floodProtectionDelay: 1000,
  messageSplit: 512
});

console.log('📡 Attempting connection...');

client.on('connecting', () => {
  console.log('🔄 Connecting...');
});

client.on('connected', () => {
  console.log('✅ Connected to server');
});

client.on('registered', () => {
  console.log('✅ Successfully registered with server');
  console.log('🎯 Attempting to join #BowlAfterBowl...');
});

client.on('join', (channel, nick) => {
  console.log(`✅ Joined channel: ${channel} as ${nick}`);
  
  // Test posting a message
  setTimeout(() => {
    console.log('📝 Testing message posting...');
    client.say('#BowlAfterBowl', '🔴 TEST: This is a test message from LIT Bot!');
    console.log('✅ Message sent!');
    
    // Disconnect after test
    setTimeout(() => {
      console.log('🏁 Disconnecting...');
      client.disconnect();
      process.exit(0);
    }, 3000);
  }, 2000);
});

client.on('error', (error) => {
  console.log('❌ IRC Error:', error.message);
});

client.on('close', () => {
  console.log('🔌 Connection closed');
});

client.on('disconnect', () => {
  console.log('🔌 Disconnected');
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout');
  client.disconnect();
  process.exit(1);
}, 15000); 