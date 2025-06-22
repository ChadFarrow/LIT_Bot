// Server-side only - Nostr bot for posting fundraiser updates
// NOTE: This will only work if you deploy to a server environment (not static hosting)
// For static hosting, you'll need to set up a separate server/API for bot posting
import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';
import { promises as fs } from 'fs';
import path from 'path';

interface FundraiserUpdateOptions {
  title: string;
  creator: string;
  amount?: number;
  endDate?: number;
  ticketPrice?: number;
  description?: string;
  url?: string;
}

interface WinnerAnnouncementOptions {
  title: string;
  creator: string;
  winner: string;
  prizeAmount: number;
  totalRaised: number;
  url?: string;
}

// Helipad webhook event interface
export interface HelipadPaymentEvent {
  index: number;
  time: number;
  value_msat: number;
  value_msat_total: number;
  action: number;
  sender: string;
  app: string;
  message: string;
  podcast: string;
  episode: string;
  tlv: string;
  remote_podcast?: string;
  remote_episode?: string;
  reply_sent?: boolean;
  payment_info?: {
    payment_hash: string;
    pubkey: string;
    custom_key: number;
    custom_value: string;
    fee_msat: number;
    reply_to_idx: number | null;
  } | null;
}

class NostrBot {
  private nsec: string;
  private relays: string[];

  constructor(nsec: string, relays: string[] = ['wss://relay.damus.io', 'wss://relay.nostr.band', 'wss://relay.primal.net', 'wss://7srr7chyc6vlhzpc2hl6lyungvluohzrmt76kbs4kmydhrxoakkbquad.local/', 'wss://chadf.nostr1.com/']) {
    this.nsec = nsec;
    this.relays = relays;
  }

  public getSecretKey(): Uint8Array {
    try {
      const { data } = nip19.decode(this.nsec);
      return data as Uint8Array;
    } catch {
      throw new Error('Invalid nsec format');
    }
  }

  public async publishToRelays(event: ReturnType<typeof finalizeEvent>): Promise<void> {
    // Test mode - just log what would be posted without actually posting
    if (process.env.TEST_MODE === 'true') {
      console.log('🧪 TEST MODE - Would post to relays:');
      console.log('📝 Content:', event.content);
      console.log('🏷️ Tags:', event.tags);
      console.log('🔗 Relays:', this.relays);
      return;
    }

    console.log(`📡 Attempting to publish to ${this.relays.length} relays...`);
    
    const publishPromises = this.relays.map(async (relayUrl) => {
      try {
        console.log(`🔄 Connecting to ${relayUrl}...`);
        const relay = await Relay.connect(relayUrl);
        console.log(`📤 Publishing to ${relayUrl}...`);
        await relay.publish(event);
        relay.close();
        console.log(`✅ Successfully published to ${relayUrl}`);
      } catch (error) {
        console.error(`❌ Failed to publish to ${relayUrl}:`, error?.message || error);
      }
    });

    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📊 Publish results: ${successful} successful, ${failed} failed out of ${this.relays.length} relays`);
  }

  async postFundraiserCreated(options: FundraiserUpdateOptions): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `🎉 New Fundraiser Created!

🎧 ${options.title}
👤 Creator: ${options.creator}
${options.ticketPrice ? `🎫 Ticket Price: ${options.ticketPrice} sats` : ''}
${options.amount ? `🎯 Target: ${options.amount} sats` : ''}
${options.endDate ? `⏰ Ends: ${new Date(options.endDate * 1000).toLocaleDateString()}` : ''}

${options.description || ''}

${options.url ? `Join: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Nostr #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'fundraiser'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }

  async postWinnerAnnouncement(options: WinnerAnnouncementOptions): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `🏆 Winner Announced!

🎧 ${options.title}
👤 Creator: ${options.creator}
🎉 Winner: ${options.winner}
💰 Prize: ${options.prizeAmount} sats
📊 Total Raised: ${options.totalRaised} sats

Congratulations to the winner! 🎉

${options.url ? `View: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Winner #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'winner'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }

  async postFundraiserEnded(options: FundraiserUpdateOptions & { totalRaised: number }): Promise<void> {
    const sk = this.getSecretKey();
    
    const content = `⏰ Fundraiser Ended

🎧 ${options.title}
👤 Creator: ${options.creator}
💰 Total Raised: ${options.totalRaised} sats
🎯 Drawing winner soon...

${options.url ? `View: ${options.url}` : ''}

#NostrBoostBot #Bitcoin #Lightning #Podcast`;

    const event = finalizeEvent({
      kind: 1,
      content,
      tags: [
        ['t', 'nostrboostbot'],
        ['t', 'bitcoin'],
        ['t', 'lightning'],
        ['t', 'podcast'],
        ['t', 'ended'],
      ],
      created_at: Math.floor(Date.now() / 1000),
    }, sk);

    await this.publishToRelays(event);
  }
}

// Server-side only function to get bot instance
export function createNostrBot(): NostrBot | null {
  const botNsec = process.env.NOSTR_BOOST_BOT_NSEC;
  
  if (!botNsec) {
    console.warn('NOSTR_BOOST_BOT_NSEC environment variable not set');
    return null;
  }

  return new NostrBot(botNsec);
}

// Helper functions for easy use
export async function announceFundraiserCreated(options: FundraiserUpdateOptions): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postFundraiserCreated(options);
  }
}

