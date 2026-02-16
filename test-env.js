// Test environment variables
console.log('Testing environment variables...');
console.log('VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? 'Set' : 'Not set');
console.log('VITE_OPENWEATHER_API_KEY:', import.meta.env.VITE_OPENWEATHER_API_KEY ? 'Set' : 'Not set');
console.log('VITE_NEWS_API_KEY:', import.meta.env.VITE_NEWS_API_KEY ? 'Set' : 'Not set');

// Test API calls
async function testAPIs() {
  try {
    // Test Weather API
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}&units=metric`);
    console.log('Weather API Status:', weatherRes.status, weatherRes.ok ? 'OK' : 'Failed');
    
    // Test News API
    const newsRes = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${import.meta.env.VITE_NEWS_API_KEY}`);
    console.log('News API Status:', newsRes.status, newsRes.ok ? 'OK' : 'Failed');
    
    // Test Unsplash (demo key)
    const bgRes = await fetch('https://api.unsplash.com/photos/random?query=nature&client_id=demo');
    console.log('Background API Status:', bgRes.status, bgRes.ok ? 'OK' : 'Failed');
    
  } catch (error) {
    console.error('API Test Error:', error);
  }
}

// Run tests when page loads
if (typeof window !== 'undefined') {
  testAPIs();
}