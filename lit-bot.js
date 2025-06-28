// lit-bot.js - LIT Bot for posting live podcast notifications via PodPing
import express from 'express';
import dotenv from 'dotenv';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import { Client } from '@hiveio/dhive';
import Parser from 'rss-parser';
import { logger } from './lib/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const execAsync = promisify(exec);

// Configure environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Store bot start time and statistics
const botStartTime = new Date();
const stats = {
  rssNotifications: 0,
  podpingEvents: 0,
  successfulPosts: 0,
  failedPosts: 0,
  lastActivity: null,
  relayStats: {
    'wss://relay.damus.io': { success: 0, failed: 0 },
    'wss://relay.nostr.band': { success: 0, failed: 0 },
    'wss://nostr.mom': { success: 0, failed: 0 },
    'wss://relay.primal.net': { success: 0, failed: 0 }
  }
};

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
        stats.relayStats[relayUrl].success++;
        stats.successfulPosts++;
      } catch (error) {
        logger.error(`Failed to publish to ${relayUrl}`, { error: error?.message || error });
        stats.relayStats[relayUrl].failed++;
        stats.failedPosts++;
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

${showTitle}
📻 Tune in now: ${feedUrl}

#LivePodcast #PC20 #PodPing #podcasting #LIT #LIVEisLIT`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'livepodcast'],
        ['t', 'pc20'],
        ['t', 'podping'],
        ['t', 'podcasting'],
        ['t', 'lit'],
        ['t', 'liveislit'],
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
      // Get current head block and start from there
      const props = await this.client.database.getDynamicGlobalProperties();
      const currentBlock = props.head_block_number;
      
      // Stream operations from Hive blockchain
      this.client.blockchain.getOperationsStream({
        from: currentBlock - 10, // Start from 10 blocks ago
      }).on('data', (operation) => {
        this.handleOperation(operation);
      }).on('error', (error) => {
        logger.error('PodPing stream error:', error);
        // Restart after a delay
        setTimeout(() => this.start(), 5000);
      });

      logger.info('🔴 PODPING WATCHER STARTED - Monitoring Hive blockchain');
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
      logger.info('🔴 PODPING EVENT RECEIVED:', json);
      
      // Check if this is a live event
      if (json.reason === 'live' && json.url && this.bot) {
        logger.info(`🔴 PODPING LIVE DETECTED: ${json.url}`);
        
        // Extract show title from URL or use URL as fallback
        const showTitle = this.extractShowTitle(json.url) || json.url;
        
        stats.podpingEvents++;
        stats.lastActivity = new Date();
        await this.bot.postLiveNotification(json.url, showTitle);
        logger.info(`🔴 PODPING POSTED: ${showTitle}`);
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

// RSS Monitor for @PodcastsLive@podcastindex.social
class MastodonRSSMonitor {
  constructor() {
    this.parser = new Parser();
    this.bot = createLITBot();
    this.processedPosts = new Set();
    this.rssUrl = 'https://podcastindex.social/@PodcastsLive.rss';
    this.pollInterval = 60000; // 1 minute
  }

  async start() {
    if (!this.bot) {
      logger.error('LIT Bot not configured for RSS monitoring');
      return;
    }

    logger.info('Starting Mastodon RSS monitor...');
    
    // Initial check
    await this.checkForNewPosts();
    
    // Set up polling
    setInterval(async () => {
      try {
        await this.checkForNewPosts();
      } catch (error) {
        logger.error('RSS polling error:', error);
      }
    }, this.pollInterval);

    logger.info(`📡 RSS MONITOR STARTED - Polling @PodcastsLive every ${this.pollInterval/1000} seconds`);
  }

  async checkForNewPosts() {
    try {
      logger.info('📡 RSS CHECK: Polling @PodcastsLive for new posts...');
      const feed = await this.parser.parseURL(this.rssUrl);
      
      // Process recent posts (last 10)
      const recentPosts = feed.items.slice(0, 10);
      
      for (const post of recentPosts) {
        await this.processPost(post);
      }
      
    } catch (error) {
      logger.error('Error fetching RSS feed:', error);
    }
  }

  async processPost(post) {
    const postId = post.guid || post.link;
    
    // Skip if already processed
    if (this.processedPosts.has(postId)) {
      return;
    }

    // Check if this looks like a live notification
    const content = post.title || post.contentSnippet || '';
    if (this.isLiveNotification(content)) {
      logger.info('📡 RSS LIVE DETECTED:', { title: post.title, content });
      
      // Extract show info
      const showInfo = this.extractShowInfo(content, post.link);
      
      if (showInfo) {
        await this.postLiveNotification(showInfo);
        logger.info(`📡 RSS POSTED: ${showInfo.title}`);
        this.processedPosts.add(postId);
        
        // Clean up old processed posts (keep last 100)
        if (this.processedPosts.size > 100) {
          const postsArray = Array.from(this.processedPosts);
          this.processedPosts = new Set(postsArray.slice(-50));
        }
      } else {
        logger.info('📡 RSS SKIPPED: Could not extract show info from:', content);
      }
    }
  }

  isLiveNotification(content) {
    const liveKeywords = [
      'live now',
      '🔴',
      'is live',
      'going live',
      'streaming now',
      'live:',
      'live!'
    ];
    
    const lowerContent = content.toLowerCase();
    return liveKeywords.some(keyword => lowerContent.includes(keyword));
  }

  extractShowInfo(content, postUrl) {
    try {
      // Parse the RSS content which comes in structured format
      // Expected format: "Show Name is going #live!\n Episode Details\n stream url: ..."
      
      // Split content into lines and process
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length === 0) return null;
      
      // First line should contain show name and "is going #live!"
      const firstLine = lines[0];
      let showName = firstLine.replace(/is going.+$/gi, '').trim();
      
      // Find episode details (usually the second line before stream url)
      let episodeDetails = '';
      let streamUrl = '';
      let showUrl = '';
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('stream url:')) {
          streamUrl = line.replace('stream url:', '').trim();
        } else if (line.startsWith('show url:')) {
          showUrl = line.replace('show url:', '').trim();
        } else if (!line.includes('#podcast') && !line.includes('http') && episodeDetails === '') {
          episodeDetails = line;
        }
      }
      
      // Build the formatted title with proper spacing
      let formattedTitle = showName;
      if (episodeDetails) {
        formattedTitle += '\n\n' + episodeDetails;
      }
      if (streamUrl) {
        formattedTitle += '\n\nstream url: ' + streamUrl;
      }
      if (showUrl) {
        formattedTitle += '\nshow url: ' + showUrl;
      }

      if (showName && showName.length > 2) {
        return {
          title: formattedTitle,
          source: 'Mastodon RSS',
          url: postUrl || 'https://podcastindex.social/@PodcastsLive'
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error extracting show info:', error);
      return null;
    }
  }

  async postLiveNotification(showInfo) {
    if (!this.bot) return;

    const sk = this.bot.getSecretKey();
    
    const content = `🔴 LIVE NOW!

${showInfo.title}
🔗 More info: ${showInfo.url}

#LivePodcast #PC20 #PodcastsLive #podcasting #LIT #LIVEisLIT`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'livepodcast'],
        ['t', 'pc20'],
        ['t', 'podcastslive'],
        ['t', 'podcasting'],
        ['t', 'lit'],
        ['t', 'liveislit'],
        ['r', showInfo.url],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.bot.publishToRelays(event);
    stats.rssNotifications++;
    stats.lastActivity = new Date();
    logger.info(`📡 RSS NOTIFICATION POSTED: ${showInfo.title}`);
  }
}

// Dashboard route - serve the main dashboard
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// API endpoints for dashboard data
app.get('/api/stats', (req, res) => {
  const now = new Date();
  const uptimeMs = now.getTime() - botStartTime.getTime();
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  
  res.json({
    ...stats,
    uptime: uptimeSeconds,
    started: botStartTime.toISOString(),
    service: 'LIT Bot - Live Podcast Notifications',
    configured: !!process.env.LIT_BOT_NSEC,
    testMode: process.env.TEST_MODE === 'true'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('LIT Bot is running');
});

// Status endpoint (legacy)
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
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`LIT Bot started`, { port: PORT });
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Status: http://localhost:${PORT}/status`);
  
  // Start PodPing monitoring
  const watcher = new PodPingWatcher();
  watcher.start();
  
  // Start RSS monitoring
  const rssMonitor = new MastodonRSSMonitor();
  rssMonitor.start();
});