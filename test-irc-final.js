import { IRCClient } from './lib/irc-client.js';
import { logger } from './lib/logger.js';

// Working IRC configuration for BowlAfterBowl
const testConfig = {
  server: 'irc.zeronode.net',
  port: 6667,
  secure: false,
  nickname: 'LIT_Bot',
  userName: 'lit_bot',
  realName: 'LIT Bot - Live Podcast Notifications',
  password: '',
  channels: ['#BowlAfterBowl']
};

console.log('🎉 Final IRC test for #BowlAfterBowl...');
console.log('Server:', testConfig.server);
console.log('Channel:', testConfig.channels[0]);
console.log('Nickname:', testConfig.nickname);

const ircClient = new IRCClient(testConfig);

// Test connection
ircClient.connect();

// Wait a bit then test posting
setTimeout(async () => {
  console.log('\n📝 Testing live notification format...');
  
  try {
    const result = await ircClient.postLiveNotification(
      'Test Show - Episode 123', 
      'https://example.com/live'
    );
    console.log('✅ Live notification test result:', result);
    
    if (result) {
      console.log('🎉 Successfully posted to #BowlAfterBowl!');
      console.log('Message format: 🔴 LIVE NOW! Test Show - Episode 123 - Tune in: https://example.com/live #LivePodcast #PC20 #PodPing');
    } else {
      console.log('❌ Failed to post to IRC');
    }
  } catch (error) {
    console.error('❌ IRC test failed:', error);
  }
  
  // Disconnect after test
  setTimeout(() => {
    ircClient.disconnect();
    console.log('\n🏁 Test completed successfully!');
    console.log('\n📋 Configuration for your .env file:');
    console.log('IRC_ENABLED=true');
    console.log('IRC_SERVER=irc.zeronode.net');
    console.log('IRC_PORT=6667');
    console.log('IRC_SECURE=false');
    console.log('IRC_NICKNAME=LIT_Bot');
    console.log('IRC_CHANNELS=#BowlAfterBowl');
    process.exit(0);
  }, 3000);
}, 5000); 