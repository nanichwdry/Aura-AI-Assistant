const DEFAULT_BACKEND = 'https://aura-ai-assistant.onrender.com';

let currentBundle = null;

async function loadBundle() {
  const data = await chrome.storage.local.get(['lastBundle', 'backendUrl']);
  currentBundle = data.lastBundle || { url: '', title: '', selectionText: '', contextText: '' };
  
  document.getElementById('pageInfo').textContent = `${currentBundle.title || 'No page'}\n${currentBundle.url || 'No URL'}`;
  document.getElementById('selectionText').textContent = currentBundle.selectionText || '(no selection - select text and press Alt+Shift+E)';
  document.getElementById('contextText').textContent = currentBundle.contextText || '(no context)';
  
  if (!currentBundle.selectionText && !currentBundle.contextText) {
    document.getElementById('error').textContent = '⚠️ No text captured. Please:\n1. Select text on the page\n2. Press Alt+Shift+E (not the icon)';
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('explainBtn').disabled = true;
  }
}

document.getElementById('captureBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'captureSelection' }, (response) => {
    if (chrome.runtime.lastError) {
      document.getElementById('error').textContent = 'Error: Content script not loaded. Refresh the page and try again.';
      document.getElementById('error').classList.remove('hidden');
    } else {
      setTimeout(() => loadBundle(), 100);
    }
  });
});

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
  explainBtn.textContent = '🎤 Speaking...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'explainWithVoice',
      question,
      context: `Title: ${currentBundle.title}\nURL: ${currentBundle.url}\nSelection: ${currentBundle.selectionText}\nContext: ${currentBundle.contextText}`
    });
    
    if (response.success) {
      answerDiv.textContent = response.answer + ' 🔊';
      answerDiv.classList.remove('hidden');
      copyBtn.classList.remove('hidden');
    } else {
      throw new Error(response.error || 'Native host not installed');
    }
  } catch (error) {
    errorDiv.textContent = `Error: ${error.message}\n\nMake sure native host is installed (run install.bat)`;
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
