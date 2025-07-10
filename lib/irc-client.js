import irc from 'irc';
import { logger } from './logger.js';

export class IRCClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  connect() {
    if (this.client) {
      this.client.disconnect();
    }

    logger.info('Connecting to IRC server...', {
      server: this.config.server,
      port: this.config.port,
      channels: this.config.channels
    });

    this.client = new irc.Client(this.config.server, this.config.nickname, {
      port: this.config.port,
      secure: this.config.secure || false,
      autoRejoin: true,
      autoConnect: true,
      channels: this.config.channels,
      realName: this.config.realName || 'LIT Bot',
      userName: this.config.userName || 'litbot',
      password: this.config.password,
      retryCount: 3,
      retryDelay: 2000,
      floodProtection: true,
      floodProtectionDelay: 1000,
      messageSplit: 512
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('registered', () => {
      logger.info('Successfully connected to IRC server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.client.on('join', (channel, nick) => {
      if (nick === this.config.nickname) {
        logger.info(`Joined IRC channel: ${channel}`);
      }
    });

    this.client.on('error', (error) => {
      logger.error('IRC connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('IRC connection closed');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.client.on('disconnect', () => {
      logger.warn('IRC disconnected');
      this.isConnected = false;
      this.attemptReconnect();
    });

    this.client.on('message', (from, to, message) => {
      logger.debug(`IRC message from ${from} to ${to}: ${message}`);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting IRC reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      logger.error('Max IRC reconnection attempts reached');
    }
  }

  async postMessage(message, channels = null) {
    if (!this.isConnected || !this.client) {
      logger.warn('IRC client not connected, cannot post message');
      return false;
    }

    const targetChannels = channels || this.config.channels;
    
    try {
      for (const channel of targetChannels) {
        this.client.say(channel, message);
        logger.info(`Posted message to IRC channel ${channel}: ${message.substring(0, 100)}...`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to post message to IRC:', error);
      return false;
    }
  }

  async postLiveNotification(showTitle, feedUrl) {
    const message = `🔴 LIVE NOW! ${showTitle} - Tune in: ${feedUrl} #LivePodcast #PC20 #PodPing`;
    
    return await this.postMessage(message);
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.isConnected = false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      channels: this.config.channels,
      server: this.config.server
    };
  }
} 