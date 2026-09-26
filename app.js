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

const state={tab:'overview',range:30};
try{const s=JSON.parse(localStorage.getItem('dpi-live')||'{}');if(s.tab)state.tab=s.tab;if(s.range)state.range=s.range}catch(e){}
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

function ads(){
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
function afterAds(){
  const rows=buckets(),c=slice(state.range);
  if(S(c,'ad_leads')>0) lineChart($('#adCpl'),rows.filter(r=>r.ad_leads),[{name:'CPL',color:css('--ads'),get:r=>r.ad_spend/r.ad_leads}],inr2,{area:true,label:'Cost per lead'});
  else $('#adCpl').innerHTML=empty('No leads recorded in this period.');
  if(S(c,'ad_link_clicks')>0) barChart($('#adClicks'),rows,r=>r.ad_link_clicks||0,css('--ads'),num,{name:'Link clicks',label:'Link clicks'});
  else $('#adClicks').innerHTML=empty('No link clicks in this period.');
}

function thumb(r,size){
  const cls=size==='sm'?'th th-sm':'th';
  const ph=`<span class="${cls} th-ph" aria-hidden="true">${esc((r.format||'Post').slice(0,1))}</span>`;
  if(!r.thumb) return ph;
  return `<img class="${cls}" src="${esc(r.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='${ph.replace(/'/g,'&#39;').replace(/"/g,'&quot;')}'">`;
}
function postCards(list){
  if(!list.length) return '';
  return `<div class="cards">${list.map(r=>`<a class="pcard" href="${esc(r.link||'#')}" target="_blank" rel="noopener">
    <div class="pc-img">${thumb(r)}<span class="pc-badge" style="background:${r.platform==='Instagram'?'var(--ig)':'var(--fb)'}">${r.platform==='Instagram'?'IG':'FB'} · ${esc(r.format)}</span></div>
    <div class="pc-body"><p class="pc-text">${esc(r.text||'(no caption)')}</p>
    <div class="pc-stats"><span><b>${r.reach!=null?compact(r.reach):'—'}</b> reach</span><span><b>${r.likes!=null?num(r.likes):'—'}</b> likes</span><span><b>${r.comments!=null?num(r.comments):'—'}</b> comments</span></div>
    <p class="pc-date">${dlabel(toDate(String(r.date).slice(0,10)))}</p></div></a>`).join('')}</div>`;
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

/* ---------- header + render ---------- */
(function header(){
  const L=DATA.lastSync, n=dates.length;
  const when=L&&L.time?new Date(L.time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):null;
  $('#conns').innerHTML=[['--fb','Facebook Page'],['--ig','Instagram'],['--ads','Ad account']].map(x=>`<span class="conn"><span class="dot" style="background:var(${x[0]})"></span>${x[1]}</span>`).join('');
  $('#syncNote').innerHTML = n
    ? `<span aria-hidden="true">●</span><span><b>Live data.</b> ${n} days synced from Meta${when?`, last sync ${esc(when)}`:''}. Updates automatically every morning.${L&&L.detail&&L.detail!=='OK'?` <span style="color:var(--ink-2)">Notes: ${esc(L.detail)}</span>`:''}</span>`
    : `<span aria-hidden="true">◆</span><span><b>No data yet.</b> Open the Google Sheet and run <b>Digital Poonam → 2. Load last 90 days</b>, then reload this page.</span>`;
})();
const views={overview:[overview,afterOverview],instagram:[()=>platform('ig'),()=>afterPlatform('ig')],facebook:[()=>platform('fb'),()=>afterPlatform('fb')],
  ads:[ads,afterAds],posts:[postsView,bindSort],audience:[audience,afterAudience]};
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
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(render,150)});
render();
})();
