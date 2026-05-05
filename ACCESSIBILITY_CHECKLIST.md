# Accessibility Quick Reference Checklist

Use this checklist for quick accessibility verification before deployment.

## 🚀 Quick Start

```bash
# Run interactive accessibility test
npm run test:a11y

# Run Lighthouse in Chrome DevTools
# DevTools → Lighthouse → Accessibility → Generate Report
```

---

## ✅ Essential Checks (5 minutes)

### Keyboard Navigation
- [ ] Tab through entire page - all interactive elements reachable
- [ ] Shift+Tab works in reverse
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Focus indicator is visible

### Images
- [ ] All images have alt text
- [ ] Alt text is descriptive (not "image" or filename)
- [ ] Decorative images have empty alt=""

### Forms
- [ ] Every input has a visible label
- [ ] Required fields marked with *
- [ ] Error messages are clear
- [ ] Can submit form with keyboard

### Color & Contrast
- [ ] Text is readable (4.5:1 ratio minimum)
- [ ] Links are distinguishable
- [ ] Focus indicators are visible
- [ ] Information not conveyed by color alone

---

## 🔍 Detailed Checks (15 minutes)

### Semantic HTML
- [ ] One h1 per page
- [ ] Heading hierarchy is logical (no skipped levels)
- [ ] Lists use ul/ol/li
- [ ] Buttons use `<button>`, links use `<a>`

### ARIA
- [ ] Icon-only buttons have aria-label
- [ ] Modals have aria-labelledby
- [ ] Live regions for dynamic content
- [ ] No redundant ARIA (native HTML preferred)

### Navigation
- [ ] Skip to main content link (optional but recommended)
- [ ] Consistent navigation across pages
- [ ] Current page indicated in navigation
- [ ] Breadcrumbs if deep hierarchy

### Content
- [ ] Page titles are descriptive
- [ ] Link text is meaningful ("Read more" → "Read more about X")
- [ ] Language attribute set (lang="en")
- [ ] No flashing content (seizure risk)

### Responsive
- [ ] Works at 200% zoom
- [ ] No horizontal scroll at 200% zoom
- [ ] Touch targets minimum 44x44px
- [ ] Works on mobile devices

---

## 🧪 Testing Tools

### Automated (Run These First)

#### 1. Lighthouse (Built into Chrome)
```
1. Open Chrome DevTools (F12)
2. Go to Lighthouse tab
3. Select "Accessibility"
4. Click "Generate report"
5. Target: 90+ score
```

#### 2. axe DevTools (Browser Extension)
```
1. Install: https://www.deque.com/axe/devtools/
2. Open DevTools → axe DevTools
3. Click "Scan ALL of my page"
4. Fix all Critical and Serious issues
```

#### 3. WAVE (Browser Extension)
```
1. Install: https://wave.webaim.org/extension/
2. Click WAVE icon in toolbar
3. Review errors (red) and alerts (yellow)
4. Fix all errors
```

### Manual (Required for Full Compliance)

#### 1. Keyboard Navigation (5 min)
```
1. Unplug your mouse
2. Navigate entire site with Tab key
3. Activate buttons with Enter/Space
4. Close modals with Escape
5. Verify focus is always visible
```

#### 2. Screen Reader (15 min)

**Windows (NVDA - Free):**
```
1. Download: https://www.nvaccess.org/download/
2. Install and start NVDA
3. Navigate with arrow keys
4. Test forms, buttons, images
```

**macOS (VoiceOver - Built-in):**
```
1. Press Cmd+F5 to start
2. Use VO+arrow keys to navigate
3. Test all interactive elements
```

**Test Scenarios:**
- [ ] Navigate product catalog
- [ ] Add item to cart
- [ ] Complete checkout
- [ ] Submit contact form
- [ ] Use admin panel

#### 3. Zoom Testing (3 min)
```
1. Browser zoom to 200% (Ctrl/Cmd + +)
2. Navigate entire page
3. Verify no horizontal scroll
4. Check all buttons are clickable
5. Test forms are usable
```

