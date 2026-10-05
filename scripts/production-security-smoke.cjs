/* eslint-disable @typescript-eslint/no-require-imports */
// Read-only probes: no tokens, no real users, no private-data mutations.
const assert=require('node:assert/strict');
async function run(){
 const base=process.argv[2]||'http://localhost:3101';
 if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw new Error('Only the local production build may be tested.');
 const response=await fetch(base,{redirect:'manual'});
 assert.equal(response.status,200);
 for(const [name,value]of Object.entries({'x-frame-options':'DENY','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}))assert.equal(response.headers.get(name),value);
 assert.ok(response.headers.get('strict-transport-security'));assert.ok(response.headers.get('permissions-policy'));
 const csp=response.headers.get('content-security-policy');assert.ok(csp.includes("frame-ancestors 'none'"));assert.ok(csp.includes("object-src 'none'"));assert.ok(!csp.includes('unsafe-eval'));assert.ok(!csp.includes('5gvci'));assert.ok(!response.headers.has('x-powered-by'));
 for(const route of ['admin/products/action','admin/promotions/action','admin/product-promotions/action','admin/orders/status','admin/customers/summaries','admin/email/order-status','admin/brands/delete','admin/testimonials/delete','upload/imagekit','checkout/place-order','checkout/upload-payment-proof','checkout/delete-payment-proof','email/order-created']){
  const result=await fetch(base+'/api/'+route,{method:'POST',headers:{'content-type':'application/json'},body:'{}',redirect:'manual'});
  assert.ok([401,403].includes(result.status),`${route} should deny anonymous access (received ${result.status})`);
  assert.ok(result.headers.get('cache-control')?.includes('no-store'));
  const body=await result.text();assert.ok(!/PRIVATE KEY|stack|firebase-admin|node_modules/i.test(body));
 }
 for(const route of ['account','orders','checkout','admin']){
  const result=await fetch(base+'/'+route,{redirect:'manual'});
  // Next can flush a public loading shell before the server layout redirects.
  // Its documented streaming redirect is then encoded in the HTML/RSC stream.
  const body=await result.text();
  assert.ok([302,303,307,308].includes(result.status)||(result.status===200&&body.includes('NEXT_REDIRECT')&&body.includes('/login')),`${route} must redirect anonymous visitors`);
  assert.ok(result.headers.get('cache-control')?.includes('no-store'));
 }
 const worker=await fetch(base+'/sw.js');assert.equal(worker.status,200);const source=await worker.text();assert.ok(source.includes('unregister'));assert.ok(!source.includes('importScripts'));assert.ok(worker.headers.get('cache-control')?.includes('no-store'));
 console.log('PASS: production headers, anonymous API/page denial, private cache controls, and retirement worker.');
}
run().catch(error=>{console.error(error.message);process.exitCode=1});
