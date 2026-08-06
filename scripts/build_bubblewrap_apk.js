const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('Testing @bubblewrap/cli initialization and build...');
try {
  // Check if bubblewrap is installed or run npx
  const cmd = `npx --registry=http://registry.npmjs.org/ @bubblewrap/cli --version`;
  console.log('Running:', cmd);
  const out = execSync(cmd, { encoding: 'utf8' });
  console.log('Bubblewrap CLI version:', out);
} catch (e) {
  console.error('Error:', e.stdout || e.message);
}
