#!/usr/bin/env node

/**
 * Security Headers Test Script
 * 
 * This script tests if all required security headers are present
 * Run: node scripts/test-security-headers.js [URL]
 * Example: node scripts/test-security-headers.js http://localhost:3000
 */

const https = require('https');
const http = require('http');

const url = process.argv[2] || 'http://localhost:3000';

const requiredHeaders = {
  'x-frame-options': ['SAMEORIGIN', 'DENY'],
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': true, // Just check if present
  'x-dns-prefetch-control': 'on',
  'x-download-options': 'noopen',
  'x-permitted-cross-domain-policies': 'none',
};

// HSTS only required in production
const productionHeaders = {
  'strict-transport-security': true,
};

console.log(`\n🔒 Testing Security Headers for: ${url}\n`);

const protocol = url.startsWith('https') ? https : http;
const isProduction = url.includes('vercel.app') || url.includes('goshperfume.com');

protocol.get(url, (res) => {
  const headers = res.headers;
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Check required headers
  for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
    const actualValue = headers[header];
    
    if (!actualValue) {
      console.log(`❌ ${header}: MISSING`);
      failed++;
    } else if (expectedValue === true) {
      console.log(`✅ ${header}: PRESENT`);
      passed++;
    } else if (Array.isArray(expectedValue)) {
      if (expectedValue.includes(actualValue)) {
        console.log(`✅ ${header}: ${actualValue}`);
        passed++;
      } else {
        console.log(`⚠️  ${header}: ${actualValue}`);
        console.log(`   Expected one of: ${expectedValue.join(', ')}`);
        warnings++;
      }
    } else if (actualValue === expectedValue) {
      console.log(`✅ ${header}: ${actualValue}`);
      passed++;
    } else {
      console.log(`⚠️  ${header}: ${actualValue}`);
      console.log(`   Expected: ${expectedValue}`);
      warnings++;
    }
  }

  // Check production-only headers
  if (isProduction) {
    console.log('\n📦 Production Headers:');
    for (const [header, expectedValue] of Object.entries(productionHeaders)) {
      const actualValue = headers[header];
      
      if (!actualValue) {
        console.log(`❌ ${header}: MISSING (required in production)`);
        failed++;
      } else {
        console.log(`✅ ${header}: PRESENT`);
        passed++;
      }
    }
  } else {
    console.log('\n💡 Development mode - HSTS not required');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed\n`);

  if (failed === 0 && warnings === 0) {
    console.log('✨ All security headers are properly configured!\n');
    process.exit(0);
  } else if (failed === 0) {
    console.log('⚠️  Security headers present but some values differ from expected.\n');
    process.exit(0);
  } else {
    console.log('❌ Some required security headers are missing. Check next.config.ts and middleware.ts\n');
    process.exit(1);
  }
}).on('error', (err) => {
  console.error(`\n❌ Error testing URL: ${err.message}\n`);
  console.log('Make sure your development server is running.\n');
  process.exit(1);
});
