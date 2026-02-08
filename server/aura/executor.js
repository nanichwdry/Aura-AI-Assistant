/**
 * Aura Executor
 * Core execution engine adapted from OpenClaw's gateway pattern
 * Provides unified pipeline for message and voice inputs
 */

import { validateToolCall, listAllowedTools } from './tool-registry.js';
import { getOrCreateSession, updateSessionContext, setPendingAction, getPendingAction, clearPendingAction } from './session-manager.js';
import { executeInActiveTab } from '../services/browser-adapter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIT_LOG = path.join(__dirname, '..', 'aura-audit.log');

const AGENT_URL = 'http://127.0.0.1:8787/tool/run';
const AGENT_TOKEN = process.env.CHOTU_AGENT_TOKEN;
const DRY_RUN = process.env.AURA_DRY_RUN === 'true';
const N8N_LINKEDIN_WEBHOOK_URL = process.env.N8N_LINKEDIN_WEBHOOK_URL;
const N8N_WEBHOOK_AUTH_TOKEN = process.env.N8N_WEBHOOK_AUTH_TOKEN;

/**
 * Main entry point for Aura command execution
 * @param {Object} request - Command request
 * @param {string} request.source - 'message' or 'voice'
 * @param {string} request.userId - User identifier
 * @param {string} request.sessionId - Session identifier
 * @param {string} request.text - Command text
 * @param {Array} request.attachments - Optional attachments
 * @param {Object} request.metadata - Optional metadata
 * @returns {Promise<Object>} - { replyText, toolTrace, actionsTaken }
 */
