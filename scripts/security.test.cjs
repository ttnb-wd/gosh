/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,request}=require('./security-fixture.cjs');
const checkout={customerName:'Customer A',phone:'N/A',address:'N/A',city:'N/A',paymentMethod:'cod',items:[{product_id:'p1',selected_size:null,quantity:2}]};
const product={name:'Product',price:100,stock:10,is_active:true};
const privateData={'products/p1':product,'orders/order-b':{user_id:'user-b',status:'Pending',payment_screenshot_file_id:'file-b'},'payment_uploads/file-b':{user_id:'user-b'},'payment_uploads/file-a':{user_id:'user-a'}};
const adminRoutes=['admin/products/action','admin/promotions/action','admin/product-promotions/action','admin/orders/status','admin/customers/summaries','admin/email/order-status','admin/brands/delete','admin/testimonials/delete','upload/imagekit'];
for(const route of adminRoutes)for(const options of [{anonymous:true},{}])test(`${route}: denies ${options.anonymous?'anonymous':'customer'} including destructive forged roles`,async()=>{
 const f=fixture(options),response=await f.load(`app/api/${route}/route.ts`).POST(request({action:'delete',role:'admin',productId:'p1',orderId:'order-b'}));
 assert.ok([401,403].includes(response.status));assert.equal(f.calls.length,0);
});
for(const route of ['checkout/place-order','checkout/upload-payment-proof','checkout/delete-payment-proof','email/order-created'])test(`${route}: denies anonymous`,async()=>{
 assert.equal((await fixture({anonymous:true}).load(`app/api/${route}/route.ts`).POST(request(checkout))).status,401);
});
test('receipt: anonymous cannot read a private image',async()=>{assert.equal((await fixture({anonymous:true}).load('app/api/checkout/payment-proof/route.ts').GET(new Request('https://www.goshperfumestudio.com/api/checkout/payment-proof?orderId=order-b'))).status,401)});
for(const query of ['orderId=order-b','fileId=file-b'])test('receipt: user A cannot access user B '+query,async()=>{
 const f=fixture({data:privateData});assert.equal((await f.load('app/api/checkout/payment-proof/route.ts').GET(new Request('https://www.goshperfumestudio.com/api/checkout/payment-proof?'+query))).status,404);assert.equal(f.calls.length,0);
});
test('order emails: user A cannot trigger user B messages',async()=>{const f=fixture({data:privateData});assert.equal((await f.load('app/api/email/order-created/route.ts').POST(request({orderId:'order-b'}))).status,403);assert.equal(f.calls.length,0)});
test('delete receipt: cross-user file is denied without deletion',async()=>{const f=fixture({data:privateData});assert.equal((await f.load('app/api/checkout/delete-payment-proof/route.ts').POST(request({fileId:'file-b'}))).status,404);assert.equal(f.calls.length,0)});
test('checkout: cross-user receipt attachment rejected',async()=>{const f=fixture({data:privateData});assert.equal((await f.load('app/api/checkout/place-order/route.ts').POST(request({...checkout,paymentScreenshotFileId:'file-b'}))).status,404);assert.equal(f.calls.length,0)});
for(const extra of [{role:'admin'},{user_id:'user-b'},{payment_status:'Paid'},{status:'Delivered'},{subtotal:0}])test('checkout: rejects privileged field '+Object.keys(extra)[0],async()=>{
 const f=fixture({data:privateData});assert.equal((await f.load('app/api/checkout/place-order/route.ts').POST(request({...checkout,...extra}))).status,400);assert.equal(f.calls.length,0);
});
for(const body of [null,[],{...checkout,customerName:'a'.repeat(101)},{...checkout,items:[{product_id:'orders/another/private',quantity:1}]},{...checkout,items:[{product_id:'p1',quantity:'2'}]},{...checkout,paymentScreenshotUrl:'http://127.0.0.1/secret'}])test('checkout: malformed/oversized/type/path/URL input is rejected '+JSON.stringify(body).slice(0,45),async()=>{
 const f=fixture({data:privateData});assert.equal((await f.load('app/api/checkout/place-order/route.ts').POST(request(body))).status,400);assert.equal(f.calls.length,0);
});
test('body: streamed size cap rejects payload without trusting Content-Length',async()=>{const f=fixture();const response=await f.load('app/api/contact/route.ts').POST(request({message:'x'.repeat(65537)}));assert.equal(response.status,413)});
test('checkout: duplicate product lines aggregate stock and complete reads before writes',async()=>{
 const f=fixture({data:privateData});const response=await f.load('app/api/checkout/place-order/route.ts').POST(request({...checkout,items:[{product_id:'p1',quantity:2},{product_id:'p1',quantity:3}]}));assert.equal(response.status,200);assert.equal(f.data.get('products/p1').stock,5);
});
test('checkout: duplicate lines exceeding total stock cannot commit',async()=>{
 const f=fixture({data:privateData});const response=await f.load('app/api/checkout/place-order/route.ts').POST(request({...checkout,items:[{product_id:'p1',quantity:6},{product_id:'p1',quantity:6}]}));assert.equal(response.status,400);assert.equal(f.data.get('products/p1').stock,10);
});
test('checkout: idempotency returns same order and reserves stock only once',async()=>{
 const f=fixture({data:privateData}),route=f.load('app/api/checkout/place-order/route.ts');
 const make=()=>request(checkout,'/api/checkout/place-order',{'Idempotency-Key':'repeat-key'});
 const [a,b]=await Promise.all([route.POST(make()),route.POST(make())]);assert.equal(a.status,200);assert.equal(b.status,200);assert.equal((await a.json()).data.id,(await b.json()).data.id);assert.equal(f.data.get('products/p1').stock,8);
});
test('checkout: idempotency rejects changed payload',async()=>{
 const f=fixture({data:privateData}),route=f.load('app/api/checkout/place-order/route.ts');await route.POST(request(checkout,'/api/test',{'Idempotency-Key':'same-key'}));assert.equal((await route.POST(request({...checkout,customerName:'Other Customer'},'/api/test',{'Idempotency-Key':'same-key'}))).status,409);
});
test('checkout: own receipt attaches once; used receipt cannot be deleted/reused',async()=>{
 const f=fixture({data:privateData}),route=f.load('app/api/checkout/place-order/route.ts');const body={...checkout,paymentScreenshotFileId:'file-a'};
 assert.equal((await route.POST(request(body))).status,200);assert.ok(f.data.get('payment_uploads/file-a').order_id);
 assert.equal((await f.load('app/api/checkout/delete-payment-proof/route.ts').POST(request({fileId:'file-a'}))).status,409);
 assert.equal((await route.POST(request(body))).status,409);assert.ok(!f.calls.some(c=>c[0]==='delete-file'));
});
test('cancellation: concurrent/double requests restore inventory once including decants',async()=>{
 const f=fixture({data:{'products/p1':{...product,stock:8},'orders/o1':{status:'Pending',stock_restored:false},'orders/o1/items/i1':{product_id:'p1',quantity:2,selected_size:'10ml'}}});
 const helper=f.load('lib/firebase/orders-server.ts');await Promise.all([helper.updateOrderStatus('o1','Cancelled','admin'),helper.updateOrderStatus('o1','Cancelled','admin')]);assert.equal(f.data.get('products/p1').stock,10);assert.equal(f.data.get('orders/o1').stock_restored,true);await assert.rejects(helper.updateOrderStatus('o1','Pending','admin'));
});
test('admin status: rejects unexpected/malformed enums',async()=>{assert.equal((await fixture({admin:true}).load('app/api/admin/orders/status/route.ts').POST(request({type:'order',orderId:'o1',status:'HACKED'}))).status,400)});
test('admin product: rejects arbitrary write keys/prototype fields and unsafe URLs',async()=>{
 for(const bad of [{...product,role:'admin'},{...product,image:'javascript:alert(1)'},JSON.parse('{"name":"x","price":100,"stock":1,"is_active":true,"__proto__":{"admin":true}}')])assert.equal((await fixture({admin:true}).load('app/api/admin/products/action/route.ts').POST(request({action:'save',product:bad}))).status,400);
});

