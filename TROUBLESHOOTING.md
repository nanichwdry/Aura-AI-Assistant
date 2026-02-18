# Aura AI Assistant - Development Troubleshooting

## Quick Fix for API Connection Issues

### Problem
- News API returns 404 errors
- Tools return "connection refused" errors
- App tries to connect to Vercel instead of local server

### Solution

1. **Start the Backend Server**
   ```bash
   cd server
   npm start
   ```
   Server should start on http://localhost:3001

2. **Start the Frontend Server**
   ```bash
   npm run dev
   ```
   Frontend should start on http://localhost:5173

3. **Use the Quick Start Script**
   ```bash
   # Run this from the project root
   start-dev.bat
   ```

4. **Test Server Connectivity**
   ```bash
   npm run test:servers
   ```

### Environment Configuration

Make sure your `.env` file has:
```
VITE_API_BASE_URL=http://localhost:3001
```

### Common Issues

1. **Port 3001 already in use**
   - Kill existing processes: `taskkill /f /im node.exe`
   - Or change port in `server/index.js`

2. **CORS errors**
   - Backend already configured for localhost:5173
   - Check if frontend is running on correct port

3. **API keys missing**
   - Check `.env` file has all required keys
   - Copy from `.env.example` if needed

### Verification Steps

1. Backend health check: http://localhost:3001/api/health
2. Frontend loading: http://localhost:5173
3. News API test: Use the test script or browser dev tools

### File Changes Made

1. **Fixed News Component**: Updated `AuraNewsDrawer.tsx` to use `API_BASE_URL`
2. **Environment Config**: Added `VITE_API_BASE_URL=http://localhost:3001` to `.env`
3. **Helper Scripts**: Added `start-dev.bat` and `test-servers.js`

### Next Steps

If issues persist:
1. Check Windows Firewall settings
2. Verify Node.js version (18+)
3. Clear browser cache
4. Restart both servers