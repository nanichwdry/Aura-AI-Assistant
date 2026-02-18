function getContextText(selection) {
  if (!selection || selection.rangeCount === 0) return '';
  
  const range = selection.getRangeAt(0);
  let container = range.commonAncestorContainer;
  
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement;
  }
  
  let contextElement = container;
  while (contextElement && !['P', 'DIV', 'ARTICLE', 'SECTION', 'LI'].includes(contextElement.tagName)) {
    contextElement = contextElement.parentElement;
  }
  
  if (!contextElement) {
    contextElement = container;
  }
  
  const text = contextElement.innerText || contextElement.textContent || '';
  return text.trim().slice(0, 6000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureSelection') {
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();
    const contextText = getContextText(selection);
    
    const bundle = {
      url: window.location.href,
      title: document.title,
      selectionText: selectionText.slice(0, 6000),
      contextText: contextText,
      timestamp: Date.now()
    };
    
    chrome.runtime.sendMessage({ action: 'openPopup', bundle });
  }
});