test('admin product: existing story notes remain supported as text',async()=>{
 const f=fixture({admin:true});const response=await f.load('app/api/admin/products/action/route.ts').POST(request({action:'save',product:{...product,notes:{story:'<img src=x onerror="alert(1)">',top:['Amber'],madeWith:'',bestFor:''}}}));assert.equal(response.status,200);assert.ok([...f.data.values()].some(value=>value.notes?.story.startsWith('<img')));
});
test('admin product: stale form cannot overwrite inventory changed by checkout',async()=>{
 const f=fixture({admin:true,data:{'products/p1':{...product,stock:8}}}),route=f.load('app/api/admin/products/action/route.ts');
 assert.equal((await route.POST(request({action:'save',productId:'p1',expectedStock:10,product}))).status,409);assert.equal(f.data.get('products/p1').stock,8);
 assert.equal((await route.POST(request({action:'save',productId:'p1',expectedStock:8,product:{...product,stock:9}}))).status,200);assert.equal(f.data.get('products/p1').stock,9);
});
test('admin product: updating inventory requires an explicit observed stock version',async()=>{
 const f=fixture({admin:true,data:{'products/p1':product}});assert.equal((await f.load('app/api/admin/products/action/route.ts').POST(request({action:'save',productId:'p1',product}))).status,400);assert.equal(f.data.get('products/p1').stock,10);
});
test('URLs/redirects: reject executable schemes, external login return URLs and encoded separators',()=>{
 const f=fixture(),v=f.load('lib/security/validation.ts'),auth=f.load('lib/auth/errors.ts');
 for(const url of ['javascript:alert(1)','data:text/html,hello','//evil.test','/\\evil.test','https://user:pass@evil.test'])assert.equal(v.safeUrl(url),false);
 for(const url of ['https://evil.test','//evil.test','/\\evil.test','/\nevil.test'])assert.equal(auth.safeAuthRedirect(url),'/account');
});
test('XSS: harmless payload stays escaped in email HTML and React text',async()=>{
 const payload='<img src=x onerror="alert(1)">';const f=fixture({env:{RESEND_API_KEY:'test-only'}});await f.load('lib/email.ts').sendCustomerOrderConfirmationEmail({customer_email:'a@example.test',customer_name:payload,order_number:'x',total:1});
 const html=JSON.parse(f.calls.find(c=>c[0]==='fetch')[2].body).html;assert.ok(html.includes('&lt;img'));assert.ok(!html.includes(payload));
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const rendered=renderToStaticMarkup(React.createElement('p',null,payload));assert.ok(rendered.includes('&lt;img'));assert.ok(!rendered.includes('<img'));
});
test('public serialization: inactive product/private metadata never leaks',()=>{const h=fixture().load('lib/security/public-data.ts');assert.equal(h.publicProduct({...product,is_active:false,email:'private'}),null);assert.ok(!('email'in h.publicProduct({...product,email:'private',created_by:'admin',imageFileId:'secret'})));assert.ok(!('imageFileId'in h.publicPromotion({id:'x',imageFileId:'secret'})))});
for(const url of ['http://127.0.0.1/secret','https://evil.test/a','https://ik.imagekit.io/other/gosh/payments/a.png'])test('receipt proxy: rejects SSRF URL '+url,async()=>{const f=fixture({data:{'orders/o1':{user_id:'user-a',payment_screenshot_url:url}}});assert.equal((await f.load('app/api/checkout/payment-proof/route.ts').GET(new Request('https://www.goshperfumestudio.com/api/checkout/payment-proof?orderId=o1'))).status,404);assert.equal(f.calls.length,0)});
test('receipt proxy: rejects executable upstream content and disables redirects',async()=>{const f=fixture({data:privateData,contentType:'text/html'});assert.equal((await f.load('app/api/checkout/payment-proof/route.ts').GET(new Request('https://www.goshperfumestudio.com/api/checkout/payment-proof?fileId=file-a'))).status,502);assert.equal(f.calls.find(c=>c[0]==='fetch')[2].redirect,'error')});
test('upload: forged MIME/path name rejected; real image gets generated name',async()=>{const helper=fixture().load('lib/security/uploads.ts');await assert.rejects(helper.validatedImage(new File(['<script>test</script>'],'../../x.png',{type:'image/png'})));const real=await helper.validatedImage(new File([Buffer.from([137,80,78,71,13,10,26,10,0])],'../../private.png',{type:'image/png'}));assert.match(real.fileName,/^[a-f0-9-]+\.png$/)});
for(const options of [{production:true},{production:true,redisFails:true,env:{UPSTASH_REDIS_REST_URL:'https://test.upstash.io',UPSTASH_REDIS_REST_TOKEN:'test-only'}}])test('rate limit: production fails closed without a reliable shared store '+JSON.stringify(options),async()=>{assert.equal((await fixture(options).load('lib/rateLimit.ts').checkRateLimit({identifier:'test',maxRequests:10,windowSeconds:60})).success,false)});

