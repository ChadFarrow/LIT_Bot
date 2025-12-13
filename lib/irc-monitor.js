import irc from 'irc';
import { logger } from './logger.js';
import { EventEmitter } from 'events';

export class IRCMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    const monitorNick = this.config.nickname + '_Mon';
    
    logger.info('Starting IRC Monitor for ppwatch detection', {
      server: this.config.server,
      nickname: monitorNick,
      channel: '#HomegrownHits'
    });
    
    this.client = new irc.Client(this.config.server, monitorNick, {
      port: this.config.port || 6667,
      secure: this.config.secure || false,
      selfSigned: true,
      certExpired: true,
      channels: ['#HomegrownHits'],
      autoConnect: true,
      autoRejoin: true,
      realName: 'LIT Bot Monitor',
      userName: this.config.userName || 'litbot_mon',
      password: this.config.password || '',
      retryCount: 10,
      retryDelay: 2000,
      floodProtection: true,
      floodProtectionDelay: 1000
    });

    // Set up event handlers
    this.client.on('registered', () => {
      logger.info('IRC Monitor connected and registered');
      this.isConnected = true;
    });

    this.client.on('join#HomegrownHits', (nick) => {
      if (nick === monitorNick) {
        logger.info('IRC Monitor joined #HomegrownHits');
      }
    });

    this.client.on('message#HomegrownHits', (nick, message) => {
      // Log all messages from ppwatch for debugging
      if (nick === 'ppwatch') {
        logger.debug('ppwatch message in #HomegrownHits:', { message });
        
        // Check for Homegrown Hits confirmation
        if (message.includes('Podping received: Homegrown Hits') && 
            message.includes('https://feed.homegrownhits.xyz/feed.xml') && 
            message.includes('(live)')) {
          logger.info('ppwatch confirmed Homegrown Hits live notification');
          this.emit('homegrown-hits-confirmed');
        }
      }
    });

    this.client.on('error', (error) => {
      logger.error('IRC Monitor error:', error);
    });

    this.client.on('disconnect', () => {
      logger.warn('IRC Monitor disconnected');
      this.isConnected = false;
    });

    // Handle connection issues
    this.client.on('netError', (error) => {
      logger.error('IRC Monitor network error:', error);
    });
  }

  disconnect() {
    if (this.client) {
      logger.info('Disconnecting IRC Monitor');
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      monitoring: '#HomegrownHits',
      purpose: 'ppwatch confirmation detection'
    };
  }
}