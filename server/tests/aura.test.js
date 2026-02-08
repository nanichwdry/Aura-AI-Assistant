/**
 * Aura Executor Tests
 * Validates tool allowlist, schema validation, and execution flow
 */

import { validateToolCall, isToolAllowed, listAllowedTools } from '../aura/tool-registry.js';
import { runAuraCommand } from '../aura/executor.js';

// Test 1: Tool allowlist blocks unknown tools
function testAllowlistBlocking() {
  console.log('Test 1: Tool allowlist blocks unknown tools');
  
  const unknownTool = validateToolCall('hack_system', {}, 'message');
  if (!unknownTool.valid && unknownTool.error.includes('not in allowlist')) {
    console.log('✓ Unknown tool blocked');
  } else {
    console.error('✗ Unknown tool was not blocked!');
    process.exit(1);
  }
  
  const knownTool = validateToolCall('open_app', { app_id: 'notepad' }, 'message');
  if (knownTool.valid) {
    console.log('✓ Known tool allowed');
  } else {
    console.error('✗ Known tool was blocked!');
    process.exit(1);
  }
}

// Test 2: Schema validation
function testSchemaValidation() {
  console.log('\nTest 2: Schema validation');
  
  const validArgs = validateToolCall('open_app', { app_id: 'notepad' }, 'message');
  if (validArgs.valid) {
    console.log('✓ Valid args accepted');
  } else {
    console.error('✗ Valid args rejected!');
    process.exit(1);
  }
  
  const invalidArgs = validateToolCall('open_app', { app_id: 123 }, 'message');
  if (!invalidArgs.valid && invalidArgs.error.includes('expected string')) {
    console.log('✓ Invalid args rejected');
  } else {
    console.error('✗ Invalid args were accepted!');
    process.exit(1);
  }
}

// Test 3: Feature flag enforcement
function testFeatureFlags() {
  console.log('\nTest 3: Feature flag enforcement');
  
  // browser_scroll requires AURA_BROWSER_SCROLL=true
  const scrollTool = validateToolCall('browser_scroll', { direction: 'down' }, 'message');
  if (!scrollTool.valid && scrollTool.error.includes('not enabled')) {
    console.log('✓ Feature flag enforced');
  } else {
    console.error('✗ Feature flag not enforced!');
    process.exit(1);
  }
}

// Test 4: Source permissions
function testSourcePermissions() {
  console.log('\nTest 4: Source permissions');
  
  const validSource = validateToolCall('open_app', { app_id: 'notepad' }, 'message');
  if (validSource.valid) {
    console.log('✓ Valid source accepted');
  } else {
    console.error('✗ Valid source rejected!');
    process.exit(1);
  }
  
  const invalidSource = validateToolCall('open_app', { app_id: 'notepad' }, 'invalid_source');
  if (!invalidSource.valid && invalidSource.error.includes('not permitted')) {
    console.log('✓ Invalid source rejected');
  } else {
    console.error('✗ Invalid source accepted!');
    process.exit(1);
  }
}

// Test 5: List allowed tools
function testListAllowedTools() {
  console.log('\nTest 5: List allowed tools');
  
  const tools = listAllowedTools('message');
  if (tools.includes('open_app') && tools.includes('search_files')) {
    console.log('✓ Tool list correct');
  } else {
    console.error('✗ Tool list incorrect!');
    process.exit(1);
  }
}

// Run all tests
console.log('=== Aura Executor Tests ===\n');
testAllowlistBlocking();
testSchemaValidation();
testFeatureFlags();
testSourcePermissions();
testListAllowedTools();
console.log('\n✓ All tests passed!');
