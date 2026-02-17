# Render Deployment Guide - Backend Only

## ✅ Current Status

Your backend is **READY** for Render deployment. All necessary configurations are in place:

- ✅ `server/package.json` exists with all runtime dependencies
- ✅ Server listens on `process.env.PORT`
- ✅ Health check endpoint at `/api/health`
- ✅ CORS configured for Vercel origins

---

## 🚀 Render Configuration

### Step 1: Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `nanichwdry/Aura-AI-Assistant`

### Step 2: Configure Build Settings

**CRITICAL: Use these EXACT commands**

```
Build Command:
cd server && npm ci

Start Command:
cd server && npm start
```

**DO NOT USE:**
- ❌ `npm run build` (triggers Vite)
- ❌ `npm install` (use `npm ci` for production)
- ❌ Any command at repo root

### Step 3: Environment Variables

Add these in Render → Environment:

```
OPENWEATHER_API_KEY=your_openweather_api_key
NEWS_API_KEY=your_news_api_key
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AUTH_REQUIRED=false
AURA_EXECUTOR=false
```

**Note:** Replace placeholder values with your actual API keys from `.env` file.

**Note:** Render automatically provides `PORT` - don't set it manually.

### Step 4: Additional Settings

- **Region:** Choose closest to your users
- **Instance Type:** Free tier is fine for testing
- **Auto-Deploy:** Enable (deploys on git push)

---

## 🧪 Testing After Deployment

Once deployed, Render will give you a URL like:
```
https://aura-backend-xyz.onrender.com
```

### Test Health Endpoint

```bash
curl https://your-render-url.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### Test API Endpoint

```bash
curl -X POST https://your-render-url.onrender.com/api/tools/run \
  -H "Content-Type: application/json" \
  -d '{"tool":"time"}'
```

---

## 🔗 Connect Frontend (Vercel)

### Update Vercel Environment Variable

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add:

```
VITE_API_BASE_URL=https://your-render-url.onrender.com
```

3. Redeploy frontend

### Update Frontend Code (if needed)

If not already done, update API calls to use:

```javascript
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Example usage
fetch(`${API_URL}/api/tools/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tool: 'weather', input: { city: 'London' } })
});
```

---

## 📋 Deployment Checklist

- [ ] Render service created
- [ ] Build command: `cd server && npm ci`
- [ ] Start command: `cd server && npm start`
- [ ] All environment variables added
- [ ] Service deployed successfully
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints working
- [ ] Vercel environment variable updated
- [ ] Frontend can connect to backend

---

## 🐛 Troubleshooting

### Build Fails with "vite: not found"

**Problem:** Render is running commands at repo root instead of `/server`

**Solution:** Double-check build command starts with `cd server &&`

### "Cannot find module 'express'"

**Problem:** Dependencies not installed

**Solution:** Ensure build command uses `npm ci` not `npm install`

### Port Binding Error

**Problem:** Server not listening on `process.env.PORT`

**Solution:** Already fixed in `server/index.js` - server uses `process.env.PORT || 3001`

### CORS Errors from Frontend

**Problem:** Vercel origin not allowed

**Solution:** Already fixed - CORS includes `*.vercel.app` pattern

### Database Errors

**Problem:** SQLite database not persisting

**Solution:** Render free tier has ephemeral storage. For persistence:
1. Upgrade to paid tier with persistent disk
2. Or migrate to PostgreSQL (recommended for production)

---

## 📊 Monitoring

### Render Dashboard

- View logs: Render → Your Service → Logs
- Monitor metrics: CPU, Memory, Response times
- Check deployment history

### Health Checks

Render automatically pings `/api/health` to verify service is running.

---

## 🔄 Continuous Deployment

With Auto-Deploy enabled:

1. Push code to GitHub: `git push`
2. Render automatically detects changes
3. Runs build command
4. Deploys new version
5. Zero-downtime deployment

---

## 💰 Cost Optimization

**Free Tier Limitations:**
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month free

**Upgrade Options:**
- **Starter ($7/month):** Always-on, faster builds
- **Standard ($25/month):** More resources, persistent disk

---

## 🎯 Production Recommendations

1. **Database:** Migrate from SQLite to PostgreSQL
2. **Monitoring:** Add error tracking (Sentry, LogRocket)
3. **Caching:** Implement Redis for session management
4. **Rate Limiting:** Add rate limiting middleware
5. **Security:** Enable HTTPS only, add helmet.js
6. **Backups:** Regular database backups

---

## 📞 Support

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **GitHub Issues:** Open issue in your repo

---

**Last Updated:** 2024-01-15
**Backend Version:** 1.0.0
**Deployment Status:** ✅ Ready for Production
