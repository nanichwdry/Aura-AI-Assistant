import https from 'https';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔍 Aura AI Assistant - API Diagnostics');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('OPENWEATHER_API_KEY:', process.env.OPENWEATHER_API_KEY ? '✅ Set' : '❌ Not set');
console.log('NEWS_API_KEY:', process.env.NEWS_API_KEY ? '✅ Set' : '❌ Not set');
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('VITE_OPENWEATHER_API_KEY:', process.env.VITE_OPENWEATHER_API_KEY ? '✅ Set' : '❌ Not set');
console.log('VITE_NEWS_API_KEY:', process.env.VITE_NEWS_API_KEY ? '✅ Set' : '❌ Not set');
console.log('VITE_GEMINI_API_KEY:', process.env.VITE_GEMINI_API_KEY ? '✅ Set' : '❌ Not set');
console.log();

// Test Weather API
async function testWeatherAPI() {
  console.log('🌤️  Testing Weather API...');
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Weather API: Working');
      console.log(`   Location: ${data.name}`);
      console.log(`   Temperature: ${data.main.temp}°C`);
    } else {
      console.log('❌ Weather API: Failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Weather API: Error');
    console.log(`   Error: ${error.message}`);
  }
  console.log();
}

// Test News API
async function testNewsAPI() {
  console.log('📰 Testing News API...');
  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ News API: Working');
      console.log(`   Articles found: ${data.articles?.length || 0}`);
    } else {
      console.log('❌ News API: Failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ News API: Error');
    console.log(`   Error: ${error.message}`);
  }
  console.log();
}

// Test Background API (Unsplash demo)
async function testBackgroundAPI() {
  console.log('🖼️  Testing Background API...');
  try {
    const response = await fetch('https://api.unsplash.com/photos/random?query=nature&client_id=demo');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Background API: Working');
      console.log(`   Image: ${data.alt_description || 'No description'}`);
    } else {
      console.log('❌ Background API: Failed');
      console.log(`   Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Background API: Error');
    console.log(`   Error: ${error.message}`);
  }
  console.log();
}

// Run all tests
async function runDiagnostics() {
  await testWeatherAPI();
  await testNewsAPI();
  await testBackgroundAPI();
  
  console.log('🔧 Troubleshooting Tips:');
  console.log('1. Make sure your .env file has VITE_ prefixed variables for frontend');
  console.log('2. Restart your development server after changing .env');
  console.log('3. Check API key validity on respective service websites');
  console.log('4. Ensure no firewall is blocking API requests');
  console.log('\n✨ Run "restart-aura.bat" to restart all services');
}

runDiagnostics();