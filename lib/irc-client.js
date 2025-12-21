import irc from 'irc';
import { logger } from './logger.js';

export class IRCClient {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.isConnected = false;
    this.lastDisconnectTime = null;
    this.lastConnectTime = null;
    this.disconnectDelay = parseInt(process.env.IRC_DISCONNECT_DELAY) || 5000; // Default 5 seconds
    this.postDelay = parseInt(process.env.IRC_POST_DELAY) || 2000; // Increased to 2 seconds for proper channel joining
    this.connecting = false; // Track connection state
    this.disconnectTimer = null; // Track disconnect timer
    this.messageQueue = []; // Queue for messages
    this.processing = false; // Track if we're processing the queue
    this.joinedChannels = new Set(); // Track which channels we've successfully joined
    this.persistentConnection = process.env.IRC_PERSISTENT_CONNECTION !== 'false'; // Default to persistent
  }

  async connect(targetChannels = null) {
    // If we already have a persistent connection and just need to join additional channels
    if (this.isConnected && this.client && this.persistentConnection) {
      const channelsToJoin = targetChannels || this.config.channels;
      const newChannels = channelsToJoin.filter(ch => !this.joinedChannels.has(ch));
      
      if (newChannels.length > 0) {
        logger.info(`Joining additional IRC channels: ${newChannels.join(', ')}`);
        return this.joinChannels(newChannels);
      } else {
        logger.debug('All required channels already joined');
        return Promise.resolve();
      }
    }

    // Prevent concurrent connections
    if (this.connecting) {
      throw new Error('Connection already in progress');
    }

    this.connecting = true;

    try {
      // Clean up existing connection if not persistent or if connection is broken
      if (!this.persistentConnection || !this.isConnected) {
        await this.disconnect();
      }

      // Use specific channels if provided, otherwise use config channels
      const channelsToJoin = targetChannels || this.config.channels;

      // Connect directly to IRC server
      const ircServer = this.config.server || 'irc.zeronode.net';
      const ircPort = this.config.port || 6667;
      const ircSecure = this.config.secure || false;
      const ircPassword = this.config.password || '';

      logger.info('Connecting to IRC server...', {
        server: ircServer,
        port: ircPort,
        secure: ircSecure,
        channels: channelsToJoin,
        persistent: this.persistentConnection
      });

      return new Promise((resolve, reject) => {
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          this.connecting = false;
          if (!this.persistentConnection) {
            this.disconnect();
          }
          reject(new Error('IRC connection timeout after 30 seconds'));
        }, 30000);

        this.client = new irc.Client(ircServer, this.config.nickname, {
          port: ircPort,
          secure: ircSecure,
          selfSigned: true, // Accept self-signed certificates for ZNC
          certExpired: true, // Accept expired certificates
          autoRejoin: this.persistentConnection, // Auto-rejoin if persistent
          autoConnect: true,
          channels: channelsToJoin,
          realName: this.config.realName || 'LIT Bot',
          userName: this.config.userName || 'litbot',
          password: ircPassword,
          retryCount: this.persistentConnection ? 3 : 0, // Retry if persistent
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

  async joinChannels(channels) {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to IRC server');
    }

    return new Promise((resolve, reject) => {
      let channelsJoined = 0;
      const targetChannels = channels.length;
      
      if (targetChannels === 0) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error(`Timeout joining channels: ${channels.join(', ')}`));
      }, 15000);

      const joinHandler = (channel, nick) => {
        if (nick === this.config.nickname && channels.includes(channel)) {
          logger.info(`Successfully joined IRC channel: ${channel}`);
          this.joinedChannels.add(channel);
          channelsJoined++;
          
          if (channelsJoined === targetChannels) {
            clearTimeout(timeout);
            this.client.removeListener('join', joinHandler);
            resolve();
          }
        }
      };

      this.client.on('join', joinHandler);

      // Join each channel
      channels.forEach(channel => {
        if (!this.joinedChannels.has(channel)) {
          logger.info(`Joining IRC channel: ${channel}`);
          this.client.join(channel);
        } else {
          // Already joined
          channelsJoined++;
          if (channelsJoined === targetChannels) {
            clearTimeout(timeout);
            this.client.removeListener('join', joinHandler);
            resolve();
          }
        }
      });
    });
  }

  setupEventHandlers(channelsToJoin, resolve, reject) {
    let channelsJoined = 0;
    const targetChannels = channelsToJoin.length;
    
    this.client.on('registered', () => {
      logger.info('Successfully connected to IRC server');
      this.isConnected = true;
      this.lastConnectTime = new Date();
      this.joinedChannels.clear(); // Reset joined channels on new connection
    });

    this.client.on('join', (channel, nick) => {
      if (nick === this.config.nickname) {
        logger.info(`Successfully joined IRC channel: ${channel}`);
        this.joinedChannels.add(channel);
        channelsJoined++;
        
        // Resolve when all channels are joined
        if (channelsJoined === targetChannels) {
          logger.info(`All ${targetChannels} IRC channels joined successfully`);
          resolve();
        }
      }
    });

    this.client.on('part', (channel, nick) => {
      if (nick === this.config.nickname) {
        logger.info(`Left IRC channel: ${channel}`);
        this.joinedChannels.delete(channel);
      }
    });

    this.client.on('kick', (channel, nick, by) => {
      if (nick === this.config.nickname) {
        logger.warn(`Kicked from IRC channel ${channel} by ${by}`);
        this.joinedChannels.delete(channel);
      }
    });

    this.client.on('error', (error) => {
      logger.error('IRC connection error:', error);
      
      // Handle specific errors differently
      if (error.command === 'err_cannotsendtochan') {
        // Error 404: Cannot send to channel (usually +n mode or not joined)
        const channel = error.args?.[1];
        const reason = error.args?.[2];
        logger.warn(`Cannot send to channel ${channel}: ${reason}`);
        
        // If we think we're in the channel but can't send, we're probably not actually joined
        if (channel && this.joinedChannels.has(channel)) {
          logger.info(`Removing ${channel} from joined channels and attempting to rejoin`);
          this.joinedChannels.delete(channel);
          
          // Try to rejoin the channel
          if (this.client && this.isConnected) {
            try {
              this.client.join(channel);
            } catch (joinError) {
              logger.error(`Failed to rejoin channel ${channel}:`, joinError);
            }
          }
        }
        
        // Don't reject the connection for this error
        return;
      } else if (error.command === 'err_nosuchchannel') {
        logger.warn('IRC channel does not exist:', error.args?.join(' '));
        return;
      } else if (error.command === 'err_inviteonlychan') {
        logger.warn('IRC channel is invite only:', error.args?.join(' '));
        return;
      } else if (error.command === 'err_channelisfull') {
        logger.warn('IRC channel is full:', error.args?.join(' '));
        return;
      }
      
      // For other errors that indicate connection issues, mark as disconnected
      this.isConnected = false;
      reject(error);
    });

    this.client.on('close', () => {
      logger.info('IRC connection closed');
      if (this.isConnected) {
        this.lastDisconnectTime = new Date();
      }
      this.isConnected = false;
      this.joinedChannels.clear();
    });

    this.client.on('disconnect', () => {
      logger.info('IRC disconnected');
      if (this.isConnected) {
        this.lastDisconnectTime = new Date();
      }
      this.isConnected = false;
      this.joinedChannels.clear();
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

    // Handle reconnection for persistent connections
    if (this.persistentConnection) {
      this.client.on('abort', () => {
        logger.warn('IRC connection aborted, will attempt to reconnect');
        this.isConnected = false;
        this.joinedChannels.clear();
      });
    }
  }

  async postMessage(message, channels = null) {
    const targetChannels = channels || this.config.channels;
    
    try {
      // Ensure we're connected and have joined the required channels
      if (!this.isConnected || !this.client) {
        logger.info('No IRC connection, establishing connection...');
        await this.connect(targetChannels);
        // Wait for channels to be fully joined
        await new Promise(r => setTimeout(r, this.postDelay));
      } else {
        // Check if we need to join any additional channels
        const missingChannels = targetChannels.filter(ch => !this.joinedChannels.has(ch));
        if (missingChannels.length > 0) {
          logger.info(`Joining missing IRC channels: ${missingChannels.join(', ')}`);
          await this.joinChannels(missingChannels);
          // Wait for channels to be fully joined
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // Post message to each channel
      const results = [];
      for (const channel of targetChannels) {
        let posted = false;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!posted && attempts < maxAttempts) {
          attempts++;
          
          try {
            if (!this.joinedChannels.has(channel)) {
              logger.info(`Channel ${channel} not joined, attempting to join (attempt ${attempts})`);
              await this.joinChannels([channel]);
              await new Promise(r => setTimeout(r, 1000)); // Wait for join to complete
            }

            if (this.joinedChannels.has(channel)) {
              this.client.say(channel, message);
              logger.info(`Posted message to IRC channel ${channel}: ${message.substring(0, 100)}...`);
              posted = true;
              results.push(true);
            } else {
              logger.warn(`Cannot post to ${channel}: still not joined after attempt ${attempts}`);
              if (attempts === maxAttempts) {
                results.push(false);
              }
            }
          } catch (error) {
            logger.error(`Failed to post to IRC channel ${channel} (attempt ${attempts}):`, error);
            
            // If it's a "cannot send to channel" error, try rejoining
            if (error.command === 'err_cannotsendtochan') {
              logger.info(`Removing and rejoining ${channel} due to send error`);
              this.joinedChannels.delete(channel);
              if (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 1000)); // Wait before retry
                continue;
              }
            }
            
            if (attempts === maxAttempts) {
              results.push(false);
            }
          }
        }
      }

      // Disconnect if not using persistent connection
      if (!this.persistentConnection) {
        setTimeout(() => {
          this.disconnect();
        }, this.disconnectDelay);
      }

      // Return true if at least one message was posted successfully
      return results.some(result => result);
    } catch (error) {
      logger.error('Failed to post message to IRC:', error);
      return false;
    }
  }

  // Queue processing removed - we now use direct posting with persistent connections

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
      joinedChannels: Array.from(this.joinedChannels),
      server: this.config.server,
      lastDisconnectTime: this.lastDisconnectTime,
      lastConnectTime: this.lastConnectTime,
      approach: this.persistentConnection ? 'persistent-connection' : 'connect-when-needed',
      persistent: this.persistentConnection,
      disconnectDelay: `${this.disconnectDelay}ms`,
      postDelay: `${this.postDelay}ms`,
      queueSize: this.messageQueue.length,
      processing: this.processing
    };
  }
}