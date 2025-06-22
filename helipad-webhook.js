// helipad-webhook.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { announceHelipadPayment } from './lib/nostr-bot.ts';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const AUTH_TOKEN = process.env.HELIPAD_WEBHOOK_TOKEN;

// Middleware for authentication
const authenticate = (req, res, next) => {
  if (!AUTH_TOKEN) {
    // If no token is set in the environment, skip auth
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ Missing or invalid Authorization header');
    return res.status(401).send('Unauthorized: Missing or invalid token');
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  if (token !== AUTH_TOKEN) {
    console.warn('🚨 Invalid token received');
    return res.status(403).send('Forbidden: Invalid token');
  }

  next();
};

app.post('/helipad-webhook', authenticate, async (req, res) => {
  try {
    const event = req.body;
    console.log('Received Helipad webhook:', JSON.stringify(event, null, 2));
    
    await announceHelipadPayment(event);
    console.log('✅ Successfully posted to Nostr');
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error posting to Nostr:', err);
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Webhook receiver is running');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Helipad webhook receiver listening on port ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/helipad-webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
}); 