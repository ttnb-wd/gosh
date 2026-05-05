#!/usr/bin/env node

/**
 * Accessibility Quick Check Script
 * 
 * This script provides a quick accessibility checklist for manual testing
 * Run: node scripts/test-accessibility.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🎯 WCAG Accessibility Quick Check\n');
console.log('═══════════════════════════════════════════════════════════════\n');

const tests = [
  {
    category: '⌨️  KEYBOARD NAVIGATION',
    checks: [
      'Can you navigate the entire site using only Tab/Shift+Tab?',
      'Can you activate all buttons with Enter or Space?',
      'Can you close modals with Escape key?',
      'Is the focus indicator visible on all interactive elements?',
      'Does tab order follow logical reading order?',
    ]
  },
  {
    category: '🖼️  IMAGES & MEDIA',
    checks: [
      'Do all images have descriptive alt text?',
      'Are decorative images marked appropriately?',
      'Can you understand the content without images?',
    ]
  },
  {
    category: '📝 FORMS',
    checks: [
      'Does every form field have a visible label?',
      'Are required fields clearly marked?',
      'Do error messages clearly explain what went wrong?',
      'Can you complete checkout using only keyboard?',
    ]
  },
  {
    category: '🎨 COLOR & CONTRAST',
    checks: [
      'Is text readable against its background?',
      'Can you distinguish interactive elements?',
      'Does the site work in high contrast mode?',
      'Is information conveyed without relying only on color?',
    ]
  },
  {
    category: '📱 RESPONSIVE & ZOOM',
    checks: [
      'Does the site work at 200% zoom?',
      'Is there horizontal scrolling at 200% zoom?',
      'Are all features accessible on mobile?',
      'Do touch targets meet minimum size (44x44px)?',
    ]
  },
  {
    category: '🔊 SCREEN READER',
    checks: [
      'Can you navigate with a screen reader?',
      'Are headings announced correctly?',
      'Are form labels read properly?',
      'Are dynamic updates announced?',
      'Can you complete a purchase with screen reader?',
    ]
  },
  {
    category: '📄 CONTENT',
    checks: [
      'Is heading hierarchy logical (h1 → h2 → h3)?',
      'Is the language of the page set correctly?',
      'Are page titles descriptive?',
      'Is link text meaningful out of context?',
    ]
  },
];

let currentTest = 0;
let currentCheck = 0;
let results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Count total checks
tests.forEach(test => {
  results.total += test.checks.length;
});

function askQuestion() {
  if (currentTest >= tests.length) {
    showResults();
    return;
  }

  const test = tests[currentTest];
  
  if (currentCheck === 0) {
    console.log(`\n${test.category}`);
    console.log('─'.repeat(63) + '\n');
  }

  if (currentCheck >= test.checks.length) {
    currentTest++;
    currentCheck = 0;
    askQuestion();
    return;
  }

  const check = test.checks[currentCheck];
  
  rl.question(`${currentCheck + 1}. ${check}\n   [y]es / [n]o / [s]kip: `, (answer) => {
    const response = answer.toLowerCase().trim();
    
    if (response === 'y' || response === 'yes') {
      console.log('   ✅ PASS\n');
      results.passed++;
    } else if (response === 'n' || response === 'no') {
      console.log('   ❌ FAIL\n');
      results.failed++;
    } else {
      console.log('   ⏭️  SKIP\n');
      results.skipped++;
    }
    
    currentCheck++;
    askQuestion();
  });
}

function showResults() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('\n📊 ACCESSIBILITY TEST RESULTS\n');
  console.log(`✅ Passed:  ${results.passed}/${results.total} (${Math.round(results.passed/results.total*100)}%)`);
  console.log(`❌ Failed:  ${results.failed}/${results.total} (${Math.round(results.failed/results.total*100)}%)`);
  console.log(`⏭️  Skipped: ${results.skipped}/${results.total} (${Math.round(results.skipped/results.total*100)}%)`);
  
  const score = Math.round((results.passed / (results.total - results.skipped)) * 100);
  
  console.log('\n───────────────────────────────────────────────────────────────');
  console.log(`\n🎯 ACCESSIBILITY SCORE: ${score}%\n`);
  
  if (score >= 90) {
    console.log('🌟 EXCELLENT! Your site is highly accessible.\n');
  } else if (score >= 75) {
    console.log('✅ GOOD! Some improvements needed.\n');
  } else if (score >= 60) {
    console.log('⚠️  FAIR. Several accessibility issues to address.\n');
  } else {
    console.log('❌ NEEDS WORK. Significant accessibility improvements required.\n');
  }
  
  console.log('📝 Next Steps:');
  console.log('   1. Fix failed checks');
  console.log('   2. Run automated tools (Lighthouse, axe)');
  console.log('   3. Test with real screen readers');
  console.log('   4. Review ACCESSIBILITY_REPORT.md for details\n');
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  rl.close();
}

console.log('This interactive checklist will help you verify accessibility.\n');
console.log('For each question, answer:');
console.log('  • [y]es if the check passes');
console.log('  • [n]o if the check fails');
console.log('  • [s]kip if you cannot test it now\n');

rl.question('Press Enter to start...', () => {
  askQuestion();
});
