import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import OpenAI from 'openai';
import * as gmail from './integrations/gmail.js';
import * as linkedin from './integrations/linkedin.js';
import * as system from './integrations/system.js';
import { authMiddleware } from './middleware/auth.js';
import { setupPairingRoutes } from './routes/pairing.js';
import { setupPcControlRoutes } from './routes/pc-control.js';
import codeRoutes from './routes/code.js';
import sketchRoutes from './routes/sketch.js';
import newsRoutes from './routes/news.js';
import musicRoutes from './routes/music.js';
import personalizationRoutes from './routes/personalization.js';
import { runAuraCommand } from './aura/executor.js';

import placesRoutes from './routes/places.js';

const AURA_EXECUTOR_ENABLED = process.env.AURA_EXECUTOR === 'true';

const AGENT_URL = 'http://127.0.0.1:8787/tool/run';
const AGENT_TOKEN = process.env.CHOTU_AGENT_TOKEN;

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'tauri://localhost',
    'http://tauri.localhost',
    'https://aura-ai-assistant.vercel.app',
    'https://aura-ai-assistant-frontend.vercel.app',
    'https://aura-ai-assistant-nine.vercel.app',
    /\.vercel\.app$/,
    /\.onrender\.com$/,
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
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
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    home_location TEXT,
    preferred_airports TEXT,
    budget_range TEXT,
    favorite_brands TEXT,
    frequent_cities TEXT,
    tone_preference TEXT DEFAULT 'professional',
    notification_prefs TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS user_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

