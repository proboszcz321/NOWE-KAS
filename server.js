const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const PORT=process.env.PORT||3000,FILE=path.join(__dirname,'data.json'),U=process.env.UPSTASH_REDIS_REST_URL,UT=process.env.UPSTASH_REDIS_REST_TOKEN;
let db={users:{},sess:{}},dirty=0,pb=0,lbT=0,n=0;
const cmd=async a=>(await(await fetch(U,{method:'POST',headers:{Authorization:'Bearer '+UT},body:JSON.stringify(a)})).json()).result;
async function load(){try{if(U){const r=await cmd(['GET','casino']);if(r)db=JSON.parse(r)}else db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){}db.users=db.users||{};db.sess=db.sess||{}}
async function save(){if(!dirty)return;dirty=0;const s=JSON.stringify(db);try{if(U)await cmd(['SET','casino',s]);else fs.writeFileSync(FILE,s)}catch(e){dirty=1}}
const files={'/':'index.html','/index.html':'index.html','/shim.js':'shim.js'};
const srv=http.createServer((q,r)=>{const f=files[q.url.split('?')[0]];if(!f){r.writeHead(404);return r.end('404')}r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html; charset=utf-8'});fs.createReadStream(path.join(__dirname,f)).pipe(r)});
const wss=new WebSocketServer({server:srv,maxPayload:8192}),conns=new Map();
const send=(w,o)=>w.readyState==1&&w.send(JSON.stringify(o)),all=o=>conns.forEach((c,w)=>c.key&&send(w,o));
const hash=(p,s)=>crypto.scryptSync(p,s,32).toString('hex'),same=(a,b)=>a.length==b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
const num=(v,a,b)=>Math.max(a,Math.min(b,+v||0)),arr=(x,k,l)=>(Array.isArray(x)?x:[]).slice(0,k).map(y=>String(y).slice(0,l));
const clean=s=>{s=s||{};const st=s.stats||{},o={};['wag','won','games','wins','best','streak','maxStreak'].forEach(k=>o[k]=num(st[k],0,1e13));o.played=arr(st.played,40,20);o.ach=arr(st.ach,20,12);
 const bal=num(s.bal,0,1e12);return{bal,peak:Math.max(bal,num(s.peak,0,1e12)),stats:o,fav:arr(s.fav,40,20),th:num(s.th,0,3),day:String(s.day||'').slice(0,20),sk:num(s.sk,0,7),bonus:num(s.bonus,0,1e14)}};
const top=()=>{const on=new Set([...conns.values()].map(c=>c.key));return Object.entries(db.users).map(([id,u])=>({id,nick:u.nick,peak:u.snap.peak,bal:u.snap.bal,best:u.snap.stats.best||0,games:u.snap.stats.games||0,lvl:Math.floor(Math.sqrt((u.snap.stats.wag||0)/400))+1,online:on.has(id)})).sort((a,b)=>b.peak-a.peak).slice(0,50)};
const bp=()=>{if(pb)return;pb=setTimeout(()=>{pb=0;all({t:'peers',list:[...conns.values()].filter(c=>c.key).map(c=>({peer:c.id,presence:c.presence,updatedAt:c.updatedAt}))})},120)};
const bl=()=>{if(lbT)return;lbT=setTimeout(()=>{lbT=0;all({t:'lb',rows:top()})},1500)};
function login(ws,c,key,u,fresh){const token=crypto.randomBytes(24).toString('hex');db.sess[token]=key;c.key=key;c.presence.uid=key;c.presence.nick=u.nick;dirty=1;
 send(ws,{t:'authok',token,nick:u.nick,id:key,snap:u.snap,at:u.t,fresh:!!fresh});send(ws,{t:'lb',rows:top()});bp();bl()}
wss.on('connection',ws=>{const c={id:'p'+(++n),key:null,presence:{},updatedAt:Date.now(),last:0,fails:0};conns.set(ws,c);ws.alive=1;ws.on('pong',()=>ws.alive=1);send(ws,{t:'me',peer:c.id});
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch(e){return}if(!m||typeof m!='object')return;const now=Date.now();
  if(!c.key){if(c.fails>=8)return ws.close();
   if(m.t=='auth'){const k=db.sess[m.token],u=k&&db.users[k];return u?login(ws,c,k,u):send(ws,{t:'autherr',clear:1,msg:'Sesja wygasła – zaloguj się ponownie'})}
   if(m.t!='login'&&m.t!='reg')return;const nk=String(m.nick||'').trim(),key=nk.toLowerCase();
   if(!/^[\p{L}\p{N}_ -]{3,16}$/u.test(nk)||typeof m.pass!='string'||m.pass.length<4||m.pass.length>64){c.fails++;return send(ws,{t:'autherr',msg:'Nick 3–16 znaków, hasło min. 4 znaki'})}
   if(m.t=='reg'){if(db.users[key])return send(ws,{t:'autherr',msg:'Ten nick jest już zajęty'});if(Object.keys(db.users).length>=20000)return send(ws,{t:'autherr',msg:'Rejestracja zamknięta'});
    const salt=crypto.randomBytes(12).toString('hex'),u=db.users[key]={nick:nk,salt,hash:hash(m.pass,salt),snap:clean(m.snap),t:now};return login(ws,c,key,u,1)}
   const u=db.users[key];if(!u||!same(hash(m.pass,u.salt),u.hash)){c.fails++;return send(ws,{t:'autherr',msg:'Zły nick lub hasło'})}return login(ws,c,key,u)}
  if(now-c.last<40)return;c.last=now;const u=db.users[c.key];if(!u)return;
  if(m.t=='p'&&m.patch&&typeof m.patch=='object'){for(const k of Object.keys(m.patch).slice(0,12)){if(k=='uid'||k=='nick')continue;const v=m.patch[k];if(k=='bjs'&&v!==c.presence.bjs)c.updatedAt=now;
    if(v===null)delete c.presence[k];else if(typeof v=='string')c.presence[k]=v.slice(0,40);else if(typeof v=='number'||typeof v=='boolean')c.presence[k]=v}
   if('bjk' in c.presence)c.presence.bjk=u.nick;bp()}
  else if(m.t=='e'&&['bet','win','chat'].includes(m.topic)){const dd=m.data&&typeof m.data=='object'?{...m.data}:{};dd.nick=u.nick;all({t:'ev',topic:m.topic,data:dd,peer:c.id})}
  else if(m.t=='sync'){if(m.from!==u.t)return send(ws,{t:'stale',snap:u.snap,at:u.t});const sn=clean(m.snap);sn.peak=Math.max(sn.peak,u.snap.peak);u.snap=sn;u.t=Date.now();dirty=1;send(ws,{t:'ack',at:u.t});bl()}
  else if(m.t=='out'){delete db.sess[m.token];dirty=1}});
 ws.on('close',()=>{conns.delete(ws);bp();bl()})});
setInterval(()=>{wss.clients.forEach(w=>{if(!w.alive)return w.terminate();w.alive=0;w.ping()});save()},15000);
process.on('SIGTERM',async()=>{dirty=1;await save();process.exit(0)});
load().then(()=>srv.listen(PORT,()=>console.log('Casino na porcie '+PORT+(U?' (Upstash)':' (plik data.json)'))));