export async function runAuraCommand(request) {
  const startTime = Date.now();
  const trace = {
    requestId: `aura_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    source: request.source,
    userId: request.userId,
    sessionId: request.sessionId,
    input: request.text,
    startTime,
    steps: [],
  };

  try {
    // Step 1: Normalize input
    trace.steps.push({ step: 'normalize', status: 'ok', timestamp: Date.now() });
    const normalizedText = sanitizeInput(request.text);
    
    if (!normalizedText) {
      return {
        replyText: "I didn't catch that. Could you try again?",
        toolTrace: trace,
        actionsTaken: [],
      };
    }

    // Step 2: Load/create session
    const session = getOrCreateSession(request.sessionId, request.userId);
    trace.steps.push({ step: 'session_loaded', sessionId: session.sessionId, timestamp: Date.now() });

    // Step 3: Determine if this is a tool call or direct reply
    const intent = await analyzeIntent(normalizedText, request.source);
    trace.steps.push({ step: 'intent_analysis', intent: intent.type, timestamp: Date.now() });

    if (intent.type === 'direct_reply') {
      return {
        replyText: intent.reply,
        toolTrace: trace,
        actionsTaken: [],
      };
    }

    // Step 4: Execute tool call
    if (intent.type === 'tool_call') {
      const toolResult = await executeTool(intent.toolName, intent.args, request.source, trace);
      
      updateSessionContext(session.sessionId, {
        lastTool: intent.toolName,
        lastToolResult: toolResult.success,
      });

      return {
        replyText: toolResult.reply,
        toolTrace: trace,
        actionsTaken: [{ tool: intent.toolName, args: intent.args, result: toolResult }],
      };
    }

    // Fallback
    return {
      replyText: "I'm not sure how to help with that.",
      toolTrace: trace,
      actionsTaken: [],
    };

  } catch (error) {
    trace.steps.push({ step: 'error', error: error.message, timestamp: Date.now() });
    return {
      replyText: "Sorry, something went wrong. Please try again.",
      toolTrace: trace,
      actionsTaken: [],
      error: error.message,
    };
  } finally {
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    writeAuditLog(trace);
  }
}

/**
 * Execute browser scroll using fixed JS templates
 */
async function executeBrowserScroll(args, trace) {
  const { direction, amount } = args;

  // Calculate scroll amount
  let scrollPx;
  if (direction === 'down' || direction === 'up') {
    if (amount === undefined) {
      scrollPx = 500; // Default
    } else if (amount <= 20) {
      // Treat as steps
      scrollPx = amount * 500;
    } else {
      // Treat as pixels (clamped)
      scrollPx = Math.max(100, Math.min(5000, amount));
    }
    if (direction === 'up') scrollPx = -scrollPx;
  }

  // Generate fixed JS template (no LLM-generated code)
  let js;
  if (direction === 'top') {
    js = 'window.scrollTo(0, 0);';
  } else if (direction === 'bottom') {
    js = 'window.scrollTo(0, document.body.scrollHeight);';
  } else {
    js = `window.scrollBy(0, ${scrollPx});`;
  }

  trace.steps.push({ 
    step: 'browser_scroll', 
    direction, 
    amount: scrollPx, 
    js, 
    timestamp: Date.now() 
  });

  try {
    await executeInActiveTab(js);
    trace.steps.push({ step: 'browser_scroll_success', timestamp: Date.now() });
    return {
      success: true,
      reply: formatSuccessReply('browser_scroll', args),
      result: 'Scrolled',
    };
  } catch (error) {
    trace.steps.push({ step: 'browser_scroll_error', error: error.message, timestamp: Date.now() });
    
    if (error.message.includes('No browser tabs')) {
      return {
        success: false,
        reply: "No page is open right now.",
        error: error.message,
      };
    }

    return {
      success: false,
      reply: "Couldn't scroll the page.",
      error: error.message,
    };
  }
}

/**
 * Parse scroll command from text
 * Examples: "scroll down", "scroll down 3", "scroll up 1200", "scroll to top"
 */
function parseScrollCommand(text) {
  const lower = text.toLowerCase();

  // Scroll to top/bottom
  if (lower.includes('to top') || lower.includes('top')) {
    return { direction: 'top' };
  }
  if (lower.includes('to bottom') || lower.includes('bottom')) {
    return { direction: 'bottom' };
  }

  // Scroll down/up with optional amount
  const downMatch = lower.match(/scroll\s+down\s*(\d+)?/);
  if (downMatch) {
    const num = downMatch[1] ? parseInt(downMatch[1]) : undefined;
    return { direction: 'down', amount: num };
  }

  const upMatch = lower.match(/scroll\s+up\s*(\d+)?/);
  if (upMatch) {
    const num = upMatch[1] ? parseInt(upMatch[1]) : undefined;
    return { direction: 'up', amount: num };
  }

  return null;
}

/**
 * Sanitize user input
 */
function sanitizeInput(text) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, 2000); // Max 2000 chars
}

/**
 * Analyze user intent (simple pattern matching for now)
 * In production, this would call an LLM
 */
async function analyzeIntent(text, source) {
  const lower = text.toLowerCase();

  // PC control patterns
  if (lower.startsWith('open ')) {
    const target = lower.replace('open ', '').trim();
    
    // Check if it's an app
    const appMap = {
      'notepad': 'notepad',
      'chrome': 'chrome',
      'vscode': 'vscode',
      'vs code': 'vscode',
    };
    
    if (appMap[target]) {
      return {
        type: 'tool_call',
        toolName: 'open_app',
        args: { app_id: appMap[target] },
      };
    }
    
    // Check if it's a URL ID
    const urlMap = {
      'gmail': 'gmail',
      'github': 'github',
      'linkedin': 'linkedin',
    };
    
    if (urlMap[target]) {
      return {
        type: 'tool_call',
        toolName: 'open_url_id',
        args: { id: urlMap[target] },
      };
    }
  }

  // Search patterns
  if (lower.includes('search') || lower.includes('find')) {
    const query = text.replace(/search|find/gi, '').trim();
    if (query) {
      return {
        type: 'tool_call',
        toolName: 'search_files',
        args: { query },
      };
    }
  }

  // System info patterns
  if (lower.includes('system info') || lower.includes('system information')) {
    return {
      type: 'tool_call',
      toolName: 'get_system_info',
      args: {},
    };
  }

  if (lower.includes('list processes') || lower.includes('running processes')) {
    return {
      type: 'tool_call',
      toolName: 'list_processes',
      args: {},
    };
  }

  // Browser scroll patterns
  if (lower.includes('scroll')) {
    // Parse scroll command
    const scrollMatch = parseScrollCommand(text);
    if (scrollMatch) {
      return {
        type: 'tool_call',
        toolName: 'browser_scroll',
        args: scrollMatch,
      };
    }
  }

  // LinkedIn posting patterns
  if (lower.includes('post on linkedin') || lower.includes('linkedin post')) {
    const textMatch = text.match(/(?:post on linkedin|linkedin post):?\s*(.+)/i);
    if (textMatch && textMatch[1]) {
      return {
        type: 'tool_call',
        toolName: 'linkedin_post_prepare',
        args: { text: textMatch[1].trim(), visibility: 'public' },
      };
    }
  }

  // Confirmation patterns
  if (lower.includes('confirm') && (lower.includes('post') || lower.includes('yes'))) {
    return {
      type: 'tool_call',
      toolName: 'linkedin_post_confirm',
      args: {},
    };
  }

  // Cancel patterns
  if (lower.includes('cancel') || lower.includes('nevermind') || lower.includes('never mind')) {
    return {
      type: 'tool_call',
      toolName: 'cancel_pending_action',
      args: {},
    };
  }

  // Default: direct reply
  return {
    type: 'direct_reply',
    reply: "I'm Aura, your AI assistant. I can help you open apps, search files, and manage your system. What would you like me to do?",
  };
}

/**
 * Execute a tool call with validation and timeout
 */
async function executeTool(toolName, args, source, trace) {
  const validation = validateToolCall(toolName, args, source);
  
  if (!validation.valid) {
    trace.steps.push({ step: 'tool_validation', status: 'failed', error: validation.error, timestamp: Date.now() });
    return {
      success: false,
      reply: `I can't do that: ${validation.error}`,
      error: validation.error,
    };
  }

  trace.steps.push({ step: 'tool_validation', status: 'ok', tool: toolName, timestamp: Date.now() });

  // Dry run mode
  if (DRY_RUN) {
    trace.steps.push({ step: 'tool_execution', status: 'dry_run', tool: toolName, args, timestamp: Date.now() });
    return {
      success: true,
      reply: `[DRY RUN] Would execute: ${toolName} with ${JSON.stringify(args)}`,
      dryRun: true,
    };
  }

  // Execute via local agent
  try {
    // Special handling for browser_scroll - execute directly via CDP
    if (toolName === 'browser_scroll') {
      return await executeBrowserScroll(args, trace);
    }

    // Special handling for LinkedIn posting
    if (toolName === 'linkedin_post_prepare') {
      return await executeLinkedInPrepare(args, trace);
    }

    if (toolName === 'linkedin_post_confirm') {
      return await executeLinkedInConfirm(args, source, trace);
    }

    if (toolName === 'cancel_pending_action') {
      return await executeCancelPending(source, trace);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), validation.timeout);

    const response = await fetch(AGENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-token': AGENT_TOKEN,
      },
      body: JSON.stringify({ tool_name: toolName, args }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    trace.steps.push({ 
      step: 'tool_execution', 
      status: data.ok ? 'ok' : 'failed', 
      tool: toolName, 
      result: data.result || data.error,
      timestamp: Date.now() 
    });

    if (data.ok) {
      return {
        success: true,
        reply: formatSuccessReply(toolName, args, data.result),
        result: data.result,
        auditId: data.audit_id,
      };
    } else {
      return {
        success: false,
        reply: `Couldn't complete that: ${data.error}`,
        error: data.error,
      };
    }

  } catch (error) {
    trace.steps.push({ step: 'tool_execution', status: 'error', error: error.message, timestamp: Date.now() });
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        reply: "That took too long. Please try again.",
        error: 'timeout',
      };
    }

    return {
      success: false,
      reply: "The local agent isn't responding. Make sure it's running.",
      error: error.message,
    };
  }
}

