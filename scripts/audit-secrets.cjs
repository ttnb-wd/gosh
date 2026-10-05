/* eslint-disable @typescript-eslint/no-require-imports */
// Report only paths/category/counts, never matched values or source excerpts.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {loadEnvConfig}=require('@next/env');
loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const findings=[];
const serverNames=['FIREBASE_PRIVATE_KEY','IMAGEKIT_PRIVATE_KEY','TURNSTILE_SECRET_KEY','RESEND_API_KEY','SENTRY_AUTH_TOKEN','UPSTASH_REDIS_REST_TOKEN'];
const serverValues=serverNames.filter(k=>process.env[k]?.length>12).map(k=>[k,process.env[k]]);
const patterns=[['private-key-material',/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----[\r\n\\n]+[A-Za-z0-9+/=\r\n\\]{100,}/],['service-account-json',/"type"\s*:\s*"service_account"/],['public-server-secret-env',/NEXT_PUBLIC_\w*(?:PRIVATE_KEY|SECRET_KEY|PASSWORD|AUTH_TOKEN|REST_TOKEN)\b/],['embedded-provider-secret',/(?:sk_live_|rk_live_|ghp_|github_pat_)[A-Za-z0-9_]{20,}/]];
patterns.push(['hardcoded-server-credential', /\b(?:FIREBASE_PRIVATE_KEY|IMAGEKIT_PRIVATE_KEY|TURNSTILE_SECRET_KEY|RESEND_API_KEY|SENTRY_AUTH_TOKEN|UPSTASH_REDIS_REST_TOKEN|SESSION_SECRET|CLIENT_SECRET|DATABASE_PASSWORD)\s*[:=]\s*["']?[A-Za-z0-9_+/=-]{20,}/]);
function scan(name,buffer,checkValues=true){if(buffer.includes(0))return;const text=buffer.toString('utf8');for(const [kind,pattern]of patterns){
 const matches=[...text.matchAll(new RegExp(pattern.source,'g'))];
 if(matches.some(match=>!(kind==='embedded-provider-secret' && /^(.)\1+$/.test(match[0].replace(/^(?:sk_live_|rk_live_|ghp_|github_pat_)/,'')))))findings.push({path:name,kind});
}if(checkValues)for(const [key,value]of serverValues)if(text.includes(value))findings.push({path:name,kind:'literal-server-secret:'+key});}
const tracked=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const worktree=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const file of worktree)if(fs.existsSync(file)&&fs.statSync(file).isFile())scan(file,fs.readFileSync(file));
if(process.argv.includes('--history')){
 const entries=cp.execFileSync('git',['rev-list','--objects','--all'],{encoding:'utf8',maxBuffer:32e6}).trim().split('\n').map(line=>{const i=line.indexOf(' ');return {id:i<0?line:line.slice(0,i),name:i<0?'':line.slice(i+1)}}).filter(e=>e.name&&!/\.(png|jpe?g|gif|webp|woff2|ico|mp4)$/.test(e.name));
 const output=cp.execFileSync('git',['cat-file','--batch'],{input:entries.map(e=>e.id).join('\n')+'\n',maxBuffer:256e6});let pos=0;
 for(const entry of entries){const end=output.indexOf(10,pos);const header=output.toString('ascii',pos,end).split(' ');const size=Number(header[2]);pos=end+1;if(header[1]==='blob')scan('history:'+entry.name+':'+entry.id.slice(0,10),output.subarray(pos,pos+size));pos+=size+1;}
 console.log(JSON.stringify({historyObjectsExamined:entries.length}));
}
let bundleCount=0;
function walk(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(js|json|html|rsc|map)$/.test(file)){bundleCount++;const buffer=fs.readFileSync(file);scan(file,buffer);if(file.includes(path.join('.next','static'))){const text=buffer.toString('utf8');for(const marker of ['FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL','TURNSTILE_SECRET_KEY','BEGIN PRIVATE KEY'])if(text.includes(marker))findings.push({path:file,kind:'client-server-marker:'+marker});if(process.env.FIREBASE_CLIENT_EMAIL&&text.includes(process.env.FIREBASE_CLIENT_EMAIL))findings.push({path:file,kind:'client-service-account-email'});}}}}
if(process.argv.includes('--bundles'))walk('.next');
// Ignore this scanner's own signatures, which intentionally contain markers.
const unique=findings.filter(f=>!f.path.includes('audit-secrets.cjs'));
console.log(JSON.stringify({trackedFiles:tracked.length,worktreeFiles:worktree.length,bundleFiles:bundleCount,findings:unique},null,2));
if(unique.length)process.exitCode=1;