export async function announceWinner(options: WinnerAnnouncementOptions): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postWinnerAnnouncement(options);
  }
}

export async function announceFundraiserEnded(options: FundraiserUpdateOptions & { totalRaised: number }): Promise<void> {
  const bot = createNostrBot();
  if (bot) {
    await bot.postFundraiserEnded(options);
  }
}

// Cache to track boost sessions and find the largest split
const boostSessions = new Map<string, { largestSplit: HelipadPaymentEvent, timeout: NodeJS.Timeout }>();
const postedBoosts = new Set<string>();

// Daily tracking for streams and boosts
interface DailyStats {
  date: string;
  streamSats: number;
  boostSats: number;
  streamShows: Set<string>;
  boostShows: Set<string>;
}

let dailyStats: DailyStats = {
  date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  streamSats: 0,
  boostSats: 0,
  streamShows: new Set(),
  boostShows: new Set()
};

// Daily summary timeout
let dailySummaryTimeout: NodeJS.Timeout | null = null;

// Hourly save timeout
let hourlySaveTimeout: NodeJS.Timeout | null = null;

function scheduleHourlySave(): void {
  if (hourlySaveTimeout) {
    clearTimeout(hourlySaveTimeout);
  }
  
  hourlySaveTimeout = setTimeout(async () => {
    await saveDailyStats();
    console.log(`💾 Hourly save completed`);
    scheduleHourlySave(); // Schedule next hour
  }, 60 * 60 * 1000); // 1 hour
  
  console.log(`💾 Hourly save scheduled`);
}

// File path for persisting daily stats
const DAILY_STATS_FILE = path.join(process.cwd(), 'daily-stats.json');

// Load daily stats from file
async function loadDailyStats(): Promise<void> {
  try {
    const data = await fs.readFile(DAILY_STATS_FILE, 'utf-8');
    const saved = JSON.parse(data);
    
    // Check if saved data is from today
    const currentDate = new Date().toISOString().split('T')[0];
    if (saved.date === currentDate) {
      dailyStats = {
        date: saved.date,
        streamSats: saved.streamSats || 0,
        boostSats: saved.boostSats || 0,
        streamShows: new Set(saved.streamShows || []),
        boostShows: new Set(saved.boostShows || [])
      };
      console.log(`📊 Loaded daily stats: ${dailyStats.streamSats + dailyStats.boostSats} total sats`);
    } else {
      console.log(`📅 New day detected, starting fresh stats`);
    }
  } catch (error) {
    console.log(`📊 No previous daily stats found, starting fresh`);
  }
}

// Save daily stats to file
async function saveDailyStats(): Promise<void> {
  try {
    const dataToSave = {
      date: dailyStats.date,
      streamSats: dailyStats.streamSats,
      boostSats: dailyStats.boostSats,
      streamShows: Array.from(dailyStats.streamShows),
      boostShows: Array.from(dailyStats.boostShows)
    };
    await fs.writeFile(DAILY_STATS_FILE, JSON.stringify(dataToSave, null, 2));
  } catch (error) {
    console.error(`❌ Failed to save daily stats:`, error);
  }
}

