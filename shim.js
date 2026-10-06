(()=>{const S=k=>{try{return localStorage.getItem(k)}catch(e){return null}},W=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let ws,me=null,uid=null,nick='',authed=false,peers=[],pres={},hs={},pcb=[],lbcb=[],rows=[],q=[],tok=S('gfc_tok'),res;const ready=new Promise(r=>res=r);
const J=(k,d)=>{try{return JSON.parse(S(k))||d}catch(e){return d}};
const snap=()=>({bal:S('gfc_bal')==null?10000:+S('gfc_bal'),stats:J('gfc_stats',{}),peak:+S('gfc_peak')||0,fav:J('gfc_fav',[]),th:+S('gfc_th')||0,day:S('gfc_day')||'',sk:+S('gfc_sk')||0,bonus:+S('gfc_bonus')||0});
const apply=(s,nk,at)=>{W('gfc_bal',s.bal);W('gfc_stats',JSON.stringify(s.stats||{}));W('gfc_peak',s.peak||0);W('gfc_fav',JSON.stringify(s.fav||[]));W('gfc_th',s.th||0);W('gfc_day',s.day||'');W('gfc_sk',s.sk||0);W('gfc_bonus',s.bonus||0);W('gfc_nick',nk);W('gfc_acc',nk);W('gfc_at',at);location.reload()};
const raw=o=>ws.readyState==1&&ws.send(JSON.stringify(o)),tx=o=>authed?raw(o):q.length<30&&q.push(o);
const I='width:100%;box-sizing:border-box;margin:5px 0;padding:12px;border-radius:10px;border:1px solid #ffd24a55;background:#0b0b14;color:#fff;font-size:16px',B='padding:12px 18px;border:0;border-radius:12px;background:#ffd24a;color:#241600;font-weight:800;font-size:15px;cursor:pointer;margin:4px';
function ui(msg){let o=document.getElementById('gfc-login');if(!o){o=document.createElement('div');o.id='gfc-login';o.style.cssText='position:fixed;inset:0;z-index:99999;background:#0b0b14f2;display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui';
 o.innerHTML=`<div style="background:#15152b;border:1px solid #ffd24a66;border-radius:22px;padding:24px;max-width:340px;width:100%;color:#eef;text-align:center"><div style="font-size:42px">🎰</div><h2 style="margin:6px 0 4px">Golden Fake Casino</h2><p style="color:#9a9ab8;font-size:13px;margin:0 0 14px">Jedno konto – ta sama gra na każdym urządzeniu</p><input id="gl-n" placeholder="Nick (3–16 znaków)" maxlength="16" style="${I}"><input id="gl-p" type="password" placeholder="Hasło (min. 4 znaki)" style="${I}"><div id="gl-m" style="color:#ff4d67;min-height:20px;font-size:13px"></div><button id="gl-l" style="${B}">Zaloguj</button><button id="gl-r" style="${B};background:#27e08a">Zarejestruj</button></div>`;document.documentElement.append(o);
 const go=t=>()=>{const n=o.querySelector('#gl-n').value,p=o.querySelector('#gl-p').value;raw(t=='reg'?{t,nick:n,pass:p,snap:snap()}:{t,nick:n,pass:p})};o.querySelector('#gl-l').onclick=go('login');o.querySelector('#gl-r').onclick=go('reg');o.querySelector('#gl-p').onkeydown=e=>{if(e.key=='Enter')go('login')()}}
 o.querySelector('#gl-m').textContent=msg||''}
function pill(){if(document.getElementById('gfc-pill'))return;const b=document.createElement('button');b.id='gfc-pill';b.textContent='👤 '+nick+' · wyloguj';b.style.cssText='position:fixed;left:10px;bottom:10px;z-index:90;background:#000a;color:#fff;border:1px solid #ffffff33;border-radius:999px;padding:7px 12px;font-size:12px;cursor:pointer';
 b.onclick=()=>{if(!confirm('Wylogować?'))return;raw({t:'out',token:tok});['gfc_tok','gfc_acc','gfc_at'].forEach(k=>{try{localStorage.removeItem(k)}catch(e){}});location.reload()};document.documentElement.append(b)}
function conn(){ws=new WebSocket((location.protocol=='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>{if(tok)raw({t:'auth',token:tok});else ui()};
 ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}
  if(m.t=='me')me=m.peer;
  else if(m.t=='authok'){tok=m.token;W('gfc_tok',tok);nick=m.nick;uid=m.id;
   if(m.fresh){W('gfc_acc',nick);W('gfc_at',m.at);W('gfc_nick',nick)}else if(S('gfc_acc')!==nick||m.at>(+S('gfc_at')||0))return apply(m.snap,nick,m.at);
   authed=true;const o=document.getElementById('gfc-login');if(o)o.remove();pill();raw({t:'p',patch:pres});q.splice(0).forEach(raw);res(uid)}
  else if(m.t=='autherr'){if(m.clear){tok=null;try{localStorage.removeItem('gfc_tok')}catch(x){}}ui(m.msg)}
  else if(m.t=='stale')apply(m.snap,nick,m.at);
  else if(m.t=='ack')W('gfc_at',m.at);
  else if(m.t=='peers'){peers=m.list.map(p=>({peer:p.peer,isMe:p.peer===me,by:null,sameTab:p.peer===me,kind:'viewer',guest:false,presence:p.presence||{},updatedAt:p.updatedAt}));pcb.forEach(f=>f({peers,joined:[],left:[],updated:[]}))}
  else if(m.t=='ev')(hs[m.topic]||[]).forEach(f=>f({topic:m.topic,data:m.data,peer:m.peer,isMe:m.peer===me,by:null,sameTab:m.peer===me,kind:'viewer',guest:false}));
  else if(m.t=='lb'){rows=m.rows;lbcb.forEach(f=>f())}};
 ws.onclose=()=>{authed=false;setTimeout(conn,2000)}}
conn();
const sync=()=>{if(authed)raw({t:'sync',from:+S('gfc_at')||0,snap:snap()})};setInterval(sync,10000);addEventListener('pagehide',sync);document.addEventListener('visibilitychange',()=>{if(document.hidden)sync()});
const room={emit:async(t,d)=>tx({t:'e',topic:t,data:d}),on:(t,f)=>{(hs[t]=hs[t]||[]).push(f);return()=>{hs[t]=(hs[t]||[]).filter(x=>x!==f)}},
 presence:async p=>{for(const k in p){if(p[k]===null)delete pres[k];else pres[k]=p[k]}tx({t:'p',patch:p})},peers:()=>peers,onPeers:f=>{pcb.push(f);return()=>{pcb=pcb.filter(x=>x!==f)}}};
const db={collection:()=>({orderBy:()=>({limit:()=>({onSnapshot:next=>{const f=()=>next({docs:rows.map(r=>({id:r.id,data:()=>r}))});lbcb.push(f);f();return()=>{lbcb=lbcb.filter(x=>x!==f)}}})}),doc:()=>({set:async()=>{}})})};
const user={id:async()=>{await ready;return uid},me:async()=>{await ready;return{id:uid,name:nick,avatarUrl:'',color:'#ffd24a',email:null,isOwner:false,canEdit:false}}};
window.claude={use:async n=>({room,db,user})[n]||null};
const st=document.createElement('style');st.textContent='#nin,#nsv{display:none!important}';document.documentElement.append(st)})();
