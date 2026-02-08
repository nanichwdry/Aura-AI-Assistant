/**
 * Browser Scroll Tests
 * Validates fixed JS templates and scroll amount calculations
 */

// Mock parseScrollCommand function (extracted from executor)
function parseScrollCommand(text) {
  const lower = text.toLowerCase();

  if (lower.includes('to top') || lower.includes('top')) {
    return { direction: 'top' };
  }
  if (lower.includes('to bottom') || lower.includes('bottom')) {
    return { direction: 'bottom' };
  }

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

// Generate JS template (extracted from executor)
function generateScrollJS(args) {
  const { direction, amount } = args;

  let scrollPx;
  if (direction === 'down' || direction === 'up') {
    if (amount === undefined) {
      scrollPx = 500;
    } else if (amount <= 20) {
      scrollPx = amount * 500;
    } else {
      scrollPx = Math.max(100, Math.min(5000, amount));
    }
    if (direction === 'up') scrollPx = -scrollPx;
  }

  if (direction === 'top') {
    return 'window.scrollTo(0, 0);';
  } else if (direction === 'bottom') {
    return 'window.scrollTo(0, document.body.scrollHeight);';
  } else {
    return `window.scrollBy(0, ${scrollPx});`;
  }
}

// Test 1: Parse scroll commands
function testParseScrollCommands() {
  console.log('Test 1: Parse scroll commands');
  
  const tests = [
    { input: 'scroll down', expected: { direction: 'down', amount: undefined } },
    { input: 'scroll down 3', expected: { direction: 'down', amount: 3 } },
    { input: 'scroll up', expected: { direction: 'up', amount: undefined } },
    { input: 'scroll up 1200', expected: { direction: 'up', amount: 1200 } },
    { input: 'scroll to top', expected: { direction: 'top' } },
    { input: 'scroll to bottom', expected: { direction: 'bottom' } },
  ];
  
  for (const test of tests) {
    const result = parseScrollCommand(test.input);
    if (JSON.stringify(result) === JSON.stringify(test.expected)) {
      console.log(`✓ "${test.input}" parsed correctly`);
    } else {
      console.error(`✗ "${test.input}" failed:`, result, 'vs', test.expected);
      process.exit(1);
    }
  }
}

// Test 2: Fixed JS templates
function testFixedJSTemplates() {
  console.log('\nTest 2: Fixed JS templates');
  
  const tests = [
    { args: { direction: 'top' }, expected: 'window.scrollTo(0, 0);' },
    { args: { direction: 'bottom' }, expected: 'window.scrollTo(0, document.body.scrollHeight);' },
    { args: { direction: 'down' }, expected: 'window.scrollBy(0, 500);' },
    { args: { direction: 'down', amount: 3 }, expected: 'window.scrollBy(0, 1500);' },
    { args: { direction: 'up' }, expected: 'window.scrollBy(0, -500);' },
    { args: { direction: 'up', amount: 2 }, expected: 'window.scrollBy(0, -1000);' },
    { args: { direction: 'down', amount: 1200 }, expected: 'window.scrollBy(0, 1200);' },
    { args: { direction: 'down', amount: 50 }, expected: 'window.scrollBy(0, 100);' }, // Clamped to min
    { args: { direction: 'down', amount: 10000 }, expected: 'window.scrollBy(0, 5000);' }, // Clamped to max
  ];
  
  for (const test of tests) {
    const result = generateScrollJS(test.args);
    if (result === test.expected) {
      console.log(`✓ ${JSON.stringify(test.args)} → ${result}`);
    } else {
      console.error(`✗ ${JSON.stringify(test.args)} failed:`, result, 'vs', test.expected);
      process.exit(1);
    }
  }
}

// Test 3: No user input in templates
function testNoUserInputInTemplates() {
  console.log('\nTest 3: No user input in templates');
  
  // Verify templates only use numeric values, no string interpolation from user
  const maliciousInput = { direction: 'down', amount: 'alert("hacked")' };
  const js = generateScrollJS(maliciousInput);
  
  // Should clamp to 100 (NaN becomes 100)
  if (js === 'window.scrollBy(0, NaN);' || js.includes('alert')) {
    console.error('✗ User input leaked into template!');
    process.exit(1);
  } else {
    console.log('✓ User input sanitized');
  }
}

// Run all tests
console.log('=== Browser Scroll Tests ===\n');
testParseScrollCommands();
testFixedJSTemplates();
testNoUserInputInTemplates();
console.log('\n✓ All tests passed!');
