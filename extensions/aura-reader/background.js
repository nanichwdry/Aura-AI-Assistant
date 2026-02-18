chrome.commands.onCommand.addListener((command) => {
  if (command === 'capture-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'captureSelection' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'explainWithVoice') {
    const port = chrome.runtime.connectNative('com.aura.native_host');
    
    port.onMessage.addListener((response) => {
      sendResponse(response);
    });
    
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      }
    });
    
    port.postMessage({
      action: 'explain',
      question: request.question,
      context: request.context
    });
    
    return true;
  }
  
  if (request.action === 'openPopup') {
    chrome.storage.local.set({ lastBundle: request.bundle });
  }
});
