/**
 * Aura Tool Registry
 * Allowlist-based tool execution with validation and permission checks
 */

const ALLOWED_TOOLS = {
  // PC Control
  open_app: {
    schema: { app_id: 'string' },
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
  open_url: {
    schema: { url: 'string' },
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
  open_url_id: {
    schema: { id: 'string' },
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
  search_files: {
    schema: { query: 'string' },
    permissions: ['message', 'voice'],
    timeout: 10000,
  },
  // System Info
  get_system_info: {
    schema: {},
    permissions: ['message', 'voice'],
    timeout: 10000,
  },
  list_processes: {
    schema: {},
    permissions: ['message', 'voice'],
    timeout: 5000,
  },
  // Browser Automation
  browser_scroll: {
    schema: { direction: 'string', amount: 'number' },
    permissions: ['message', 'voice'],
    timeout: 3000,
    requiresFeature: 'AURA_BROWSER_SCROLL',
  },
  // LinkedIn Posting (via n8n)
  linkedin_post_prepare: {
    schema: { text: 'string', visibility: 'string' },
    permissions: ['message', 'voice'],
    timeout: 1000,
    requiresFeature: 'AURA_LINKEDIN_N8N',
    confirmRequired: true,
  },
  linkedin_post_confirm: {
    schema: { nonce: 'string' },
    permissions: ['message', 'voice'],
    timeout: 10000,
    requiresFeature: 'AURA_LINKEDIN_N8N',
  },
  cancel_pending_action: {
    schema: {},
    permissions: ['message', 'voice'],
    timeout: 100,
  },
};

function validateToolCall(toolName, args, source) {
  const tool = ALLOWED_TOOLS[toolName];
  
  if (!tool) {
    return { valid: false, error: `Tool '${toolName}' not in allowlist` };
  }
  
  if (!tool.permissions.includes(source)) {
    return { valid: false, error: `Tool '${toolName}' not permitted for source '${source}'` };
  }

  // Check feature flag if required
  if (tool.requiresFeature && process.env[tool.requiresFeature] !== 'true') {
    return { valid: false, error: `Feature '${tool.requiresFeature}' not enabled` };
  }
  
  // Validate schema
  for (const [key, type] of Object.entries(tool.schema)) {
    if (args[key] !== undefined && typeof args[key] !== type) {
      return { valid: false, error: `Invalid argument '${key}': expected ${type}` };
    }
  }
  
  return { valid: true, timeout: tool.timeout };
}

function isToolAllowed(toolName) {
  return toolName in ALLOWED_TOOLS;
}

function listAllowedTools(source) {
  return Object.entries(ALLOWED_TOOLS)
    .filter(([_, tool]) => tool.permissions.includes(source))
    .map(([name]) => name);
}

export { validateToolCall, isToolAllowed, listAllowedTools, ALLOWED_TOOLS };
