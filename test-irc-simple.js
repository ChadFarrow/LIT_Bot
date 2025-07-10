import irc from 'irc';

console.log('🔍 Testing connection to clover.zeronode.net...\n');

// Test configurations
const configs = [
  { port: 6667, secure: false, name: 'Standard' },
  { port: 6697, secure: true, name: 'SSL' },
  { port: 6668, secure: false, name: 'Alternative' }
];

async function testConnection(config) {
  return new Promise((resolve) => {
    console.log(`Testing ${config.name}: clover.zeronode.net:${config.port} (SSL: ${config.secure})`);
    
    const client = new irc.Client('clover.zeronode.net', 'LIT_Bot', {
      port: config.port,
      secure: config.secure,
      autoRejoin: false,
      autoConnect: true,
      channels: [],
      realName: 'LIT Bot Test',
      userName: 'lit_bot',
      retryCount: 0,
      retryDelay: 1000
    });

    let connected = false;
    const timeout = setTimeout(() => {
      if (!connected) {
        console.log('❌ Timeout');
        client.disconnect();
        resolve({ success: false, reason: 'timeout' });
      }
    }, 8000);

    client.on('registered', () => {
      clearTimeout(timeout);
      connected = true;
      console.log('✅ Connected successfully!');
      client.disconnect();
      resolve({ success: true, config });
    });

    client.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Error:', error.message);
      resolve({ success: false, reason: error.message });
    });

    client.on('close', () => {
      if (!connected) {
        clearTimeout(timeout);
        console.log('❌ Connection closed');
        resolve({ success: false, reason: 'connection closed' });
      }
    });
  });
}

async function runTests() {
  for (const config of configs) {
    const result = await testConnection(config);
    console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`);
    
    if (result.success) {
      console.log('🎉 Found working configuration!');
      console.log('Use this in your .env file:');
      console.log(`IRC_SERVER=clover.zeronode.net`);
      console.log(`IRC_PORT=${config.port}`);
      console.log(`IRC_SECURE=${config.secure}`);
      break;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🏁 Connection tests completed');
}

runTests().catch(console.error); 