setupPairingRoutes(app, db);
setupPcControlRoutes(app);
app.use('/api/code', codeRoutes);
app.use('/api/sketch', sketchRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/personalization', personalizationRoutes);
app.use('/api/places', placesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Add logging middleware for all API requests
app.use('/api', (req, res, next) => {
  console.log(`[API] ${req.method} ${req.path} - Status: ${res.statusCode}`);
  next();
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

// Unified tool router endpoint
app.post('/api/tools/run', async (req, res) => {
  console.log(`[API] POST /api/tools/run - Tool: ${req.body.tool}`);
  
  try {
    const { tool, input = {} } = req.body;
    
    if (!tool) {
      console.log(`[API] Error: Missing tool parameter`);
      return res.status(400).json({ success: false, error: 'Tool parameter is required' });
    }
    
    let result;
    
    switch (tool) {
      case 'weather':
        try {
          const city = input.city || 'Frederick';
          const apiKey = process.env.GOOGLE_MAPS_API_KEY;
          
          // Get coordinates from city name
          const geocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`);
          const geocodeData = await geocodeResponse.json();
          
          if (!geocodeData.results?.[0]) {
            throw new Error('Location not found');
          }
          
          const location = geocodeData.results[0].geometry.location;
          const locationName = geocodeData.results[0].formatted_address;
          
          // Get weather from OpenWeather as base
          const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
          const weatherData = await weatherResponse.json();
          
          // Try to get air quality data from Google
          let airQuality = null;
          try {
            const aqResponse = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: { latitude: location.lat, longitude: location.lng }
              })
            });
            if (aqResponse.ok) {
              airQuality = await aqResponse.json();
            }
          } catch (e) {
            console.log('Air Quality API not available');
          }
          
          // Try to get pollen data from Google
          let pollen = null;
          try {
            const pollenResponse = await fetch(`https://pollen.googleapis.com/v1/forecast:lookup?key=${apiKey}&location.latitude=${location.lat}&location.longitude=${location.lng}&days=1`);
            if (pollenResponse.ok) {
              pollen = await pollenResponse.json();
            }
          } catch (e) {
            console.log('Pollen API not available');
          }
          
          result = {
            ...weatherData,
            name: locationName.split(',')[0],
            location: location,
            airQuality: airQuality,
            pollen: pollen
          };
        } catch (error) {
          console.error('Weather API error:', error);
          result = {
            name: 'Frederick',
            main: { temp: 0, feels_like: 0, humidity: 0 },
            weather: [{ description: 'Weather service unavailable' }],
            wind: { speed: 0 },
            error: error.message
          };
        }
        break;
        
      case 'news':
        try {
          const category = input.category || 'general';
          const country = input.country || 'us';
          const query = input.query;
          
          let newsUrl;
          if (query) {
            newsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;
          } else {
            newsUrl = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${process.env.NEWS_API_KEY}`;
          }
          
          const newsResponse = await fetch(newsUrl);
          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            result = newsData.articles.slice(0, 10).map(article => ({
              title: article.title,
              description: article.description,
              source: article.source,
              url: article.url,
              publishedAt: article.publishedAt,
              urlToImage: article.urlToImage
            }));
          } else {
            result = [
              {
                title: 'News Service Unavailable',
                description: 'Unable to fetch latest news. Please check your API configuration.',
                source: { name: 'System' },
                url: '#'
              }
            ];
          }
        } catch (error) {
          result = [
            {
              title: 'News Service Error',
              description: 'Failed to connect to news service.',
              source: { name: 'System' },
              url: '#'
            }
          ];
        }
        break;
        
      case 'wikipedia':
        if (!input.query) {
          return res.status(400).json({ success: false, error: 'Query parameter required for Wikipedia' });
        }
        try {
          const wikiResponse = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(input.query)}`);
          if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            result = `${wikiData.title}\n\n${wikiData.extract}\n\nRead more: ${wikiData.content_urls?.desktop?.page || ''}`;
          } else {
            result = `No Wikipedia article found for "${input.query}"`;
          }
        } catch (error) {
          result = `Wikipedia search failed for "${input.query}"`;
        }
        break;
        
      case 'music':
        result = 'Music Player\n\n🎵 Now Playing: None\n🎶 Playlist: Empty\n⏯️ Controls: Play | Pause | Next | Previous';
        break;
        
      case 'games':
        try {
          const apiKey = '5ab37b5ba20e4739a66f7eb7c05da175';
          const { search, genre } = input || {};
          
          let url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=12`;
          
          if (search && search.trim()) {
            url += `&search=${encodeURIComponent(search.trim())}`;
          } else {
            url += `&ordering=-rating`; // Only add ordering if no search
          }
          
          if (genre && genre !== 'all') {
            url += `&genres=${genre}`;
          }
          
          console.log('Games API URL:', url);
          const gamesResponse = await fetch(url);
          console.log('Games API Status:', gamesResponse.status);
          
          if (gamesResponse.ok) {
            const gamesData = await gamesResponse.json();
            console.log('Games API Response:', gamesData);
            
            result = gamesData.results?.map(game => ({
              id: game.id,
              name: game.name,
              rating: game.rating || 0,
              released: game.released,
              background_image: game.background_image,
              genres: game.genres?.map(g => g.name).join(', ') || 'Unknown',
              platforms: game.platforms?.map(p => p.platform.name).slice(0, 3).join(', ') || 'Multiple',
              metacritic: game.metacritic
            })) || [];
          } else {
            const errorText = await gamesResponse.text();
            console.error('Games API Error:', gamesResponse.status, errorText);
            result = [];
          }
        } catch (error) {
          console.error('Games API Exception:', error);
          result = [];
        }
        break;
        
      case 'themes':
        result = 'Theme Manager\n\n🎨 Available Themes:\n• Dark Mode (Current)\n• Light Mode\n• Blue Theme\n• Purple Theme\n• Custom Theme\n\nTheme applied successfully!';
        break;
        
      case 'sketchpad':
        const { action: sketchAction, sketch, prompt: sketchPrompt, id: sketchId } = input;
        
        if (sketchAction === 'save' && sketch) {
          // Save sketch to database
          try {
            db.prepare(`
              INSERT OR REPLACE INTO sketches (id, title, dataUrl, created, updated) 
              VALUES (?, ?, ?, ?, ?)
            `).run(sketch.id, sketch.title, sketch.dataUrl, sketch.created, sketch.updated);
            result = { success: true, message: 'Sketch saved successfully' };
          } catch (error) {
            result = { success: false, error: 'Failed to save sketch' };
          }
        } else if (sketchAction === 'list') {
          // Get all sketches
          try {
            const sketches = db.prepare('SELECT * FROM sketches ORDER BY updated DESC').all();
            result = sketches;
          } catch (error) {
            // Create sketches table if it doesn't exist
            db.exec(`
              CREATE TABLE IF NOT EXISTS sketches (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                dataUrl TEXT NOT NULL,
                created TEXT NOT NULL,
                updated TEXT NOT NULL
              )
            `);
            result = [];
          }
        } else if (sketchAction === 'delete' && sketchId) {
          // Delete sketch
          try {
            db.prepare('DELETE FROM sketches WHERE id = ?').run(sketchId);
            result = { success: true, message: 'Sketch deleted successfully' };
          } catch (error) {
            result = { success: false, error: 'Failed to delete sketch' };
          }
        } else if (sketchAction === 'ai_generate' && sketchPrompt) {
          // AI Image Generation (placeholder - would need DALL-E or similar)
          try {
            // For now, return a placeholder response
            // In production, you'd integrate with DALL-E, Midjourney, or Stable Diffusion
            result = 'data:image/svg+xml;base64,' + btoa(`
              <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect width="800" height="600" fill="#1e293b"/>
                <text x="400" y="280" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="24">
                  AI Image Generation
                </text>
                <text x="400" y="320" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">
                  Prompt: ${sketchPrompt}
                </text>
                <text x="400" y="360" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">
                  (Placeholder - integrate with DALL-E API)
                </text>
              </svg>
            `);
          } catch (error) {
            result = 'AI image generation service unavailable';
          }
        } else {
          result = 'AI Sketchpad ready. Draw, create, and generate with AI assistance.';
        }
        break;
        
      case 'task_manager':
        if (input.text) {
          const tasks = input.text.split('\n').filter(t => t.trim());
          result = tasks;
        } else {
          result = ['Sample Task 1', 'Sample Task 2', 'Sample Task 3'];
        }
        break;
        
      case 'notepad':
        const { action: noteAction, note, text: noteText, id: noteId } = input;
        
        if (noteAction === 'save' && note) {
          // Save note to database
          try {
            db.prepare(`
              INSERT OR REPLACE INTO notes (id, title, content, created, updated) 
              VALUES (?, ?, ?, ?, ?)
            `).run(note.id, note.title, note.content, note.created, note.updated);
            result = { success: true, message: 'Note saved successfully' };
          } catch (error) {
            result = { success: false, error: 'Failed to save note' };
          }
        } else if (noteAction === 'list') {
          // Get all notes
          try {
            const notes = db.prepare('SELECT * FROM notes ORDER BY updated DESC').all();
            result = notes;
          } catch (error) {
            // Create notes table if it doesn't exist
            db.exec(`
              CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created TEXT NOT NULL,
                updated TEXT NOT NULL
              )
            `);
            result = [];
          }
        } else if (noteAction === 'delete' && noteId) {
          // Delete note
          try {
            db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
            result = { success: true, message: 'Note deleted successfully' };
          } catch (error) {
            result = { success: false, error: 'Failed to delete note' };
          }
        } else if (noteAction === 'test_ai') {
          // Test AI Connection
          try {
            console.log('Testing OpenAI connection...');
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'user',
                content: 'Say "AI connection successful" if you can read this.'
              }],
              max_tokens: 50
            });
            result = completion.choices[0].message.content.trim();
            console.log('AI test result:', result);
          } catch (error) {
            console.error('AI test failed:', error);
            result = `AI connection failed: ${error.message}`;
          }
        } else if (noteAction === 'grammar_check' && noteText) {
          // AI Grammar Check
          try {
            console.log('Grammar check request:', noteText);
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'system',
                content: 'You are a grammar and writing assistant. Fix grammar, spelling, punctuation, and improve clarity while maintaining the original meaning and tone. Return only the corrected text without explanations.'
              }, {
                role: 'user',
                content: noteText
              }],
              max_tokens: 1000,
              temperature: 0.3
            });
            result = completion.choices[0].message.content.trim();
            console.log('Grammar check result:', result);
          } catch (error) {
            console.error('Grammar check error:', error);
            result = 'Grammar check service unavailable. Please check your OpenAI API key.';
          }
        } else if (noteAction === 'rewrite' && noteText) {
          // AI Rewrite
          try {
            console.log('Rewrite request:', noteText);
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'system',
                content: 'You are a professional writing assistant. Rewrite the text to be more professional, clear, engaging, and well-structured while maintaining the original meaning. Improve flow and readability. Return only the rewritten text.'
              }, {
                role: 'user',
                content: noteText
              }],
              max_tokens: 1000,
              temperature: 0.7
            });
            result = completion.choices[0].message.content.trim();
            console.log('Rewrite result:', result);
          } catch (error) {
            console.error('Rewrite error:', error);
            result = 'Rewrite service unavailable. Please check your OpenAI API key.';
          }
        } else if (noteAction === 'expand' && noteText) {
          // AI Expand Ideas
          try {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'system',
                content: 'You are a creative writing assistant. Expand on the given text by adding more details, examples, explanations, and depth while maintaining the original tone and direction. Make it more comprehensive and engaging.'
              }, {
                role: 'user',
                content: noteText
              }],
              max_tokens: 1500,
              temperature: 0.8
            });
            result = completion.choices[0].message.content.trim();
          } catch (error) {
            result = 'Expand service unavailable. Please check your OpenAI API key.';
          }
        } else if (noteAction === 'summarize' && noteText) {
          // AI Summarize
          try {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{
                role: 'system',
                content: 'You are a summarization assistant. Create a concise, well-structured summary of the given text, capturing the key points and main ideas. Keep it clear and informative.'
              }, {
                role: 'user',
                content: noteText
              }],
              max_tokens: 500,
              temperature: 0.3
            });
            result = completion.choices[0].message.content.trim();
          } catch (error) {
            result = 'Summarize service unavailable. Please check your OpenAI API key.';
          }
        } else {
          result = 'AI Notepad ready. Create, edit, and enhance your notes with AI assistance.';
        }
        break;
        
      case 'translator':
        if (!input.text) {
          return res.status(400).json({ success: false, error: 'Text parameter required for translation' });
        }
        try {
          const toLang = input.to || 'en';
          let fromLang = input.from;
          let translatedText = '';
          let detectedLang = fromLang;
          
          // If auto-detect, use Google Translate API via Gemini
          if (!fromLang || fromLang === 'auto') {
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            
            const prompt = `Translate this text to ${toLang === 'en' ? 'English' : toLang}. Only return the translation, nothing else:\n\n${input.text}`;
            const result = await model.generateContent(prompt);
            translatedText = result.response.text();
            detectedLang = 'auto';
          } else {
            // Use MyMemory API for specific language pairs
            const translateResponse = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(input.text)}&langpair=${fromLang}|${toLang}`);
            if (translateResponse.ok) {
              const translateData = await translateResponse.json();
              translatedText = translateData.responseData.translatedText;
              detectedLang = fromLang;
            } else {
              throw new Error('Translation service unavailable');
            }
          }
          
          result = {
            original: input.text,
            translated: translatedText,
            from: detectedLang,
            to: toLang
          };
        } catch (error) {
          result = { error: 'Translation failed: ' + error.message };
        }
        break;
        
      case 'time':
        result = new Date().toISOString();
        break;
        
      case 'background':
        result = {
          urls: { regular: 'https://picsum.photos/800/600?random=' + Date.now() },
          alt_description: 'Beautiful random background',
          user: { name: 'Lorem Picsum' },
          links: { html: 'https://picsum.photos' }
        };
        break;
        
      case 'code_editor':
        if (!input.text) {
          return res.status(400).json({ success: false, error: 'Code input required' });
        }
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: 'You are Aura Code Editor. Rules: 1) Return production-ready code only. 2) No "assume sanitized" - either render as text safely OR propose concrete sanitization. 3) For React: handle response.ok, error state, abort controller, stale updates. 4) Use best practices. 5) Secure and modern syntax. 6) Minimal changes only.'
            }, {
              role: 'user',
              content: input.text
            }]
          });
          result = completion.choices[0].message.content;
        } catch (error) {
          return res.status(500).json({ success: false, error: 'Code generation failed: ' + error.message });
        }
        break;
        
      case 'code_analyzer':
        if (!input.code) {
          return res.status(400).json({ success: false, error: 'Code parameter required for analysis' });
        }
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'system',
              content: 'You are Aura Code Analyzer. Analyze code and return structured feedback:\n\n## Critical Issues\n## Improvements\n## Refactored Snippet (if needed)\n## Summary\n\nBe precise. No fluff. No "assume sanitized" - call out real security issues with concrete fixes.'
            }, {
              role: 'user',
              content: `Code to analyze:\n\`\`\`\n${input.code}\n\`\`\``
            }]
          });
          result = completion.choices[0].message.content;
        } catch (error) {
          return res.status(500).json({ success: false, error: 'Code analysis failed: ' + error.message });
        }
        break;
        
      case 'summarizer':
        if (!input.text) {
          return res.status(400).json({ success: false, error: 'Text parameter required for summarization' });
        }
        const sentences = input.text.split('.').filter(s => s.trim());
        const summary = sentences.slice(0, 2).join('.') + (sentences.length > 2 ? '.' : '');
        result = `Summary:\n\n${summary}\n\nOriginal: ${input.text.length} characters\nSummary: ${summary.length} characters`;
        break;
        
      case 'founder':
        result = {
          name: 'NaniChwdry (Mukharji V)',
          role: 'Creator of Aura AI Assistant',
          message: 'Hello! I created Aura to be your personal AI assistant.'
        };
        break;
        
      case 'memory':
        if (input.action === 'save' && input.key && input.value) {
          db.prepare('INSERT OR REPLACE INTO memories (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(input.key, input.value);
          result = { message: `Memory saved: ${input.key} = ${input.value}` };
        } else if (input.action === 'get') {
          const rows = db.prepare('SELECT key, value FROM memories').all();
          result = Object.fromEntries(rows.map(r => [r.key, r.value]));
        } else {
          result = { message: 'Aura Memory ready. Use action: "save" or "get"' };
        }
        break;
        
      case 'route_planner':
        const { origin, destination, preference = 'fastest' } = input;
        
        if (!origin || !destination) {
          return res.status(400).json({ success: false, error: 'Origin and destination are required' });
        }
        
        try {
          // Import the upgraded route planner
          const { planRoute } = await import('./tools/route_planner.js');
          const routeResult = await planRoute({ origin, destination, preference });
          
          if (!routeResult.success) {
            return res.status(500).json(routeResult);
          }
          
          result = routeResult.data;
        } catch (error) {
          console.error('Route planner error:', error);
          return res.status(500).json({ success: false, error: error.message });
        }
        break;
        
      case 'vscode_help':
        try {
          const { vscode_help } = await import('./tools/vscode_help.js');
          const vscodeResult = await vscode_help(input);
          if (!vscodeResult.success) {
            return res.status(400).json(vscodeResult);
          }
          result = vscodeResult.data;
        } catch (error) {
          console.error('VS Code helper error:', error);
          return res.status(500).json({ success: false, error: error.message });
        }
        break;
        
      case 'page_explain':
        try {
          const { page_explain } = await import('./tools/page_explain.js');
          const pageResult = await page_explain(input);
          if (!pageResult.success) {
            return res.status(400).json(pageResult);
          }
          result = pageResult.data;
        } catch (error) {
          console.error('Page explain error:', error);
          return res.status(500).json({ success: false, error: error.message });
        }
        break;
        
      default:
        console.log(`[API] Error: Unknown tool: ${tool}`);
        return res.status(400).json({ success: false, error: `Unknown tool: ${tool}` });
    }
    
    console.log(`[API] Success: Tool ${tool} executed successfully`);
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error(`[API] Error in /api/tools/run:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat endpoint - Agent Orchestrated
app.post('/api/chat', async (req, res) => {
  const text = (req.body?.text || req.body?.message || req.body?.transcript || '').trim();
  const sessionId = req.body?.sessionId || `session_${Date.now()}`;
  const userId = req.body?.userId || 'default';
  
  // Aura Executor (feature-flagged)
  if (AURA_EXECUTOR_ENABLED && text) {
    try {
      const result = await runAuraCommand({
        source: 'message',
        userId,
        sessionId,
        text,
        attachments: req.body?.attachments || [],
        metadata: req.body?.metadata || {},
      });
      
      return res.json({
        success: true,
        reply: result.replyText,
        trace: result.toolTrace,
        actions: result.actionsTaken,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
  
  // Agent Core Orchestration with Personalization
  if (text) {
    try {
      const { executeAgent } = await import('./agent/agent_core.js');
      const result = await executeAgent(text, sessionId, userId);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        type: 'error',
        reasoning: error.message,
        data: null,
        confidence: 0
      });
    }
  }
  
  res.json({ success: false, type: 'error', reasoning: 'No message provided', data: null, confidence: 0 });
});

// Optional: Backend can also route through n8n if needed
app.post('/api/pc-control', async (req, res) => {
  try {
    const response = await fetch('https://mukharji2108.app.n8n.cloud/webhook/pc-control-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: req.body.command || req.body.text,
        source: 'backend',
        requestId: Date.now().toString()
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'n8n workflow unavailable' });
  }
});

const gmailTokens = db.prepare('SELECT value FROM memories WHERE key = ?').get('gmail_tokens');
if (gmailTokens) gmail.initGmail(JSON.parse(gmailTokens.value));

const linkedinToken = db.prepare('SELECT value FROM memories WHERE key = ?').get('linkedin_token');
if (linkedinToken) linkedin.setLinkedInToken(linkedinToken.value);

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

export default app;