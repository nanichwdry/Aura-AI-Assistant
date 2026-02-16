import { cleanupOldActions } from './agent/preference_engine.js';

console.log('Running scheduled cleanup...');

const deleted = cleanupOldActions();

console.log(`✓ Deleted ${deleted} old actions`);
console.log(`Retention policy: ${process.env.ACTION_RETENTION_DAYS || 90} days`);

process.exit(0);
