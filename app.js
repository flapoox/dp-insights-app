/* Dashboard renderer (same as the Google dashboard). Expects window.DP_DATA. */

const DATA = window.DP_DATA;
(function(){
const $ = (s,el=document)=>el.querySelector(s);
const css = v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const inr = n=>'₹'+Math.round(n).toLocaleString('en-IN');
const inr2 = n=>'₹'+Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const num = n=>Math.round(n).toLocaleString('en-IN');
const compact = n=>{n=Math.round(n);if(n>=1e7)return(n/1e7).toFixed(2)+' Cr';if(n>=1e5)return(n/1e5).toFixed(1)+' L';if(n>=1e3)return(n/1e3).toFixed(1)+'K';return String(n)};
const pct = (n,d=1)=>n.toFixed(d)+'%';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const dlabel = d=>d.getDate()+' '+MON[d.getMonth()];
const esc = s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toDate = s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
const ymd = d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

/* ---------- data ---------- */
const byDate = {}; (DATA.daily||[]).forEach(r=>{ if(r.date) byDate[String(r.date).slice(0,10)] = r; });
const dates = Object.keys(byDate).sort();
const KEYS = ['fb_reach','fb_views','fb_engagements','fb_new_follows','fb_followers','ig_reach','ig_views','ig_engaged','ig_interactions','ig_profile_views','ig_link_taps','ig_follows','ig_unfollows','ig_followers','ad_spend','ad_impressions','ad_reach','ad_clicks','ad_link_clicks','ad_leads'];
// continuous series of 180 days ending at the latest synced day (yesterday)
const END = dates.length ? toDate(dates[dates.length-1]) : new Date();
const DAYS = 180, days = [];
for(let i=DAYS-1;i>=0;i--){ const d=new Date(END); d.setDate(END.getDate()-i);
  const src = byDate[ymd(d)]||{}; const o={d};
  KEYS.forEach(k=>{ const v=src[k]; o[k] = (v===null||v===undefined||v==='')?null:Number(v); }); days.push(o); }

const state={tab:'overview',range:30,yt:'all'};
try{const s=JSON.parse(localStorage.getItem('dpi-live')||'{}');if(s.tab)state.tab=s.tab;if(s.range)state.range=s.range;if(s.yt)state.yt=s.yt}catch(e){}
const save=()=>{try{localStorage.setItem('dpi-live',JSON.stringify(state))}catch(e){}};

function slice(n,offset=0){return days.slice(DAYS-n*(offset+1),DAYS-n*offset)}
const has=(a,k)=>a.some(r=>r[k]!=null);
const sum=(a,k)=>a.reduce((s,x)=>s+(x[k]||0),0);
const S=(a,k)=>has(a,k)?sum(a,k):null;
const lastVal=(a,k)=>{for(let i=a.length-1;i>=0;i--) if(a[i][k]!=null) return a[i][k]; return null};
const div=(a,b)=>(a==null||b==null||!b)?null:a/b;
const FOLLOW_KEYS=['fb_followers','ig_followers'];
function groupWeeks(rows){
  const out=[];for(let i=0;i<rows.length;i+=7){const ch=rows.slice(i,i+7);const o={d:ch[0].d};
    KEYS.forEach(k=>o[k]=FOLLOW_KEYS.includes(k)?lastVal(ch,k):S(ch,k));out.push(o)}return out;
}
const buckets=()=>{const c=slice(state.range);return c.length>30?groupWeeks(c):c};
const per=()=>state.range>30?'week':'day';

function delta(cur,prev,invert=false){
  if(cur==null||prev==null||!prev) return '<span class="delta flat">No earlier data to compare</span>';
  const ch=(cur-prev)/Math.abs(prev)*100, good=invert?ch<0:ch>0;
  const cls=Math.abs(ch)<0.5?'flat':good?'up':'down';
  return `<span class="delta ${cls}">${ch>0?'▲':'▼'} ${Math.abs(ch).toFixed(1)}% <span style="color:var(--muted);font-weight:400">vs prev ${state.range}d</span></span>`;
}
function kpi(label,cur,prev,fmt,sparkVals,color,invert){
  const vals=(sparkVals||[]).map(v=>v==null?0:v);
  return `<div class="kpi"><div class="lbl"><span class="sw" style="background:${color}"></span>${label}</div>
    <div class="val">${cur==null?'—':fmt(cur)}</div>${cur==null?'<span class="delta flat">Not available yet</span>':delta(cur,prev,invert)}${vals.length>1&&cur!=null?spark(vals,color):''}</div>`;
}
const empty=(msg)=>`<p class="sub" style="margin:0;padding-block:24px;text-align:center">${msg}</p>`;

/* ---------- chart primitives ---------- */
function spark(values,color){
  const w=200,h=34,mn=Math.min(...values),mx=Math.max(...values),r=mx-mn||1;
  const pts=values.map((v,i)=>[i/(values.length-1)*w,h-3-(v-mn)/r*(h-8)]);
  const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join('');
  const last=pts[pts.length-1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:34px" aria-hidden="true">
    <path d="${line} L${w} ${h} L0 ${h}Z" fill="${color}" opacity=".12"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="${color}"/></svg>`;
}
function niceMax(v){const e=Math.pow(10,Math.floor(Math.log10(v||1)));const f=v/e;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function axisTicks(max){const m=niceMax(max);return[0,m/4,m/2,m*3/4,m].map(v=>({v,m}))}

function lineChart(host,rows,series,fmt,opts={}){
  const W=720,H=opts.h||240,P={l:52,r:14,t:10,b:26};
  const iw=W-P.l-P.r, ih=H-P.t-P.b;
  const max=niceMax(Math.max(...series.flatMap(s=>rows.map(r=>s.get(r)))));
  const x=i=>P.l+(rows.length===1?iw/2:i/(rows.length-1)*iw), y=v=>P.t+ih-v/max*ih;
  const ticks=[0,.25,.5,.75,1].map(f=>f*max);
  const step=Math.max(1,Math.ceil(rows.length/6));
  let g=ticks.map(t=>`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${P.l-8}" y="${y(t)+3.5}" text-anchor="end">${compact(t)}</text>`).join('');
  g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--axis)"/>`;
  rows.forEach((r,i)=>{if(i%step===0||i===rows.length-1&&rows.length<10)g+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle">${dlabel(r.d)}</text>`});
  series.forEach(s=>{
    const d=rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(s.get(r)).toFixed(1)).join('');
    if(opts.area) g+=`<path d="${d} L${x(rows.length-1)} ${y(0)} L${x(0)} ${y(0)}Z" fill="${s.color}" opacity=".10"/>`;
    g+=`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    const li=rows.length-1;
    g+=`<circle cx="${x(li)}" cy="${y(s.get(rows[li]))}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
  });
  g+=`<line class="xh" y1="${P.t}" y2="${P.t+ih}" stroke="var(--ink-2)" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>`;
  g+=series.map((s,k)=>`<circle class="hd hd${k}" r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`).join('');
  g+=`<rect class="hit" x="${P.l}" y="${P.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
  host.innerHTML=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label||''}">${g}</svg><div class="tip" hidden></div></div>`;
  const svg=host.querySelector('svg'),tip=host.querySelector('.tip'),xh=svg.querySelector('.xh');
  const move=e=>{
    const b=svg.getBoundingClientRect(),sx=(e.clientX-b.left)/b.width*W;
    const i=Math.max(0,Math.min(rows.length-1,Math.round((sx-P.l)/iw*(rows.length-1))));
    xh.setAttribute('x1',x(i));xh.setAttribute('x2',x(i));xh.setAttribute('visibility','visible');
    series.forEach((s,k)=>{const c=svg.querySelector('.hd'+k);c.setAttribute('cx',x(i));c.setAttribute('cy',y(s.get(rows[i])));c.setAttribute('visibility','visible')});
    tip.innerHTML=`<b>${dlabel(rows[i].d)} ${rows[i].d.getFullYear()}</b>`+series.map(s=>`<div class="row"><span class="sw" style="background:${s.color}"></span>${s.name}: <b>${fmt(s.get(rows[i]))}</b></div>`).join('');
    tip.hidden=false;
    const top=Math.min(...series.map(s=>y(s.get(rows[i]))));
    let left=x(i)/W*b.width; left=Math.max(80,Math.min(b.width-80,left));
    tip.style.left=left+'px';tip.style.top=(top/H*b.height)+'px';
  };
  const leave=()=>{tip.hidden=true;xh.setAttribute('visibility','hidden');svg.querySelectorAll('.hd').forEach(c=>c.setAttribute('visibility','hidden'))};
  svg.addEventListener('pointermove',move);svg.addEventListener('pointerleave',leave);
}

function barChart(host,rows,get,color,fmt,opts={}){
  const W=720,H=opts.h||220,P={l:52,r:14,t:10,b:26};
  const iw=W-P.l-P.r, ih=H-P.t-P.b, n=rows.length;
  const max=niceMax(Math.max(...rows.map(get)));
  const bw=iw/n, gap=Math.min(2,bw*0.25), w=Math.max(1,bw-gap);
  const y=v=>P.t+ih-v/max*ih;
  const step=Math.max(1,Math.ceil(n/6));
  let g=[0,.25,.5,.75,1].map(f=>f*max).map(t=>`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${P.l-8}" y="${y(t)+3.5}" text-anchor="end">${opts.tick?opts.tick(t):compact(t)}</text>`).join('');
  const r=Math.min(4,w/2);
  rows.forEach((row,i)=>{
    const v=get(row), x0=P.l+i*bw+gap/2, y0=y(v), h=P.t+ih-y0;
    const rr=Math.min(r,h);
    g+=`<path class="b" data-i="${i}" d="M${x0} ${P.t+ih} V${y0+rr} Q${x0} ${y0} ${x0+rr} ${y0} H${x0+w-rr} Q${x0+w} ${y0} ${x0+w} ${y0+rr} V${P.t+ih}Z" fill="${color}"/>`;
    if(i%step===0) g+=`<text x="${x0+w/2}" y="${H-6}" text-anchor="middle">${dlabel(row.d)}</text>`;
  });
  g+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(0)}" y2="${y(0)}" stroke="var(--axis)"/>`;
  g+=`<rect class="hit" x="${P.l}" y="${P.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
  host.innerHTML=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label||''}">${g}</svg><div class="tip" hidden></div></div>`;
  const svg=host.querySelector('svg'),tip=host.querySelector('.tip'),bars=[...svg.querySelectorAll('.b')];
  svg.addEventListener('pointermove',e=>{
    const b=svg.getBoundingClientRect(),sx=(e.clientX-b.left)/b.width*W;
    const i=Math.max(0,Math.min(n-1,Math.floor((sx-P.l)/bw)));
    bars.forEach((el,k)=>el.setAttribute('opacity',k===i?1:.45));
    tip.innerHTML=`<b>${dlabel(rows[i].d)}</b><div>${opts.name||''}: <b>${fmt(get(rows[i]))}</b></div>`;tip.hidden=false;
    let left=(P.l+i*bw+bw/2)/W*b.width;left=Math.max(70,Math.min(b.width-70,left));
    tip.style.left=left+'px';tip.style.top=(y(get(rows[i]))/H*b.height)+'px';
  });
  svg.addEventListener('pointerleave',()=>{tip.hidden=true;bars.forEach(el=>el.setAttribute('opacity',1))});
}



/* ---------- views ---------- */
function overview(){
  const c=slice(state.range),p=slice(state.range,1),w=buckets();
  const reachOf=a=>{const x=S(a,'ig_reach'),y=S(a,'fb_reach');return x==null&&y==null?null:(x||0)+(y||0)};
  const engOf=a=>{const x=S(a,'ig_interactions'),y=S(a,'fb_engagements');return x==null&&y==null?null:(x||0)+(y||0)};
  const folOf=a=>{const f=S(a,'fb_new_follows'),i=S(a,'ig_follows'),u=S(a,'ig_unfollows');return f==null&&i==null?null:(f||0)+(i||0)-(u||0)};
  const spend=S(c,'ad_spend'),leads=S(c,'ad_leads'),pSpend=S(p,'ad_spend'),pLeads=S(p,'ad_leads');
  const cpl=leads?spend/leads:null, pcpl=pLeads?pSpend/pLeads:null;
  const igR=S(c,'ig_reach'),fbR=S(c,'fb_reach');
  const from=c[0].d, inP=(DATA.posts||[]).filter(x=>x.date&&toDate(x.date)>=from&&x.reach!=null).sort((a,b)=>b.reach-a.reach);
  const best=inP[0];
  const bestDay=has(c,'ad_leads')?c.reduce((a,b)=>(b.ad_leads||0)>(a.ad_leads||0)?b:a):null;
  const ins=[];
  if(igR!=null&&fbR!=null&&igR+fbR>0) ins.push(['i',`Instagram delivers <b>${(igR/(igR+fbR)*100).toFixed(0)}%</b> of organic reach; Facebook ${(fbR/(igR+fbR)*100).toFixed(0)}%.`]);
  if(best) ins.push(['g',`Top post: <b>${esc(best.text||'(no caption)')}</b> (${best.format}, ${best.platform}) reached ${compact(best.reach)} accounts.`]);
  if(cpl!=null&&pcpl!=null) ins.push([cpl<=pcpl?'g':'w',`Cost per lead ${cpl<=pcpl?'fell':'rose'} to <b>${inr2(cpl)}</b> from ${inr2(pcpl)} in the previous ${state.range} days.`]);
  if(bestDay&&bestDay.ad_leads) ins.push(['i',`Best lead day: <b>${dlabel(bestDay.d)}</b> with ${num(bestDay.ad_leads)} leads on ${inr(bestDay.ad_spend||0)} spend.`]);
  const igF=lastVal(c,'ig_followers'),fbF=lastVal(c,'fb_followers');
  if(igF!=null||fbF!=null) ins.push(['i',`Followers now: Instagram <b>${igF!=null?num(igF):'—'}</b>, Facebook Page <b>${fbF!=null?num(fbF):'—'}</b>.`]);
  return `
  <div class="grid kpis">
    ${kpi('Total reach (FB + IG)',reachOf(c),reachOf(p),compact,w.map(r=>(r.ig_reach||0)+(r.fb_reach||0)),'var(--accent)')}
    ${kpi('Engagements',engOf(c),engOf(p),compact,w.map(r=>(r.ig_interactions||0)+(r.fb_engagements||0)),'var(--accent)')}
    ${kpi('Net followers gained',folOf(c),folOf(p),num,w.map(r=>(r.fb_new_follows||0)+(r.ig_follows||0)-(r.ig_unfollows||0)),'var(--accent)')}
    ${kpi('Ad spend',spend,pSpend,inr,w.map(r=>r.ad_spend),'var(--ads)')}
    ${kpi('Leads from ads',leads,pLeads,num,w.map(r=>r.ad_leads),'var(--ads)')}
    ${kpi('Cost per lead',cpl,pcpl,inr2,w.map(r=>r.ad_leads?r.ad_spend/r.ad_leads:null),'var(--ads)',true)}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Organic reach by platform</h2><p class="sub">Accounts reached per ${per()}</p>
      <div class="legend"><span><i class="sw" style="background:var(--ig)"></i>Instagram</span><span><i class="sw" style="background:var(--fb)"></i>Facebook</span></div>
      <div id="ovReach"></div></section>
    <section class="panel"><h2>What changed this period</h2><p class="sub">Worked out from the numbers on this page</p>
      ${ins.length?`<ul class="insights">${ins.map(x=>`<li><span class="ic ${x[0]}">${x[0]==='g'?'↑':x[0]==='w'?'!':'i'}</span><span>${x[1]}</span></li>`).join('')}</ul>`:empty('Not enough data yet.')}</section>
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Ad spend</h2><p class="sub">₹ per ${per()}</p><div id="ovSpend"></div></section>
    <section class="panel"><h2>Leads</h2><p class="sub">Leads per ${per()}</p><div id="ovLeads"></div></section>
  </div>`;
}
function afterOverview(){
  const rows=buckets(), c=slice(state.range);
  if(has(c,'ig_reach')||has(c,'fb_reach')) lineChart($('#ovReach'),rows,[{name:'Instagram',color:css('--ig'),get:r=>r.ig_reach||0},{name:'Facebook',color:css('--fb'),get:r=>r.fb_reach||0}],num,{label:'Organic reach by platform'});
  else $('#ovReach').innerHTML=empty('No reach data yet.');
  if(has(c,'ad_spend')) barChart($('#ovSpend'),rows,r=>r.ad_spend||0,css('--ads'),inr,{name:'Spend',tick:v=>'₹'+compact(v),label:'Ad spend'}); else $('#ovSpend').innerHTML=empty('No ad spend in this period.');
  if(has(c,'ad_leads')&&S(c,'ad_leads')>0) barChart($('#ovLeads'),rows,r=>r.ad_leads||0,css('--ads'),num,{name:'Leads',label:'Leads'}); else $('#ovLeads').innerHTML=empty('No leads recorded in this period.');
}

function platform(which){
  const ig=which==='ig', c=slice(state.range),p=slice(state.range,1),w=buckets();
  const K=ig?{reach:'ig_reach',views:'ig_views',eng:'ig_interactions',F:'ig_followers'}:{reach:'fb_reach',views:'fb_views',eng:'fb_engagements',F:'fb_followers'};
  const color=ig?'var(--ig)':'var(--fb)';
  const net=a=>ig?(has(a,'ig_follows')?S(a,'ig_follows')-(S(a,'ig_unfollows')||0):null):S(a,'fb_new_follows');
  const er=a=>{const e=S(a,K.eng),r=S(a,K.reach);return e!=null&&r?e/r*100:null};
  const posts=(DATA.posts||[]).filter(x=>x.platform===(ig?'Instagram':'Facebook'));
  return `
  <div class="grid kpis k4">
    ${kpi('Followers',lastVal(c,K.F),null,num,[],color)}
    ${kpi(ig?'New follows':'New Page follows',net(c),net(p),num,w.map(r=>ig?(r.ig_follows||0)-(r.ig_unfollows||0):r.fb_new_follows),color)}
    ${kpi('Accounts reached',S(c,K.reach),S(p,K.reach),compact,w.map(r=>r[K.reach]),color)}
    ${kpi('Views',S(c,K.views),S(p,K.views),compact,w.map(r=>r[K.views]),color)}
    ${kpi(ig?'Interactions':'Engagements',S(c,K.eng),S(p,K.eng),compact,w.map(r=>r[K.eng]),color)}
    ${kpi('Engagement rate (by reach)',er(c),er(p),v=>pct(v,2),w.map(r=>r[K.reach]?(r[K.eng]||0)/r[K.reach]*100:null),color)}
    ${ig?kpi('Profile visits',S(c,'ig_profile_views'),S(p,'ig_profile_views'),compact,w.map(r=>r.ig_profile_views),color):''}
    ${ig?kpi('Link-in-bio taps',S(c,'ig_link_taps'),S(p,'ig_link_taps'),num,w.map(r=>r.ig_link_taps),color):''}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Reach and views</h2><p class="sub">Per ${per()}</p>
      <div class="legend"><span><i class="sw" style="background:${color}"></i>Views</span><span><i class="sw" style="background:var(--ink-2)"></i>Accounts reached</span></div>
      <div id="plReach"></div></section>
    <section class="panel"><h2>Follower count</h2><p class="sub">Recorded once a day from the day sync started</p><div id="plFol"></div></section>
  </div>
  <div class="section-title">Top ${ig?'Instagram':'Facebook'} posts · click to open</div>
  ${postCards(posts.filter(x=>x.date&&String(x.date).slice(0,10)>=ymd(c[0].d)).sort((a,b)=>(+b.reach||0)-(+a.reach||0)).slice(0,4))}
  <div class="section-title">${ig?'Instagram':'Facebook'} posts in this period · click a column to sort</div>
  <section class="panel">${postTable(posts)}</section>`;
}
function afterPlatform(which){
  const ig=which==='ig', rows=buckets(), c=slice(state.range), col=css(ig?'--ig':'--fb');
  const rk=ig?'ig_reach':'fb_reach', vk=ig?'ig_views':'fb_views', fk=ig?'ig_followers':'fb_followers';
  if(has(c,rk)||has(c,vk)) lineChart($('#plReach'),rows,[{name:'Views',color:col,get:r=>r[vk]||0},{name:'Reached',color:css('--ink-2'),get:r=>r[rk]||0}],num,{label:'Reach and views'});
  else $('#plReach').innerHTML=empty('No data yet.');
  const fr=c.filter(r=>r[fk]!=null);
  if(fr.length>1) lineChart($('#plFol'),fr,[{name:'Followers',color:col,get:r=>r[fk]}],num,{area:true,label:'Follower count'});
  else $('#plFol').innerHTML=empty(fr.length?`${num(fr[0][fk])} followers. The trend line appears after a few days of nightly sync.`:'Recorded from the first sync onwards.');
  bindSort();
}

function oldAds(){
  const c=slice(state.range),p=slice(state.range,1),w=buckets();
  const s=S(c,'ad_spend'),i=S(c,'ad_impressions'),cl=S(c,'ad_link_clicks'),l=S(c,'ad_leads');
  const ps=S(p,'ad_spend'),pi=S(p,'ad_impressions'),pcl=S(p,'ad_link_clicks'),pl=S(p,'ad_leads');
  const from=ymd(c[0].d), to=ymd(c[c.length-1].d);
  const agg={};
  (DATA.campaigns||[]).forEach(r=>{const d=String(r.date).slice(0,10); if(d<from||d>to) return;
    const a=agg[r.campaign_id]=agg[r.campaign_id]||{name:r.campaign_name,obj:r.objective,sp:0,im:0,rc:0,ck:0,ld:0};
    a.sp+=+r.spend||0;a.im+=+r.impressions||0;a.rc+=+r.reach||0;a.ck+=+r.link_clicks||0;a.ld+=+r.leads||0;});
  const rows=Object.values(agg).sort((a,b)=>b.sp-a.sp);
  const cplAvg=l?s/l:null;
  return `
  <div class="grid kpis k4">
    ${kpi('Amount spent',s,ps,inr,w.map(r=>r.ad_spend),'var(--ads)')}
    ${kpi('Impressions',i,pi,compact,w.map(r=>r.ad_impressions),'var(--ads)')}
    ${kpi('Link clicks',cl,pcl,num,w.map(r=>r.ad_link_clicks),'var(--ads)')}
    ${kpi('CTR (link)',div(cl,i)!=null?cl/i*100:null,div(pcl,pi)!=null?pcl/pi*100:null,v=>pct(v,2),w.map(r=>r.ad_impressions?(r.ad_link_clicks||0)/r.ad_impressions*100:null),'var(--ads)')}
    ${kpi('CPM',div(s,i)!=null?s/i*1000:null,div(ps,pi)!=null?ps/pi*1000:null,inr2,w.map(r=>r.ad_impressions?r.ad_spend/r.ad_impressions*1000:null),'var(--ads)',true)}
    ${kpi('Leads',l,pl,num,w.map(r=>r.ad_leads),'var(--ads)')}
    ${kpi('Cost per lead',l?s/l:null,pl?ps/pl:null,inr2,w.map(r=>r.ad_leads?r.ad_spend/r.ad_leads:null),'var(--ads)',true)}
    ${kpi('Cost per link click',cl?s/cl:null,pcl?ps/pcl:null,inr2,w.map(r=>r.ad_link_clicks?r.ad_spend/r.ad_link_clicks:null),'var(--ads)',true)}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Cost per lead</h2><p class="sub">₹ per lead, per ${per()}</p><div id="adCpl"></div></section>
    <section class="panel"><h2>Link clicks</h2><p class="sub">Per ${per()}</p><div id="adClicks"></div></section>
  </div>
  <div class="section-title">Campaigns in this period</div>
  <section class="panel">${rows.length?`<div class="tbl-wrap"><table>
    <thead><tr><th>Campaign</th><th>Objective</th><th>Spend</th><th>Impr.</th><th>CPM</th><th>Link clicks</th><th>CTR</th><th>CPC</th><th>Leads</th><th>CPL</th><th>Health</th></tr></thead>
    <tbody>${rows.map(r=>{const cpl=r.ld?r.sp/r.ld:null;
      const st=cplAvg&&cpl&&cpl>cplAvg*1.15?['s-bad','CPL above avg']:r.sp>0&&r.ck===0?['s-warn','No link clicks']:['s-good','On track'];
      return `<tr><td>${esc(r.name)}</td><td><span class="pill">${esc(r.obj)}</span></td><td>${inr(r.sp)}</td><td>${compact(r.im)}</td><td>${r.im?inr2(r.sp/r.im*1000):'—'}</td><td>${num(r.ck)}</td><td>${r.im?pct(r.ck/r.im*100,2):'—'}</td><td>${r.ck?inr2(r.sp/r.ck):'—'}</td><td>${r.ld?num(r.ld):'—'}</td><td>${cpl?inr2(cpl):'—'}</td><td><span class="status ${st[0]}">${st[1]}</span></td></tr>`}).join('')}
    </tbody></table></div>
    <p class="sub" style="margin:10px 0 0">Health flags: CPL more than 15% above the account average, or spend with no link clicks.</p>`:empty('No campaigns ran in this period.')}</section>`;
}
/* ---------- Meta Ads: scorecard, suggestions, campaigns, ad previews, actions ---------- */
const SET=DATA.settings||{};
const META={};(DATA.adsMeta||[]).forEach(m=>META[m.ad_id]=m);
const numv=v=>v==null||v===''?0:Number(v)||0;
function adRows(win){return (DATA.adStats||[]).filter(r=>String(r.window)===String(win)).map(r=>{
  const m=META[r.ad_id]||{};return Object.assign({},r,{spend:numv(r.spend),impressions:numv(r.impressions),reach:numv(r.reach),frequency:numv(r.frequency),
  link_clicks:numv(r.link_clicks),results:numv(r.results),value:numv(r.value),purchases:numv(r.purchases),leads:numv(r.leads),m});});}
function roll(rows){const t={spend:0,impressions:0,link_clicks:0,results:0,value:0,purchases:0,leads:0,freqW:0,byType:{}};
  rows.forEach(r=>{t.spend+=r.spend;t.impressions+=r.impressions;t.link_clicks+=r.link_clicks;t.value+=r.value;t.purchases+=r.purchases;t.leads+=r.leads;t.freqW+=r.frequency*r.impressions;
    const b=t.byType[r.result_type]=t.byType[r.result_type]||{spend:0,n:0};b.spend+=r.spend;b.n+=r.results;});
  const main=Object.entries(t.byType).sort((a,b)=>((b[1].n>0)-(a[1].n>0))||b[1].spend-a[1].spend)[0]; // prefer a result type that actually has results
  t.type=main?main[0]:'Results';t.results=main?main[1].n:0;t.typeSpend=main?main[1].spend:0;
  t.cpr=t.results?t.typeSpend/t.results:null;t.ctr=t.impressions?t.link_clicks/t.impressions*100:null;
  t.cpm=t.impressions?t.spend/t.impressions*1000:null;t.cpc=t.link_clicks?t.spend/t.link_clicks:null;t.freq=t.impressions?t.freqW/t.impressions:null;
  t.roas=t.value&&t.spend?t.value/t.spend:null;t.estRoas=!t.roas&&SET.leadValue&&t.leads&&t.spend?t.leads*SET.leadValue/t.spend:null;
  return t;}
function groupBy(rows,key){const g={};rows.forEach(r=>(g[r[key]]=g[r[key]]||[]).push(r));return g;}
const budgetOf=m=>{const a=m.adset_budget,c=m.campaign_budget;
  if(c!==''&&c!=null&&!String(c).startsWith('L')) return {id:m.campaign_id,level:'campaign',v:Number(c)};
  if(a!==''&&a!=null&&!String(a).startsWith('L')) return {id:m.adset_id,level:'ad set',v:Number(a)};return null;};
const isOn=s=>String(s||'').toUpperCase()==='ACTIVE';
const typeShort=t=>({'Leads':'lead','Purchases':'purchase','Chats started':'chat','Landing page views':'page view','Link clicks':'click','Engagements':'engagement','Video views':'view','People reached':'person reached','App installs':'install'}[t]||'result');
const typePlural=t=>({'People reached':'people reached'}[t]||typeShort(t)+'s');
function btn(label,a,cls){return `<button type="button" class="abtn ${cls||''}" data-act="${esc(JSON.stringify(a))}">${label}</button>`;}

function adsModel(){
  const w=String(state.range),cur=adRows(w),prev=adRows('p'+w);
  const T=roll(cur),P=roll(prev);
  const camps=Object.entries(groupBy(cur,'campaign_id')).map(([id,rs])=>{const t=roll(rs),m=rs[0].m||{};
    const pt=roll(prev.filter(r=>r.campaign_id===id));
    return Object.assign(t,{id,name:m.campaign_name||'Campaign '+id,status:m.campaign_status,objective:m.objective,budget:budgetOf(m),prev:pt,ads:rs.length});}).sort((a,b)=>b.spend-a.spend);
  const ads=cur.map(r=>{const t=roll([r]);const p=prev.find(x=>x.ad_id===r.ad_id);const pt=p?roll([p]):null;
    return Object.assign(t,{id:r.ad_id,m:r.m,name:r.m.ad_name||'Ad '+r.ad_id,status:r.m.status,eff:r.m.effective_status,prevCtr:pt?pt.ctr:null});}).sort((a,b)=>b.spend-a.spend);
  // ads that are live but had no spend in this window
  Object.values(META).forEach(m=>{if(isOn(m.effective_status)&&!ads.some(a=>a.id===m.ad_id)) ads.push(Object.assign(roll([]),{id:m.ad_id,m,name:m.ad_name,status:m.status,eff:m.effective_status,prevCtr:null,idle:true}));});
  const avg=T.cpr;
  const cnt={};camps.forEach(c=>cnt[c.type]=(cnt[c.type]||0)+1);const acnt={};ads.forEach(a=>{if(!a.idle)acnt[a.type]=(acnt[a.type]||0)+1});
  const avgC=t=>cnt[t]>1&&T.byType[t]&&T.byType[t].n?T.byType[t].spend/T.byType[t].n:null;   // compare campaigns only within the same result type
  const avgA=t=>acnt[t]>1&&T.byType[t]&&T.byType[t].n?T.byType[t].spend/T.byType[t].n:null;
  ads.forEach(a=>{const avg=avgA(a.type);
    const enough=a.spend>=Math.max(200,(avg||300)*1.5);
    a.tag=a.idle?['Idle','t-watch','Live but no spend in this period']
      :a.results>=3&&avg&&a.cpr<=avg*0.8?['Winner','t-win',`${Math.round((1-a.cpr/avg)*100)}% cheaper per ${typeShort(a.type)} than average`]
      :enough&&!a.results&&a.type!=='People reached'?['Pause','t-bad',`Spent ${inr(a.spend)} with no ${typePlural(a.type)}`]
      :enough&&avg&&a.cpr>=avg*1.6?['Pause','t-bad',`${Math.round((a.cpr/avg-1)*100)}% costlier than average`]
      :a.impressions>1000&&a.ctr!=null&&a.ctr<0.6?['Fix','t-warn','Very few people click: try a new hook or visual']
      :a.freq>3.5?['Watch','t-watch','Same people seeing it too often']
      :a.spend<100?['New','t-watch','Not enough data yet']:['OK','t-ok','Performing close to average'];});
  return {T,P,camps,ads,avg,avgC};
}

function adInsights(M){
  const {T,P,camps,ads,avgC}=M, good=[],bad=[],next=[], u=typeShort(T.type), R=state.range;
  if(!T.spend) return {good,bad,next:[{t:'No ad spend in this period',x:'Nothing to analyse for the last '+R+' days. Pick a longer range or start a campaign.'}]};
  if(T.cpr&&P.cpr){const ch=(T.cpr-P.cpr)/P.cpr*100;
    if(ch>=20) bad.push({t:`Cost per ${u} up ${ch.toFixed(0)}%`,x:`${inr2(P.cpr)} → ${inr2(T.cpr)} vs the previous ${R} days. ${T.cpm&&P.cpm&&T.cpm>P.cpm*1.15?'Ads also became costlier to show (CPM up), so the audience may be getting saturated.':'Check which campaign got worse below.'}`});
    else if(ch<=-15) good.push({t:`Cost per ${u} down ${Math.abs(ch).toFixed(0)}%`,x:`${inr2(P.cpr)} → ${inr2(T.cpr)} vs the previous ${R} days. Keep the current creatives running.`});}
  if(T.results&&P.results&&T.results>=P.results*1.2) good.push({t:`${num(T.results)} ${T.type.toLowerCase()}, up ${Math.round((T.results/P.results-1)*100)}%`,x:`From ${num(P.results)} in the previous ${R} days.`});
  if(T.ctr!=null&&T.impressions>2000){ if(T.ctr<0.7) bad.push({t:`Low click rate: ${pct(T.ctr,2)}`,x:'Healthy is around 1% or more. The first 3 seconds / first line is not stopping the scroll. Test a stronger hook, a face, or an offer in the visual.'});
    else if(T.ctr>=1.5) good.push({t:`Strong click rate: ${pct(T.ctr,2)}`,x:'People are interested in the ads. Focus on what happens after the click (form or page).'});}
  const fLimit=R<=7?2.5:3.5;
  if(T.freq&&T.freq>fLimit) bad.push({t:`Ad fatigue: frequency ${T.freq.toFixed(1)}`,x:`On average each person saw the ads ${T.freq.toFixed(1)} times. Add 2–3 fresh creatives or widen the audience.`});
  if(T.cpm&&P.cpm&&T.cpm>P.cpm*1.25) bad.push({t:`Reaching people got ${Math.round((T.cpm/P.cpm-1)*100)}% costlier`,x:`CPM ${inr2(P.cpm)} → ${inr2(T.cpm)}. Often a sign of a small or tired audience, or festival-season competition.`});
  if(T.roas!=null){ if(T.roas<1) bad.push({t:`ROAS ${T.roas.toFixed(2)}×: losing money`,x:`Sales worth ${inr(T.value)} from ${inr(T.spend)} spend.`}); else if(T.roas>=2) good.push({t:`ROAS ${T.roas.toFixed(2)}×`,x:`Sales worth ${inr(T.value)} from ${inr(T.spend)} spend.`});}
  camps.forEach(c=>{
    if(c.spend<Math.max(300,T.spend*0.05)) return;
    const b=c.budget, on=isOn(c.status), avg=avgC(c.type), cu=typeShort(c.type);
    if(avg&&c.results>=3&&c.cpr<=avg*0.8){
      const a=[];if(on&&b) a.push(btn(`Scale +20% (₹${num(b.v)} → ₹${num(Math.round(b.v*1.2))})`,{action:'budget',id:b.id,name:c.name,from:b.v,budget:Math.round(b.v*1.2),level:b.level},'a-good'));
      good.push({t:`Winner: ${c.name}`,x:`${num(c.results)} ${c.type.toLowerCase()} at ${inr2(c.cpr)} each, ${Math.round((1-c.cpr/avg)*100)}% cheaper than average. Give it more budget.`,a});
    } else if(!c.results&&c.type!=='People reached'&&c.spend>=Math.max(500,(avg||0)*2)){
      const a=[];if(on) a.push(btn('Pause campaign',{action:'status',id:c.id,name:c.name,status:'PAUSED',level:'campaign'},'a-bad'));
      bad.push({t:`No results: ${c.name}`,x:`Spent ${inr(c.spend)} with zero ${c.type.toLowerCase()}. `+(c.type==='Purchases'?'Either nobody bought, or the website pixel is not reporting purchases to Meta. Check the pixel before spending more.':'Pause it, or check the form/landing page is working.'),a});
    } else if(avg&&c.cpr>=avg*1.5){
      const a=[];if(on&&b) a.push(btn(`Cut −20% (₹${num(b.v)} → ₹${num(Math.round(b.v*0.8))})`,{action:'budget',id:b.id,name:c.name,from:b.v,budget:Math.round(b.v*0.8),level:b.level},'a-bad'));
      if(on) a.push(btn('Pause',{action:'status',id:c.id,name:c.name,status:'PAUSED',level:'campaign'},'a-ghost'));
      bad.push({t:`Expensive: ${c.name}`,x:`${inr2(c.cpr)} per ${cu}, ${Math.round((c.cpr/avg-1)*100)}% above average. Move budget to the winner or change the creative.`,a});
    }
  });
  const best=ads.filter(a=>a.type===T.type&&a.results>=3&&a.cpr).sort((a,b)=>a.cpr-b.cpr)[0];
  if(best) good.push({t:`Best ad: ${best.name}`,x:`${inr2(best.cpr)} per ${typeShort(best.type)}, CTR ${best.ctr!=null?pct(best.ctr,2):'—'}. Make 2 more ads in the same style.`});
  ads.filter(a=>a.tag[0]==='Pause'&&isOn(a.eff)).slice(0,3).forEach(a=>bad.push({t:`Weak ad: ${a.name}`,x:a.tag[2]+'.',a:[btn('Pause ad',{action:'status',id:a.id,name:a.name,status:'PAUSED',level:'ad'},'a-bad')]}));
  ads.filter(a=>a.prevCtr&&a.ctr!=null&&a.ctr<a.prevCtr*0.7&&a.freq>2.5&&isOn(a.eff)).slice(0,2).forEach(a=>bad.push({t:`Getting tired: ${a.name}`,x:`Click rate fell from ${pct(a.prevCtr,2)} to ${pct(a.ctr,2)} while frequency is ${a.freq.toFixed(1)}. Replace the creative soon.`}));
  const live=ads.filter(a=>isOn(a.eff)).length;
  if(live&&live<3) next.push({t:'Add more creatives',x:`Only ${live} ad${live>1?'s are':' is'} running. Meta finds cheaper results with 3–5 different ads (reel, carousel, single image).`});
  if(!SET.leadValue&&T.leads&&!T.value) next.push({t:'See ROAS for lead ads',x:'Tell the dashboard what one lead is worth: Sheet → Digital Poonam → Set value of one lead. Estimated ROAS then appears here.'});
  if(T.type==='Leads'&&T.cpr) next.push({t:'Follow up leads within 1 hour',x:`Each lead costs ${inr2(T.cpr)}. Leads called within an hour convert much better; a WhatsApp auto-reply helps.`});
  const topPost=(DATA.posts||[]).filter(p=>p.reach).sort((a,b)=>b.reach-a.reach)[0];
  if(topPost) next.push({t:'Boost your best organic post',x:`"${String(topPost.text||'').slice(0,60)}…" reached ${compact(topPost.reach)} people for free. Boosting proven posts is usually cheaper than new ads.`,a:[btn('Boost this post',{action:'boost',postId:topPost.id,platform:topPost.platform,caption:topPost.text,thumb:topPost.thumb},'a-good')]});
  return {good:good.slice(0,6),bad:bad.slice(0,6),next:next.slice(0,4)};
}

function ads(){
  const M=adsModel(),{T,P}=M,w=buckets();
  if(!(DATA.adStats||[]).length) return oldAds()+`<p class="sub" style="margin-top:12px">Ad-level suggestions and previews appear after the next sync.</p>`;
  const I=adInsights(M), u=typeShort(T.type);
  const roasCard=T.roas!=null?kpi('ROAS',T.roas,P.roas,v=>v.toFixed(2)+'×',null,'var(--ads)')
    :T.estRoas!=null?kpi('Est. ROAS (lead value ₹'+num(SET.leadValue)+')',T.estRoas,P.estRoas,v=>v.toFixed(2)+'×',null,'var(--ads)')
    :`<div class="kpi"><div class="lbl"><span class="sw" style="background:var(--ads)"></span>ROAS</div><div class="val">—</div><span class="delta flat">${T.leads?'Lead ads: set the value of one lead in the Sheet menu':'No purchase value tracked by the pixel'}</span></div>`;
  const card=(cls,title,list,emptyMsg)=>`<section class="panel ins ${cls}"><h2>${title}</h2>${list.length?list.map(i=>`<div class="ins-item"><b>${esc(i.t)}</b><p>${esc(i.x)}</p>${i.a&&i.a.length?`<div class="ins-acts">${i.a.join('')}</div>`:''}</div>`).join(''):`<p class="sub">${emptyMsg}</p>`}</section>`;
  return `
  <div class="grid kpis k4">
    ${kpi('Amount spent',T.spend,P.spend,inr,w.map(r=>r.ad_spend),'var(--ads)')}
    ${kpi(T.type,T.results,P.type===T.type?P.results:null,num,T.type==='Leads'?w.map(r=>r.ad_leads):null,'var(--ads)')}
    ${kpi('Cost per '+u,T.cpr,P.type===T.type?P.cpr:null,inr2,null,'var(--ads)',true)}
    ${roasCard}
    ${kpi('CTR (link)',T.ctr,P.ctr,v=>pct(v,2),null,'var(--ads)')}
    ${kpi('CPM',T.cpm,P.cpm,inr2,null,'var(--ads)',true)}
    ${kpi('Cost per link click',T.cpc,P.cpc,inr2,null,'var(--ads)',true)}
    ${kpi('Frequency',T.freq,P.freq,v=>v.toFixed(2),null,'var(--ads)',true)}
  </div>
  <div class="grid ins3" style="margin-top:16px">
    ${card('ins-good','✅ What is going right',I.good,'Nothing stands out yet.')}
    ${card('ins-bad','⚠️ What is going wrong',I.bad,'No problems found in this period. 👍')}
    ${card('ins-next','👉 Do this next',I.next,'Nothing pending.')}
  </div>
  ${SET.actionsEnabled?'':`<p class="note">Buttons need an Action PIN first: Sheet → Digital Poonam → <b>Set Action PIN &amp; spend limits</b>.</p>`}
  <div class="section-title">Campaigns · last ${state.range} days</div>
  <section class="panel"><div class="tbl-wrap"><table>
    <thead><tr><th>Campaign</th><th>Status</th><th>Daily budget</th><th>Spend</th><th>Results</th><th>Cost / result</th><th>ROAS</th><th>CTR</th><th>CPM</th><th>Freq.</th></tr></thead>
    <tbody>${M.camps.map(c=>{const b=c.budget,on=isOn(c.status),st=String(c.status||'').toUpperCase();
      const roas=c.roas!=null?c.roas.toFixed(2)+'×':c.estRoas!=null?'~'+c.estRoas.toFixed(2)+'×':'—';
      return `<tr><td><b>${esc(c.name)}</b><div class="sub" style="margin:2px 0 0">${esc(String(c.objective||'').replace('OUTCOME_','').toLowerCase())} · ${c.ads} ad${c.ads>1?'s':''}</div></td>
      <td><span class="status ${on?'s-good':'s-warn'}">${on?'Active':st==='PAUSED'?'Paused':esc(st.toLowerCase()||'—')}</span><div>${on?btn('Pause',{action:'status',id:c.id,name:c.name,status:'PAUSED',level:'campaign'},'a-ghost sm'):btn('Resume',{action:'status',id:c.id,name:c.name,status:'ACTIVE',level:'campaign'},'a-ghost sm')}</div></td>
      <td>${b?`<div class="bud">${btn('−',{action:'budget',id:b.id,name:c.name,from:b.v,budget:Math.round(b.v*0.8),level:b.level},'a-ghost sm')}<span>₹${num(b.v)}</span>${btn('+',{action:'budget',id:b.id,name:c.name,from:b.v,budget:Math.round(b.v*1.2),level:b.level},'a-ghost sm')}</div><div class="sub" style="margin:2px 0 0">${b.level} budget</div>`:'<span class="sub">lifetime / mixed</span>'}</td>
      <td>${inr(c.spend)}</td><td>${num(c.results)} <span class="sub">${esc(c.type.toLowerCase())}</span></td><td>${c.cpr?inr2(c.cpr):'—'}</td><td>${roas}</td>
      <td>${c.ctr!=null?pct(c.ctr,2):'—'}</td><td>${c.cpm?inr2(c.cpm):'—'}</td><td>${c.freq?c.freq.toFixed(1):'—'}</td></tr>`}).join('')||`<tr><td colspan="10">${empty('No campaigns ran in this period.')}</td></tr>`}</tbody></table></div></section>
  <div class="section-title">Ads · with previews</div>
  <div class="cards adcards">${M.ads.map(a=>{const m=a.m||{},on=isOn(a.eff),link=m.preview||m.permalink;
    return `<article class="pcard adcard"><div class="pc-img">${thumb({thumb:m.thumb,format:'Ad'})}<span class="tag ${a.tag[1]}">${a.tag[0]}</span>
      <span class="pc-badge" style="background:${on?'var(--good)':'var(--muted)'}">${on?'Live':'Off'}</span></div>
      <div class="pc-body"><b class="ad-name">${esc(a.name)}</b>${m.title?`<p class="pc-text" style="font-weight:600">${esc(m.title)}</p>`:''}${m.body?`<p class="pc-text">${esc(m.body)}</p>`:''}
      <p class="ad-why">${esc(a.tag[2])}</p>
      <div class="pc-stats"><span><b>${inr(a.spend)}</b> spent</span><span><b>${num(a.results)}</b> ${esc(typePlural(a.type))}</span><span><b>${a.cpr?inr2(a.cpr):'—'}</b> each</span><span><b>${a.ctr!=null?pct(a.ctr,2):'—'}</b> CTR</span><span><b>${a.freq?a.freq.toFixed(1):'—'}</b> freq</span></div>
      <div class="ins-acts">${on?btn('Pause',{action:'status',id:a.id,name:a.name,status:'PAUSED',level:'ad'},'a-ghost sm'):btn('Resume',{action:'status',id:a.id,name:a.name,status:'ACTIVE',level:'ad'},'a-ghost sm')}${link?`<a class="abtn a-ghost sm" href="${esc(link)}" target="_blank" rel="noopener">Preview ↗</a>`:''}</div>
      </div></article>`}).join('')||empty('No ads in this period.')}</div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Cost per lead</h2><p class="sub">₹ per lead, per ${per()}</p><div id="adCpl"></div></section>
    <section class="panel"><h2>Recent changes from this app</h2>${(DATA.actions||[]).length?`<ul class="alog">${DATA.actions.map(x=>`<li><span>${esc(new Date(x.time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))}</span> <b>${esc(x.action)}</b> · ${esc(x.target)}<br><span class="sub">${esc(x.result)} · ${esc(x.from)}</span></li>`).join('')}</ul>`:empty('No changes made from the app yet.')}</section>
  </div>`;
}
function afterAds(){
  const rows=buckets(),c=slice(state.range);
  const el=$('#adCpl'); if(!el) return;
  if(S(c,'ad_leads')>0) lineChart(el,rows.filter(r=>r.ad_leads),[{name:'CPL',color:css('--ads'),get:r=>r.ad_spend/r.ad_leads}],inr2,{area:true,label:'Cost per lead'});
  else el.innerHTML=empty('No leads recorded in this period.');
  const oc=$('#adClicks'); if(oc){ if(S(c,'ad_link_clicks')>0) barChart(oc,rows,r=>r.ad_link_clicks||0,css('--ads'),num,{name:'Link clicks',label:'Link clicks'}); else oc.innerHTML=empty('No link clicks in this period.'); }
}

/* ---------- action dialog (pause / budget / boost) ---------- */
let ACT_PIN=null, ACT_PIN_AT=0;
function sendAction(payload){
  if(window.DP_ACTION) return window.DP_ACTION(payload);
  return new Promise(res=>{try{google.script.run.withSuccessHandler(res).withFailureHandler(e=>res({error:'net',message:String(e&&e.message||e)})).appAction(payload)}catch(e){res({error:'net',message:'Actions are not available here.'})}});
}
function openAct(a){
  const dlg=$('#actDlg');
  const pinFresh=ACT_PIN&&Date.now()-ACT_PIN_AT<5*60000;
  let body='';
  if(a.action==='status') body=`<p><b>${a.status==='PAUSED'?'Pause':'Resume'} ${esc(a.level)}</b><br>${esc(a.name)}</p><p class="sub">${a.status==='PAUSED'?'It stops spending straight away. You can resume any time.':'It starts spending again at its current budget.'}</p>`;
  if(a.action==='budget') body=`<p><b>Change daily budget</b> (${esc(a.level)})<br>${esc(a.name)}</p>
    <label class="fld">New daily budget (₹)<input id="aBudget" type="number" inputmode="numeric" min="100" value="${a.budget}"></label>
    <p class="sub">Now ₹${num(a.from)}/day. Allowed in one step: ₹${num(Math.ceil(a.from*(1-(SET.maxStepPct||30)/100)))} to ₹${num(Math.min(Math.floor(a.from*(1+(SET.maxStepPct||30)/100)),SET.maxDailyBudget||3000))}. Max ever: ₹${num(SET.maxDailyBudget||3000)}/day.</p>`;
  if(a.action==='boost') body=`<p><b>Boost post</b> on ${esc(a.platform)}</p>${a.thumb?`<img src="${esc(a.thumb)}" alt="" referrerpolicy="no-referrer" class="boost-img">`:''}<p class="sub" style="margin-top:6px">${esc(String(a.caption||'').slice(0,120))}</p>
    <div class="fld2"><label class="fld">Budget per day (₹)<input id="bBudget" type="number" inputmode="numeric" min="100" max="${SET.maxDailyBudget||3000}" value="300"></label>
    <label class="fld">Days<input id="bDays" type="number" inputmode="numeric" min="1" max="30" value="5"></label></div>
    <label class="fld">Where<select id="bPlace"><option value="raipur">Raipur + 40 km</option><option value="india">All India</option><option value="bhopal">Bhopal + 40 km</option><option value="indore">Indore + 40 km</option><option value="nagpur">Nagpur + 40 km</option></select></label>
    <div class="fld2"><label class="fld">Age from<input id="bAgeMin" type="number" min="18" max="65" value="22"></label><label class="fld">Age to<input id="bAgeMax" type="number" min="18" max="65" value="55"></label></div>
    <p class="sub" id="bTotal"></p><p class="sub">It is created <b>paused</b>, so nothing is spent until you press Resume on it under Campaigns.</p>`;
  dlg.innerHTML=`<form method="dialog" class="dlg" id="actForm"><h2>Confirm change</h2>${body}
    ${SET.actionsEnabled?`<label class="fld" ${pinFresh?'hidden':''}>Action PIN<input id="aPin" type="password" autocomplete="off" ${pinFresh?'':'required'} minlength="8"></label>`:`<p class="err">Actions are switched off. Set an Action PIN first: Sheet → Digital Poonam → Set Action PIN &amp; spend limits.</p>`}
    <p class="err" id="aErr" role="alert"></p><p class="ok" id="aOk" role="status"></p>
    <div class="dlg-acts"><button type="button" class="abtn a-ghost" id="aCancel">Cancel</button>${SET.actionsEnabled?`<button type="submit" class="abtn a-good" id="aGo">Confirm</button>`:''}</div></form>`;
  const tot=()=>{const b=$('#bBudget'),d=$('#bDays');if(b&&d)$('#bTotal').textContent=`Total up to ₹${num((+b.value||0)*(+d.value||0))} over ${+d.value||0} days.`};
  if(a.action==='boost'){tot();$('#bBudget').addEventListener('input',tot);$('#bDays').addEventListener('input',tot);}
  $('#aCancel').onclick=()=>dlg.close();
  const f=$('#actForm');
  if(f) f.onsubmit=e=>{e.preventDefault();
    const p=Object.assign({},a); delete p.thumb;
    if(a.action==='budget') p.budget=Math.round(+$('#aBudget').value);
    if(a.action==='boost'){p.budget=Math.round(+$('#bBudget').value);p.days=Math.round(+$('#bDays').value);p.place=$('#bPlace').value;p.ageMin=+$('#bAgeMin').value;p.ageMax=+$('#bAgeMax').value;}
    const pinEl=$('#aPin'); p.actionPin=pinFresh?ACT_PIN:(pinEl?pinEl.value:'');
    const go=$('#aGo'); go.disabled=true; go.textContent='Working…'; $('#aErr').textContent='';
    sendAction(p).then(r=>{
      if(r&&r.ok){ACT_PIN=p.actionPin;ACT_PIN_AT=Date.now();$('#aOk').textContent=r.message+' Refresh to see updated numbers.';go.remove();$('#aCancel').textContent='Close';
        if(a.action==='status'){Object.values(META).forEach(m=>{if(a.level==='ad'&&m.ad_id===a.id){m.status=a.status;m.effective_status=a.status;} if(a.level==='campaign'&&m.campaign_id===a.id){m.campaign_status=a.status; if(a.status==='PAUSED')m.effective_status='CAMPAIGN_PAUSED';}});}
        if(a.action==='budget'){Object.values(META).forEach(m=>{if(m.campaign_id===a.id)m.campaign_budget=p.budget;if(m.adset_id===a.id)m.adset_budget=p.budget;});}
        dlg.addEventListener('close',()=>render(),{once:true});
      } else {if(r&&r.error==='badactpin'){ACT_PIN=null;const l=$('#aPin');if(l){l.closest('label').hidden=false;l.required=true;l.value='';}}
        $('#aErr').textContent=(r&&r.message)||'Something went wrong.';go.disabled=false;go.textContent='Try again';}
    });};
  dlg.showModal();
  setTimeout(()=>{const x=$('#aPin');if(x&&!x.closest('label').hidden)x.focus();},50);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;e.preventDefault();e.stopPropagation();
  try{openAct(JSON.parse(b.dataset.act))}catch(err){console.error(err)}});

function thumb(r,size){
  const cls=size==='sm'?'th th-sm':'th';
  const ph=`<span class="${cls} th-ph" aria-hidden="true">${esc((r.format||'Post').slice(0,1))}</span>`;
  if(!r.thumb) return ph;
  return `<img class="${cls}" src="${esc(r.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='${ph.replace(/'/g,'&#39;').replace(/"/g,'&quot;')}'">`;
}
function postCards(list){
  if(!list.length) return '';
  return `<div class="cards">${list.map(r=>`<div class="pcard"><a class="pc-link" href="${esc(r.link||'#')}" target="_blank" rel="noopener">
    <div class="pc-img">${thumb(r)}<span class="pc-badge" style="background:${r.platform==='Instagram'?'var(--ig)':'var(--fb)'}">${r.platform==='Instagram'?'IG':'FB'} · ${esc(r.format)}</span></div>
    <div class="pc-body"><p class="pc-text">${esc(r.text||'(no caption)')}</p>
    <div class="pc-stats"><span><b>${r.reach!=null?compact(r.reach):'—'}</b> reach</span><span><b>${r.likes!=null?num(r.likes):'—'}</b> likes</span><span><b>${r.comments!=null?num(r.comments):'—'}</b> comments</span></div>
    <p class="pc-date">${dlabel(toDate(String(r.date).slice(0,10)))}</p></div></a>
    <div class="pc-foot">${btn('🚀 Boost',{action:'boost',postId:r.id,platform:r.platform,caption:r.text,thumb:r.thumb},'a-ghost sm')}</div></div>`).join('')}</div>`;
}
let sortKey='reach',sortDir=-1;
function postTable(list){
  const from=ymd(slice(state.range)[0].d);
  const rows=list.filter(x=>x.date&&String(x.date).slice(0,10)>=from).sort((a,b)=>((a[sortKey]??-1)>(b[sortKey]??-1)?1:-1)*sortDir);
  if(!rows.length) return empty(`No posts in the last ${state.range} days. Try a longer range.`);
  const cols=[['text','Post'],['platform','Platform'],['format','Format'],['date','Date'],['reach','Reach'],['views','Views'],['likes','Likes'],['comments','Comments'],['saves','Saves'],['shares','Shares'],['er','Eng. rate']];
  rows.forEach(r=>r.er=r.reach?((r.interactions!=null?+r.interactions:(+r.likes||0)+(+r.comments||0)+(+r.saves||0)+(+r.shares||0))/r.reach*100):null);
  const n=v=>v==null||v===''?'—':num(v);
  return `<div class="tbl-wrap"><table class="posts"><thead><tr>${cols.map(c=>`<th data-k="${c[0]}" tabindex="0" ${c[0]===sortKey?`aria-sort="${sortDir<0?'descending':'ascending'}"`:''}>${c[1]}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r=>`<tr><td class="post-title"><div class="pt">${thumb(r,'sm')}${r.link?`<a href="${esc(r.link)}" target="_blank" rel="noopener" style="color:inherit">${esc(r.text||'(no caption)')}</a>`:`<span>${esc(r.text||'(no caption)')}</span>`}</div></td><td>${r.platform}</td><td><span class="pill">${esc(r.format)}</span></td><td>${dlabel(toDate(String(r.date).slice(0,10)))}</td><td>${n(r.reach)}</td><td>${n(r.views)}</td><td>${n(r.likes)}</td><td>${n(r.comments)}</td><td>${n(r.saves)}</td><td>${n(r.shares)}</td><td>${r.er!=null?pct(r.er,2):'—'}</td></tr>`).join('')}</tbody></table></div>`;
}
function bindSort(){
  document.querySelectorAll('table.posts th').forEach(th=>{
    const go=()=>{const k=th.dataset.k;if(k===sortKey)sortDir*=-1;else{sortKey=k;sortDir=-1}render()};
    th.addEventListener('click',go);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
  });
}
function postsView(){
  const from=ymd(slice(state.range)[0].d), inP=(DATA.posts||[]).filter(x=>x.date&&String(x.date).slice(0,10)>=from&&x.reach!=null);
  const types=[...new Set(inP.map(x=>x.format))];
  const byType=types.map(t=>{const a=inP.filter(x=>x.format===t);const er=a.map(x=>x.reach?((+x.interactions||0)/x.reach*100):0);
    return{t,n:a.length,reach:a.reduce((s,x)=>s+(+x.reach||0),0)/a.length,er:er.reduce((s,x)=>s+x,0)/a.length}}).sort((a,b)=>b.reach-a.reach);
  const mx=Math.max(1,...byType.map(b=>b.reach)), mxe=Math.max(1,...byType.map(b=>b.er));
  return `
  <div class="grid two">
    <section class="panel"><h2>Average reach by format</h2><p class="sub">Per post, both platforms, last ${state.range} days</p>
      ${byType.length?`<div class="hbars">${byType.map(b=>`<div class="hb"><span>${esc(b.t)} <span style="color:var(--muted)">(${b.n})</span></span><div class="track"><div class="fill" style="width:${b.reach/mx*100}%;background:var(--accent)"></div></div><span class="n">${compact(b.reach)}</span></div>`).join('')}</div>`:empty('No posts with reach data in this period.')}</section>
    <section class="panel"><h2>Average engagement rate by format</h2><p class="sub">Interactions ÷ reach</p>
      ${byType.length?`<div class="hbars">${byType.map(b=>`<div class="hb"><span>${esc(b.t)}</span><div class="track"><div class="fill" style="width:${b.er/mxe*100}%;background:var(--accent)"></div></div><span class="n">${pct(b.er,2)}</span></div>`).join('')}</div>`:empty('No posts with reach data in this period.')}</section>
  </div>
  <div class="section-title">Top posts in the last ${state.range} days · click to open</div>
  ${postCards(inP.slice().sort((a,b)=>(+b.reach||0)-(+a.reach||0)).slice(0,8))||empty('No posts in this period.')}
  <div class="section-title">Every post · click a column to sort</div>
  <section class="panel">${postTable(DATA.posts||[])}</section>`;
}

function audience(){
  const A=DATA.audience||{};
  const ag={}; (A.ageGender||[]).forEach(r=>{const [age,g]=r.k||[];ag[age]=ag[age]||{F:0,M:0,U:0};ag[age][g==='F'?'F':g==='M'?'M':'U']+=r.v});
  const ages=Object.keys(ag).sort();
  const tot=Object.values(ag).reduce((s,x)=>s+x.F+x.M+x.U,0)||1;
  const mx=Math.max(1,...ages.map(a=>ag[a].F+ag[a].M+ag[a].U));
  const cities=(A.city||[]).map(r=>({n:(r.k||[])[0],v:r.v})).sort((a,b)=>b.v-a.v).slice(0,10);
  const cTot=(A.city||[]).reduce((s,r)=>s+r.v,0)||1;
  const grid=Array.from({length:7},()=>Array(24).fill(0)), cnt=Array(7).fill(0);
  (A.online||[]).forEach(o=>{if(!o.h||!Object.keys(o.h).length) return;const wd=toDate(o.date).getDay();cnt[wd]++;Object.keys(o.h).forEach(h=>grid[wd][+h]+=+o.h[h]||0)});
  const cells=grid.map((r,d)=>r.map(v=>cnt[d]?v/cnt[d]:0)); const cm=Math.max(1,...cells.flat());
  const DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], steps=['--seq-0','--seq-1','--seq-2','--seq-3','--seq-4','--seq-5'];
  const hourTot=Array.from({length:24},(_,h)=>cells.reduce((s,r)=>s+r[h],0)); const ph=hourTot.indexOf(Math.max(...hourTot));
  const hasOnline=cells.flat().some(v=>v>0);
  return `
  <div class="grid two">
    <section class="panel"><h2>Age and gender</h2><p class="sub">Instagram followers, % of total</p>
      ${ages.length?`<div class="legend"><span><i class="sw" style="background:var(--ig)"></i>Women</span><span><i class="sw" style="background:var(--fb)"></i>Men</span></div>
      <div class="hbars">${ages.map(a=>{const x=ag[a];return `<div class="hb"><span>${esc(a)}</span><div class="track" style="background:none"><div class="fill" style="width:${x.F/mx*100}%;background:var(--ig);border-radius:5px 0 0 5px"></div><div class="fill" style="width:${x.M/mx*100}%;background:var(--fb)"></div></div><span class="n">${((x.F+x.M+x.U)/tot*100).toFixed(1)}%</span></div>`}).join('')}</div>`:empty('Meta shares age and gender only for accounts with 100+ followers.')}</section>
    <section class="panel"><h2>Top cities</h2><p class="sub">Instagram followers, % of total</p>
      ${cities.length?`<div class="hbars">${cities.map(c=>`<div class="hb"><span title="${esc(c.n)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(c.n).split(',')[0])}</span><div class="track"><div class="fill" style="width:${c.v/cities[0].v*100}%;background:var(--accent)"></div></div><span class="n">${(c.v/cTot*100).toFixed(1)}%</span></div>`).join('')}</div>`:empty('No city data yet.')}</section>
  </div>
  <section class="panel" style="margin-top:16px"><h2>When followers are online</h2><p class="sub">Instagram, average by day and hour over the last 30 days. Hours are as Meta reports them.</p>
    ${hasOnline?`<div class="tbl-wrap"><div class="heat" id="heat">
      <span></span>${Array.from({length:24},(_,h)=>`<span class="h">${h%3===0?h:''}</span>`).join('')}
      ${DN.map((dn,d)=>`<span>${dn}</span>`+cells[d].map((v,h)=>`<span class="c" style="background:var(${steps[Math.min(5,Math.floor(v/cm*6))]})" data-t="${dn} ${String(h).padStart(2,'0')}:00 — about ${num(v)} followers online"></span>`).join('')).join('')}
    </div></div>
    <div class="scale">Fewer ${steps.map(s=>`<i style="background:var(${s})"></i>`).join('')} More · Busiest hour: ${ph}:00–${ph+1}:00</div>`:empty('No online-hours data yet.')}</section>`;
}
function afterAudience(){
  const heat=$('#heat'); if(!heat) return;
  const tip=document.createElement('div');tip.className='tip';tip.hidden=true;heat.parentElement.style.position='relative';heat.parentElement.appendChild(tip);
  heat.addEventListener('pointermove',e=>{const c=e.target.closest('.c');if(!c){tip.hidden=true;return}
    const b=heat.parentElement.getBoundingClientRect(),r=c.getBoundingClientRect();tip.textContent=c.dataset.t;tip.hidden=false;
    tip.style.left=(r.left-b.left+r.width/2+heat.parentElement.scrollLeft)+'px';tip.style.top=(r.top-b.top)+'px'});
  heat.addEventListener('pointerleave',()=>tip.hidden=true);
}

/* ---------- YouTube ---------- */
const YT=DATA.yt||{};
const Nn=v=>v==null||v===''||isNaN(+v)?null:+v;
const YCH=(YT.channels||[]).map((c,i)=>({...c,color:i%2?'var(--yt2)':'var(--yt)',colorName:i%2?'--yt2':'--yt'}));
if(!state.yt||(state.yt!=='all'&&!YCH.some(c=>c.channel_id===state.yt))) state.yt='all';
const ytSel=()=>state.yt==='all'?YCH.map(c=>c.channel_id):[state.yt];
const YK=['views','minutes','gained','lost','likes','comments','shares','durW'];
function ytDays(ids){
  const rows=(YT.daily||[]).filter(r=>ids.includes(r.channel_id));
  const by={};let last='';
  rows.forEach(r=>{const k=String(r.date).slice(0,10);if(k>last)last=k;const o=by[k]=by[k]||{};const v=Nn(r.views)||0;
    o.views=(o.views||0)+v;o.minutes=(o.minutes||0)+(Nn(r.minutes)||0);o.gained=(o.gained||0)+(Nn(r.subs_gained)||0);o.lost=(o.lost||0)+(Nn(r.subs_lost)||0);
    o.likes=(o.likes||0)+(Nn(r.likes)||0);o.comments=(o.comments||0)+(Nn(r.comments)||0);o.shares=(o.shares||0)+(Nn(r.shares)||0);o.durW=(o.durW||0)+(Nn(r.avg_view_sec)||0)*v;
    o['v_'+r.channel_id]=(o['v_'+r.channel_id]||0)+v});
  if(!last) return {arr:[],end:null};
  const end=toDate(last),arr=[];
  for(let i=DAYS-1;i>=0;i--){const d=new Date(end);d.setDate(end.getDate()-i);const s=by[ymd(d)];const o={d};
    YK.forEach(k=>o[k]=s&&s[k]!=null?s[k]:null);YCH.forEach(c=>o['v_'+c.channel_id]=s?(s['v_'+c.channel_id]||0):null);arr.push(o)}
  return {arr,end};
}
function ytWeeks(rows){const out=[];for(let i=0;i<rows.length;i+=7){const ch=rows.slice(i,i+7);const o={d:ch[0].d};
  Object.keys(ch[0]).filter(k=>k!=='d').forEach(k=>o[k]=S(ch,k));out.push(o)}return out}
const FMT_NAMES={SHORTS:'Shorts',VIDEO_ON_DEMAND:'Long videos',LIVE_STREAM:'Live',STORY:'Stories',UNSPECIFIED:'Other'};
const SRC_NAMES={YT_SEARCH:'YouTube search',SUBSCRIBER:'Subscriber feeds',RELATED_VIDEO:'Suggested videos',SHORTS:'Shorts feed',BROWSE:'Home & browse',EXT_URL:'Outside YouTube (links)',
  YT_CHANNEL:'Your channel page',PLAYLIST:'Playlists',NOTIFICATION:'Notifications',NO_LINK_OTHER:'Direct / unknown',END_SCREEN:'End screens',YT_OTHER_PAGE:'Other YouTube pages',
  ADVERTISING:'YouTube ads',HASHTAGS:'Hashtag pages',SOUND_PAGE:'Sound pages',ANNOTATION:'Cards',CAMPAIGN_CARD:'Campaign cards',YT_PLAYLIST_PAGE:'Playlist pages',PRODUCT_PAGE:'Product pages',LIVE_REDIRECT:'Live redirects',VIDEO_REMIXES:'Remixes'};
function ytSplit(kind,win,ids){const m={};(YT.split||[]).filter(r=>r.kind===kind&&String(r.window)===String(win)&&ids.includes(r.channel_id)).forEach(r=>{
  const k=r.label;m[k]=m[k]||{k,views:0,minutes:0};m[k].views+=Nn(r.views)||0;m[k].minutes+=Nn(r.minutes)||0});return Object.values(m).sort((a,b)=>b.views-a.views)}
const mmss=s=>{s=Math.round(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const ytWin=()=>state.range===7?7:state.range===90?90:30;
function ytVideos(ids){return (YT.videos||[]).filter(v=>ids.includes(v.channel_id)).map(v=>{const w=ytWin();
  return {...v,vw:Nn(v['views_'+w])||0,hrs:(Nn(w===90?v.minutes_90:v.minutes_30)||0)/60,pctv:Nn(v.avg_pct_30),subs:Nn(w===90?v.subs_90:v.subs_30)||0,
    all:Nn(v.views_all),url:v.type==='Short'?'https://youtube.com/shorts/'+v.video_id:'https://youtu.be/'+v.video_id,ch:YCH.find(c=>c.channel_id===v.channel_id)}})}
function ytInsights(T,P,ids,vids,fmt,src){
  const good=[],bad=[],next=[],n=state.range;
  if(T.views!=null&&P.views){const ch=(T.views-P.views)/P.views*100;
    if(ch>=10) good.push({t:`Views up ${ch.toFixed(0)}%`,x:`${compact(T.views)} views in the last ${n} days vs ${compact(P.views)} before.`});
    else if(ch<=-15) bad.push({t:`Views down ${Math.abs(ch).toFixed(0)}%`,x:`${compact(T.views)} views vs ${compact(P.views)} in the previous ${n} days. Check if uploads slowed down.`})}
  const net=(T.gained||0)-(T.lost||0);
  if(T.views&&net>0){const per=net/T.views*1000;(per>=3?good:next).push({t:`${per.toFixed(1)} new subscribers per 1,000 views`,x:per>=3?'Viewers like what they see and are subscribing.':'Add a clear "subscribe" ask and an end screen pointing to your best video.'})}
  if(net<0) bad.push({t:'Losing subscribers',x:`${num(T.lost)} left and ${num(T.gained)} joined. Look at the videos posted just before the drop.`});
  const inR=vids.filter(v=>v.vw>0).sort((a,b)=>b.vw-a.vw);
  if(inR[0]) good.push({t:'Best video: '+inR[0].title,x:`${compact(inR[0].vw)} views${inR[0].subs?`, ${num(inR[0].subs)} new subscribers`:''} (${inR[0].type}). Make a follow-up on the same topic.`});
  const sh=fmt.find(f=>f.k==='SHORTS'),lv=fmt.find(f=>f.k==='VIDEO_ON_DEMAND'),totV=fmt.reduce((s,f)=>s+f.views,0),totM=fmt.reduce((s,f)=>s+f.minutes,0);
  if(sh&&lv&&totV&&totM){const vs=sh.views/totV*100,ms=sh.minutes/totM*100;
    next.push({t:`Shorts bring ${vs.toFixed(0)}% of views, ${ms.toFixed(0)}% of watch time`,x:vs>60?'Shorts find new people; turn the best Shorts into longer videos and link them, so viewers stay longer.':'Long videos carry the channel. Cut 2–3 Shorts from each long video to reach new people.'})}
  const longs=vids.filter(v=>v.type==='Video'&&v.pctv!=null&&v.vw>=50);
  if(longs.length){const avg=longs.reduce((s,v)=>s+v.pctv,0)/longs.length;
    (avg>=45?good:bad).push({t:`Long videos are watched ${avg.toFixed(0)}% through on average`,x:avg>=45?'Strong retention. Keep the same pacing.':'Viewers leave early. Get to the point in the first 30 seconds and cut slow parts.'})}
  const from=ymd(new Date(Date.now()-n*864e5)),ups=vids.filter(v=>String(v.published)>=from);
  if(!ups.length) next.push({t:`No uploads in the last ${n} days`,x:'Channels grow with a steady rhythm. Aim for at least one video (or 3 Shorts) a week.'});
  else good.push({t:`${ups.length} upload${ups.length>1?'s':''} in the last ${n} days`,x:`${ups.filter(v=>v.type==='Short').length} Shorts, ${ups.filter(v=>v.type!=='Short').length} videos.`});
  const tot=src.reduce((s,x)=>s+x.views,0),search=src.find(x=>x.k==='YT_SEARCH');
  if(tot&&(!search||search.views/tot<0.1)) next.push({t:'Few views from YouTube search',x:`Only ${search?(search.views/tot*100).toFixed(0):0}% come from search. Put the words people type (e.g. "digital marketing course Raipur") in titles, first line of description and tags.`});
  if(tot&&src[0]) good.push({t:'Top traffic source: '+(SRC_NAMES[src[0].k]||src[0].k),x:`${(src[0].views/tot*100).toFixed(0)}% of views in this period.`});
  return {good,bad,next};
}
function youtube(){
  if(!YCH.length) return `<section class="panel"><h2>Connect YouTube</h2><p class="sub">No YouTube channel connected yet.</p>
    <ol class="steps"><li>Open the Google Sheet → <b>Digital Poonam → YouTube → A. Save Google login client</b> (one time).</li>
    <li>Then <b>B. Connect a YouTube channel</b> and sign in with the Google account that owns the channel.</li>
    <li>Repeat step 2 for the second channel. Data appears here right after.</li></ol></section>`;
  const ids=ytSel(),{arr,end}=ytDays(ids),n=state.range;
  const c=arr.slice(DAYS-n),p=arr.slice(DAYS-2*n,DAYS-n),w=n>30?ytWeeks(c):c;
  const tot=a=>{const o={};YK.forEach(k=>o[k]=S(a,k));o.avg=o.views?o.durW/o.views:null;o.eng=(o.likes||0)+(o.comments||0)+(o.shares||0);return o};
  const T=tot(c),P=tot(p);
  const subs=ids.reduce((s,id)=>{const ch=YCH.find(x=>x.channel_id===id);return s+(Nn(ch&&ch.subs)||0)},0);
  const vids=ytVideos(ids),fmt=ytSplit('format',ytWin(),ids),src=ytSplit('traffic',ytWin(),ids);
  const I=ytInsights(T,P,ids,vids,fmt,src);
  const col=state.yt==='all'?'var(--yt)':(YCH.find(x=>x.channel_id===state.yt)||{}).color;
  const card=(cls,title,list,emptyMsg)=>`<section class="panel ins ${cls}"><h2>${title}</h2>${list.length?list.map(i=>`<div class="ins-item"><b>${esc(i.t)}</b><p>${esc(i.x)}</p></div>`).join(''):`<p class="sub">${emptyMsg}</p>`}</section>`;
  const fmtBars=(list,name)=>{const t=list.reduce((s,x)=>s+x.views,0)||1,mx=Math.max(1,...list.map(x=>x.views));
    return list.length?`<div class="hbars">${list.slice(0,8).map(x=>`<div class="hb"><span>${esc(name[x.k]||x.k)}</span><div class="track"><div class="fill" style="width:${x.views/mx*100}%;background:${col}"></div></div><span class="n">${(x.views/t*100).toFixed(0)}%</span></div>`).join('')}</div>`:empty('Appears after the next sync.')};
  const top=vids.filter(v=>v.vw>0).sort((a,b)=>b.vw-a.vw);
  const errs=YCH.filter(x=>ids.includes(x.channel_id)&&String(x.status||'').startsWith('error'));
  const net=v=>v.gained==null?null:(v.gained||0)-(v.lost||0);
  return `
  <div class="ytbar">${YCH.length>1?`<div class="seg" id="ytSeg" aria-label="Channel"><button data-c="all" aria-pressed="${state.yt==='all'}">Both channels</button>${YCH.map(x=>`<button data-c="${esc(x.channel_id)}" aria-pressed="${state.yt===x.channel_id}">${esc(x.title)}</button>`).join('')}</div>`:''}
    <span class="sub" style="margin:0">${end?`YouTube data up to ${dlabel(end)} (YouTube reports with a 2–3 day delay)`:'Waiting for first sync'}</span></div>
  ${errs.map(x=>`<p class="note">⚠️ ${esc(x.title)}: ${esc(String(x.status).replace(/^error: /,''))}</p>`).join('')}
  <div class="ytchs">${YCH.filter(x=>ids.includes(x.channel_id)).map(x=>`<a class="ytch" href="https://youtube.com/channel/${esc(x.channel_id)}" target="_blank" rel="noopener">${x.thumb?`<img src="${esc(x.thumb)}" alt="" referrerpolicy="no-referrer">`:''}<span><b>${esc(x.title)}</b><span class="sub">${Nn(x.subs)!=null?compact(+x.subs)+' subscribers · ':''}${Nn(x.videos)!=null?num(+x.videos)+' videos':''}</span></span></a>`).join('')}</div>
  <div class="grid kpis k4">
    ${kpi('Subscribers',subs||null,null,num,[],col)}
    ${kpi('Net new subscribers',net(T),net(P),num,w.map(r=>(r.gained||0)-(r.lost||0)),col)}
    ${kpi('Views',T.views,P.views,compact,w.map(r=>r.views),col)}
    ${kpi('Watch time (hours)',T.minutes!=null?T.minutes/60:null,P.minutes!=null?P.minutes/60:null,compact,w.map(r=>(r.minutes||0)/60),col)}
    ${kpi('Avg view duration',T.avg,P.avg,mmss,null,col)}
    ${kpi('Likes',T.likes,P.likes,compact,w.map(r=>r.likes),col)}
    ${kpi('Comments + shares',T.views!=null?(T.comments||0)+(T.shares||0):null,P.views!=null?(P.comments||0)+(P.shares||0):null,num,w.map(r=>(r.comments||0)+(r.shares||0)),col)}
    ${kpi('Subs per 1,000 views',T.views?net(T)/T.views*1000:null,P.views?net(P)/P.views*1000:null,v=>v.toFixed(1),null,col)}
  </div>
  <div class="grid ins3" style="margin-top:16px">
    ${card('ins-good','✅ What is going right',I.good,'Nothing stands out yet.')}
    ${card('ins-bad','⚠️ What is going wrong',I.bad,'No problems found in this period. 👍')}
    ${card('ins-next','👉 Do this next',I.next,'Nothing pending.')}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Views</h2><p class="sub">Per ${per()}</p>${state.yt==='all'&&YCH.length>1?`<div class="legend">${YCH.map(x=>`<span><i class="sw" style="background:${x.color}"></i>${esc(x.title)}</span>`).join('')}</div>`:''}<div id="ytViews"></div></section>
    <section class="panel"><h2>Watch time</h2><p class="sub">Hours per ${per()}</p><div id="ytWatch"></div></section>
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Shorts vs long videos</h2><p class="sub">Share of views, last ${ytWin()} days</p>${fmtBars(fmt,FMT_NAMES)}
      ${fmt.length?`<p class="sub" style="margin-top:10px">${fmt.map(f=>`${esc(FMT_NAMES[f.k]||f.k)}: ${compact(f.minutes/60)} watch hours`).join(' · ')}</p>`:''}</section>
    <section class="panel"><h2>Where views come from</h2><p class="sub">Traffic sources, last ${ytWin()} days</p>${fmtBars(src,SRC_NAMES)}</section>
  </div>
  <div class="section-title">Top videos · last ${ytWin()} days · click to open</div>
  ${top.length?`<div class="cards ytcards">${top.slice(0,8).map(v=>`<a class="pcard" href="${esc(v.url)}" target="_blank" rel="noopener">
    <div class="pc-img">${thumb({thumb:v.thumb,format:v.type})}<span class="pc-badge" style="background:${v.ch?v.ch.color:'var(--yt)'}">${esc(v.type)}${YCH.length>1&&v.ch?' · '+esc(v.ch.title):''}</span></div>
    <div class="pc-body"><p class="pc-text" style="font-weight:600">${esc(v.title)}</p>
    <div class="pc-stats"><span><b>${compact(v.vw)}</b> views</span><span><b>${v.hrs?compact(v.hrs):'—'}</b> watch hrs</span><span><b>${v.pctv!=null?pct(v.pctv,0):'—'}</b> watched</span><span><b>${num(v.subs)}</b> subs</span></div>
    <p class="pc-date">Posted ${v.published?dlabel(toDate(v.published))+' '+toDate(v.published).getFullYear():'—'} · ${v.all!=null?compact(v.all)+' views all-time':''}</p></div></a>`).join('')}</div>`:empty('No video views in this period yet.')}
  <div class="section-title">Latest uploads</div>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>Video</th>${YCH.length>1?'<th>Channel</th>':''}<th>Type</th><th>Posted</th><th>Views (${ytWin()}d)</th><th>All-time views</th><th>Likes</th><th>Comments</th><th>% watched</th></tr></thead>
  <tbody>${vids.slice().sort((a,b)=>String(b.published).localeCompare(String(a.published))).slice(0,30).map(v=>`<tr><td class="post-title"><div class="pt">${thumb({thumb:v.thumb,format:v.type},'sm')}<a href="${esc(v.url)}" target="_blank" rel="noopener" style="color:inherit">${esc(v.title)}</a></div></td>${YCH.length>1?`<td>${esc(v.ch?v.ch.title:'')}</td>`:''}<td><span class="pill">${esc(v.type)}</span></td><td>${v.published?dlabel(toDate(v.published)):'—'}</td><td>${num(v.vw)}</td><td>${v.all!=null?num(v.all):'—'}</td><td>${Nn(v.likes_all)!=null?num(+v.likes_all):'—'}</td><td>${Nn(v.comments_all)!=null?num(+v.comments_all):'—'}</td><td>${v.pctv!=null?pct(v.pctv,0):'—'}</td></tr>`).join('')||`<tr><td colspan="9">${empty('No uploads found.')}</td></tr>`}</tbody></table></div></section>`;
}
function afterYoutube(){
  const seg=$('#ytSeg');if(seg)seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.yt=b.dataset.c;save();render()});
  if(!YCH.length) return;
  const ids=ytSel(),{arr}=ytDays(ids),n=state.range,c=arr.slice(DAYS-n),rows=n>30?ytWeeks(c):c;
  const col=state.yt==='all'?css('--yt'):css((YCH.find(x=>x.channel_id===state.yt)||{colorName:'--yt'}).colorName);
  if(!has(c,'views')){$('#ytViews').innerHTML=empty('No data for this period yet.');$('#ytWatch').innerHTML=empty('No data for this period yet.');return}
  const series=state.yt==='all'&&YCH.length>1?YCH.map(x=>({name:x.title,color:css(x.colorName),get:r=>r['v_'+x.channel_id]||0})):[{name:'Views',color:col,get:r=>r.views||0}];
  lineChart($('#ytViews'),rows,series,num,{label:'YouTube views'});
  barChart($('#ytWatch'),rows,r=>(r.minutes||0)/60,col,v=>compact(v)+' h',{name:'Watch hours',label:'Watch time'});
}

/* ---------- header + render ---------- */
(function header(){
  const L=DATA.lastSync, n=dates.length;
  const when=L&&L.time?new Date(L.time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):null;
  $('#conns').innerHTML=[['--fb','Facebook Page'],['--ig','Instagram'],['--ads','Ad account']].concat(YCH.map(c=>[c.colorName,c.title])).map(x=>`<span class="conn"><span class="dot" style="background:var(${x[0]})"></span>${x[1]}</span>`).join('');
  $('#syncNote').innerHTML = n
    ? `<span aria-hidden="true">●</span><span><b>Live data.</b> ${n} days synced from Meta${when?`, last sync ${esc(when)}`:''}. Updates automatically every morning.${L&&L.detail&&L.detail!=='OK'?` <span style="color:var(--ink-2)">Notes: ${esc(L.detail)}</span>`:''}</span>`
    : `<span aria-hidden="true">◆</span><span><b>No data yet.</b> Open the Google Sheet and run <b>Digital Poonam → 2. Load last 90 days</b>, then reload this page.</span>`;
})();
const views={overview:[overview,afterOverview],instagram:[()=>platform('ig'),()=>afterPlatform('ig')],facebook:[()=>platform('fb'),()=>afterPlatform('fb')],
  ads:[ads,afterAds],youtube:[youtube,afterYoutube],posts:[postsView,bindSort],audience:[audience,afterAudience]};
if(!views[state.tab]) state.tab='overview';
function render(){
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.tab===state.tab));
  document.querySelectorAll('#range button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.d===state.range));
  const c=slice(state.range);
  $('#rangeLabel').textContent=dlabel(c[0].d)+' – '+dlabel(c[c.length-1].d)+' '+c[c.length-1].d.getFullYear();
  const [html,after]=views[state.tab];$('#view').innerHTML=html();after();
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;state.tab=b.dataset.tab;save();render()});
$('#range').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.range=+b.dataset.d;save();render()});
let rt,lastW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-lastW)<2)return;lastW=innerWidth;clearTimeout(rt);rt=setTimeout(render,150)}); // only redraw when the width really changes
render();
})();
