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
  if (request.action === 'openPopup') {
    chrome.storage.local.set({ lastBundle: request.bundle }, () => {
      chrome.action.openPopup();
    });
  }
});
