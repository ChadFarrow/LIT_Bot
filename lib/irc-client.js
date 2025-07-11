import irc from 'irc';
import { logger } from './logger.js';

export class IRCClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 10000; // 10 seconds
    this.keepAliveInterval = null;
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
      retryCount: 10,
      retryDelay: 5000,
      floodProtection: true,
      floodProtectionDelay: 1000,
      messageSplit: 512,
      stripColors: true,
      encoding: 'utf8',
      showErrors: true,
      debug: false
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('registered', () => {
      logger.info('Successfully connected to IRC server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startKeepAlive();
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
      this.stopKeepAlive();
      this.attemptReconnect();
    });

    this.client.on('disconnect', () => {
      logger.warn('IRC disconnected');
      this.isConnected = false;
      this.stopKeepAlive();
      this.attemptReconnect();
    });

    this.client.on('message', (from, to, message) => {
      logger.debug(`IRC message from ${from} to ${to}: ${message}`);
    });

    // Add ping handler to keep connection alive
    this.client.on('ping', (server) => {
      logger.debug('Received ping from server, sending pong');
      this.client.pong(server);
    });

    // Add pong handler
    this.client.on('pong', (server) => {
      logger.debug('Received pong from server');
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

    // Connection is validated by isConnected flag

    const targetChannels = channels || this.config.channels;
    
    try {
      for (const channel of targetChannels) {
        this.client.say(channel, message);
        logger.info(`Posted message to IRC channel ${channel}: ${message.substring(0, 100)}...`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to post message to IRC:', error);
      this.isConnected = false;
      return false;
    }
  }

  async postLiveNotification(showTitle, feedUrl) {
    const message = `🔴 LIVE NOW! ${showTitle} - Tune in: ${feedUrl} #LivePodcast #PC20 #PodPing`;
    
    return await this.postMessage(message);
  }

  startKeepAlive() {
    // Send periodic pings to keep connection alive
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.client) {
        try {
          this.client.send('PING', 'keepalive');
          logger.debug('Sent keepalive ping to IRC server');
        } catch (error) {
          logger.error('Failed to send keepalive ping:', error);
        }
      }
    }, 60000); // Send ping every 60 seconds
  }

  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  disconnect() {
    this.stopKeepAlive();
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