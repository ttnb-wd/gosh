/* eslint-disable @typescript-eslint/no-require-imports */
// Test-only isolated adapters. Never load .env or connect to real Firebase.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const { NextResponse }=require('next/server');
function fixture(options={}) {
 const data=new Map(Object.entries(options.data||{})); const calls=[]; let sequence=0,lock=Promise.resolve();
 const snap=ref=>({ref,id:ref.id,exists:data.has(ref.path),data:()=>structuredClone(data.get(ref.path))});
 const query=(name,filters=[],maximum=Infinity)=>({kind:'query',name,filters,
   doc:(id)=>ref(name+'/'+(id||'generated-'+(++sequence))),
   where:(field,op,value)=>query(name,[...filters,[field,op,value]],maximum),limit:n=>query(name,filters,n),orderBy:()=>query(name,filters,maximum),
   get:async()=>{ const docs=[...data.keys()].filter(k=>k.startsWith(name+'/')&&k.slice(name.length+1).indexOf('/')<0).map(k=>snap(ref(k))).filter(d=>filters.every(([field,op,value])=>op==='=='?d.data()[field]===value:true)).slice(0,maximum);return {docs,size:docs.length,empty:!docs.length,forEach:fn=>docs.forEach(fn)}; },
   add:async value=>{const r=ref(name+'/generated-'+(++sequence));await r.set(value);return r;},
 });
 const ref=name=>({kind:'doc',path:name,id:name.split('/').at(-1),get:async()=>snap(ref(name)),collection:sub=>query(name+'/'+sub),
   set:async(value,{merge}={})=>{data.set(name,merge?{...data.get(name),...value}:value);calls.push(['set',name]);},
   update:async value=>{data.set(name,{...data.get(name),...value});calls.push(['update',name]);},delete:async()=>{data.delete(name);calls.push(['delete',name]);},
 });
 const adminDb={collection:name=>query(name),runTransaction:async fn=>{
   const previous=lock;let release;lock=new Promise(resolve=>{release=resolve});await previous;
   let writes=false;const pending=[];
   const tx={get:async r=>{if(writes)throw new Error('Firestore transaction read after write');return r.get();},
     update:(r,v)=>{writes=true;pending.push(()=>r.update(v));},set:(r,v)=>{writes=true;pending.push(()=>r.set(v));},
     create:(r,v)=>{writes=true;pending.push(()=>{if(data.has(r.path))throw new Error('Already exists');return r.set(v);});},delete:r=>{writes=true;pending.push(()=>r.delete());}};
   try{const result=await fn(tx);for(const commit of pending)await commit();return result;}finally{release();}
 }};
 const user=options.anonymous?null:{uid:'user-a',email:'a@example.test'};
 const admin=!!options.admin;
 const mocks={ 'server-only':{},'next/server':{NextResponse},
  '@/lib/firebase/admin':{adminDb}, './admin':{adminDb},
  'firebase-admin/firestore':{FieldValue:{serverTimestamp:()=> 'server-time'},Timestamp:{now:()=>({toMillis:()=>Date.now()}),fromDate:d=>({toDate:()=>d})}},
  '@/lib/auth/apiAuth':{getAuthenticatedUser:async()=>user,checkAdminApiAuth:async()=>({user,isAdmin:admin}),requireAdminApiAuth:async()=>{if(!user||!admin)throw new Error('Admin access required');return user;}},
  '@/lib/security/abuse':{limitRequest:async()=>null},
  '@/lib/rateLimit':{checkRateLimit:async()=>({success:!options.rateLimited}),createRateLimitId:()=> 'test',getClientIp:()=> 'test'},
  '@/lib/turnstile':{verifyTurnstileToken:async()=>({success:true})},
  '@/lib/imagekit':{__esModule:true,default:{files:{get:async()=>({filePath:options.filePath||'/gosh/payment-proofs/a.png'})}},
    buildSignedImageKitUrl:()=>options.upstream||'https://ik.imagekit.io/test/gosh/payment-proofs/a.png',deleteImageKitFile:async id=>calls.push(['delete-file',id])},
  '@upstash/redis':{Redis:class{async eval(){if(options.redisFails)throw new Error('PRIVATE PROVIDER DETAIL');return [1,60]}}},
 };
 const cache=new Map();
 function load(file){const absolute=path.resolve(file);if(cache.has(absolute))return cache.get(absolute).exports;
  const loadedModule={exports:{}};cache.set(absolute,loadedModule);
  const customRequire=name=>{if(mocks[name])return mocks[name];if(name.startsWith('@/'))return load(name.slice(2)+'.ts');if(name.startsWith('.'))return load(path.resolve(path.dirname(absolute),name)+'.ts');return require(name);};
  const context=vm.createContext({module:loadedModule,exports:loadedModule.exports,require:customRequire,Buffer,Request,Response,File,FormData,Headers,URL,URLSearchParams,TextDecoder,Uint8Array,AbortSignal,Error,TypeError,
    process:{env:{NODE_ENV:options.production?'production':'test',NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT:'https://ik.imagekit.io/test',...(options.env||{})}},
    console:{log(){},warn(){},error(){}},setInterval:()=>({unref(){}}),Date,
    fetch:async(url,init)=>{calls.push(['fetch',url,init]);return new Response(options.responseBody||'image',{headers:{'content-type':options.contentType||'image/png'}});}});
  const code=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  new vm.Script(code,{filename:absolute}).runInContext(context);return loadedModule.exports;
 }
 return {load,data,calls};
}
function request(body={},url='/api/test',headers={}){return new Request('https://www.goshperfumestudio.com'+url,{method:'POST',headers:{origin:'https://www.goshperfumestudio.com','content-type':'application/json',...headers},body:JSON.stringify(body)});}
module.exports={fixture,request};
