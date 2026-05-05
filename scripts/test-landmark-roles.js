/**
 * Test Script: Landmark Roles Verification
 * 
 * This script verifies that explicit ARIA landmark roles are properly
 * implemented across the application for screen reader accessibility.
 * 
 * Run with: node scripts/test-landmark-roles.js
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
  magenta: '\x1b[35m',
};

// Files to check for landmark roles
const filesToCheck = {
  navigation: [
    { file: 'components/Navbar.tsx', roles: ['banner', 'navigation'] },
    { file: 'components/Footer.tsx', roles: ['contentinfo'] },
    { file: 'components/admin/AdminSidebar.tsx', roles: ['navigation'] },
    { file: 'components/admin/AdminHeader.tsx', roles: ['banner'] },
  ],
  publicPages: [
    { file: 'app/page.tsx', roles: ['main'] },
    { file: 'app/products/page.tsx', roles: ['main'] },
    { file: 'app/orders/page.tsx', roles: ['main'] },
    { file: 'app/contact/page.tsx', roles: ['main'] },
    { file: 'app/about/page.tsx', roles: ['main'] },
    { file: 'app/checkout/page.tsx', roles: ['main'] },
    { file: 'app/login/page.tsx', roles: ['main'] },
  ],
  adminPages: [
    { file: 'app/admin/page.tsx', roles: ['main'] },
    { file: 'app/admin/orders/page.tsx', roles: ['main'] },
    { file: 'app/admin/products/page.tsx', roles: ['main'] },
    { file: 'app/admin/messages/page.tsx', roles: ['main'] },
    { file: 'app/admin/customers/page.tsx', roles: ['main'] },
    { file: 'app/admin/settings/page.tsx', roles: ['main'] },
    { file: 'app/admin/login/page.tsx', roles: ['main'] },
  ],
  sections: [
    { file: 'components/ProductSection.tsx', roles: ['region'] },
    { file: 'components/CollectionPreview.tsx', roles: ['region'] },
    { file: 'components/BrandStory.tsx', roles: ['region'] },
    { file: 'components/LuxuryStats.tsx', roles: ['region'] },
  ],
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedFiles = [];

console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║     Landmark Roles - Accessibility Test Suite            ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

/**
 * Check if a file contains the required landmark roles
 */
function checkFile(filePath, requiredRoles) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⚠ SKIP${colors.reset} - File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const fileName = path.basename(filePath);
  
  console.log(`${colors.blue}Testing:${colors.reset} ${filePath}`);
  
  let fileHasFailures = false;
  
  requiredRoles.forEach(role => {
    totalTests++;
    
    // Create regex patterns for different role formats
    const patterns = [
      new RegExp(`role=["']${role}["']`, 'i'),
      new RegExp(`role\\s*=\\s*["']${role}["']`, 'i'),
    ];
    
    const found = patterns.some(pattern => pattern.test(content));
    
    if (found) {
      console.log(`  ${colors.green}✓${colors.reset} role="${role}" found`);
      passedTests++;
    } else {
      console.log(`  ${colors.red}✗${colors.reset} role="${role}" missing`);
      failedTests++;
      fileHasFailures = true;
    }
  });
  
  if (fileHasFailures) {
    failedFiles.push(filePath);
  }
  
  console.log('');
}

/**
 * Check navigation components
 */
function checkNavigationComponents() {
  console.log(`${colors.magenta}═══ Navigation Components ═══${colors.reset}\n`);
  filesToCheck.navigation.forEach(({ file, roles }) => {
    checkFile(file, roles);
  });
}

/**
 * Check public pages
 */
function checkPublicPages() {
  console.log(`${colors.magenta}═══ Public Pages ═══${colors.reset}\n`);
  filesToCheck.publicPages.forEach(({ file, roles }) => {
    checkFile(file, roles);
  });
}

/**
 * Check admin pages
 */
function checkAdminPages() {
  console.log(`${colors.magenta}═══ Admin Pages ═══${colors.reset}\n`);
  filesToCheck.adminPages.forEach(({ file, roles }) => {
    checkFile(file, roles);
  });
}

/**
 * Check section components
 */
function checkSectionComponents() {
  console.log(`${colors.magenta}═══ Section Components ═══${colors.reset}\n`);
  filesToCheck.sections.forEach(({ file, roles }) => {
    checkFile(file, roles);
  });
}

// Run all tests
checkNavigationComponents();
checkPublicPages();
checkAdminPages();
checkSectionComponents();

// Print summary
console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}Test Summary${colors.reset}\n`);
console.log(`Total Tests:  ${totalTests}`);
console.log(`${colors.green}Passed:       ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed:       ${failedTests}${colors.reset}`);

const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
console.log(`Pass Rate:    ${passRate}%`);

if (failedFiles.length > 0) {
  console.log(`\n${colors.red}Files with failures:${colors.reset}`);
  failedFiles.forEach(file => {
    console.log(`  ${colors.red}•${colors.reset} ${file}`);
  });
}

console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

// Landmark role guidelines
console.log(`${colors.cyan}Landmark Role Guidelines:${colors.reset}\n`);
console.log(`${colors.green}✓${colors.reset} banner      - Site header (one per page)`);
console.log(`${colors.green}✓${colors.reset} navigation  - Navigation menus (can have multiple with labels)`);
console.log(`${colors.green}✓${colors.reset} main        - Primary content (one per page)`);
console.log(`${colors.green}✓${colors.reset} contentinfo - Footer (one per page)`);
console.log(`${colors.green}✓${colors.reset} region      - Significant sections (with aria-label)`);
console.log(`${colors.green}✓${colors.reset} complementary - Supporting content`);
console.log(`${colors.green}✓${colors.reset} search      - Search functionality`);
console.log(`${colors.green}✓${colors.reset} form        - Forms\n`);

// Screen reader shortcuts
console.log(`${colors.cyan}Screen Reader Shortcuts:${colors.reset}\n`);
console.log(`${colors.blue}NVDA/JAWS:${colors.reset}`);
console.log(`  D           - Jump to next landmark`);
console.log(`  Shift+D     - Jump to previous landmark`);
console.log(`  Insert+F7   - List all landmarks\n`);

console.log(`${colors.blue}VoiceOver:${colors.reset}`);
console.log(`  VO+U        - Open rotor, then select landmarks\n`);

console.log(`${colors.blue}TalkBack:${colors.reset}`);
console.log(`  Local menu  - Navigate by landmarks\n`);

// Exit with appropriate code
if (failedTests > 0) {
  console.log(`${colors.red}❌ Some tests failed. Please review the implementation.${colors.reset}\n`);
  process.exit(1);
} else {
  console.log(`${colors.green}✅ All tests passed! Landmark roles are properly implemented.${colors.reset}\n`);
  process.exit(0);
}
