import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import * as gmail from './integrations/gmail.js';
import * as linkedin from './integrations/linkedin.js';
import * as system from './integrations/system.js';
import { authMiddleware } from './middleware/auth.js';
import { setupPairingRoutes } from './routes/pairing.js';
import { setupPcControlRoutes } from './routes/pc-control.js';

const AGENT_URL = 'http://127.0.0.1:8787/tool/run';
const AGENT_TOKEN = process.env.CHOTU_AGENT_TOKEN;

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'tauri://localhost', 'http://tauri.localhost'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

const db = new Database('chottu.db');
app.set('db', db);

db.exec(`
  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    device_name TEXT NOT NULL,
    scopes TEXT NOT NULL,
    revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS pairing_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_id TEXT UNIQUE NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

setupPairingRoutes(app, db);
setupPcControlRoutes(app);

// Simple web interface for pairing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Chottu Core Server</title></head>
    <body style="font-family: Arial; padding: 20px; background: #111; color: #fff;">
      <h1>Chottu AI Assistant - Core Server</h1>
      <div style="background: #222; padding: 20px; border-radius: 10px; margin: 20px 0;">
        <h2>Device Pairing</h2>
        <button onclick="generateCode()" style="background: #0066cc; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">Generate Pairing Code</button>
        <div id="code" style="margin: 20px 0; font-size: 24px; font-weight: bold;"></div>
      </div>
      <script>
        async function generateCode() {
          const response = await fetch('/pair/start', { method: 'POST' });
          const data = await response.json();
          document.getElementById('code').innerHTML = 'Pairing Code: <span style="color: #00ff00;">' + data.code + '</span><br><small>Expires in 5 minutes</small>';
        }
      </script>
    </body>
    </html>
  `);
});

app.use(authMiddleware);

app.get('/api/memory', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM memories').all();
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
});

app.post('/api/memory', (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO memories (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
  res.json({ success: true });
});

app.get('/api/history', (req, res) => {
  const rows = db.prepare('SELECT role, content FROM conversations ORDER BY created_at DESC LIMIT 40').all();
  res.json(rows.reverse().map(r => ({ role: r.role, parts: [{ text: r.content }] })));
});

app.post('/api/history', (req, res) => {
  const { role, content } = req.body;
  db.prepare('INSERT INTO conversations (role, content) VALUES (?, ?)').run(role, content);
  res.json({ success: true });
});

app.get('/auth/gmail', (req, res) => res.redirect(gmail.getAuthUrl()));
app.get('/auth/gmail/callback', async (req, res) => {
  const tokens = await gmail.getTokens(req.query.code);
  await gmail.initGmail(tokens);
  db.prepare('INSERT OR REPLACE INTO memories (key, value) VALUES (?, ?)').run('gmail_tokens', JSON.stringify(tokens));
  res.send('Gmail connected! Close this window.');
});

app.get('/auth/linkedin', (req, res) => res.redirect(linkedin.getAuthUrl()));
app.get('/auth/linkedin/callback', async (req, res) => {
  const tokens = await linkedin.getTokens(req.query.code);
  linkedin.setLinkedInToken(tokens.access_token);
  db.prepare('INSERT OR REPLACE INTO memories (key, value) VALUES (?, ?)').run('linkedin_token', tokens.access_token);
  res.send('LinkedIn connected! Close this window.');
});

app.post('/api/tools/email', async (req, res) => {
  const { action, query } = req.body;
  const emails = await gmail.getEmails(query || '', 10);
  res.json(emails);
});

app.post('/api/tools/linkedin', async (req, res) => {
  const data = await linkedin.getNotifications();
  res.json(data);
});

app.post('/api/tools/system', async (req, res) => {
  const { task } = req.body;
  const result = task.includes('search') || task.includes('find')
    ? await system.searchFiles(task.split(' ').pop())
    : await system.executeCommand(task);
  res.json(result);
});

// Chat endpoint with PC control fast path
app.post('/api/chat', async (req, res) => {
  const text = (req.body?.text || req.body?.message || req.body?.transcript || '').trim().toLowerCase();
    // === PC CONTROL FAST PATH (DO NOT TOUCH OTHER LOGIC) ===
  try {
    const normalized = String(text || "").trim().toLowerCase();

    // only intercept explicit "open ..." commands
    if (normalized.startsWith("open ")) {
      // IMPORTANT: call existing backend PC route, NOT the agent directly
      const port = process.env.PORT || 3001;

      // ✅ YOU MUST SET THIS TO THE REAL PATH FROM routes/pc-control.js
      // Open routes/pc-control.js and copy the exact endpoint path that handles NL open commands.
      // It will look like: app.post('/api/....', ...)
      const PC_NL_PATH = "/api/pc/nl"; // <-- CHANGE THIS to match your routes/pc-control.js

      const r = await fetch(`http://127.0.0.1:${port}${PC_NL_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalized })
      });

      const data = await r.json().catch(() => null);

      if (data?.ok) {
        return res.json({
          ok: true,
          reply: "Sure thing. Done.",
          tool: data
        });
      }

      // For an open command, return the real error (no fake “agent offline”)
      return res.json({
        ok: false,
        reply: `Couldn't do that: ${data?.error || "Unknown PC-control error"}`,
        tool: data
      });
    }
  } catch (e) {
    return res.json({
      ok: false,
      reply: `PC control failed: ${e?.message || String(e)}`
    });
  }
  // === END PC CONTROL FAST PATH ===

  
  // PC control fast path
  if (text.startsWith('open ')) {
    try {
      const response = await fetch('http://localhost:3001/api/pc/nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      
      if (data.ok) {
        return res.json({ success: true, message: 'Sure. Done.' });
      } else if (data.error === 'No PC action matched') {
        // Fall through to normal chat logic
      } else {
        return res.json({ success: false, message: data.error });
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.json({ success: false, message: 'PC control service unavailable' });
      }
      // Fall through to normal chat logic
    }
  }
  
  // Normal chat logic (placeholder)
  res.json({ success: true, message: 'Chat response would go here' });
});

const gmailTokens = db.prepare('SELECT value FROM memories WHERE key = ?').get('gmail_tokens');
if (gmailTokens) gmail.initGmail(JSON.parse(gmailTokens.value));

const linkedinToken = db.prepare('SELECT value FROM memories WHERE key = ?').get('linkedin_token');
if (linkedinToken) linkedin.setLinkedInToken(linkedinToken.value);

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
