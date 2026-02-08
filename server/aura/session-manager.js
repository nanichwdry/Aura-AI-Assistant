/**
 * Aura Session Manager
 * Minimal session tracking for conversation continuity
 */

const sessions = new Map();

function getOrCreateSession(sessionId, userId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      context: {},
      pendingAction: null,
    });
  }
  
  const session = sessions.get(sessionId);
  session.lastActivity = Date.now();
  session.messageCount++;
  
  return session;
}

function updateSessionContext(sessionId, updates) {
  const session = sessions.get(sessionId);
  if (session) {
    session.context = { ...session.context, ...updates };
  }
}

function setPendingAction(sessionId, action) {
  const session = sessions.get(sessionId);
  if (session) {
    session.pendingAction = action;
  }
}

function getPendingAction(sessionId) {
  const session = sessions.get(sessionId);
  return session?.pendingAction || null;
}

function clearPendingAction(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    session.pendingAction = null;
  }
}

function clearOldSessions(maxAgeMs = 3600000) {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > maxAgeMs) {
      sessions.delete(id);
    }
  }
}

// Cleanup every 10 minutes
setInterval(() => clearOldSessions(), 600000);

export { getOrCreateSession, updateSessionContext, setPendingAction, getPendingAction, clearPendingAction, clearOldSessions };
