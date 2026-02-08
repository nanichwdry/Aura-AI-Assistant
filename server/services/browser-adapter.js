/**
 * Minimal Chrome DevTools Protocol adapter for browser automation
 * Connects to Chrome/Edge via CDP to execute JavaScript in active tab
 */

import { spawn } from 'child_process';
import http from 'http';

const CDP_PORT = 9222;
let activeTabId = null;

/**
 * Execute JavaScript in the currently active Chrome tab
 * @param {string} js - JavaScript code to execute (must be from fixed templates only)
 * @returns {Promise<any>} - Result of execution
 */
export async function executeInActiveTab(js) {
  if (!activeTabId) {
    // Try to find active tab
    const tabs = await listTabs();
    if (tabs.length === 0) throw new Error('No browser tabs open');
    activeTabId = tabs[0].id; // Use first tab as active
  }

  const result = await sendCDPCommand(activeTabId, 'Runtime.evaluate', {
    expression: js,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(`Script error: ${result.exceptionDetails.text}`);
  }

  return result.result?.value;
}

/**
 * List all open Chrome tabs
 */
async function listTabs() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${CDP_PORT}/json/list`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data).filter(t => t.type === 'page');
          resolve(tabs);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', () => resolve([])); // No browser running
    req.setTimeout(1000, () => {
      req.destroy();
      resolve([]);
    });
  });
}

/**
 * Send CDP command to specific tab
 */
async function sendCDPCommand(tabId, method, params = {}) {
  const tabs = await listTabs();
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) throw new Error('Tab not found');

  const WebSocketModule = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocketModule.default(tab.webSocketDebuggerUrl);
    const msgId = Date.now();

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === msgId) {
        ws.close();
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });

    ws.on('error', reject);
    setTimeout(() => {
      ws.close();
      reject(new Error('CDP command timeout'));
    }, 5000);
  });
}

/**
 * Ensure Chrome is running with remote debugging enabled
 */
export async function ensureChromeDebugging() {
  const tabs = await listTabs();
  if (tabs.length > 0) return true;

  // Chrome not running with debugging - try to start it
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const chromePath of chromePaths) {
    try {
      spawn(chromePath, [`--remote-debugging-port=${CDP_PORT}`], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      
      // Wait for Chrome to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newTabs = await listTabs();
      if (newTabs.length > 0) return true;
    } catch (err) {
      continue;
    }
  }

  return false;
}

/**
 * Reset active tab (call when opening new page)
 */
export function resetActiveTab() {
  activeTabId = null;
}
