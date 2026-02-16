import express from 'express';
import { getProfile, updateProfile, getRecentActions, inferPreferences, cleanupOldActions } from '../agent/preference_engine.js';
import { generateProactiveSuggestions, checkDailyProactive, logSuggestion } from '../agent/proactive_engine.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';
import Database from 'better-sqlite3';

const router = express.Router();
const db = new Database('chottu.db');
const MAX_BODY_SIZE = 100 * 1024; // 100KB

// Body size limit middleware
router.use((req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return res.status(413).json({ success: false, error: 'Request body too large' });
  }
  next();
});

// All routes require authentication
router.use(requireAuth);

// Get user profile (authenticated user only)
router.get('/profile', (req, res) => {
  const profile = getProfile(req.user.id);
  res.json({ success: true, profile });
});

// Update user profile (authenticated user only)
router.post('/profile', (req, res) => {
  updateProfile(req.user.id, req.body);
  res.json({ success: true, message: 'Profile updated' });
});

// Get recent actions (authenticated user only)
router.get('/actions', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const actions = getRecentActions(req.user.id, limit);
  res.json({ success: true, actions });
});

// Get inferred preferences (authenticated user only)
router.get('/preferences', (req, res) => {
  const preferences = inferPreferences(req.user.id);
  res.json({ success: true, preferences });
});

// Get proactive suggestions (authenticated user only)
router.get('/suggestions', async (req, res) => {
  const suggestions = await generateProactiveSuggestions(req.user.id);
  res.json({ success: true, suggestions });
});

// Log suggestion interaction
router.post('/suggestions/:type/dismiss', (req, res) => {
  logSuggestion(req.user.id, req.params.type, {}, true);
  res.json({ success: true });
});

router.post('/suggestions/:type/accept', (req, res) => {
  logSuggestion(req.user.id, req.params.type, {}, false);
  res.json({ success: true });
});

// Daily proactive check (authenticated user only)
router.get('/daily', async (req, res) => {
  const daily = await checkDailyProactive(req.user.id);
  res.json({ success: true, daily });
});

// Reset memory (authenticated user only)
router.post('/reset', (req, res) => {
  const userId = req.user.id;
  
  // Ensure profile exists before reset
  db.prepare('INSERT OR IGNORE INTO user_profiles (user_id, tone_preference) VALUES (?, "professional")').run(userId);
  
  // Delete user actions
  db.prepare('DELETE FROM user_actions_new WHERE user_id = ?').run(userId);
  
  // Delete preferences
  db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
  
  // Delete suggestion history
  db.prepare('DELETE FROM suggestion_history WHERE user_id = ?').run(userId);
  
  // Reset profile to defaults
  db.prepare(`
    UPDATE user_profiles 
    SET home_location = NULL, 
        preferred_airports = NULL, 
        budget_range = NULL, 
        favorite_brands = NULL, 
        frequent_cities = NULL,
        tone_preference = 'professional',
        notification_prefs = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).run(userId);
  
  res.json({ success: true, message: 'Memory reset successfully' });
});

// Transparency view (authenticated user only)
router.get('/transparency', (req, res) => {
  const profile = getProfile(req.user.id);
  const actions = getRecentActions(req.user.id, 50);
  const preferences = inferPreferences(req.user.id);
  
  // Build evidence-based explanation
  const evidenceDetails = [];
  
  preferences.frequentRoutes.forEach(r => {
    evidenceDetails.push({
      type: 'frequent_route',
      value: r.route,
      confidence: r.confidence,
      evidenceCount: r.count,
      usedFor: 'Route suggestions and traffic alerts'
    });
  });
  
  if (preferences.budgetPatterns.avg) {
    evidenceDetails.push({
      type: 'budget_avg',
      value: `$${Math.round(preferences.budgetPatterns.avg)}`,
      confidence: preferences.budgetPatterns.confidence,
      evidenceCount: 'multiple purchases',
      usedFor: 'Deal recommendations within your budget'
    });
  }
  
  const explanation = {
    dataCollected: {
      profileFields: Object.keys(profile).filter(k => profile[k]),
      actionCount: actions.length,
      actionTypes: [...new Set(actions.map(a => a.type))]
    },
    inferredPatterns: preferences,
    evidenceDetails,
    howWeUseIt: [
      'Suggest relevant routes based on your frequent searches',
      'Recommend deals within your typical budget range',
      'Provide weather for your home location',
      'Adjust tone based on your preference'
    ],
    yourRights: [
      'View all collected data',
      'Reset memory at any time',
      'Update preferences manually',
      'Opt out of personalization'
    ]
  };
  
  res.json({ success: true, explanation });
});

// Admin-only: Get any user profile
router.get('/admin/profile/:userId', requireAdmin, (req, res) => {
  const profile = getProfile(req.params.userId);
  res.json({ success: true, profile });
});

// Admin-only: Cleanup old actions
router.post('/admin/cleanup', requireAdmin, (req, res) => {
  const deleted = cleanupOldActions();
  res.json({ success: true, deleted });
});

export default router;
