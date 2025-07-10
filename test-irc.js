import { IRCClient } from './lib/irc-client.js';
import { logger } from './lib/logger.js';

// Test IRC configuration
const testConfig = {
  server: 'irc.libera.chat',
  port: 6667,
  secure: false,
  nickname: 'LITBotTest',
  userName: 'litbottest',
  realName: 'LIT Bot Test',
  password: '',
  channels: ['#test']
};

console.log('Testing IRC client...');

const ircClient = new IRCClient(testConfig);

// Test connection
ircClient.connect();

// Wait a bit then test posting
setTimeout(async () => {
  console.log('Testing IRC message posting...');
  
  try {
    const result = await ircClient.postMessage('🔴 TEST: This is a test message from LIT Bot!');
    console.log('IRC test result:', result);
  } catch (error) {
    console.error('IRC test failed:', error);
  }
  
  // Disconnect after test
  setTimeout(() => {
    ircClient.disconnect();
    console.log('IRC test completed');
    process.exit(0);
  }, 2000);
}, 5000); 