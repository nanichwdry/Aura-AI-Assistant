// Test script for Aura extensions backend
// Run: node extensions/test-backend.js

const BACKEND_URL = 'https://aura-ai-assistant.onrender.com';

async function testPageExplain() {
  console.log('\n🌐 Testing page_explain tool...');
  
  const response = await fetch(`${BACKEND_URL}/api/tools/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'page_explain',
      input: {
        question: 'What is this about?',
        url: 'https://example.com',
        title: 'Test Page',
        selectionText: 'Machine learning is a subset of AI.',
        contextText: 'Machine learning is a subset of AI. It uses algorithms to learn from data.'
      }
    })
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ page_explain works!');
    console.log('Answer:', result.data.answer);
  } else {
    console.log('❌ page_explain failed:', result.error);
  }
}

async function testVSCodeHelp() {
  console.log('\n💻 Testing vscode_help tool...');
  
  const response = await fetch(`${BACKEND_URL}/api/tools/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tool: 'vscode_help',
      input: {
        question: 'Explain this code',
        filePath: '/test/example.js',
        languageId: 'javascript',
        selectionText: 'const sum = (a, b) => a + b;',
        contextSnippet: 'function calculate() {\n  const sum = (a, b) => a + b;\n  return sum(5, 3);\n}',
        diagnostics: [],
        terminalTail: ''
      }
    })
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Result:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ vscode_help works!');
    console.log('Answer:', result.data.answer);
  } else {
    console.log('❌ vscode_help failed:', result.error);
  }
}

async function testHealth() {
  console.log('\n🏥 Testing health endpoint...');
  
  const response = await fetch(`${BACKEND_URL}/api/health`);
  const result = await response.json();
  
  console.log('Status:', response.status);
  console.log('Result:', result);
  
  if (response.ok) {
    console.log('✅ Backend is healthy!');
  } else {
    console.log('❌ Backend health check failed');
  }
}

async function runTests() {
  console.log('🚀 Testing Aura Extensions Backend');
  console.log('Backend URL:', BACKEND_URL);
  
  try {
    await testHealth();
    await testPageExplain();
    await testVSCodeHelp();
    
    console.log('\n✨ All tests completed!');
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

runTests();
