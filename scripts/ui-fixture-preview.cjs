/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated browser review of the real UI with synthetic records. Never ships in Next.
// No production auth guard is bypassed and every fixture write stays in memory.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), ts = require('typescript');
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const root = process.cwd(), output = path.join(os.tmpdir(), 'gosh-ui-fixtures');
fs.mkdirSync(output, {recursive:true});
const write = (name, value) => { const file=path.join(output,name); fs.writeFileSync(file,value); return file; };
function initializer(file,name) {
  const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true);
  for(const node of source.statements) if(ts.isVariableStatement(node)) for(const declaration of node.declarationList.declarations) if(declaration.name.getText(source)===name) return declaration.initializer.getText(source);
  throw new Error('Missing fixture defaults '+name);
}
const settings=write('settings.js',`export const defaultSettings=${initializer('lib/siteSettings.ts','defaultSettings')}; export const defaultWebsiteSettings=${initializer('lib/websiteSettings.ts','defaultWebsiteSettings')}; export const getDefaultSettings=()=>({...defaultSettings}); export const getSiteSettings=async()=>defaultSettings; export const getWebsiteSettings=async()=>defaultWebsiteSettings; export const updateSiteSettings=async()=>({success:true}); export const updateWebsiteSettings=async(data)=>({success:true,data});`);
write('records.js',`
export const user={uid:'review-user',id:'review-user',email:'review@example.test',emailVerified:true,role:'admin',full_name:'Studio Reviewer',getIdToken:async()=> 'fixture-only'};
export const products=Array.from({length:24},(_,i)=>({id:'p'+i,name:['Amber Memory','Rose Atelier','Cedar & Musk'][i%3],brand:['GOSH','Atelier'][i%2],brand_id:'b'+i%2,description:'A warm, refined fragrance with a lingering signature.',image:'/images/showcase/perfume-showcase-1.jpg',images:['/images/showcase/perfume-showcase-1.jpg'],price:125000+i*1000,stock:i%3===0?3:18,is_active:true,is_featured:true,category:i===23?'accessories':'perfumes',badge:i%3===0?'New':null,scent_collection:'Floral',decants:[{id:'5ml',label:'5 ml',ml:5,price:18000,stock:12},{id:'10ml',label:'10 ml',ml:10,price:32000,stock:10}],notes:{top:['Bergamot'],middle:['Rose'],base:['Amber']},created_at:new Date().toISOString(),updated_at:new Date().toISOString()}));
export const orders=Array.from({length:12},(_,i)=>({id:'o'+i,order_number:'GOSH-010'+i,user_id:user.uid,customer_name:'Avery Rose',customer_email:'avery@example.test',phone:'09912345678',address:'24 Garden Road',city:'Yangon',payment_method:'kbzpay',payment_status:i%2?'Paid':'Verifying',status:i%2?'Delivered':'Pending',subtotal:125000,delivery_fee:3000,discount:0,total:128000,created_at:new Date().toISOString(),payment_screenshot_url:'/images/showcase/perfume-showcase-1.jpg',payment_account_name:'Avery Rose',payment_phone:'09912345678'}));
export const items=[{id:'i1',product_name:'Amber Memory',product_brand:'GOSH',product_image:products[0].image,selected_size:'Bottle',price:125000,quantity:1}];
export const customers=Array.from({length:24},(_,i)=>({id:'c'+i,email:'avery'+i+'@example.test',full_name:'Avery Rose',phone:'09912345678',role:i===0?'admin':'customer',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),total_orders:4,total_spent:512000,last_order_date:new Date().toISOString(),latest_status:'Delivered',latest_customer_name:'Avery Rose',latest_phone:'09912345678',total_count:24}));
export const brands=[{id:'b0',name:'GOSH',slug:'gosh',is_active:true,description:'The studio collection'},{id:'b1',name:'Atelier',slug:'atelier',is_active:true,description:'Art of scent'}];
export const messages=[{id:'m1',name:'Avery Rose',email:'avery@example.test',subject:'Fragrance consultation',message:'Could you help me choose a woody fragrance?',is_read:false,is_replied:false,created_at:new Date().toISOString()}];
export const testimonials=[{id:'t1',name:'Avery Rose',email:'avery@example.test',rating:5,comment:'A beautiful fragrance and a thoughtful experience.',message:'A beautiful fragrance and a thoughtful experience.',is_approved:true,is_active:true,created_at:new Date().toISOString()}];
export const promotions=[{id:'promo1',product_id:'p0',product:products[0],promotion_price:100000,is_active:true,start_at:new Date(Date.now()-86400000).toISOString(),end_at:new Date(Date.now()+86400000*7).toISOString(),title:'The Autumn Edit',description:'Discover a warm signature.',type:'new_product',image:products[0].image,cta_text:'Discover',cta_url:'/products',created_at:new Date().toISOString()}];
export const records={products,orders,items,brands,messages,testimonials,profiles:customers};
`);
const firestore=write('firestore.js',`
import {records} from './records';
export class Timestamp { constructor(value){this.value=value;} toDate(){return new Date(this.value);} static fromDate(value){return new Timestamp(value);} static now(){return new Timestamp(Date.now());} }
export const collection=(db,...segments)=>({name:segments.at(-1)}); export const doc=(db,...segments)=>({name:segments.at(-2),id:segments.at(-1)});
export const where=(...args)=>args, orderBy=(...args)=>args,limit=(value)=>value,query=(ref)=>ref,serverTimestamp=()=>new Date().toISOString();
const snapshot=(ref)=>{let rows=new URLSearchParams(location.search).get('state')==='empty'?[]:records[ref.name]||[]; if(new URLSearchParams(location.search).get('state')==='error') throw new Error('Fixture unavailable'); const docs=rows.map(row=>({id:row.id,data:()=>row,exists:()=>true})); return {docs,empty:!docs.length,size:docs.length,forEach:fn=>docs.forEach(fn)};};
export const getDocs=async(ref)=>{if(new URLSearchParams(location.search).get('state')==='loading') return new Promise(()=>{}); return snapshot(ref);};
export const getDoc=async()=>({exists:()=>false,data:()=>({})});
export const onSnapshot=(ref,fn,error)=>{try{fn(snapshot(ref));}catch(e){error?.(e);}return ()=>{};};
export const setDoc=async()=>{}, updateDoc=async()=>{}, deleteDoc=async()=>{}, addDoc=async()=>({id:'fixture'});
export const writeBatch=()=>({update:()=>{},commit:async()=>{}});
`);
const auth=write('auth.js',`import {user} from './records'; export const auth={currentUser:user,authStateReady:async()=>{},onAuthStateChanged:fn=>{fn(user);return ()=>{};}}; export const db={}; export const useAdminAuth=()=>({user,isAdmin:true,loading:false}); export const useAuth=()=>({user,sessionUser:user,status:'authenticated',isAdmin:true,loading:false}); export const getFirebaseAuthorizationHeader=async()=>({}); export const signOutUser=async()=>{}; export const requireAuth=async()=>user; export const EmailAuthProvider={credential:()=>({})}; export const reauthenticateWithCredential=async()=>{}; export const updatePassword=async()=>{}; export const onAuthStateChanged=(auth,fn)=>auth.onAuthStateChanged(fn); export default function Provider({children}){return children;}`);
const navigation=write('navigation.js',`export const usePathname=()=>location.pathname; const params=new URLSearchParams(location.search); export const useSearchParams=()=>params; export const useRouter=()=>({push:path=>location.href=path,replace:path=>location.href=path,refresh:()=>location.reload()});`);
const link=write('link.jsx',`import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>;}`);
const image=write('image.jsx',`import React from 'react';export default function Image({fill,priority,sizes,quality,unoptimized,loader,placeholder,blurDataURL,src,style,...props}){return <img src={typeof src==='string'?src:src?.src} {...props} style={{...(fill?{position:'absolute',inset:0,width:'100%',height:'100%'}:{}),...style}}/>;}`);
const loader=write('ts-loader.cjs',`module.exports=function(source){return require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source,{compilerOptions:{target:7,module:99,jsx:4,esModuleInterop:true}}).outputText;};`);
const ignore=write('ignore-loader.cjs',`module.exports=()=>'';`);
const sentry=write('sentry.js',`export const captureException=()=>{};export const captureMessage=()=>{};export const setUser=()=>{};`);
const entry=write('entry.jsx',`
import React from 'react';import{createRoot}from'react-dom/client';import{user,products,promotions,customers}from'./records';
import GlobalAmbientBackground from '${root.replace(/\\/g,'/')}/components/GlobalAmbientBackground';
import AdminSidebar from '${root.replace(/\\/g,'/')}/components/admin/AdminSidebar';
import Dashboard from '${root.replace(/\\/g,'/')}/app/admin/(protected)/page';
import Products from '${root.replace(/\\/g,'/')}/app/admin/(protected)/products/page';
import Orders from '${root.replace(/\\/g,'/')}/app/admin/(protected)/orders/page';
import Promotions from '${root.replace(/\\/g,'/')}/app/admin/(protected)/promotions/page';
import Customers from '${root.replace(/\\/g,'/')}/app/admin/(protected)/customers/page';
import Brands from '${root.replace(/\\/g,'/')}/app/admin/(protected)/brands/page';
import Announcements from '${root.replace(/\\/g,'/')}/app/admin/(protected)/announcements/page';
import Messages from '${root.replace(/\\/g,'/')}/app/admin/(protected)/messages/page';
import Testimonials from '${root.replace(/\\/g,'/')}/app/admin/(protected)/testimonials/page';
import Settings from '${root.replace(/\\/g,'/')}/app/admin/(protected)/settings/page';
import Account from '${root.replace(/\\/g,'/')}/app/account/page';
import Security from '${root.replace(/\\/g,'/')}/app/account/security/page';
import History from '${root.replace(/\\/g,'/')}/app/orders/page';
import Checkout from '${root.replace(/\\/g,'/')}/app/checkout/page';
import Shop from '${root.replace(/\\/g,'/')}/app/products/ProductsClient';
import Offers from '${root.replace(/\\/g,'/')}/app/promotions/PromotionsClient';
import Home from '${root.replace(/\\/g,'/')}/app/page';
import {ThemeProvider} from '${root.replace(/\\/g,'/')}/components/ThemeProvider';
import StudioFeedback,{notify,confirmAction}from '${root.replace(/\\/g,'/')}/components/ui/StudioFeedback';
import StudioSelect from '${root.replace(/\\/g,'/')}/components/ui/StudioSelect';
import DateTimePicker from '${root.replace(/\\/g,'/')}/components/admin/DateTimePicker';
import StudioLoading from '${root.replace(/\\/g,'/')}/components/ui/StudioLoading';
import {StudioMotion} from '${root.replace(/\\/g,'/')}/components/ui/StudioMotion';
window.__fixtureCalls=[];const originalFetch=window.fetch;window.fetch=async(url,options={})=>{if(!String(url).includes('/api/'))return originalFetch(url,options);window.__fixtureCalls.push({url:String(url),method:options.method||'GET',body:options.body?JSON.parse(options.body):null}); const state=new URLSearchParams(location.search).get('state');if(state==='loading')return new Promise(()=>{});const empty=state==='empty';const data=String(url).includes('unified')?{bannerPromotions:promotions,productPromotions:promotions}:String(url).includes('customers')?customers:String(url).includes('products')?products:promotions;return {ok:state!=='error',status:state==='error'?500:200,json:async()=>({success:state!=='error',data:empty?[]:options.method==='POST'&&String(url).includes('/products/action')?{id:'fixture-product'}:data,products:empty?[]:products,promotions:empty?[]:promotions,testimonials:[],error:state==='error'?'Unable to load this preview':undefined})};};
localStorage.setItem('gosh_cart',JSON.stringify([{id:'p0',name:'Amber Memory',brand:'GOSH',price:125000,image:products[0].image,qty:1}]));
const routes={'/':Home,'/products':Shop,'/promotions':Offers,'/admin':Dashboard,'/admin/products':Products,'/admin/orders':Orders,'/admin/promotions':Promotions,'/admin/customers':Customers,'/admin/brands':Brands,'/admin/announcements':Announcements,'/admin/messages':Messages,'/admin/testimonials':Testimonials,'/admin/settings':Settings,'/account/security':Security,'/orders':History,'/checkout':Checkout};
function Controls(){const[value,setValue]=React.useState('a'),[date,setDate]=React.useState(new Date());return <main className="p-6 max-w-2xl mx-auto space-y-6"><h1 className="studio-display">Studio controls</h1><StudioSelect label="Fragrance family" value={value} onChange={setValue} options={[{value:'a',label:'Amber'},{value:'b',label:'Floral'},{value:'c',label:'Woody'}]}/><StudioSelect label="Disabled choice" value="a" onChange={()=>{}} disabled options={[{value:'a',label:'Amber'}]}/><DateTimePicker label="Promotion begins" selected={date} onChange={setDate}/><DateTimePicker label="Invalid date" selected={null} onChange={()=>{}} error="Choose a start date"/><input aria-label="Invalid email" aria-invalid="true" defaultValue="avery"/><input aria-label="Disabled field" disabled value="Unavailable" readOnly/><textarea aria-label="Notes" placeholder="Tell us about your scent"/><button className="studio-compact-button" onClick={()=>notify('Saved successfully','success')}>Success toast</button><button className="studio-compact-button" onClick={()=>confirmAction('Remove this sample item?')}>Delete confirmation</button><StudioLoading label="Loading preview" skeleton/></main>}
async function main(){let content;const route=location.pathname;if(route==='/account')content=await Account();else{const Component=route==='/controls'?Controls:routes[route];content=Component?<Component/>:<Controls/>;}createRoot(document.getElementById('root')).render(<ThemeProvider><GlobalAmbientBackground/><div className="site-page-wrapper"><StudioMotion><StudioFeedback>{route.startsWith('/admin')?<div data-admin-theme className="studio-admin min-h-screen bg-canvas"><AdminSidebar/><div className="lg:ml-64 min-w-0">{content}</div></div>:content}</StudioFeedback></StudioMotion></div></ThemeProvider>)}main();
`);
const alias={'@':root,'@sentry/nextjs$':sentry,'firebase/firestore$':firestore,'firebase/auth$':auth,'next/navigation$':navigation,'next/link$':link,'next/image$':image};
for(const name of ['components/admin/AdminAuthProvider','components/auth/AuthProvider','lib/firebase/config','lib/firebase/client-auth','lib/firebase/auth','lib/auth/session']) alias[path.join(root,name)]=auth;
for(const name of ['lib/siteSettings','lib/websiteSettings'])alias[path.join(root,name)]=settings;
webpack({mode:'development',devtool:false,entry,output:{path:output,filename:'review.js'},resolve:{extensions:['.tsx','.ts','.jsx','.js'],modules:[path.join(root,'node_modules'),'node_modules'],alias},module:{rules:[{test:/\.(tsx?|jsx)$/,exclude:/node_modules/,use:loader},{test:/\.css$/,use:ignore}]},optimization:{minimize:false}},(error,stats)=>{
  if(error||stats.hasErrors()){console.error(error||stats.toString({all:false,errors:true}));process.exitCode=1;return;}
  const cssRoot=path.join(root,'.next/static/css');const css=fs.existsSync(cssRoot)?fs.readdirSync(cssRoot,{recursive:true}).filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join(cssRoot,name),'utf8')).join('\n'):'';write('review.css',css+['app/design-system.css','app/studio.css','app/ambient-background.css','app/homepage.css','app/globals-datepicker.css'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n'));
  http.createServer((request,response)=>{const url=new URL(request.url,'http://localhost');let file=url.pathname==='/review.js'||url.pathname==='/review.css'?path.join(output,url.pathname.slice(1)):url.pathname.startsWith('/images/')?path.join(root,'public',url.pathname):null;if(file&&fs.existsSync(file)){response.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'image/jpeg');response.end(fs.readFileSync(file));}else{response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>document.documentElement.classList.toggle("dark",localStorage.getItem("theme")==="dark")</script><link rel="stylesheet" href="/review.css"><body class="relative isolate"><div id="root"></div><script src="/review.js"></script></body></html>');}}).listen(3025,'127.0.0.1',()=>console.log('Isolated fixture review: http://127.0.0.1:3025 (no live database connections)'));
});



