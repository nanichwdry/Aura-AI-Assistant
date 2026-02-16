export function authMiddleware(req, res, next) {
  // Skip auth for pairing endpoints, health check, and PC control
  if (req.path.startsWith('/pair/') || req.path === '/api/health' || req.path.startsWith('/api/pc/')) {
    return next();
  }
  
  // Skip auth if disabled (dev only)
  if (process.env.AUTH_REQUIRED === 'false') {
    return next();
  }
  
  // Skip all auth for memory, history, and tools endpoints in dev
  if (req.path.startsWith('/api/memory') || req.path.startsWith('/api/history') || req.path.startsWith('/api/tools/')) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH] Missing or invalid authorization header for ${req.path}`);
    return res.status(401).json({ success: false, error: 'Not paired / unauthorized' });
  }
  
  const token = authHeader.substring(7);
  const db = req.app.get('db');
  
  // Validate token
  const device = db.prepare(`
    SELECT * FROM devices 
    WHERE token = ? AND revoked = 0
  `).get(token);
  
  if (!device) {
    console.log(`[AUTH] Invalid or revoked token for ${req.path}`);
    return res.status(401).json({ success: false, error: 'Not paired / unauthorized' });
  }
  
  // Add device info to request
  req.device = {
    id: device.id,
    name: device.device_name,
    scopes: device.scopes.split(',')
  };
  
  next();
}