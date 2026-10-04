/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only visual review. Protected pages use the isolated in-memory preview.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = process.env.GOSH_THEME_REVIEW_ROOT || path.join(os.tmpdir(), 'gosh-theme-review');
const publicRoutes = ['/', '/products', '/promotions', '/about', '/contact', '/login', '/login?mode=signup', '/forgot-password', '/reset-password', '/verify-email', '/admin/login', '/privacy', '/terms', '/refund-policy', '/delivery-policy', '/not-a-gosh-page'];
const fixtureRoutes = ['/', '/products', '/promotions', '/account', '/account/security', '/orders', '/checkout', '/admin', '/admin/products', '/admin/orders', '/admin/promotions', '/admin/customers', '/admin/brands', '/admin/announcements', '/admin/messages', '/admin/testimonials', '/admin/settings', '/controls'];
const sections = ['.home-hero', '.home-introduction', '.home-scent-story', '.studio-featured', '.studio-promotion', '.studio-collections', '.studio-story', '.studio-testimonials', '.home-finale', '.studio-footer'];
const results = [], failures = [], errors = [];
function check(condition, message) { if (!condition) failures.push(message); }
async function reveal(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 35));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(200);
}
async function appearance(page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const bright = [];
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
      if (rect.width * rect.height < 18000 || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .7) continue;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a > 178 && r > 180 && g > 170 && b > 160) bright.push({tag:el.tagName, class:el.className, color:style.backgroundColor});
    }
    return {theme:document.documentElement.classList.contains('dark')?'dark':'light', width:innerWidth, pageWidth:document.documentElement.scrollWidth, bodyWidth:document.body.scrollWidth, bright, ambient:!!document.querySelector('.site-ambient'), surface:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()};
  });
}
async function capture(page, name) { await page.screenshot({path:path.join(output, name + '.png'), fullPage:true}); }
async function overlays(page, theme, width) {
  const sample = async name => {
    await page.waitForTimeout(650);
    const state = await appearance(page);
    check(theme !== 'dark' || state.bright.length === 0, name + ' has a light surface');
    await page.screenshot({path:path.join(output, name + '-' + theme + '-' + width + '.png')});
  };
  await page.goto('http://127.0.0.1:3025/controls');
  await page.waitForTimeout(300);
  await page.getByRole('combobox', {name:'Fragrance family'}).click();
  await page.getByRole('listbox').waitFor();
  await sample('dropdown');
  await page.getByRole('option', {name:'Woody'}).click();
  assert.match(await page.getByRole('combobox', {name:'Fragrance family'}).innerText(), /Woody/);
  await page.getByRole('textbox', {name:'Promotion begins'}).click();
  await page.locator('.gosh-datepicker').waitFor();
  await sample('calendar');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:'Delete confirmation'}).click();
  await page.getByRole('dialog').waitFor();
  await sample('confirmation');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.goto('http://127.0.0.1:3025/admin/products');
  await page.waitForTimeout(400);
  await page.getByRole('button', {name:/add perfume product/i}).click();
  await page.getByRole('dialog', {name:'Product editor'}).waitFor();
  await sample('product-editor');
  await page.keyboard.press('Escape');
  await page.goto('http://127.0.0.1:3025/');
  await page.waitForTimeout(400);
  await page.getByRole('button', {name:/Quick view/}).first().click();
  await page.getByRole('dialog', {name:/Fragrance details/}).waitFor();
  await sample('product-detail');
  await page.keyboard.press('Escape');
  await page.getByRole('button', {name:/shopping bag/}).first().click();
  await page.getByRole('dialog', {name:'Your shopping bag'}).waitFor();
  await sample('cart');
  await page.keyboard.press('Escape');
  if (width === 390) {
    await page.getByRole('button', {name:'Open navigation menu'}).click();
    await page.locator('dialog[open]').waitFor();
    await sample('mobile-navigation');
    await page.keyboard.press('Escape');
  }
}
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({channel:'msedge', headless:true});
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
    await context.addInitScript(value => localStorage.setItem('theme', value), theme);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({url:page.url(), theme, width, error:error.message}));
    // External assets/services are unnecessary for fixture review; no external writes.
    await page.route(/https?:\/\/(?!localhost|127\.0\.0\.1)/, route => route.abort());
    for (const [kind, base, routes] of [['fixture','http://127.0.0.1:3025',fixtureRoutes],['public','http://localhost:3020',publicRoutes]]) {
      for (const route of routes) {
        await page.goto(base + route, {waitUntil:'domcontentloaded', timeout:60000});
        await page.waitForTimeout(kind === 'fixture' ? 400 : 700);
        if (route === '/') await reveal(page);
        const state = await appearance(page);
        results.push({kind, route, theme, ...state});
        check(state.theme === theme, kind + route + ' did not restore ' + theme);
        check(state.pageWidth <= width + 2 && state.bodyWidth <= width + 2, kind + route + ' horizontal overflow at ' + width);
        check(theme !== 'dark' || state.bright.length === 0, kind + route + ' has large light surfaces: ' + JSON.stringify(state.bright));
        check(state.ambient, kind + route + ' missing ambient layer');
        const name = kind + '-' + (route === '/' ? 'home' : route.slice(1).replace(/[^a-z\d]+/gi, '-')) + '-' + theme + '-' + width;
        await capture(page, name);
        if (kind === 'fixture' && route === '/') {
          for (const selector of sections) if (await page.locator(selector).count()) {
            await page.locator(selector).scrollIntoViewIfNeeded();
            await page.waitForTimeout(650);
            await page.locator(selector).screenshot({path:path.join(output, 'section-' + selector.slice(1) + '-' + theme + '-' + width + '.png')});
          }
        }
        console.log(kind, width, theme, route, state.bright.length ? 'bright=' + state.bright.length : 'ok');
      }
    }
    await overlays(page, theme, width);
    await context.close();
  }
  // Verify the real toggle, pre-paint restoration, and storage-denied fallback.
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage();
  await page.goto('http://localhost:3020/');
  await page.getByRole('button', {name:'Switch to dark mode'}).click();
  await page.waitForTimeout(500);
  check((await appearance(page)).theme === 'dark', 'toggle did not activate dark');
  check(await page.evaluate(() => localStorage.getItem('theme')) === 'dark', 'dark choice not saved');
  await page.reload();
  check((await appearance(page)).theme === 'dark', 'reload flashed/reset saved dark');
  // Record parser/first-frame restoration independently of hydration.
  await context.addInitScript(() => {
    window.__themePaints = [];
    let count = 0;
    const sample = () => {
      if (document.body?.querySelector('main')) window.__themePaints.push(document.documentElement.classList.contains('dark'));
      if (count++ < 30) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.reload();
  await page.waitForTimeout(650);
  const firstPaints = await page.evaluate(() => window.__themePaints);
  check(firstPaints.length > 0 && firstPaints.every(Boolean), 'saved dark was missing from a content paint');
  await page.getByRole('button', {name:'Switch to light mode'}).click();
  await page.waitForTimeout(500);
  await page.goto('http://localhost:3020/about');
  check((await appearance(page)).theme === 'light', 'navigation did not persist light');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('storage disabled'); }; });
  await page.getByRole('button', {name:'Switch to dark mode'}).click();
  await page.waitForTimeout(500);
  check((await appearance(page)).theme === 'dark', 'storage-denied toggle failed');
  await page.goto('http://localhost:3020/');
  await page.waitForTimeout(1500);
  const scroll = await page.evaluate(async () => {
    const start = scrollY;
    const frames = [];
    let previous = performance.now();
    for (let i = 0; i < 30; i++) {
      window.scrollBy(0, 35);
      await new Promise(requestAnimationFrame);
      const now = performance.now(); frames.push(now - previous); previous = now;
    }
    return {start, end:scrollY, behavior:getComputedStyle(document.documentElement).scrollBehavior, bodyOverflow:document.body.style.overflow, frames, runningAnimations:document.getAnimations().filter(a => a.playState === 'running').length};
  });
  check(scroll.end > scroll.start && scroll.behavior === 'auto' && scroll.bodyOverflow !== 'hidden', 'native scroll was blocked');
  await browser.close();
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({results, failures, errors, scroll, firstPaints}, null, 2));
  console.log(JSON.stringify({screens:results.length, failures, errors, scroll, output}));
  if (failures.length || errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); fs.mkdirSync(output,{recursive:true}); fs.writeFileSync(path.join(output, 'failure.json'),JSON.stringify({results, failures, errors, error:error.stack}, null, 2)); process.exitCode = 1; });
