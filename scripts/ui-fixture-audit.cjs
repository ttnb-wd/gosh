/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='http://127.0.0.1:3025',output=process.env.GOSH_UI_REVIEW_ROOT||path.join(require('node:os').tmpdir(),'gosh-ui-review');
const routes=['/','/products','/promotions','/admin','/admin/products','/admin/orders','/admin/promotions','/admin/customers','/admin/brands','/admin/announcements','/admin/messages','/admin/testimonials','/admin/settings','/account','/account/security','/orders','/checkout','/controls'];
(async()=>{
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});const results=[],errors=[];
  for(const width of [390,768,1440,1920]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
    page.on('pageerror',error=>errors.push({route:page.url(),width,error:error.message}));
    await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
    for(const route of routes){
      await page.goto(base+route);await page.waitForTimeout(750);
      const result=await page.evaluate(()=>({width:innerWidth,page:document.documentElement.scrollWidth,body:document.body.scrollWidth,headings:[...document.querySelectorAll('h1')].map(el=>el.innerText)}));results.push({route,...result});
      await page.screenshot({path:path.join(output,'fixture-'+route.slice(1).replaceAll('/','-')+'-'+width+'.png'),fullPage:true});console.log(width,route,result.page>width+2?'OVERFLOW':'ok');
    }await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',error=>errors.push({route:page.url(),error:error.message}));
  for(const route of ['/admin/products','/admin/orders','/admin/customers','/admin/messages','/admin/testimonials'])for(const state of ['loading','empty','error']){
    await page.goto(base+route+'?state='+state);await page.waitForTimeout(700);await page.screenshot({path:path.join(output,'fixture-'+route.slice(1).replaceAll('/','-')+'-'+state+'.png'),fullPage:true});
  }
  await page.goto(base+'/controls');await page.waitForTimeout(300);
  const choice=page.getByRole('combobox',{name:'Fragrance family'});await choice.focus();await page.keyboard.press('Enter');await page.getByRole('listbox').waitFor();await page.keyboard.press('End');await page.keyboard.press('Enter');assert.match(await choice.innerText(),/Woody/);assert.equal(await choice.getAttribute('aria-expanded'),'false');
  await choice.click();await page.getByRole('option',{name:'Floral'}).click();assert.match(await choice.innerText(),/Floral/);
  await choice.click();await page.keyboard.press('Escape');assert.equal(await choice.getAttribute('aria-expanded'),'false');assert.ok(await choice.evaluate(el=>el===document.activeElement));
  assert.ok(await page.getByRole('combobox',{name:'Disabled choice'}).isDisabled());
  await page.getByRole('button',{name:'Success toast'}).click();await page.getByRole('status').filter({hasText:'Saved successfully'}).waitFor();
  const confirmation=page.getByRole('button',{name:'Delete confirmation'});await confirmation.click();await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Keep item');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Delete item');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await confirmation.evaluate(el=>el===document.activeElement));
  await choice.click();await page.screenshot({path:path.join(output,'dropdown-open-390.png')});await page.keyboard.press('Escape');
  await page.getByRole('textbox',{name:'Promotion begins'}).click();await page.locator('.gosh-datepicker').waitFor();await page.screenshot({path:path.join(output,'calendar-open-390.png')});await page.keyboard.press('Escape');
  await page.goto(base+'/admin/products');await page.waitForTimeout(600);await page.getByRole('button',{name:/add perfume product/i}).click();await page.getByRole('dialog',{name:'Product editor'}).waitFor();await page.waitForTimeout(250);await page.screenshot({path:path.join(output,'product-editor-390.png')});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  const menu=page.getByRole('button',{name:'Open admin navigation'});await menu.click();await page.getByRole('dialog',{name:'Admin navigation'}).waitFor();await page.waitForTimeout(250);await page.screenshot({path:path.join(output,'admin-mobile-navigation-390.png')});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await menu.evaluate(el=>el===document.activeElement));
  await browser.close();fs.writeFileSync(path.join(output,'fixture-results.json'),JSON.stringify({results,errors,keyboard:true,states:15},null,2));console.log(JSON.stringify({screens:results.length,overflows:results.filter(r=>r.page>r.width+2||r.body>r.width+2),errors}));if(errors.length||results.some(r=>r.page>r.width+2||r.body>r.width+2))process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1);});
