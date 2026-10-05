/* eslint-disable @typescript-eslint/no-require-imports */
// Must run only against an emulator, with an inert demo project.
const {test,before,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
let env;
before(async()=>{
 const host=process.env.FIRESTORE_EMULATOR_HOST;
 if(!host||!/^127\.0\.0\.1:\d+$|^localhost:\d+$/.test(host)) throw new Error('A local Firestore emulator is required; production access is prohibited.');
 const [hostname,port]=host.split(':');
 env=await initializeTestEnvironment({projectId:'demo-gosh-security',firestore:{host:hostname,port:Number(port),rules:fs.readFileSync('firestore.rules','utf8').replace(/^\uFEFF/,'')}});
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  for(const [name,data]of Object.entries({
   'users/a':{role:'user',full_name:'Customer A'},'users/b':{role:'user'},'users/admin':{role:'admin'},
   'orders/order-a':{user_id:'a',status:'Pending',payment_status:'Unpaid'},'orders/order-b':{user_id:'b',status:'Pending'},
   'orders/order-a/items/item':{product_id:'product',quantity:1},
   'products/active':{is_active:true,name:'Public',price:100,stock:5},'products/inactive':{is_active:false},
   'brands/brand':{name:'Brand',is_active:true},'messages/private':{status:'unread',email:'private@example.test'},
   'testimonials/active':{name:'Customer',comment:'Nice product',is_active:true,rating:5},'testimonials/draft':{is_active:false},
   'promotions/active':{is_active:true},'promotions/draft':{is_active:false},'product_promotions/active':{is_active:true},
   'site_settings/1':{store_name:'Public Store'},'site_settings/private':{secret:'test-only'},
   'payment_uploads/file':{user_id:'a'},'payments/payment':{user_id:'a'},'audit_logs/log':{action:'test'},
   'newsletter_subscribers/private':{email:'private@example.test'},'admin_notifications/n1':{is_read:false},
  }))await setDoc(doc(db,name),data);
 });
});
after(async()=>{if(env)await env.cleanup()});
const anon=()=>env.unauthenticatedContext().firestore();
const customer=id=>env.authenticatedContext(id,{email_verified:true}).firestore();
const admin=()=>customer('admin');
for(const path of ['users/a','orders/order-a','orders/order-a/items/item','messages/private','payments/payment','payment_uploads/file','audit_logs/log','newsletter_subscribers/private','admin_notifications/n1'])test('anonymous denied '+path,async()=>assertFails(getDoc(doc(anon(),path))));
for(const path of ['users/b','orders/order-b','messages/private','payments/payment','audit_logs/log'])test('cross-user/private read denied '+path,async()=>assertFails(getDoc(doc(customer('a'),path))));
for(const path of ['products/active','brands/brand','testimonials/active','promotions/active','product_promotions/active','site_settings/1'])test('public data readable '+path,async()=>assertSucceeds(getDoc(doc(anon(),path))));
for(const path of ['products/inactive','testimonials/draft','promotions/draft','site_settings/private'])test('unpublished/private configuration denied '+path,async()=>assertFails(getDoc(doc(anon(),path))));
test('owner may query only their own orders/items',async()=>{const db=customer('a');await assertSucceeds(getDocs(query(collection(db,'orders'),where('user_id','==','a'))));await assertSucceeds(getDoc(doc(db,'orders/order-a/items/item')));await assertFails(getDocs(collection(db,'orders')))});
test('unverified customer cannot read orders',async()=>assertFails(getDoc(doc(env.authenticatedContext('a',{email_verified:false}).firestore(),'orders/order-a'))));
test('profile role/mass assignment and cross-user updates denied',async()=>{const db=customer('a');for(const changes of [{role:'admin'},{isAdmin:true},{email_verified:true}])await assertFails(updateDoc(doc(db,'users/a'),changes));await assertFails(updateDoc(doc(db,'users/b'),{full_name:'Hacked',updated_at:serverTimestamp()}));await assertFails(setDoc(doc(db,'users/forged'),{role:'admin'}))});
test('bounded profile edit preserved',async()=>assertSucceeds(updateDoc(doc(customer('a'),'users/a'),{full_name:'Updated Customer',updated_at:serverTimestamp()})));
test('oversized profile denied',async()=>assertFails(updateDoc(doc(customer('a'),'users/a'),{full_name:'x'.repeat(101),updated_at:serverTimestamp()})));
test('customer cannot create orders or testimonials or audit records',async()=>{const db=customer('a');for(const path of ['orders/new','testimonials/new','audit_logs/new','arbitrary/new'])await assertFails(setDoc(doc(db,path),{user_id:'a',is_active:false,status:'Paid'}))});
test('customer destructive operations denied',async()=>{for(const path of ['orders/order-a','products/active','users/a','brands/brand','testimonials/active'])await assertFails(deleteDoc(doc(customer('a'),path)))});
test('admin direct money/status/destruction bypasses denied',async()=>{const db=admin();await assertFails(updateDoc(doc(db,'orders/order-a'),{status:'Cancelled'}));await assertFails(updateDoc(doc(db,'orders/order-a'),{payment_status:'Paid'}));await assertFails(deleteDoc(doc(db,'orders/order-a')));await assertFails(updateDoc(doc(db,'products/active'),{price:0}));await assertFails(deleteDoc(doc(db,'brands/brand')));await assertFails(deleteDoc(doc(db,'testimonials/active')))});
test('admin reads and narrow notification/message edits preserved',async()=>{const db=admin();await assertSucceeds(getDoc(doc(db,'users/b')));await assertSucceeds(getDoc(doc(db,'products/inactive')));await assertSucceeds(updateDoc(doc(db,'orders/order-a'),{is_read:true}));await assertSucceeds(updateDoc(doc(db,'messages/private'),{status:'read'}));await assertFails(updateDoc(doc(db,'messages/private'),{email:'forged@example.test'}))});
test('admin testimonial moderation rejects unsafe URL/field',async()=>{const db=admin();await assertSucceeds(updateDoc(doc(db,'testimonials/active'),{is_active:false}));await assertFails(updateDoc(doc(db,'testimonials/active'),{avatar_url:'javascript:alert(1)'}));await assertFails(updateDoc(doc(db,'testimonials/active'),{user_id:'someone'}))});
test('admin brand linkage and bounded settings edits preserved',async()=>{const db=admin();await assertSucceeds(updateDoc(doc(db,'products/active'),{brand:'Brand',brand_id:'brand',updated_at:serverTimestamp()}));await assertSucceeds(updateDoc(doc(db,'site_settings/1'),{store_name:'Store',facebook_url:'https://facebook.com/store',updated_at:serverTimestamp()}));await assertFails(updateDoc(doc(db,'site_settings/1'),{secret:'private',updated_at:serverTimestamp()}));await assertFails(updateDoc(doc(db,'site_settings/1'),{facebook_url:'javascript:alert(1)',updated_at:serverTimestamp()}))});
test('server-only nested collections deny both customer and admin',async()=>{for(const db of [customer('a'),admin()])for(const path of ['order_requests/x','email_deliveries/x','payment_uploads/file','users/a/private/x']){await assertFails(getDoc(doc(db,path)));await assertFails(setDoc(doc(db,path),{role:'admin'}))}});
