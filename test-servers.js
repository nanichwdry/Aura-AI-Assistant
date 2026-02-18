const fetch = require('node-fetch');

async function testServers() {
  console.log('Testing Aura AI Assistant Servers...\n');
  
  // Test Backend Server
  try {
    console.log('Testing Backend Server (http://localhost:3001)...');
    const backendResponse = await fetch('http://localhost:3001/api/health');
    if (backendResponse.ok) {
      const data = await backendResponse.json();
      console.log('✅ Backend Server: ONLINE');
      console.log('   Status:', data.status);
      console.log('   Timestamp:', data.timestamp);
    } else {
      console.log('❌ Backend Server: ERROR - Status', backendResponse.status);
    }
  } catch (error) {
    console.log('❌ Backend Server: OFFLINE');
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test Frontend Server
  try {
    console.log('Testing Frontend Server (http://localhost:5173)...');
    const frontendResponse = await fetch('http://localhost:5173');
    if (frontendResponse.ok) {
      console.log('✅ Frontend Server: ONLINE');
    } else {
      console.log('❌ Frontend Server: ERROR - Status', frontendResponse.status);
    }
  } catch (error) {
    console.log('❌ Frontend Server: OFFLINE');
    console.log('   Error:', error.message);
  }
  
  console.log();
  
  // Test News API
  try {
    console.log('Testing News API...');
    const newsResponse = await fetch('http://localhost:3001/api/news/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'us', language: 'en' })
    });
    if (newsResponse.ok) {
      const data = await newsResponse.json();
      console.log('✅ News API: WORKING');
      console.log('   Articles found:', data.articles?.length || 0);
    } else {
      console.log('❌ News API: ERROR - Status', newsResponse.status);
    }
  } catch (error) {
    console.log('❌ News API: ERROR');
    console.log('   Error:', error.message);
  }
  
  console.log();
  console.log('Test completed!');
}

testServers();