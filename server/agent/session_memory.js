const sessions = new Map();

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      lastIntent: null,
      lastEntities: {},
      lastToolResults: {},
      contextStack: [],
      lastMode: null,
      greeted: false
    });
  }
  return sessions.get(sessionId);
}

export function updateSession(sessionId, data) {
  const session = getSession(sessionId);
  Object.assign(session, data);
  session.contextStack.push({
    timestamp: Date.now(),
    intent: data.lastIntent,
    result: data.lastToolResults
  });
  if (session.contextStack.length > 10) session.contextStack.shift();
}

export function clearSession(sessionId) {
  sessions.delete(sessionId);
}
