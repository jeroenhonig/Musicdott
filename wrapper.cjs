#!/usr/bin/env node
// Wrapper script to provide __filename and __dirname to the CJS bundle
const path = require('path');
const { fileURLToPath } = require('url');

// Set globals before loading the bundle
global.__filename = __filename;
global.__dirname = __dirname;

// Load the actual application
require('./index.cjs');
