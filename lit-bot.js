// lit-bot.js - LIT Bot for posting live podcast notifications via PodPing
import express from 'express';
import dotenv from 'dotenv';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import { Client } from '@hiveio/dhive';
import { logger } from './lib/logger.js';

const execAsync = promisify(exec);

// Configure environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Store bot start time
const botStartTime = new Date();

// LIT Bot Nostr configuration
class LITBot {
  constructor(nsec, relays = ['wss://relay.damus.io', 'wss://relay.nostr.band', 'wss://nostr.mom', 'wss://relay.primal.net']) {
    this.nsec = nsec;
    this.relays = relays;
  }

  getSecretKey() {
    try {
      const { data } = nip19.decode(this.nsec);
      return data;
    } catch {
      throw new Error('Invalid nsec format');
    }
  }

  async publishToRelays(event) {
    // Test mode - just log what would be posted without actually posting
    if (process.env.TEST_MODE === 'true') {
      logger.info('TEST MODE - Would post to relays', { 
        content: event.content,
        tags: event.tags,
        relays: this.relays 
      });
      return;
    }

    logger.info(`Attempting to publish to ${this.relays.length} relays`, { content: event.content });
    
    const publishPromises = this.relays.map(async (relayUrl) => {
      try {
        logger.debug(`Connecting to ${relayUrl}`);
        const relay = await Relay.connect(relayUrl);
        logger.debug(`Publishing to ${relayUrl}`);
        await relay.publish(event);
        relay.close();
        logger.info(`Successfully published to ${relayUrl}`);
      } catch (error) {
        logger.error(`Failed to publish to ${relayUrl}`, { error: error?.message || error });
      }
    });

    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Publish results: ${successful} successful, ${failed} failed out of ${this.relays.length} relays`);
  }

  async postLiveNotification(feedUrl, showTitle) {
    const sk = this.getSecretKey();
    
    const content = `🔴 LIVE NOW!

🎧 ${showTitle}
📻 Tune in now: ${feedUrl}

#LivePodcast #PC20 #PodPing`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'livepodcast'],
        ['t', 'pc20'],
        ['t', 'podping'],
        ['r', feedUrl],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }
}

// Create LIT Bot instance
function createLITBot() {
  const botNsec = process.env.LIT_BOT_NSEC;
  
  if (!botNsec) {
    console.warn('LIT_BOT_NSEC environment variable not set');
    return null;
  }

  return new LITBot(botNsec);
}

// PodPing monitoring using Hive blockchain
class PodPingWatcher {

  constructor() {
    this.client = new Client([
      'https://api.hive.blog',
      'https://api.hivekings.com',
      'https://anyx.io',
    ]);
    this.bot = createLITBot();
    this.processedOps = new Set();
  }

  async start() {
    if (!this.bot) {
      logger.error('LIT Bot not configured - missing LIT_BOT_NSEC');
      return;
    }

    logger.info('Starting PodPing watcher...');
    
    try {
      // Stream operations from Hive blockchain
      this.client.blockchain.getOperationsStream({
        from: new Date(Date.now() - 60000), // Start from 1 minute ago
      }).on('data', (operation) => {
        this.handleOperation(operation);
      }).on('error', (error) => {
        logger.error('PodPing stream error:', error);
        // Restart after a delay
        setTimeout(() => this.start(), 5000);
      });

      logger.info('PodPing watcher started successfully');
    } catch (error) {
      logger.error('Failed to start PodPing watcher:', error);
    }
  }

  async handleOperation(operation) {
    try {
      const opId = `${operation.block_num}-${operation.transaction_num}-${operation.operation_num}`;
      
      // Skip if already processed
      if (this.processedOps.has(opId)) {
        return;
      }
      
      this.processedOps.add(opId);
      
      // Clean up old processed ops (keep last 1000)
      if (this.processedOps.size > 1000) {
        const opsArray = Array.from(this.processedOps);
        this.processedOps = new Set(opsArray.slice(-500));
      }

      const [opType, opData] = operation.op;
      
      // Look for custom_json operations which contain podping data
      if (opType === 'custom_json' && opData.id === 'podping') {
        await this.processPodPingEvent(opData);
      }
    } catch (error) {
      logger.error('Error handling operation:', error);
    }
  }

  async processPodPingEvent(opData) {
    try {
      const json = JSON.parse(opData.json);
      logger.info('PodPing event received:', json);
      
      // Check if this is a live event
      if (json.reason === 'live' && json.url && this.bot) {
        logger.info(`Live podcast detected: ${json.url}`);
        
        // Extract show title from URL or use URL as fallback
        const showTitle = this.extractShowTitle(json.url) || json.url;
        
        await this.bot.postLiveNotification(json.url, showTitle);
        logger.info(`Posted live notification for: ${showTitle}`);
      }
    } catch (error) {
      logger.error('Error processing PodPing event:', error);
    }
  }

  extractShowTitle(url) {
    try {
      // Basic extraction from URL - could be improved with RSS parsing
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      
      // Look for obvious show names in path
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1]
          .replace(/\.xml$|\.rss$/i, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('LIT Bot is running');
});

// Status endpoint
app.get('/status', (req, res) => {
  const now = new Date();
  const uptimeMs = now.getTime() - botStartTime.getTime();
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  
  res.json({
    status: 'running',
    uptime: uptimeSeconds,
    started: botStartTime.toISOString(),
    service: 'LIT Bot - Live Podcast Notifications',
    configured: !!process.env.LIT_BOT_NSEC
  });
});

// Start the server and PodPing watcher
const PORT = process.env.PORT || 3334;
app.listen(PORT, () => {
  logger.info(`LIT Bot started`, { port: PORT });
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Status: http://localhost:${PORT}/status`);
  
  // Start PodPing monitoring
  const watcher = new PodPingWatcher();
  watcher.start();
});