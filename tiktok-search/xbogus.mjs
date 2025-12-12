/**
 * X-Bogus Generator
 * 
 * Uses the npm xbogus package which embeds TikTok's actual algorithm.
 * 
 * Usage:
 *   node xbogus.mjs "<url>" "<userAgent>"
 * 
 * Example:
 *   node xbogus.mjs "https://www.tiktok.com/api/search/user/full/?aid=1988&keyword=test" "Mozilla/5.0..."
 * 
 * Output:
 *   Just the X-Bogus signature string
 * 
 * Install dependency:
 *   npm install xbogus
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let xbogus;
try {
  xbogus = require('xbogus');
} catch (e) {
  console.error('Error: xbogus package not installed');
  console.error('Run: npm install xbogus');
  process.exit(1);
}

const url = process.argv[2];
const userAgent = process.argv[3] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

if (!url) {
  console.error('Usage: node xbogus.mjs "<url>" [userAgent]');
  process.exit(1);
}

const signature = xbogus(url, userAgent);
console.log(signature);
