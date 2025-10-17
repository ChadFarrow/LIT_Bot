import irc from 'irc';
import { logger } from './logger.js';

export class IRCClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.lastDisconnectTime = null;
    this.lastConnectTime = null;
    this.disconnectDelay = parseInt(process.env.IRC_DISCONNECT_DELAY) || 2000; // Default 2 seconds
    this.postDelay = parseInt(process.env.IRC_POST_DELAY) || 1000; // Default 1 second delay after joining
    this.connecting = false; // Track connection state
    this.disconnectTimer = null; // Track disconnect timer
  }

  async connect(targetChannels = null) {
    // Prevent concurrent connections
    if (this.connecting) {
      throw new Error('Connection already in progress');
    }

    this.connecting = true;

    try {
      // Clean up existing connection and wait for it to complete
      await this.disconnect();

      // Use specific channels if provided, otherwise use config channels
      const channelsToJoin = targetChannels || this.config.channels;

      // Connect directly to IRC server
      const ircServer = this.config.server || 'irc.zeronode.net';
      const ircPort = this.config.port || 6667;
      const ircSecure = this.config.secure || false;
      const ircPassword = this.config.password || '';

      logger.info('Connecting to IRC server for posting...', {
        server: ircServer,
        port: ircPort,
        secure: ircSecure,
        channels: channelsToJoin
      });

      return new Promise((resolve, reject) => {
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          this.connecting = false;
          this.disconnect();
          reject(new Error('IRC connection timeout after 30 seconds'));
        }, 30000);

        this.client = new irc.Client(ircServer, this.config.nickname, {
          port: ircPort,
          secure: ircSecure,
          selfSigned: true, // Accept self-signed certificates for ZNC
          certExpired: true, // Accept expired certificates
          autoRejoin: false, // Don't auto-rejoin since we disconnect after posting
          autoConnect: true,
          channels: channelsToJoin,
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

        this.setupEventHandlers(
          channelsToJoin,
          () => {
            clearTimeout(connectionTimeout);
            this.connecting = false;
            resolve();
          }, 
          (error) => {
            clearTimeout(connectionTimeout);
            this.connecting = false;
            reject(error);
          }
        );
      });
    } catch (error) {
      this.connecting = false;
      throw error;
    }
  }

  setupEventHandlers(channelsToJoin, resolve, reject) {
    let channelsJoined = 0;
    const targetChannels = channelsToJoin.length;
    
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
      // Connect fresh for each post, only joining the channels we need
      logger.info('Connecting to IRC for posting to specific channels...');
      await this.connect(targetChannels);
      
      // Wait before posting to ensure channels are fully joined
      logger.info(`Waiting ${this.postDelay}ms after joining channels before posting...`);
      await new Promise(resolve => setTimeout(resolve, this.postDelay));
      
      // Post to channels
      for (const channel of targetChannels) {
        this.client.say(channel, message);
        logger.info(`Posted message to IRC channel ${channel}: ${message.substring(0, 100)}...`);
      }
      
      // Schedule disconnect after posting
      logger.info(`Waiting ${this.disconnectDelay}ms before disconnecting from IRC...`);
      this.disconnectTimer = setTimeout(() => {
        this.disconnect();
      }, this.disconnectDelay); // Give messages time to send
      
      return true;
    } catch (error) {
      logger.error('Failed to post message to IRC:', error);
      await this.disconnect();
      return false;
    }
  }

  async postLiveNotification(showTitle, feedUrl) {
    const message = `🔴 LIVE NOW! ${showTitle} - Tune in: ${feedUrl} #LivePodcast #PC20 #PodPing`;
    
    return await this.postMessage(message);
  }

  async disconnect() {
    // Clear any pending disconnect timer
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }

    if (this.client) {
      return new Promise((resolve) => {
        // Set up cleanup handler
        const cleanup = () => {
          this.client = null;
          this.isConnected = false;
          resolve();
        };

        // If already disconnected, just clean up
        if (!this.isConnected) {
          cleanup();
          return;
        }

        // Set up one-time event handlers for disconnect
        this.client.once('close', cleanup);
        this.client.once('disconnect', cleanup);
        
        // Force cleanup after 5 seconds if disconnect doesn't complete
        setTimeout(cleanup, 5000);

        try {
          this.client.removeAllListeners(); // Clean up event listeners
          this.client.once('close', cleanup); // Re-add after removeAllListeners
          this.client.once('disconnect', cleanup); // Re-add after removeAllListeners
          this.client.disconnect();
        } catch (error) {
          logger.debug('Error during disconnect:', error);
          cleanup();
        }
      });
    } else {
      this.isConnected = false;
    }
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
      approach: 'connect-when-needed',
      disconnectDelay: `${this.disconnectDelay}ms`,
      postDelay: `${this.postDelay}ms`
    };
  }
}