/* eslint-disable @typescript-eslint/no-require-imports */
// Real local routes only. Does not authenticate, send messages, or mutate production data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
let playwright;
try { playwright = require('playwright'); } catch { playwright = require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
const base = process.env.GOSH_UI_BASE || 'http://localhost:3020';
const output = process.env.GOSH_UI_REVIEW_ROOT || path.join(require('node:os').tmpdir(),'gosh-ui-review');
const publicRoutes = ['/', '/products', '/products?collection=Floral', '/products?search=rose', '/promotions', '/about', '/contact', '/login', '/login?mode=signup', '/forgot-password', '/reset-password', '/verify-email', '/admin/login', '/privacy', '/terms', '/refund-policy', '/delivery-policy', '/not-a-gosh-page'];
const protectedRoutes = ['/account','/account/security','/orders','/checkout','/admin','/admin/products','/admin/orders','/admin/promotions','/admin/customers','/admin/brands','/admin/announcements','/admin/messages','/admin/testimonials','/admin/settings'];
async function run() {
  fs.mkdirSync(output,{recursive:true});
  const browser = await playwright.chromium.launch({headless:true,channel:"msedge"});
  const results=[],errors=[];
  for(const width of [390,768,1440,1920]) {
    const context = await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push({width,error:error.message}));
    for(const route of publicRoutes) {
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
      await page.locator('body').waitFor();
      await page.waitForTimeout(600);
      const dimensions=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,body:document.body.scrollWidth,background:getComputedStyle(document.body).backgroundColor}));
      const result={route,width,status:response.status(),...dimensions};
      results.push(result);
      if(dimensions.page>width+2||dimensions.body>width+2) result.overflow=true;
      const file=route==='/'?'home':route.slice(1).replace(/[^a-z\d]+/gi,'-');
      await page.screenshot({path:path.join(output,file+'-'+width+'.png'),fullPage:true});
      console.log(`${width} ${route} ${result.status}${result.overflow?' OVERFLOW':''}`);
    }
    await context.close();
  }
  const context=await browser.newContext();
  const page=await context.newPage();
  for(const route of protectedRoutes) {
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForURL(url=>url.pathname === (route.startsWith('/admin')?'/admin/login':'/login'),{timeout:15000});
    assert.ok(new URL(page.url()).pathname === (route.startsWith('/admin')?'/admin/login':'/login'),`guard for ${route}`);
  }
  for(const [route,target] of [['/register','/login'],['/auth/action','/login'],['/auth/action?mode=resetPassword','/reset-password'],['/auth/action?mode=verifyEmail','/verify-email']]) {
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.waitForURL(url=>url.pathname===target,{timeout:15000});
  }
  // Mouse, keyboard, native scrolling, mobile navigation and reduced motion on the real storefront.
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/products',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);
  const bag=page.getByRole('button',{name:/shopping bag|open bag|open cart/i}).first();
  if(await bag.count()) { await bag.click(); await page.getByRole('dialog',{name:'Your shopping bag'}).waitFor(); await page.keyboard.press('Escape'); await page.getByRole('dialog',{name:'Your shopping bag'}).waitFor({state:'hidden'}); }
  const navigation=page.getByRole('button',{name:/Open navigation|Open menu/i}).first();
  if(await navigation.count()) { await navigation.click(); await page.locator('dialog[open]').waitFor(); await page.keyboard.press('Escape'); assert.equal(await page.locator('dialog[open]').count(),0); }
  const scroll=await page.evaluate(()=>({behavior:getComputedStyle(document.documentElement).scrollBehavior,overflow:document.body.style.overflow}));
  assert.equal(scroll.behavior,'auto');
  assert.notEqual(scroll.overflow,'hidden');
  await browser.close();
  fs.writeFileSync(path.join(output,'route-results.json'),JSON.stringify({results,errors,protectedRoutes:protectedRoutes.length,scroll},null,2));
  console.log(JSON.stringify({screens:results.length,overflows:results.filter(r=>r.overflow),pageErrors:errors,protectedRoutes:protectedRoutes.length,output}));
  if(results.some(r=>r.overflow)||errors.length) process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exit(1);});