/**
 * Format success reply based on tool
 */
function formatSuccessReply(toolName, args, result) {
  switch (toolName) {
    case 'open_app':
      return `Opened ${args.app_id}.`;
    case 'open_url_id':
      return `Opened ${args.id}.`;
    case 'search_files':
      return Array.isArray(result) && result.length > 0
        ? `Found ${result.length} file(s).`
        : "No files found.";
    case 'get_system_info':
      return "Got system info.";
    case 'list_processes':
      return "Listed running processes.";
    case 'browser_scroll':
      if (args.direction === 'top' || args.direction === 'bottom') {
        return `Scrolled to ${args.direction}.`;
      }
      const steps = args.amount && args.amount <= 20 ? args.amount : undefined;
      if (steps) {
        return `Scrolled ${args.direction} ${steps} step${steps > 1 ? 's' : ''}.`;
      }
      return `Scrolled ${args.direction}.`;
    default:
      return "Done.";
  }
}

/**
 * Execute LinkedIn post prepare (store draft)
 */
async function executeLinkedInPrepare(args, trace) {
  const { text, visibility } = args;
  const nonce = `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const draft = {
    text,
    visibility: visibility || 'public',
    nonce,
    createdAt: Date.now(),
  };

  // Store in session (using trace.sessionId from parent context)
  const sessionId = trace.sessionId;
  setPendingAction(sessionId, { type: 'linkedin_post', draft });

  trace.steps.push({ 
    step: 'linkedin_prepare', 
    nonce, 
    textLength: text.length,
    timestamp: Date.now() 
  });

  return {
    success: true,
    reply: `Ready to post on LinkedIn:\n\n"${text}"\n\nSay "confirm post" to publish, or "cancel" to discard.`,
    nonce,
  };
}

/**
 * Execute LinkedIn post confirm (send to n8n)
 */
async function executeLinkedInConfirm(args, source, trace) {
  const sessionId = trace.sessionId;
  const pending = getPendingAction(sessionId);

  if (!pending || pending.type !== 'linkedin_post') {
    trace.steps.push({ step: 'linkedin_confirm', status: 'no_pending', timestamp: Date.now() });
    return {
      success: false,
      reply: "No LinkedIn post is waiting for confirmation.",
    };
  }

  const { draft } = pending;

  // Check if draft is too old (5 minutes)
  if (Date.now() - draft.createdAt > 300000) {
    clearPendingAction(sessionId);
    trace.steps.push({ step: 'linkedin_confirm', status: 'expired', timestamp: Date.now() });
    return {
      success: false,
      reply: "That draft expired. Please create a new post.",
    };
  }

  if (DRY_RUN) {
    clearPendingAction(sessionId);
    trace.steps.push({ step: 'linkedin_confirm', status: 'dry_run', timestamp: Date.now() });
    return {
      success: true,
      reply: `[DRY RUN] Would post to LinkedIn: "${draft.text}"`,
      dryRun: true,
    };
  }

  if (!N8N_LINKEDIN_WEBHOOK_URL) {
    trace.steps.push({ step: 'linkedin_confirm', status: 'no_webhook', timestamp: Date.now() });
    return {
      success: false,
      reply: "LinkedIn webhook not configured.",
    };
  }

  try {
    const response = await fetch(N8N_LINKEDIN_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_WEBHOOK_AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        text: draft.text,
        visibility: draft.visibility,
        source: 'aura',
        nonce: draft.nonce,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    clearPendingAction(sessionId);
    trace.steps.push({ step: 'linkedin_confirm', status: 'posted', nonce: draft.nonce, timestamp: Date.now() });

    return {
      success: true,
      reply: "Posted to LinkedIn!",
      nonce: draft.nonce,
    };
  } catch (error) {
    trace.steps.push({ step: 'linkedin_confirm', status: 'error', error: error.message, timestamp: Date.now() });
    return {
      success: false,
      reply: `Couldn't post to LinkedIn: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Execute cancel pending action
 */
async function executeCancelPending(source, trace) {
  const sessionId = trace.sessionId;
  const pending = getPendingAction(sessionId);

  if (!pending) {
    trace.steps.push({ step: 'cancel_pending', status: 'nothing_pending', timestamp: Date.now() });
    return {
      success: true,
      reply: "Nothing to cancel.",
    };
  }

  clearPendingAction(sessionId);
  trace.steps.push({ step: 'cancel_pending', status: 'cancelled', type: pending.type, timestamp: Date.now() });

  return {
    success: true,
    reply: `Cancelled ${pending.type.replace('_', ' ')}.`,
  };
}

/**
 * Write audit log entry
 */
function writeAuditLog(trace) {
  try {
    const entry = JSON.stringify(trace) + '\n';
    fs.appendFileSync(AUDIT_LOG, entry);
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

/**
 * Get list of available tools for a source
 */
export function getAvailableTools(source) {
  return listAllowedTools(source);
}