#### 4. Color Blindness (2 min)
```
Chrome DevTools:
1. Open DevTools (F12)
2. Cmd/Ctrl+Shift+P → "Rendering"
3. Emulate vision deficiencies
4. Test: Protanopia, Deuteranopia, Tritanopia
```

---

## 🎯 Priority Fixes

### Critical (Fix Immediately)
- ❌ Missing alt text on images
- ❌ Form inputs without labels
- ❌ Keyboard trap (can't escape modal)
- ❌ Insufficient color contrast (<3:1)
- ❌ Missing page title

### High (Fix Before Launch)
- ⚠️ Poor color contrast (3:1 - 4.5:1)
- ⚠️ Unclear error messages
- ⚠️ Icon-only buttons without labels
- ⚠️ Broken heading hierarchy
- ⚠️ No focus indicators

### Medium (Fix Soon)
- 💡 Missing skip-to-content link
- 💡 Link text not descriptive
- 💡 No ARIA live regions
- 💡 Missing landmark roles
- 💡 No reduced motion support

### Low (Nice to Have)
- ✨ Accessibility statement page
- ✨ Keyboard shortcuts
- ✨ High contrast mode
- ✨ Font size controls

---

## 📊 Scoring Guide

### Lighthouse Accessibility Score
- **90-100**: Excellent ✅
- **75-89**: Good ⚠️
- **50-74**: Needs Work ❌
- **0-49**: Critical Issues 🚨

### axe DevTools
- **0 Critical**: Excellent ✅
- **1-2 Critical**: Needs Fixes ⚠️
- **3+ Critical**: Major Issues ❌

### Manual Testing
- **All checks pass**: Excellent ✅
- **1-2 issues**: Minor Fixes ⚠️
- **3+ issues**: Needs Work ❌

---

## 🔧 Common Fixes

### Missing Alt Text
```tsx
// ❌ Bad
<img src="product.jpg" />

// ✅ Good
<img src="product.jpg" alt="Golden Noir luxury perfume bottle" />
```

### Missing Form Label
```tsx
// ❌ Bad
<input type="text" placeholder="Name" />

// ✅ Good
<label htmlFor="name">Name</label>
<input id="name" type="text" placeholder="John Doe" />
```

### Icon-Only Button
```tsx
// ❌ Bad
<button><X /></button>

// ✅ Good
<button aria-label="Close modal"><X /></button>
```

### Poor Contrast
```tsx
// ❌ Bad (yellow on white)
<p className="text-yellow-400">Text</p>

// ✅ Good (darker yellow)
<p className="text-yellow-700">Text</p>
```

### Missing Focus State
```tsx
// ❌ Bad
<button className="bg-blue-500">Click</button>

// ✅ Good
<button className="bg-blue-500 focus:ring-2 focus:ring-blue-400">
  Click
</button>
```

---

## 📱 Mobile Accessibility

### Touch Targets
- [ ] Minimum 44x44px (iOS) or 48x48px (Android)
- [ ] Adequate spacing between targets
- [ ] No overlapping interactive elements

### Gestures
- [ ] All features work with single tap
- [ ] No complex gestures required
- [ ] Swipe gestures have alternatives

### Screen Readers
- [ ] Test with VoiceOver (iOS)
- [ ] Test with TalkBack (Android)
- [ ] All content is announced
- [ ] Navigation is logical

---

## 📚 Resources

### Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Testing Tools
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [NVDA (Windows - Free)](https://www.nvaccess.org/)
- [JAWS (Windows - Commercial)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS/iOS - Built-in)](https://www.apple.com/accessibility/voiceover/)
- [TalkBack (Android - Built-in)](https://support.google.com/accessibility/android/answer/6283677)

### Learning
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [Deque University](https://dequeuniversity.com/)

---

## 📧 Get Help

**Questions or Issues?**
- Email: maybelasttime9@gmail.com
- Subject: Accessibility Help - GOSH Perfume Studio

---

**Last Updated:** May 5, 2026  
**Next Review:** Monthly
