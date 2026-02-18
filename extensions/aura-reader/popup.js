const DEFAULT_BACKEND = 'https://aura-ai-assistant.onrender.com';

let currentBundle = null;

async function loadBundle() {
  const data = await chrome.storage.local.get(['lastBundle', 'backendUrl']);
  currentBundle = data.lastBundle || { url: '', title: '', selectionText: '', contextText: '' };
  
  document.getElementById('pageInfo').textContent = `${currentBundle.title}\n${currentBundle.url}`;
  document.getElementById('selectionText').textContent = currentBundle.selectionText || '(no selection)';
  document.getElementById('contextText').textContent = currentBundle.contextText || '(no context)';
  
  if (!currentBundle.selectionText && !currentBundle.contextText) {
    document.getElementById('error').textContent = 'No text selected. Please select text on the page and try again.';
    document.getElementById('error').classList.remove('hidden');
  }
}

document.getElementById('explainBtn').addEventListener('click', async () => {
  const question = document.getElementById('question').value.trim() || 'Explain this simply';
  const answerDiv = document.getElementById('answer');
  const errorDiv = document.getElementById('error');
  const copyBtn = document.getElementById('copyBtn');
  const explainBtn = document.getElementById('explainBtn');
  
  answerDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  copyBtn.classList.add('hidden');
  
  explainBtn.disabled = true;
  explainBtn.textContent = '⏳ Thinking...';
  
  try {
    const data = await chrome.storage.local.get('backendUrl');
    const backendUrl = data.backendUrl || DEFAULT_BACKEND;
    
    const response = await fetch(`${backendUrl}/api/tools/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'page_explain',
        input: {
          question,
          url: currentBundle.url,
          title: currentBundle.title,
          selectionText: currentBundle.selectionText,
          contextText: currentBundle.contextText
        }
      })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Server error: ${text}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      answerDiv.textContent = result.data.answer;
      answerDiv.classList.remove('hidden');
      copyBtn.classList.remove('hidden');
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    errorDiv.textContent = `Error: ${error.message}`;
    errorDiv.classList.remove('hidden');
  } finally {
    explainBtn.disabled = false;
    explainBtn.textContent = '✨ Explain';
  }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const answer = document.getElementById('answer').textContent;
  navigator.clipboard.writeText(answer);
  document.getElementById('copyBtn').textContent = '✅ Copied!';
  setTimeout(() => {
    document.getElementById('copyBtn').textContent = '📋 Copy Answer';
  }, 2000);
});

document.getElementById('settingsLink').addEventListener('click', (e) => {
  e.preventDefault();
  const newUrl = prompt('Enter backend URL:', DEFAULT_BACKEND);
  if (newUrl) {
    chrome.storage.local.set({ backendUrl: newUrl });
    alert('Backend URL updated!');
  }
});

document.getElementById('contextText').addEventListener('click', (e) => {
  e.target.classList.toggle('collapsed');
});

loadBundle();
