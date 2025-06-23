// helipad-webhook.js
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { announceHelipadPayment, postTestDailySummary, postTestWeeklySummary } from './lib/nostr-bot.ts';
import { logger } from './lib/logger.js';

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
    logger.warn('Missing or invalid Authorization header');
    return res.status(401).send('Unauthorized: Missing or invalid token');
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  if (token !== AUTH_TOKEN) {
    logger.warn('Invalid token received');
    return res.status(403).send('Forbidden: Invalid token');
  }

  next();
};

app.post('/helipad-webhook', authenticate, async (req, res) => {
  try {
    const event = req.body;
    logger.info('Received Helipad webhook', { event });
    
    await announceHelipadPayment(event);
    
    res.status(200).send('OK');
  } catch (err) {
    logger.error('Error posting to Nostr', { error: err.message, stack: err.stack });
    res.status(500).send('Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Webhook receiver is running');
});

// Test daily summary endpoint
app.get('/test-daily-summary', async (req, res) => {
  try {
    logger.info('Test daily summary requested');
    await postTestDailySummary();
    res.status(200).send('Test daily summary posted to Nostr');
  } catch (err) {
    logger.error('Error posting test daily summary', { error: err.message, stack: err.stack });
    res.status(500).send('Error posting test daily summary');
  }
});

// Test weekly summary endpoint
app.get('/test-weekly-summary', async (req, res) => {
  try {
    logger.info('Test weekly summary requested');
    await postTestWeeklySummary();
    res.status(200).send('Test weekly summary posted to Nostr');
  } catch (err) {
    logger.error('Error posting test weekly summary', { error: err.message, stack: err.stack });
    res.status(500).send('Error posting test weekly summary');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Helipad webhook receiver started`, { port: PORT });
  logger.info(`Webhook URL: http://localhost:${PORT}/helipad-webhook`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
}); 