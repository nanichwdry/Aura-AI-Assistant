import { getProfile, inferPreferences } from './preference_engine.js';
import Database from 'better-sqlite3';

const db = new Database('chottu.db');
const MAX_SUGGESTIONS_PER_DAY = 3;
const COOLDOWNS = {
  traffic_alert: 4 * 60 * 60 * 1000,
  weather_update: 12 * 60 * 60 * 1000,
  price_drop: 24 * 60 * 60 * 1000,
  route_reminder: 24 * 60 * 60 * 1000
};

export async function generateProactiveSuggestions(userId) {
  const profile = getProfile(userId);
  const preferences = inferPreferences(userId);
  const suggestions = [];
  
  // Check daily limit
  const todayCount = db.prepare(`
    SELECT COUNT(*) as count FROM suggestion_history
    WHERE user_id = ? AND created_at > datetime('now', '-1 day')
  `).get(userId).count;
  
  if (todayCount >= MAX_SUGGESTIONS_PER_DAY) {
    return [];
  }
  
  // Traffic alert with cooldown
  if (canSuggest(userId, 'traffic_alert') && profile.homeLocation && profile.frequentCities.length > 0) {
    const dismissed = getDismissalRate(userId, 'traffic_alert');
    if (dismissed < 0.5) {
      suggestions.push({
        type: 'traffic_alert',
        message: `Check traffic for your frequent routes`,
        relevanceScore: 0.6 * (1 - dismissed),
        action: { tool: 'route_planner', input: { origin: profile.homeLocation } },
        evidence: {
          source: 'profile',
          signals: ['home_location', 'frequent_cities'],
          count: profile.frequentCities.length
        }
      });
    }
  }
  
  // Price drop with cooldown
  if (canSuggest(userId, 'price_drop') && preferences.budgetPatterns.avg) {
    const dismissed = getDismissalRate(userId, 'price_drop');
    if (dismissed < 0.5) {
      suggestions.push({
        type: 'price_drop',
        message: `Check for price drops on recent searches`,
        relevanceScore: 0.7 * (1 - dismissed),
        action: { tool: 'deal_finder', input: {} },
        evidence: {
          source: 'inferred',
          signals: ['budget_avg'],
          confidence: preferences.budgetPatterns.confidence,
          avgBudget: Math.round(preferences.budgetPatterns.avg)
        }
      });
    }
  }
  
  // Weather with cooldown
  if (canSuggest(userId, 'weather_update') && profile.homeLocation) {
    const dismissed = getDismissalRate(userId, 'weather_update');
    if (dismissed < 0.5) {
      suggestions.push({
        type: 'weather_update',
        message: `Today's weather in ${profile.homeLocation}`,
        relevanceScore: 0.5 * (1 - dismissed),
        action: { tool: 'weather', input: { city: profile.homeLocation } },
        evidence: {
          source: 'profile',
          signals: ['home_location'],
          location: profile.homeLocation
        }
      });
    }
  }
  
  // Route reminder with cooldown
  if (canSuggest(userId, 'route_reminder') && preferences.frequentRoutes.length > 0) {
    const topRoute = preferences.frequentRoutes[0];
    if (topRoute.confidence >= 0.7) {
      const dismissed = getDismissalRate(userId, 'route_reminder');
      if (dismissed < 0.5) {
        const [origin, destination] = topRoute.route.split('-');
        suggestions.push({
          type: 'route_reminder',
          message: `Plan your trip from ${origin} to ${destination}?`,
          relevanceScore: 0.65 * (1 - dismissed) * topRoute.confidence,
          action: { tool: 'route_planner', input: { origin, destination } },
          evidence: {
            source: 'inferred',
            signals: ['frequent_route'],
            confidence: topRoute.confidence,
            count: topRoute.count,
            route: topRoute.route
          }
        });
      }
    }
  }
  
  return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, MAX_SUGGESTIONS_PER_DAY - todayCount);
}

function canSuggest(userId, type) {
  const cooldown = COOLDOWNS[type] || 0;
  const recent = db.prepare(`
    SELECT created_at FROM suggestion_history
    WHERE user_id = ? AND suggestion_type = ?
    ORDER BY created_at DESC LIMIT 1
  `).get(userId, type);
  
  if (!recent) return true;
  
  const lastSeen = new Date(recent.created_at).getTime();
  return Date.now() - lastSeen > cooldown;
}

function getDismissalRate(userId, type) {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(dismissed) as dismissed_count
    FROM suggestion_history
    WHERE user_id = ? AND suggestion_type = ?
  `).get(userId, type);
  
  if (!stats || stats.total === 0) return 0;
  return stats.dismissed_count / stats.total;
}

export function logSuggestion(userId, type, data, dismissed = false) {
  db.prepare(`
    INSERT INTO suggestion_history (user_id, suggestion_type, suggestion_data, dismissed)
    VALUES (?, ?, ?, ?)
  `).run(userId, type, JSON.stringify(data), dismissed ? 1 : 0);
}

export async function checkDailyProactive(userId) {
  const suggestions = await generateProactiveSuggestions(userId);
  return {
    timestamp: new Date().toISOString(),
    suggestions,
    count: suggestions.length
  };
}
