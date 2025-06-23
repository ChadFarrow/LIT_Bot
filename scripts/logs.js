#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

function getProcessInfo() {
  try {
    const output = execSync('ps aux | grep -E "(helipad-webhook|tsx.*helipad)" | grep -v grep', { encoding: 'utf8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    return [];
  }
}

function getSystemLogs() {
  try {
    // Get recent system logs that might be related to our process
    const output = execSync('log show --predicate "process == \"node\" OR process == \"tsx\"" --last 1h --style compact', { encoding: 'utf8' });
    return output.trim().split('\n').slice(-20); // Last 20 lines
  } catch (error) {
    return [];
  }
}

function getNetworkConnections() {
  try {
    const output = execSync('lsof -i :3001', { encoding: 'utf8' });
    return output.trim().split('\n');
  } catch (error) {
    return [];
  }
}

function main() {
  console.log('📋 BoostBot Logs & Information\n');
  
  // Check if bot is running
  const processes = getProcessInfo();
  
  if (processes.length === 0) {
    console.log('❌ BoostBot is not running');
    console.log('💡 Start it with: npm start');
    return;
  }
  
  console.log('✅ BoostBot is running\n');
  
  // Show process information
  console.log('🔍 Process Information:');
  processes.forEach((process, index) => {
    const parts = process.split(/\s+/);
    const pid = parts[1];
    const cpu = parts[2];
    const mem = parts[3];
    const time = parts[8];
    
    console.log(`  Process ${index + 1}:`);
    console.log(`    PID: ${pid}`);
    console.log(`    CPU: ${cpu}%`);
    console.log(`    Memory: ${mem}%`);
    console.log(`    Runtime: ${time}`);
    console.log('');
  });
  
  // Show network connections
  console.log('🌐 Network Connections (Port 3001):');
  const connections = getNetworkConnections();
  if (connections.length > 1) { // Skip header
    connections.slice(1).forEach(conn => {
      const parts = conn.split(/\s+/);
      if (parts.length >= 9) {
        console.log(`  ${parts[0]} (PID: ${parts[1]}) - ${parts[8]}`);
      }
    });
  } else {
    console.log('  No active connections found');
  }
  console.log('');
  
  // Show recent system logs
  console.log('📝 Recent System Logs (last hour):');
  const systemLogs = getSystemLogs();
  if (systemLogs.length > 0) {
    systemLogs.forEach(log => {
      if (log.trim()) {
        console.log(`  ${log}`);
      }
    });
  } else {
    console.log('  No recent system logs found');
  }
  console.log('');
  
  // Show health check
  console.log('🏥 Health Check:');
  try {
    const response = execSync('curl -s http://localhost:3001/health', { encoding: 'utf8' });
    console.log(`  ✅ Health endpoint: ${response.trim()}`);
  } catch (error) {
    console.log('  ❌ Health endpoint not responding');
  }
  console.log('');
  
  // Show available endpoints
  console.log('🔗 Available Endpoints:');
  console.log('  📡 POST /helipad-webhook - Main webhook endpoint');
  console.log('  💚 GET  /health - Health check');
  console.log('  🧪 GET  /test-daily-summary - Test daily summary');
  console.log('  📊 GET  /test-weekly-summary - Test weekly summary');
  console.log('');
  
  console.log('💡 Tips:');
  console.log('  • Use "npm run status" for a quick status check');
  console.log('  • Use "npm run restart" to restart the bot');
  console.log('  • Check the terminal where you started the bot for live logs');
  console.log('  • The bot logs all webhook events and Nostr posts');
}

main(); 