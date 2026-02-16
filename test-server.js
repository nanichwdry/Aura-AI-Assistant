// Test server connectivity
async function testServer() {
  try {
    console.log('Testing server connection...');
    
    // Test health endpoint
    const healthRes = await fetch('http://localhost:3001/api/health');
    console.log('Health check:', healthRes.status, await healthRes.text());
    
    // Test memory endpoint
    const memoryRes = await fetch('http://localhost:3001/api/memory');
    console.log('Memory endpoint:', memoryRes.status, await memoryRes.text());
    
  } catch (error) {
    console.error('Server test failed:', error);
  }
}

testServer();