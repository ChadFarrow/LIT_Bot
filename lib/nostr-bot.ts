// Server-side only - Nostr bot for posting fundraiser updates
// NOTE: This will only work if you deploy to a server environment (not static hosting)
// For static hosting, you'll need to set up a separate server/API for bot posting
import { finalizeEvent, nip19 } from 'nostr-tools';
import { Relay } from 'nostr-tools/relay';

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

  constructor(nsec: string, relays: string[] = ['wss://relay.damus.io', 'wss://relay.nostr.band']) {
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

    const publishPromises = this.relays.map(async (relayUrl) => {
      try {
        const relay = await Relay.connect(relayUrl);
        await relay.publish(event);
        relay.close();
        console.log(`✅ Published to ${relayUrl}`);
      } catch (error) {
        console.error(`❌ Failed to publish to ${relayUrl}:`, error);
      }
    });

    await Promise.allSettled(publishPromises);
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

export async function announceHelipadPayment(event: HelipadPaymentEvent): Promise<void> {
  const bot = createNostrBot();
  if (!bot) return;

  // Debug: Log all payment details to understand the data
  console.log(`🔍 Payment received - Action: ${event.action}, Amount: ${event.value_msat / 1000} sats, Total: ${event.value_msat_total / 1000} sats, Message: "${event.message || 'none'}"`);
  
  // Skip small payments (likely streaming) - under 25 sats
  if (event.value_msat_total < 25000) {
    console.log(`🌊 Small payment detected (${event.value_msat_total / 1000} sats total), likely streaming - skipping.`);
    return;
  }

  // For streaming sats, group by a wider time window and ignore total amount
  // since streaming creates many small individual payments
  const timeWindow = Math.floor(event.time / 60); // 60-second windows for streaming
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

async function postBoostToNostr(event: HelipadPaymentEvent, bot: any): Promise<void> {
  const actionText = "📤 Boost Sent!";
  const senderLabel = "👤 Sender";

  // Format the content for Nostr
  const contentParts = [
    actionText,
    '',
    `${senderLabel}: ${event.sender || 'Unknown'}`,
  ];

  if (event.message && event.message.trim()) {
    contentParts.push(`💬 Message: ${event.message}`);
  }

  contentParts.push(
    `🎧 Podcast: ${event.podcast || ''}`,
    `📻 Episode: ${event.episode || ''}`,
    `💸 Amount: ${(event.value_msat_total / 1000).toLocaleString()} sats`,
    `📱 App: ${event.app || ''}`,
    `🕒 Time: ${new Date(event.time * 1000).toLocaleString()}`,
    '',
    '#Boostagram #Podcasting20 #V4V'
  );

  const content = contentParts.join('\n');

  const nostrEvent = finalizeEvent({
    kind: 1,
    content,
    tags: [
      ['t', 'boostagram'],
      ['t', 'podcasting20'],
      ['t', 'v4v'],
      ['t', 'podcast'],
    ],
    created_at: Math.floor(Date.now() / 1000),
  }, bot.getSecretKey());

  await bot.publishToRelays(nostrEvent);
}