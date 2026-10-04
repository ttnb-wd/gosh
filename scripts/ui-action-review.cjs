/* eslint-disable @typescript-eslint/no-require-imports */
// Runs existing UI actions against the isolated in-memory preview only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(require('node:os').homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base='http://127.0.0.1:3025';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/admin/products');await page.waitForTimeout(600);
  const actions=page.locator('.studio-row-actions').first();await actions.locator('summary').click();await actions.getByRole('button',{name:'Deactivate',exact:true}).click();await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>window.__fixtureCalls.some(call=>call.method==='POST'&&call.url.includes('/products/action'))));
  await actions.locator('summary').click();await actions.getByRole('button',{name:'Edit',exact:true}).click();await page.getByRole('dialog',{name:'Product editor'}).waitFor();await page.waitForTimeout(250);
  const editor=page.getByRole('dialog',{name:'Product editor'});assert.equal(await editor.locator('input[name="name"]').inputValue(),'Amber Memory');await editor.locator('input[name="name"]').fill('Amber Memory Review');
  await editor.locator('button[type="submit"]').click();await editor.waitFor({state:'hidden'});
  const productCall=await page.evaluate(()=>window.__fixtureCalls.filter(call=>call.method==='POST'&&call.url.includes('/products/action')).at(-1));assert.match(JSON.stringify(productCall.body),/Amber Memory Review/);
  await actions.locator('summary').click();await actions.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog',{name:'Delete product'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Add Perfume Product'}).click();await page.getByRole('dialog',{name:'Product editor'}).waitFor();
  await editor.locator('input[name="name"]').fill('Review Created Fragrance');await editor.locator('input[name="price"]').fill('150000');await editor.locator('input[name="stock"]').fill('10');
  await editor.getByRole('combobox',{name:'Brand',exact:true}).click();await page.getByRole('option',{name:'GOSH',exact:true}).click();await editor.locator('button[type="submit"]').click();await editor.waitFor({state:'hidden'});
  assert.ok(await page.evaluate(()=>window.__fixtureCalls.some(call=>call.body?.action==='save'&&call.body.productId===null&&JSON.stringify(call.body.product).includes('Review Created Fragrance'))));
  await page.goto(base+'/admin/promotions');await page.waitForTimeout(600);
  const promotion=page.locator('.studio-row-actions').first();await promotion.locator('summary').click();await promotion.getByRole('button',{name:/deactivate/i}).click();await page.waitForTimeout(200);assert.ok(await page.evaluate(()=>window.__fixtureCalls.some(call=>call.body?.action==='toggle')));
  await promotion.locator('summary').click();await promotion.getByRole('button',{name:/edit/i}).click();await page.waitForTimeout(250);
  await page.locator('input[placeholder="25"]').fill('10');await page.getByRole('button',{name:'Update Promotion',exact:true}).click();await page.waitForTimeout(300);
  const promotionCall=await page.evaluate(()=>window.__fixtureCalls.find(call=>call.body?.action==='update'));assert.equal(promotionCall.body.data.promotion_price,112500);assert.equal(promotionCall.body.data.product_id,'p0');
  await promotion.locator('summary').click();await promotion.getByRole('button',{name:/delete/i}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Keep item'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await page.evaluate(()=>!window.__fixtureCalls.some(call=>call.body?.action==='delete')));
  await page.goto(base+'/products');await page.waitForTimeout(700);
  const decant=page.getByRole('combobox',{name:'Decant size for Amber Memory'}).first();await decant.click();await page.getByRole('option',{name:/5 ml/}).click();await page.getByRole('button',{name:/Add .* to bag/i}).first().click();await page.getByRole('button',{name:'Open shopping bag'}).click();await page.getByRole('dialog',{name:'Your shopping bag'}).waitFor();await page.waitForTimeout(250);
  const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('gosh_cart')));assert.ok(cart.some(item=>item.selectedSize==='5 ml'&&item.price===14400));
  await page.getByRole('button',{name:/Increase quantity/}).last().click();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
  await page.goto(base+'/checkout');await page.waitForTimeout(500);await page.getByRole('button',{name:/KBZPay Mobile payment/}).click();await page.getByRole('dialog',{name:'Payment details'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);await browser.close();console.log('Passed: product create/status/edit/delete-cancel, promotion status/edit/pricing/delete-cancel, discounted decant/cart quantity, payment dialog and scroll restoration.');
  const output=process.env.GOSH_UI_REVIEW_ROOT||path.join(require('node:os').tmpdir(),'gosh-ui-review');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'action-results.json'),JSON.stringify({passed:true,errors,productCall,promotionCall},null,2));
})().catch(error=>{console.error(error);process.exit(1);});

