import { IRCClient } from './lib/irc-client.js';
import { logger } from './lib/logger.js';

// Test IRC configuration for BowlAfterBowl
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

console.log('🔴 Testing IRC client for #BowlAfterBowl...');
console.log('Server:', testConfig.server);
console.log('Channel:', testConfig.channels[0]);
console.log('Nickname:', testConfig.nickname);

const ircClient = new IRCClient(testConfig);

// Test connection
ircClient.connect();

// Wait a bit then test posting
setTimeout(async () => {
  console.log('\n📝 Testing IRC message posting to #BowlAfterBowl...');
  
  try {
    const testMessage = '🔴 TEST: This is a test message from LIT Bot! Testing live podcast notifications.';
    const result = await ircClient.postMessage(testMessage);
    console.log('✅ IRC test result:', result);
    
    if (result) {
      console.log('🎉 Successfully posted to #BowlAfterBowl!');
    } else {
      console.log('❌ Failed to post to IRC');
    }
  } catch (error) {
    console.error('❌ IRC test failed:', error);
  }
  
  // Test live notification format
  setTimeout(async () => {
    console.log('\n🎧 Testing live notification format...');
    try {
      const result = await ircClient.postLiveNotification(
        'Test Show - Episode 123', 
        'https://example.com/live'
      );
      console.log('✅ Live notification test result:', result);
    } catch (error) {
      console.error('❌ Live notification test failed:', error);
    }
    
    // Disconnect after test
    setTimeout(() => {
      ircClient.disconnect();
      console.log('\n🏁 IRC test completed');
      process.exit(0);
    }, 2000);
  }, 3000);
}, 5000); 