test('email delivery: concurrent repeated event sends once',async()=>{const f=fixture(),helper=f.load('lib/security/email-once.ts');let sent=0;const send=async()=>{sent++;return {ok:true}};await Promise.all([helper.deliverOnce('order:1',send),helper.deliverOnce('order:1',send)]);await helper.deliverOnce('order:1',send);assert.equal(sent,1)});
test('brand deletion: server detects linked products and preserves records',async()=>{const f=fixture({admin:true,data:{'brands/brand':{name:'Brand',is_active:true},'products/product':{brand_id:'brand'}}});const result=await f.load('app/api/admin/brands/delete/route.ts').POST(request({brandId:'brand'}));assert.equal(result.status,200);assert.equal((await result.json()).deleted,false);assert.equal(f.data.get('brands/brand').is_active,false);assert.ok(f.data.has('products/product'))});
test('admin destructive deletion targets only the validated document and records actor',async()=>{const f=fixture({admin:true,data:{'testimonials/one':{name:'one'},'testimonials/two':{name:'two'}}});assert.equal((await f.load('app/api/admin/testimonials/delete/route.ts').POST(request({testimonialId:'one'}))).status,200);assert.ok(!f.data.has('testimonials/one'));assert.ok(f.data.has('testimonials/two'));assert.ok([...f.data.entries()].some(([key,value])=>key.startsWith('audit_logs/')&&value.actor==='user-a'))});
