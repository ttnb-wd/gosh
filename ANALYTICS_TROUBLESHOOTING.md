# Analytics Troubleshooting Guide

## Issue: "Compiling" showing in terminal on localhost

### What's Happening

When you see "compiling" in the terminal, Next.js is building your pages. This is normal behavior, especially:
- On first load after starting the dev server
- When you make changes to files
- When you navigate to a new page for the first time

### Solution

**Just wait!** The compilation usually takes 10-30 seconds. Once complete, your page will load.

### How to Verify Analytics is Working

#### Step 1: Wait for Compilation to Complete

```bash
# You should see something like:
✓ Compiled /page in 2.5s
✓ Compiled successfully
```

#### Step 2: Open Your Browser

1. Go to `http://localhost:3000`
2. Wait for the page to load completely

#### Step 3: Check Browser Console

1. Press `F12` to open Developer Tools
2. Go to **Console** tab
3. Type: `window.gtag`
4. Press Enter

**Expected Result**:
- If analytics is configured: `ƒ gtag(){dataLayer.push(arguments);}`
- If not configured: `undefined` (this is OK if you haven't added the Measurement ID yet)

#### Step 4: Check Data Layer

In the same console, type:
```javascript
window.dataLayer
```

**Expected Result**:
- Should show an array: `[...]`
- If analytics is configured, it will have events

### Common Issues and Solutions

#### Issue 1: Compilation Takes Too Long

**Symptoms**: Terminal shows "compiling" for more than 2 minutes

**Solutions**:
1. **Stop and restart the dev server**:
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Check for syntax errors**:
   - Look for red error messages in terminal
   - Check browser console for errors

#### Issue 2: Page Won't Load

**Symptoms**: Browser shows loading spinner forever

**Solutions**:
1. **Check terminal for errors**:
   - Look for red error messages
   - Look for "Error:" or "Failed to compile"

2. **Check port 3000 is not in use**:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # If something is using it, kill the process or use different port
   npm run dev -- -p 3001
   ```

3. **Try a different browser**:
   - Sometimes browser cache causes issues
   - Try incognito/private mode

#### Issue 3: Analytics Not Loading

**Symptoms**: `window.gtag` is `undefined`

**This is NORMAL if**:
- You haven't added `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env` yet
- The analytics component is designed to not load if no ID is configured

**To fix**:
1. Add to `.env`:
   ```env
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

2. Restart dev server:
   ```bash
   # Press Ctrl+C
   npm run dev
   ```

3. Refresh browser

#### Issue 4: Build Errors

**Symptoms**: Terminal shows TypeScript or compilation errors

**Common fixes**:

1. **Missing dependencies**:
   ```bash
   npm install
   ```

2. **TypeScript errors**:
   - Check the error message
   - Usually points to the file and line number
   - Fix the syntax error

3. **Module not found**:
   ```bash
   # Restart dev server
   npm run dev
   ```

### Testing Without Measurement ID

You can test that the analytics code is working even without a Google Analytics account:

1. **Check the component loads**:
   ```javascript
   // Browser console
   document.querySelector('script[src*="googletagmanager"]')
   ```
   - Should return `null` if no Measurement ID (this is correct)
   - Should return `<script>` element if ID is configured

2. **Check the analytics functions exist**:
   ```javascript
   // Browser console
   typeof window.gtag
   ```
   - Should return `"undefined"` if no Measurement ID
   - Should return `"function"` if ID is configured

### Verification Checklist

- [ ] Dev server is running (`npm run dev`)
- [ ] Terminal shows "✓ Compiled successfully"
- [ ] Browser can access `http://localhost:3000`
- [ ] Page loads without errors
- [ ] Browser console has no red errors
- [ ] (Optional) `NEXT_PUBLIC_GA_MEASUREMENT_ID` is in `.env`
- [ ] (Optional) `window.gtag` is a function (if ID configured)

### Still Having Issues?

#### Check These Files Exist

```bash
# Check analytics files were created
ls lib/analytics.ts
ls components/GoogleAnalytics.tsx
```

**Expected**: Both files should exist

#### Check Layout File

Open `app/layout.tsx` and verify it has:

```typescript
import GoogleAnalytics from "@/components/GoogleAnalytics";

// ... in the return statement:
<body>
  <GoogleAnalytics />
  {children}
</body>
```

#### Check for Syntax Errors

Look in terminal for messages like:
- `Error: ...`
- `Failed to compile`
- `Module not found`
- `Unexpected token`

These indicate syntax errors that need to be fixed.

### Performance Tips

If compilation is slow:

1. **Close unused applications** to free up memory
2. **Disable antivirus temporarily** (it can slow down file watching)
3. **Use SSD** instead of HDD if possible
4. **Increase Node.js memory**:
   ```bash
   $env:NODE_OPTIONS="--max-old-space-size=4096"
   npm run dev
   ```

### Next Steps After Compilation

Once your page loads successfully:

1. ✅ **Verify page loads** - Homepage should display
2. ✅ **Check console** - No red errors
3. ✅ **Add Measurement ID** - If you want to enable tracking
4. ✅ **Test navigation** - Click around the site
5. ✅ **Verify analytics** - Check Google Analytics Realtime (if ID configured)

### Quick Test Script

Run this in your browser console to test everything:

```javascript
// Test 1: Check if analytics library is loaded
console.log('Analytics library:', typeof window.gtag);

// Test 2: Check data layer
console.log('Data layer:', window.dataLayer);

// Test 3: Check if GoogleAnalytics component rendered
console.log('GA Script:', document.querySelector('script[src*="googletagmanager"]'));

// Test 4: Check environment variable (won't show the actual value for security)
console.log('Has Measurement ID:', !!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
```

**Expected Output** (without Measurement ID):
```
Analytics library: undefined
Data layer: undefined
GA Script: null
Has Measurement ID: false
```

**Expected Output** (with Measurement ID):
```
Analytics library: function
Data layer: Array [...]
GA Script: <script>
Has Measurement ID: true
```

### Contact Support

If you're still having issues after trying these solutions:

1. **Check the error message** in terminal
2. **Copy the full error** (including stack trace)
3. **Note what you were doing** when the error occurred
4. **Check the documentation** in `ANALYTICS_SETUP.md`

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Module not found" | File path is wrong | Check import paths |
| "Cannot find module '@/lib/analytics'" | TypeScript path issue | Restart dev server |
| "Unexpected token" | Syntax error | Check for typos |
| "Port 3000 is already in use" | Another app using port | Use different port or kill process |
| "EADDRINUSE" | Port conflict | Stop other dev servers |

---

## Summary

**Most common issue**: Just need to wait for compilation to complete!

**Quick fix**: 
1. Wait 30 seconds
2. Refresh browser
3. Check console for errors

**If still not working**:
1. Stop dev server (Ctrl+C)
2. Clear cache: `rm -rf .next`
3. Restart: `npm run dev`
4. Wait for "✓ Compiled successfully"
5. Refresh browser

---

**Last Updated**: May 5, 2026  
**Status**: Troubleshooting Guide
