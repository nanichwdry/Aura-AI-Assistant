import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('chottu.db');
const ADMIN_TOKENS = (process.env.ADMIN_TOKENS || '').split(',').filter(Boolean);
const ADMIN_TOKEN_HASHES = ADMIN_TOKENS.map(t => crypto.createHash('sha256').update(t).digest('hex'));
const ADMIN_IP_ALLOWLIST = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').filter(Boolean);
const ENABLE_ADMIN_ROUTES = process.env.ENABLE_ADMIN_ROUTES === 'true';

// Rate limiting store
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute

function checkRateLimit(key) {
  const now = Date.now();
  const record = rateLimits.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  record.count++;
  rateLimits.set(key, record);
  
  return record.count <= RATE_LIMIT_MAX_REQUESTS;
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  
  if (!match) {
    return res.status(401).json({ success: false, error: 'Missing Authorization Bearer token' });
  }
  
  const token = match[1].trim();
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Empty token' });
  }
  
  // Rate limit by token
  if (!checkRateLimit(`token:${token}`)) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }
  
  // Rate limit by IP
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(`ip:${ip}`)) {
    return res.status(429).json({ success: false, error: 'Rate limit exceeded' });
  }
  
  // Check if admin token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  if (ADMIN_TOKEN_HASHES.includes(tokenHash)) {
    // Verify IP allowlist if configured
    if (ADMIN_IP_ALLOWLIST.length > 0 && !ADMIN_IP_ALLOWLIST.includes(ip)) {
      return res.status(403).json({ success: false, error: 'IP not allowed' });
    }
    req.user = { id: 'admin', isAdmin: true };
    return next();
  }
  
  // Check device token and map to user_id
  const device = db.prepare('SELECT token, user_id, device_name FROM devices WHERE token = ? AND revoked = 0').get(token);
  
  if (!device || !device.user_id) {
    return res.status(401).json({ success: false, error: 'Invalid or revoked token' });
  }
  
  // Update last_seen_at
  db.prepare('UPDATE devices SET last_seen_at = CURRENT_TIMESTAMP WHERE token = ?').run(token);
  
  req.user = { id: device.user_id, isAdmin: false, deviceToken: token };
  next();
}

export function requireAdmin(req, res, next) {
  if (!ENABLE_ADMIN_ROUTES) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  
  next();
}

export function optionalAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  
  if (match) {
    const token = match[1].trim();
    const device = db.prepare('SELECT token, user_id FROM devices WHERE token = ? AND revoked = 0').get(token);
    if (device && device.user_id) {
      req.user = { id: device.user_id, isAdmin: false };
    }
  }
  
  if (!req.user) {
    req.user = { id: 'default', isAdmin: false };
  }
  
  next();
}
