import { IRCClient } from './lib/irc-client.js';
import { logger } from './lib/logger.js';

// Test different configurations for clover.zeronode.net
const testConfigs = [
  {
    name: 'Standard (Port 6667)',
    server: 'clover.zeronode.net',
    port: 6667,
    secure: false
  },
  {
    name: 'SSL (Port 6697)',
    server: 'clover.zeronode.net',
    port: 6697,
    secure: true
  },
  {
    name: 'Alternative Port (6668)',
    server: 'clover.zeronode.net',
    port: 6668,
    secure: false
  }
];

async function testConnection(config) {
  console.log(`\n🔍 Testing: ${config.name}`);
  console.log(`Server: ${config.server}:${config.port} (SSL: ${config.secure})`);
  
  const testConfig = {
    ...config,
    nickname: 'LIT_Bot',
    userName: 'lit_bot',
    realName: 'LIT Bot - Live Podcast Notifications',
    password: '',
    channels: ['#BowlAfterBowl']
  };

  const ircClient = new IRCClient(testConfig);
  
  return new Promise((resolve) => {
    let connected = false;
    let timeout = false;
    
    // Set a timeout
    const timeoutId = setTimeout(() => {
      timeout = true;
      ircClient.disconnect();
      resolve({ success: false, reason: 'timeout' });
    }, 10000);
    
    // Override the event handlers for testing
    ircClient.client = new (require('irc')).Client(testConfig.server, testConfig.nickname, {
      port: testConfig.port,
      secure: testConfig.secure,
      autoRejoin: true,
      autoConnect: true,
      channels: testConfig.channels,
      realName: testConfig.realName,
      userName: testConfig.userName,
      password: testConfig.password,
      retryCount: 1,
      retryDelay: 2000,
      floodProtection: true,
      floodProtectionDelay: 1000,
      messageSplit: 512
    });

    ircClient.client.on('registered', () => {
      clearTimeout(timeoutId);
      connected = true;
      console.log('✅ Connected successfully!');
      ircClient.disconnect();
      resolve({ success: true });
    });

    ircClient.client.on('error', (error) => {
      clearTimeout(timeoutId);
      console.log('❌ Connection error:', error.message);
      resolve({ success: false, reason: error.message });
    });

    ircClient.client.on('close', () => {
      if (!connected && !timeout) {
        clearTimeout(timeoutId);
        console.log('❌ Connection closed');
        resolve({ success: false, reason: 'connection closed' });
      }
    });

    ircClient.connect();
  });
}

async function runTests() {
  console.log('🔍 Testing connection to clover.zeronode.net...\n');
  
  for (const config of testConfigs) {
    const result = await testConnection(config);
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} - ${result.reason || ''}`);
    
    if (result.success) {
      console.log('🎉 Found working configuration!');
      break;
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 Connection tests completed');
}

runTests().catch(console.error); 