async function postDailySummary(): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  const streamShows = Array.from(dailyStats.streamShows);
  const boostShows = Array.from(dailyStats.boostShows);

  const content = `📊 Daily V4V Summary - ${dailyStats.date}

🌊 Streamed: ${dailyStats.streamSats.toLocaleString()} sats
📤 Boosted: ${dailyStats.boostSats.toLocaleString()} sats
💰 Total: ${(dailyStats.streamSats + dailyStats.boostSats).toLocaleString()} sats

${streamShows.length > 0 ? `🎧 Streamed to:\n${streamShows.map(show => `• ${show}`).join('\n')}\n` : ''}
${boostShows.length > 0 ? `🚀 Boosted:\n${boostShows.map(show => `• ${show}`).join('\n')}` : ''}

#V4V #Podcasting20 #PC20 #ValueStreaming #Boostagram`;

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: [
      ['t', 'v4v'],
      ['t', 'podcasting20'],
      ['t', 'pc20'],
      ['t', 'valuestreaming'],
      ['t', 'boostagram'],
      ['t', 'dailysummary'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
  console.log(`📊 Posted daily summary: ${dailyStats.streamSats + dailyStats.boostSats} total sats`);
}

async function resetDailyStats(): Promise<void> {
  dailyStats = {
    date: new Date().toISOString().split('T')[0],
    streamSats: 0,
    boostSats: 0,
    streamShows: new Set(),
    boostShows: new Set()
  };
  await saveDailyStats();
}

function scheduleDailySummary(): void {
  if (dailySummaryTimeout) {
    clearTimeout(dailySummaryTimeout);
  }

  // Calculate time until midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const msUntilMidnight = midnight.getTime() - now.getTime();

  dailySummaryTimeout = setTimeout(async () => {
    await postDailySummary();
    await resetDailyStats();
    scheduleDailySummary(); // Schedule next day
  }, msUntilMidnight);

  console.log(`📅 Daily summary scheduled for ${midnight.toLocaleString()}`);
}

// Test function to manually post current daily summary
export async function postTestDailySummary(): Promise<void> {
  console.log(`📊 Posting test daily summary...`);
  
  // Add temporary test data to see the format
  dailyStats.streamSats = 1250;
  dailyStats.boostSats = 500;
  dailyStats.streamShows.add("Lightning Thrashes");
  dailyStats.streamShows.add("The Wait Is Over");
  dailyStats.streamShows.add("Underwater - Single");
  dailyStats.boostShows.add("Lightning Thrashes");
  dailyStats.boostShows.add("Mike's Mixtape");
  
  console.log(`Test stats: ${dailyStats.streamSats} stream sats, ${dailyStats.boostSats} boost sats`);
  console.log(`Test shows: ${Array.from(dailyStats.streamShows).join(', ')} | ${Array.from(dailyStats.boostShows).join(', ')}`);
  await postDailySummary();
  
  // Reset to real data after test
  await resetDailyStats();
}

export async function announceHelipadPayment(event: HelipadPaymentEvent): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  // Debug: Log all payment details to understand the data
  console.log(`🔍 Payment received - Action: ${event.action}, Amount: ${event.value_msat / 1000} sats, Total: ${event.value_msat_total / 1000} sats, Message: "${event.message || 'none'}"`);
  
  // Load daily stats on first run
  if (dailyStats.streamSats === 0 && dailyStats.boostSats === 0 && dailyStats.streamShows.size === 0) {
    await loadDailyStats();
  }

  // Check if we need to reset daily stats (new day)
  const currentDate = new Date().toISOString().split('T')[0];
  if (currentDate !== dailyStats.date) {
    await postDailySummary(); // Post previous day's summary
    await resetDailyStats();
  }

  // Track all payments for daily summary
  const showName = event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless' 
    ? event.podcast 
    : (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless' ? event.episode : 'Unknown');

  const satsAmount = Math.floor(event.value_msat_total / 1000);
  const hasMessage = event.message && event.message.trim() && event.message.trim() !== '';
  const isLargePayment = satsAmount >= 1000;
  
  if (event.action === 1) { // Stream
    dailyStats.streamSats += satsAmount;
    dailyStats.streamShows.add(showName);
    console.log(`🌊 Added ${satsAmount} stream sats to daily total`);
  } else if (event.action === 2) { // Boost
    dailyStats.boostSats += satsAmount;
    dailyStats.boostShows.add(showName);
    console.log(`📤 Added ${satsAmount} boost sats to daily total`);
  }
  
  // Auto-save for large payments or payments with messages
  if (isLargePayment || hasMessage) {
    await saveDailyStats();
    console.log(`💾 Auto-saved: ${isLargePayment ? 'large payment' : 'has message'} (${satsAmount} sats)`);
  }

  // Schedule daily summary and hourly saves if not already scheduled
  if (!dailySummaryTimeout) {
    scheduleDailySummary();
    scheduleHourlySave();
  }

  // Only continue with individual boost posts for action === 2
  if (event.action !== 2) {
    return; // Skip individual posts for streams
  }

  // Group splits by a wider time window to catch all splits from the same boost
  const timeWindow = Math.floor(event.time / 120); // 2-minute windows to prevent split sessions
  const sessionId = `${timeWindow}-${event.sender}-${event.episode}-${event.podcast}`;
  
  console.log(`🔍 Processing payment: ${event.value_msat / 1000} sats (total: ${event.value_msat_total / 1000} sats) - Session: ${sessionId}`);
  
  // Check if we already posted for this boost session
  if (postedBoosts.has(sessionId)) {
    console.log(`⏭️ Already posted for boost session ${sessionId}, skipping.`);
    return;
  }

  // Get or create session entry
  const existingSession = boostSessions.get(sessionId);
  
  if (existingSession) {
    // Clear the previous timeout
    clearTimeout(existingSession.timeout);
    
    // Update if this split is larger
    if (event.value_msat > existingSession.largestSplit.value_msat) {
      existingSession.largestSplit = event;
      console.log(`📊 Updated largest split for session ${sessionId}: ${event.value_msat / 1000} sats (total: ${event.value_msat_total / 1000} sats)`);
    } else {
      console.log(`📊 Keeping existing largest split for session ${sessionId}: ${existingSession.largestSplit.value_msat / 1000} sats`);
    }
  } else {
    // First split for this session
    boostSessions.set(sessionId, { largestSplit: event, timeout: setTimeout(() => {}, 0) });
    console.log(`🆕 New boost session ${sessionId}: ${event.value_msat / 1000} sats (total: ${event.value_msat_total / 1000} sats)`);
  }

  // Set a timeout to post the largest payment after 30 seconds of no new payments
  // Longer delay for streaming to collect more payments in the session
  const session = boostSessions.get(sessionId)!;
  session.timeout = setTimeout(async () => {
    console.log(`🚀 Posting largest payment for session ${sessionId}: ${session.largestSplit.value_msat / 1000} sats (total: ${session.largestSplit.value_msat_total / 1000} sats)`);
    
    // Mark this session as posted
    postedBoosts.add(sessionId);
    boostSessions.delete(sessionId);
    
    // Post the largest payment from this session
    await postBoostToNostr(session.largestSplit, bot);
  }, 30000);
}

// Mapping of podcast app names to their download/website URLs and display names
const podcastAppLinks: Record<string, { url: string; displayName?: string }> = {
  'CurioCaster': { url: 'https://curiocaster.com' },
  'Fountain': { url: 'https://fountain.fm' },
  'Podverse': { url: 'https://podverse.fm' },
  'Castamatic': { url: 'https://castamatic.com' },
  'PodcastGuru': { url: 'https://podcastguru.io' },
  'Breez': { url: 'https://breez.technology' },
  'Sphinx': { url: 'https://sphinx.chat' },
  'LNBeats': { url: 'https://lnbeats.com' },
  'LN Beats': { url: 'https://lnbeats.com', displayName: 'LNBeats' },  // Display without space
  'Satoshis.stream': { url: 'https://satoshis.stream' },
  'Podstation': { url: 'https://podstation.github.io' },
  'Alby': { url: 'https://getalby.com' },
  'TrueFans': { url: 'https://truefans.fm' },
  'Buzzsprout': { url: 'https://buzzsprout.com' },
  // Add more as needed
};

async function postBoostToNostr(event: HelipadPaymentEvent, bot: any): Promise<void> {
  const actionText = "📤 Boost Sent!";
  const senderLabel = "👤 Sender";

  // Parse TLV data to build show link
  let showLink = '';
  try {
    if (event.tlv) {
      const tlvData = JSON.parse(event.tlv);
      const feedID = tlvData.feedID;
      
      // Link to show page (has all episodes + app chooser + episodes.fm button)
      if (feedID) {
        showLink = `https://podcastindex.org/podcast/${feedID}`;
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to parse TLV data for show link:', error);
  }

  // Format the content for Nostr
  const contentParts = [
    actionText,
    '',
    `${senderLabel}: ${event.sender || 'Unknown'}`,
  ];

  if (event.message && event.message.trim()) {
    contentParts.push(`💬 Message: ${event.message}`);
  }

  // Build app info with link if available
  const appName = event.app || '';
  const appConfig = podcastAppLinks[appName];
  const appInfo = appConfig 
    ? `📱 App: ${appConfig.url}`
    : `📱 App: ${appName}`;

  // Add podcast and episode info only if they exist and aren't placeholder values
  if (event.podcast && event.podcast.trim() && event.podcast.trim().toLowerCase() !== 'nameless') {
    contentParts.push(`🎧 Podcast: ${event.podcast}`);
  }
  if (event.episode && event.episode.trim() && event.episode.trim().toLowerCase() !== 'nameless') {
    contentParts.push(`📻 Episode: ${event.episode}`);
  }

  contentParts.push(
    `💸 Amount: ${(event.value_msat_total / 1000).toLocaleString()} sats`,
    appInfo
  );

  // Add show link if available
  if (showLink) {
    contentParts.push(`🎧 Listen: ${showLink}`);
  }

  contentParts.push(
    '',
    '#Boostagram #Podcasting20 #PC20 #V4V'
  );

  const content = contentParts.join('\n');

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: [
      ['t', 'boostagram'],
      ['t', 'podcasting20'],
      ['t', 'pc20'],
      ['t', 'v4v'],
      ['t', 'podcast'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
}