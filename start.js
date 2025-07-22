#!/usr/bin/env node

// Custom startup script with better port handling and logging
const { spawn } = require('child_process');

// Determine the port from various possible environment variables
const port = process.env.PORT || process.env.APP_PORT || '3456';
const host = process.env.HOST || '0.0.0.0';

console.log(`=== SvelteKit Startup Script ===`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Host: ${host}`);
console.log(`Port: ${port}`);
console.log(`Available environment variables:`);
Object.keys(process.env)
  .filter(key => key.includes('PORT') || key.includes('HOST'))
  .forEach(key => console.log(`  ${key}=${process.env[key]}`));
console.log(`================================`);

// Set the environment variables for the SvelteKit app
process.env.HOST = host;
process.env.PORT = port;

// Start the SvelteKit application
const child = spawn('node', ['build'], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  console.log(`SvelteKit application exited with code ${code}`);
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start SvelteKit application:', err);
  process.exit(1);
});