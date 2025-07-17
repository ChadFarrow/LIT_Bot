import irc from 'irc';
import { logger } from './logger.js';

export class IRCClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.lastDisconnectTime = null;
    this.lastConnectTime = null;
  }

  async connect() {
    // Clean up existing connection
    this.disconnect();

    // Connect directly to IRC server
    const ircServer = this.config.server || 'irc.zeronode.net';
    const ircPort = this.config.port || 6667;
    const ircSecure = this.config.secure || false;
    const ircPassword = this.config.password || '';

    logger.info('Connecting to IRC server for posting...', {
      server: ircServer,
      port: ircPort,
      secure: ircSecure,
      channels: this.config.channels
    });

    return new Promise((resolve, reject) => {
      this.client = new irc.Client(ircServer, this.config.nickname, {
        port: ircPort,
        secure: ircSecure,
        autoRejoin: false, // Don't auto-rejoin since we disconnect after posting
        autoConnect: true,
        channels: this.config.channels,
        realName: this.config.realName || 'LIT Bot',
        userName: this.config.userName || 'litbot',
        password: ircPassword,
        retryCount: 0,
        floodProtection: true,
        floodProtectionDelay: 1000,
        messageSplit: 512,
        stripColors: true,
        encoding: 'utf8',
        showErrors: true,
        debug: false
      });

      this.setupEventHandlers(resolve, reject);
    });
  }

  setupEventHandlers(resolve, reject) {
    let channelsJoined = 0;
    const targetChannels = this.config.channels.length;
    
    this.client.on('registered', () => {
      logger.info('Successfully connected to IRC server');
      this.isConnected = true;
      this.lastConnectTime = new Date();
    });

    this.client.on('join', (channel, nick) => {
      if (nick === this.config.nickname) {
        logger.info(`Joined IRC channel: ${channel}`);
        channelsJoined++;
        
        // Resolve when all channels are joined
        if (channelsJoined === targetChannels) {
          resolve();
        }
      }
    });

    this.client.on('error', (error) => {
      logger.error('IRC connection error:', error);
      this.isConnected = false;
      reject(error);
    });

    this.client.on('close', () => {
      logger.debug('IRC connection closed');
      if (this.isConnected) {
        this.lastDisconnectTime = new Date();
      }
      this.isConnected = false;
    });

    this.client.on('disconnect', () => {
      logger.debug('IRC disconnected');
      if (this.isConnected) {
        this.lastDisconnectTime = new Date();
      }
      this.isConnected = false;
    });

    // Handle pings properly
    this.client.on('ping', (server) => {
      if (this.isConnected) {
        try {
          this.client.send('PONG', server);
        } catch (error) {
          logger.error('Failed to send PONG response:', error);
        }
      }
    });
  }

  async postMessage(message, channels = null) {
    const targetChannels = channels || this.config.channels;
    
    try {
      // Connect fresh for each post
      logger.info('Connecting to IRC for posting...');
      await this.connect();
      
      // Post to channels
      for (const channel of targetChannels) {
        this.client.say(channel, message);
        logger.info(`Posted message to IRC channel ${channel}: ${message.substring(0, 100)}...`);
      }
      
      // Disconnect after posting
      setTimeout(() => {
        this.disconnect();
      }, 2000); // Give messages time to send
      
      return true;
    } catch (error) {
      logger.error('Failed to post message to IRC:', error);
      this.disconnect();
      return false;
    }
  }

  async postLiveNotification(showTitle, feedUrl) {
    const message = `🔴 LIVE NOW! ${showTitle} - Tune in: ${feedUrl} #LivePodcast #PC20 #PodPing`;
    
    return await this.postMessage(message);
  }

  disconnect() {
    if (this.client) {
      this.client.removeAllListeners(); // Clean up event listeners
      this.client.disconnect();
      this.client = null;
    }
    this.isConnected = false;
  }

  isConnectionActive() {
    // Since we connect fresh each time, just check if we're connected
    return this.isConnected && this.client;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      connectionActive: this.isConnectionActive(),
      channels: this.config.channels,
      server: this.config.server,
      lastDisconnectTime: this.lastDisconnectTime,
      lastConnectTime: this.lastConnectTime,
      approach: 'connect-when-needed'
    };
  }
}