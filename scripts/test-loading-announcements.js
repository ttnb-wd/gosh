/**
 * Test Script: Loading State Announcements
 * 
 * This script verifies that loading state announcements are properly
 * implemented across the application for screen reader accessibility.
 * 
 * Run with: node scripts/test-loading-announcements.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Files to check for loading announcements
const filesToCheck = [
  'components/ProductSection.tsx',
  'app/orders/page.tsx',
  'app/admin/page.tsx',
  'app/admin/messages/page.tsx',
  'app/admin/customers/page.tsx',
  'app/admin/settings/page.tsx',
  'app/globals.css',
];

// Required patterns for accessibility
const requiredPatterns = {
  liveRegion: /role=["']status["']|role=["']alert["']/,
  ariaLive: /aria-live=["'](polite|assertive)["']/,
  ariaAtomic: /aria-atomic=["']true["']/,
  srOnlyClass: /className=["'][^"']*sr-only[^"']*["']/,
  loadingMessage: /loading|please wait/i,
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║  Loading State Announcements - Accessibility Test Suite  ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

/**
 * Check if a file contains the required accessibility patterns
 */
function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⚠ SKIP${colors.reset} - File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const fileName = path.basename(filePath);
  
  console.log(`${colors.blue}Testing:${colors.reset} ${filePath}`);
  
  // Special handling for globals.css
  if (fileName === 'globals.css') {
    totalTests++;
    if (content.includes('.sr-only') && content.includes('position: absolute')) {
      console.log(`  ${colors.green}✓${colors.reset} .sr-only utility class found`);
      passedTests++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} .sr-only utility class missing`);
      failedTests++;
    }
    console.log('');
    return;
  }

  // Check for loading state variable
  totalTests++;
  if (content.includes('loading') || content.includes('Loading')) {
    console.log(`  ${colors.green}✓${colors.reset} Loading state handling found`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} No loading state found`);
    failedTests++;
  }

  // Check for ARIA live region
  totalTests++;
  if (requiredPatterns.liveRegion.test(content)) {
    console.log(`  ${colors.green}✓${colors.reset} ARIA role (status/alert) found`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Missing ARIA role`);
    failedTests++;
  }

  // Check for aria-live attribute
  totalTests++;
  if (requiredPatterns.ariaLive.test(content)) {
    console.log(`  ${colors.green}✓${colors.reset} aria-live attribute found`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Missing aria-live attribute`);
    failedTests++;
  }

  // Check for aria-atomic attribute
  totalTests++;
  if (requiredPatterns.ariaAtomic.test(content)) {
    console.log(`  ${colors.green}✓${colors.reset} aria-atomic attribute found`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Missing aria-atomic attribute`);
    failedTests++;
  }

  // Check for sr-only class usage
  totalTests++;
  if (requiredPatterns.srOnlyClass.test(content)) {
    console.log(`  ${colors.green}✓${colors.reset} sr-only class applied`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Missing sr-only class`);
    failedTests++;
  }

  // Check for loading message
  totalTests++;
  if (requiredPatterns.loadingMessage.test(content)) {
    console.log(`  ${colors.green}✓${colors.reset} Loading message found`);
    passedTests++;
  } else {
    console.log(`  ${colors.red}✗${colors.reset} Missing loading message`);
    failedTests++;
  }

  console.log('');
}

// Run tests on all files
filesToCheck.forEach(checkFile);

// Print summary
console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}Test Summary${colors.reset}\n`);
console.log(`Total Tests:  ${totalTests}`);
console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);

const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
console.log(`Pass Rate:    ${passRate}%`);

console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

// Exit with appropriate code
if (failedTests > 0) {
  console.log(`${colors.red}❌ Some tests failed. Please review the implementation.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}✅ All tests passed! Loading announcements are properly implemented.${colors.reset}\n`);
  process.exit(0);
}
