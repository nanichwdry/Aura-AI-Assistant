import express from 'express';
import { handleWebhook, verifyWebhook } from '../controllers/whatsappController.js';

const router = express.Router();

// Webhook verification (GET)
router.get('/webhook', verifyWebhook);

// Webhook events (POST)
router.post('/webhook', handleWebhook);

export default router;
