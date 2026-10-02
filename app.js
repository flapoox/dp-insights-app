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

const state={tab:'home',range:30,yt:'all'};
try{const s=JSON.parse(localStorage.getItem('dpi-live')||'{}');if(s.tab)state.tab=s.tab;if(s.range)state.range=s.range;if(s.yt)state.yt=s.yt;if(s.cw)state.cw=s.cw;if(s.hp)state.hp=s.hp;if(s.pr)state.pr=s.pr;if(s.pm)state.pm=s.pm}catch(e){}
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
  return `<span class="delta ${cls}">${ch>0?'▲':'▼'} ${Math.abs(ch).toFixed(1)}%</span><span class="flat" style="font-size:11.5px">vs previous ${state.range} days</span>`;
}
function kpi(label,cur,prev,fmt,sparkVals,color,invert){
  const vals=(sparkVals||[]).map(v=>v==null?0:v);
  return `<div class="kpi"><div class="lbl"><span class="sw" style="background:${color}"></span>${label}</div>
    <div class="val">${cur==null?'—':fmt(cur)}</div>${cur==null?'<span class="delta flat">Not available yet</span>':delta(cur,prev,invert)}${vals.length>1&&cur!=null?spark(vals,color):''}</div>`;
}
const empty=(msg)=>`<p class="sub" style="margin:0;padding-block:24px;text-align:center">${msg}</p>`;

/* ---------- chart primitives (3.0: bars only, brand orange) ---------- */
// small bar sparkline: last bar strong, others faded
function spark(values,color){
  const v=values.map(x=>x==null||isNaN(x)?0:+x), n=v.length; if(n<2) return '';
  const w=200,h=34,gap=n>20?2:4,bw=(w-gap*(n-1))/n,mx=Math.max(...v),mn=Math.min(...v)*0.6,r=(mx-mn)||1;
  const c=css('--accent');
  return `<svg class="mini" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${v.map((x,i)=>{const bh=Math.max(3,(x-mn)/r*(h-2));
    return `<rect x="${(i*(bw+gap)).toFixed(1)}" y="${(h-bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(3,bw/2).toFixed(1)}" fill="${c}" fill-opacity="${i===n-1?1:.38}"/>`}).join('')}</svg>`;
}
function niceMax(v){const e=Math.pow(10,Math.floor(Math.log10(v||1)));const f=v/e;return(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*e}
function axisTicks(max){const m=niceMax(max);return[0,m/4,m/2,m*3/4,m].map(v=>({v,m}))}

// Stacked/simple bar chart for white panels. series: [{name,get}] ; first series in brand orange.
function stackBars(host,rows,series,fmt,opts={}){
  const W=720,H=opts.h||230,P={l:46,r:8,t:12,b:26};
  const iw=W-P.l-P.r, ih=H-P.t-P.b, n=rows.length;
  const cols=[css('--accent'),css('--ink-2'),css('--muted')];
  const tot=r=>series.reduce((s,x)=>s+(+x.get(r)||0),0);
  const max=niceMax(Math.max(1,...rows.map(tot)));
  const bw=iw/n, gap=Math.max(1,Math.min(8,bw*0.28)), w=Math.max(1,bw-gap);
  const y=v=>P.t+ih-v/max*ih;
  const step=Math.max(1,Math.ceil(n/6));
  let g=[0,.5,1].map(f=>f*max).map(t=>`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${P.l-8}" y="${y(t)+3.5}" text-anchor="end">${opts.tick?opts.tick(t):compact(t)}</text>`).join('');
  const rr=Math.min(5,w/2);
  rows.forEach((row,i)=>{
    const x0=P.l+i*bw+gap/2; let base=0;
    series.forEach((s,k)=>{const v=+s.get(row)||0; if(v<=0) return; const y1=y(base+v), y0=y(base), h=y0-y1; const top=k===series.length-1||series.slice(k+1).every(z=>!(+z.get(row)>0));
      const r=top?Math.min(rr,h):0;
      g+=`<path class="b b${i}" d="M${x0} ${y0} V${y1+r} Q${x0} ${y1} ${x0+r} ${y1} H${x0+w-r} Q${x0+w} ${y1} ${x0+w} ${y1+r} V${y0}Z" fill="${cols[k%cols.length]}"/>`; base+=v;});
    if(i%step===0||i===n-1&&n<=8) g+=`<text x="${x0+w/2}" y="${H-6}" text-anchor="middle">${dlabel(row.d)}</text>`;
  });
  g+=`<rect class="hit" x="${P.l}" y="${P.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
  host.innerHTML=`<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label||''}">${g}</svg><div class="tip" hidden></div></div>`;
  const svg=host.querySelector('svg'),tip=host.querySelector('.tip');
  const show=e=>{
    const b=svg.getBoundingClientRect(),sx=(e.clientX-b.left)/b.width*W;
    const i=Math.max(0,Math.min(n-1,Math.floor((sx-P.l)/bw)));
    svg.querySelectorAll('.b').forEach(el=>el.setAttribute('opacity',el.classList.contains('b'+i)?1:.4));
    tip.innerHTML=`<b>${dlabel(rows[i].d)} ${rows[i].d.getFullYear()}</b>`+series.map((s,k)=>`<div class="row"><span class="sw" style="background:${cols[k%cols.length]}"></span>${s.name}: <b>${fmt(+s.get(rows[i])||0)}</b></div>`).join('');
    tip.hidden=false;
    let left=(P.l+i*bw+bw/2)/W*b.width;left=Math.max(80,Math.min(b.width-80,left));
    tip.style.left=left+'px';tip.style.top=(y(tot(rows[i]))/H*b.height)+'px';
  };
  svg.addEventListener('pointermove',show);svg.addEventListener('pointerdown',show);
  svg.addEventListener('pointerleave',()=>{tip.hidden=true;svg.querySelectorAll('.b').forEach(el=>el.setAttribute('opacity',1))});
}
// old names kept so every screen draws bars now
function lineChart(host,rows,series,fmt,opts={}){ stackBars(host,rows,series.slice(0,3),fmt,opts); }
function barChart(host,rows,get,color,fmt,opts={}){ stackBars(host,rows,[{name:opts.name||'',get}],fmt,opts); }

// Black card bars you can tap. items:[{v,label,on,best,tip}] ; returns html. onPick handled by caller via data-i.
function tapBars(items,opts={}){
  const vals=items.map(x=>x.v==null||isNaN(x.v)?0:+x.v), mx=Math.max(1,...vals), mn=Math.min(0,...vals);
  const H=opts.sm?70:120, dense=items.length>14;
  return `<div class="bc-bars${opts.sm?' sm':''}${dense?' bc-dense':''}" role="group" aria-label="${esc(opts.label||'Bars')}">${items.map((x,i)=>{
    const h=Math.max(5,Math.round((vals[i]-mn)/((mx-mn)||1)*H));
    return `<button type="button" class="bc-b${x.on?' on':''}${x.best&&!x.on?' best':''}" data-i="${i}" aria-label="${esc(x.aria||'')}" aria-pressed="${x.on?'true':'false'}"><span>${esc(x.tip||'')}</span><i data-h="${h}" style="height:${opts.grow?4:h}px"></i></button>`}).join('')}</div>
  <div class="bc-lab" aria-hidden="true">${items.map(x=>`<span class="${x.on?'on':''}">${esc(x.label||'')}</span>`).join('')}</div>`;
}
function growBars(root){ requestAnimationFrame(()=>requestAnimationFrame(()=>root.querySelectorAll('.bc-b i[data-h]').forEach(i=>i.style.height=i.dataset.h+'px'))); }


/* ---------- views ---------- */

/* ---------- Instagram / Facebook: filter, tappable bars, day boxes ---------- */
const PDEF={
  ig:{name:'Instagram',plat:'Instagram',F:'ig_followers',
    metrics:[['reach','Reach','ig_reach'],['views','Views','ig_views'],['net','New followers',null],['eng','Interactions','ig_interactions']],
    net:r=>r.ig_follows==null?null:(r.ig_follows||0)-(r.ig_unfollows||0),
    boxes:[['Reach','ig_reach'],['Views','ig_views'],['Followers','F'],['Interactions','ig_interactions'],['Profile visits','ig_profile_views'],['Link taps','ig_link_taps']]},
  fb:{name:'Facebook',plat:'Facebook',F:'fb_followers',
    metrics:[['reach','Reach','fb_reach'],['views','Views','fb_views'],['net','New follows',null],['eng','Engagements','fb_engagements']],
    net:r=>r.fb_new_follows,
    boxes:[['Reach','fb_reach'],['Views','fb_views'],['Followers','F'],['Engagements','fb_engagements']]}
};
if(!['d',7,30].includes(state.pr)) state.pr=7;
if(!state.pm) state.pm='reach';
const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dfull=d=>WD[d.getDay()]+', '+dlabel(d);
const pctCh=(a,b)=>a==null||b==null||!b?null:(a-b)/Math.abs(b)*100;
function pchip(p,vs){if(p==null) return `<span class="dp flat">No earlier data</span>`;
  const up=p>=0;return `<span class="dp ${Math.abs(p)<0.5?'flat':up?'up':'down'}">${up?'▲':'▼'} ${Math.abs(p).toFixed(Math.abs(p)<10?1:0)}%</span><span class="vs">${vs}</span>`}
function platform(which){
  const P=PDEF[which], mode=state.pr, isDay=mode==='d', n=isDay?7:mode;
  const mdef=P.metrics.find(m=>m[0]===state.pm)||P.metrics[0];
  const val=(r,k)=>k==='net'?P.net(r):r[k];
  const mkey=mdef[0]==='net'?'net':mdef[2];
  const win=days.slice(DAYS-n), prevWin=days.slice(DAYS-2*n,DAYS-n);
  if(state.psel==null||state.psel>=n) state.psel=n-1;
  const sel=isDay?n-1:state.psel, day=win[sel], prev=days[DAYS-n+sel-1];
  const lastLabel=(()=>{const t=new Date();t.setHours(0,0,0,0);const y=new Date(t);y.setDate(t.getDate()-1);return ymd(END)===ymd(y)?'Yesterday':dlabel(END)})();
  const sumOf=(a,k)=>{let t=0,any=false;a.forEach(r=>{const v=val(r,k);if(v!=null){t+=v;any=true}});return any?t:null};
  // summary card
  let sLabel,sRange,sVal,sP,sNote;
  const postsOf=d=>(DATA.posts||[]).filter(x=>x.platform===P.plat&&String(x.date).slice(0,10)===ymd(d));
  const reelsIn=a=>a.reduce((t,r)=>t+postsOf(r.d).filter(x=>/reel|video/i.test(x.format)).length,0);
  if(isDay){
    const rk=P.metrics[0][2]; sLabel='Reach · '+lastLabel.toLowerCase(); sRange=dfull(day.d);
    sVal=day[rk]; sP=pctCh(day[rk],prev&&prev[rk]);
    const np=postsOf(day.d).length, nf=P.net(day);
    sNote=`${np} post${np===1?'':'s'} that day${nf!=null?` · ${nf>=0?'+':''}${num(nf)} followers`:''} · data syncs every morning`;
  } else {
    const t=sumOf(win,mkey), pt=sumOf(prevWin,mkey);
    sLabel=mdef[1]+' · last '+n+' days'; sRange=dlabel(win[0].d)+' – '+dlabel(win[n-1].d);
    sVal=t; sP=pctCh(t,pt);
    const nf=sumOf(win,'net');
    sNote=`${reelsIn(win)} Reels/videos posted${nf!=null?` · ${nf>=0?'+':''}${num(nf)} followers`:''}`;
  }
  const big=v=>v==null?'—':(mdef[0]==='net'&&!isDay&&v>0?'+':'')+num(v);
  const sum=`<section class="psum"><div class="ps-top"><span>${sLabel}</span><span>${sRange}</span></div>
    <div class="ps-main"><span class="ps-big">${big(sVal)}</span>${sP==null?'':`<span class="ps-d ${Math.abs(sP)<0.5?'flat':sP>0?'up':'down'}">${sP>0?'▲':'▼'} ${Math.abs(sP).toFixed(Math.abs(sP)<10?1:0)}% ${isDay?'vs day before':'vs previous '+n+' days'}</span>`}</div>
    <div class="ps-note">${sNote}</div></section>`;
  // bar chart
  let chart='';
  if(!isDay){
    const vals=win.map(r=>val(r,mkey)), have=vals.some(v=>v!=null);
    const vv=vals.map(v=>v==null?-Infinity:v), bi=vv.indexOf(Math.max(...vv));
    const lv=vals.map(v=>v==null?Infinity:v), li=lv.indexOf(Math.min(...lv));
    const items=win.map((r,i)=>({v:vals[i],on:i===sel,best:i===bi,tip:vals[i]==null?'—':compact(vals[i]),
      label:n===7?WD[r.d.getDay()]:((i%5===0||i===n-1)?String(r.d.getDate()):''),aria:dfull(r.d)+': '+(vals[i]==null?'no data':num(vals[i]))}));
    chart=`<section class="dkcard bchart" style="margin-top:12px">
      <div class="bc-chips" role="group" aria-label="What the bars show">${P.metrics.map(m=>`<button type="button" data-pm="${m[0]}" aria-pressed="${m[0]===mdef[0]}">${m[1]}</button>`).join('')}</div>
      <div class="bc-hint">Tap a bar to see that day</div>
      ${have?tapBars(items,{label:mdef[1]+' per day',grow:state._grow}):`<p class="bc-hint" style="padding:30px 0;text-align:center">No ${mdef[1].toLowerCase()} data yet.</p>`}
      ${have?`<div class="bc-foot"><span>Best: <b class="g">${dfull(win[bi].d)} (${compact(vals[bi])})</b></span><span>Lowest: <b class="r">${dfull(win[li].d)} (${compact(vals[li])})</b></span></div>`:''}
    </section>`;
  }
  // day boxes
  const pool=isDay?days.slice(DAYS-7):win;
  const tag=k=>{if(isDay) return '';const a=pool.map(r=>r[k]).filter(v=>v!=null);if(a.length<3||day[k]==null) return '';
    if(day[k]===Math.max(...a)) return `<span class="tg hi">● Highest in ${n} days</span>`;
    if(day[k]===Math.min(...a)) return `<span class="tg lo">● Lowest in ${n} days</span>`;return ''};
  const vsT=isDay?'vs day before':'vs day before';
  const boxes=P.boxes.map(([lab,k])=>{
    if(k==='F'){const f=day[P.F], nf=P.net(day);
      return `<div class="dbox"><span class="k">${lab}</span><span class="v">${f==null?'—':num(f)}</span><span class="dp ${nf==null?'flat':nf>=0?'up':'down'}">${nf==null?'No data':(nf>=0?'+':'')+num(nf)}</span><span class="vs">${nf==null?'':'new this day'}</span><span class="tg"></span></div>`}
    const v=day[k];
    return `<div class="dbox"><span class="k">${lab}</span><span class="v">${v==null?'—':num(v)}</span>${v==null?'<span class="dp flat">Not available</span>':pchip(pctCh(v,prev&&prev[k]),vsT)}${tag(k)||'<span class="tg"></span>'}</div>`}).join('');
  const dp=postsOf(day.d);
  const postsHtml=`<section class="panel dposts"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Posted this day</h2><span class="pill">${dp.length} post${dp.length===1?'':'s'}</span></div>
    ${dp.length?dp.map(x=>`<a class="dpost" href="${esc(x.link||'#')}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${thumb(x,'sm')}<span class="t"><b>${esc(String(x.text||'(no caption)').slice(0,80))}</b><span>${esc(x.format)}</span></span><span class="r"><b>${x.reach!=null?compact(x.reach):'—'}</b><span>reach</span></span></a>`).join('')
      :`<p class="sub" style="margin:8px 0 0">Nothing posted. Reach came from older posts.</p>`}</section>`;
  // suggestion
  const rk=P.metrics[0][2], avgR=(()=>{const a=pool.map(r=>r[rk]).filter(v=>v!=null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null})();
  const diff=avgR&&day[rk]!=null?Math.round((day[rk]-avgR)/avgR*100):null;
  const reels=dp.filter(x=>/reel|video/i.test(x.format)).length;
  let tipT='Keep posting at the times your audience is online (see Audience).';
  if(diff!=null){
    if(!reels&&diff<0) tipT=`No Reel this day, and reach was ${Math.abs(diff)}% below your average. Days with a Reel usually reach more people.`;
    else if(diff>=15) tipT=`Strong day: reach ${diff}% above your average. Make one more post in the same format this week.`;
    else if(diff<=-15) tipT=`Reach ${Math.abs(diff)}% below average${reels?' even with a Reel':''}. Try a stronger hook in the first 2 seconds, or post in the evening.`;
    else tipT=`A normal day, close to your average reach. Evening Reels tend to do best.`;
  }
  const tip=`<div class="ptip"><span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"></path></svg></span><div><b>Suggestion</b><span>${tipT}</span></div></div>`;
  const posts=(DATA.posts||[]).filter(x=>x.platform===P.plat);
  const from=ymd(win[0].d);
  return `
  <div class="pfilter" role="group" aria-label="Period">${[['d',lastLabel],[7,'7 days'],[30,'30 days']].map(o=>`<button type="button" data-pr="${o[0]}" aria-pressed="${state.pr===o[0]}">${o[1]}</button>`).join('')}</div>
  ${sum}${chart}
  <div class="pday"><h2>${isDay?lastLabel+', '+dlabel(day.d):dfull(day.d)}</h2><p>${isDay?'Compared with the day before':'Compared with the day before · tap another bar to change'}</p></div>
  <div class="dboxes">${boxes}</div>
  ${postsHtml}${tip}
  <div class="section-title">Top ${P.name} posts · last ${n} days</div>
  ${postCards(posts.filter(x=>x.date&&String(x.date).slice(0,10)>=from).sort((a,b)=>(+b.reach||0)-(+a.reach||0)).slice(0,4))||`<section class="panel">${empty('No posts in this period.')}</section>`}
  <div class="section-title">All ${P.name} posts · tap a column to sort</div>
  <section class="panel">${postTable(posts,from)}</section>`;
}
function afterPlatform(which){
  const v=$('#view');
  v.querySelectorAll('[data-pr]').forEach(b=>b.addEventListener('click',()=>{const x=b.dataset.pr;state.pr=x==='d'?'d':+x;state.psel=null;state._grow=true;save();render();state._grow=false}));
  v.querySelectorAll('[data-pm]').forEach(b=>b.addEventListener('click',()=>{state.pm=b.dataset.pm;state._grow=true;save();render();state._grow=false}));
  v.querySelectorAll('.bc-b').forEach(b=>b.addEventListener('click',()=>{state.psel=+b.dataset.i;render()}));
  growBars(v);
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
/* ---------- who is signed in, and what their role allows ---------- */
const ME=DATA.me||{name:'Owner',role:'owner',roleName:'Owner',can:{analytics:true,ads:true,adActions:true,scriptStatus:true,team:true,publish:true,approve:true}};
const CAN=k=>!!(ME.can&&ME.can[k]);
const TAB_NEEDS={channels:'analytics',instagram:'analytics',facebook:'analytics',youtube:'analytics',website:'analytics',posts:'analytics',audience:'analytics',ads:'ads',publish:'publish',scripts:'scriptStatus',team:'team'};
const allowed=t=>!TAB_NEEDS[t]||CAN(TAB_NEEDS[t]);
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
      <span class="pc-badge" style="background:${on?'#17734A':'#57534E'}">${on?'Live':'Off'}</span></div>
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
    ${CAN('adActions')?`<div class="pc-foot">${btn('🚀 Boost',{action:'boost',postId:r.id,platform:r.platform,caption:r.text,thumb:r.thumb},'a-ghost sm')}</div>`:''}</div>`).join('')}</div>`;
}
let sortKey='reach',sortDir=-1;
function postTable(list,fromDate){
  const from=fromDate||ymd(slice(state.range)[0].d);
  const rows=list.filter(x=>x.date&&String(x.date).slice(0,10)>=from).sort((a,b)=>((a[sortKey]??-1)>(b[sortKey]??-1)?1:-1)*sortDir);
  if(!rows.length) return empty('No posts in this period. Try a longer range.');
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
      ${ages.length?`<div class="legend"><span><i class="sw" style="background:var(--accent)"></i>Women</span><span><i class="sw" style="background:var(--ink-2)"></i>Men</span></div>
      <div class="hbars">${ages.map(a=>{const x=ag[a];return `<div class="hb"><span>${esc(a)}</span><div class="track" style="background:none"><div class="fill" style="width:${x.F/mx*100}%;background:var(--accent);border-radius:5px 0 0 5px"></div><div class="fill" style="width:${x.M/mx*100}%;background:var(--ink-2)"></div></div><span class="n">${((x.F+x.M+x.U)/tot*100).toFixed(1)}%</span></div>`}).join('')}</div>`:empty('Meta shares age and gender only for accounts with 100+ followers.')}</section>
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
const YT_CH='https:'+'/'+'/youtube.com/channel/';
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
    return list.length?`<div class="hbars">${list.slice(0,8).map(x=>`<div class="hb"><span>${esc(name[x.k]||x.k)}</span><div class="track"><div class="fill" style="width:${x.views/mx*100}%;background:var(--accent)"></div></div><span class="n">${(x.views/t*100).toFixed(0)}%</span></div>`).join('')}</div>`:empty('Appears after the next sync.')};
  const top=vids.filter(v=>v.vw>0).sort((a,b)=>b.vw-a.vw);
  const errs=YCH.filter(x=>ids.includes(x.channel_id)&&String(x.status||'').startsWith('error'));
  const net=v=>v.gained==null?null:(v.gained||0)-(v.lost||0);
  return `
  <div class="ytbar">${YCH.length>1?`<div class="seg" id="ytSeg" aria-label="Channel"><button data-c="all" aria-pressed="${state.yt==='all'}">Both channels</button>${YCH.map(x=>`<button data-c="${esc(x.channel_id)}" aria-pressed="${state.yt===x.channel_id}">${esc(x.title)}</button>`).join('')}</div>`:''}
    <span class="sub" style="margin:0">${end?`YouTube data up to ${dlabel(end)} (YouTube reports with a 2–3 day delay)`:'Waiting for first sync'}</span></div>
  ${errs.map(x=>`<p class="note">⚠️ ${esc(x.title)}: ${esc(String(x.status).replace(/^error: /,''))}</p>`).join('')}
  <div class="ytchs">${YCH.filter(x=>ids.includes(x.channel_id)).map(x=>`<a class="ytch" href="${esc(YT_CH+x.channel_id)}" target="_blank" rel="noopener">${x.thumb?`<img src="${esc(x.thumb)}" alt="" referrerpolicy="no-referrer">`:''}<span><b>${esc(x.title)}</b><span class="sub">${Nn(x.subs)!=null?compact(+x.subs)+' subscribers · ':''}${Nn(x.videos)!=null?num(+x.videos)+' videos':''}</span></span></a>`).join('')}</div>
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

/* ---------- Scripts + teleprompter ---------- */
const STYPE={FACE:{n:'Face shoot',ic:'📸',c:'var(--ig)'},CLONE:{n:'AI clone',ic:'🤖',c:'var(--accent)'},ANIMATION:{n:'Animation',ic:'🎞️',c:'var(--yt)'},FACELESS:{n:'Faceless',ic:'🎧',c:'var(--ads)'}};
const SSTAT=['To do','Shot','Edited','Posted'];
const SC=(DATA.scripts||[]).slice().sort((a,b)=>String(a.post_on||'9').localeCompare(String(b.post_on||'9'))||(+a.priority||99)-(+b.priority||99));
if(!state.sf) state.sf='ALL'; if(!state.ss) state.ss='open';
const sdate=s=>{const d=toDate(String(s||'').slice(0,10));return isNaN(d)?'':dlabel(d)};
function scriptText(x){const T=STYPE[x.type]||{n:x.type};
  return ['#'+x.priority+' '+x.title,'Type: '+T.n+' | Owner: '+x.owner+' | Post on: '+sdate(x.post_on),'','HOOK: '+x.hook,'','SCRIPT:',x.script,'','ON-SCREEN TEXT: '+x.on_screen,'','EDITOR NOTES: '+x.visuals,'','CAPTION: '+x.caption,'','AI label on Instagram: '+x.ai_label].join('\n')}
function scriptsView(){
  if(!SC.length) return `<section class="panel">${empty('No scripts yet. Ask Claude for this month\'s scripts.')}</section>`;
  const open=SC.filter(x=>x.status!=='Posted');
  const cnt=t=>open.filter(x=>x.type===t).length;
  const list=SC.filter(x=>(state.sf==='ALL'||x.type===state.sf)&&(state.ss==='all'||(state.ss==='open'?x.status!=='Posted':x.status==='Posted')));
  const nFace=cnt('FACE');
  const plan=[
    ['FACE',`${nFace} to shoot`,nFace?`One session with your photographer, about ${nFace*10+30} min. Same spot, change outfit between scripts. Use the teleprompter below.`:'Nothing left to shoot.'],
    ['CLONE',`${cnt('CLONE')} for the editor`,'Editor pastes the script into HeyGen with your avatar and voice. Turn on the AI label when posting.'],
    ['ANIMATION',`${cnt('ANIMATION')} for the editor`,'Fully AI-animated film with your cloned voice, like your Ganesha film. Needs 1 to 2 days, so start early.'],
    ['FACELESS',`${cnt('FACELESS')} for the editor`,'Text, b-roll or screen recording with your cloned voice. The editor can batch these in one sitting.']];
  return `
  <div class="hhead" style="margin-bottom:14px"><div><h2 class="hello">Scripts</h2><p class="sub" style="margin:4px 0 0">${open.length} to make · newest posting dates first</p></div></div>
  <div class="grid splan">${plan.map(p=>`<div class="kpi"><div class="lbl"><span class="sw" style="background:${STYPE[p[0]].c}"></span>${STYPE[p[0]].ic} ${STYPE[p[0]].n}</div><div class="val" style="font-size:22px">${p[1]}</div><p class="sub" style="margin:6px 0 0">${p[2]}</p></div>`).join('')}</div>
  <div class="ybar" style="margin-top:16px">
    <div class="seg" id="sfSeg">${[['ALL','All'],...Object.keys(STYPE).map(k=>[k,STYPE[k].ic+' '+STYPE[k].n])].map(o=>`<button data-v="${o[0]}" aria-pressed="${state.sf===o[0]}">${o[1]}</button>`).join('')}</div>
    <div class="seg" id="ssSeg">${[['open','To make'],['posted','Posted'],['all','All']].map(o=>`<button data-v="${o[0]}" aria-pressed="${state.ss===o[0]}">${o[1]}</button>`).join('')}</div>
  </div>
  <div class="scards">${list.map(x=>{const T=STYPE[x.type]||{n:x.type,ic:'',c:'var(--muted)'};
    return `<article class="scard" data-id="${esc(x.id)}">
      <div class="sc-top"><span class="sc-no">#${esc(x.priority)}</span><span class="sc-type">${T.ic} ${esc(T.n)}</span><span class="sub" style="margin:0">Post on <b>${esc(sdate(x.post_on))}</b></span>
        <select class="sc-st" aria-label="Status" ${CAN('scriptStatus')?'':'disabled'}>${SSTAT.map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></div>
      <h3>${esc(x.title)}</h3>
      <p class="sc-owner">${esc(x.owner)} · ${esc(x.pillar||'')}</p>
      <blockquote>${esc(x.hook)}</blockquote>
      <details><summary>Full script and notes</summary>
        <div class="sc-body">${String(x.script||'').split('\n').map(l=>`<p>${esc(l)}</p>`).join('')}</div>
        <dl><dt>On-screen text</dt><dd>${esc(x.on_screen)}</dd><dt>Editor notes</dt><dd>${esc(x.visuals)}</dd><dt>Caption</dt><dd>${esc(x.caption)}</dd><dt>AI label on Instagram</dt><dd>${esc(x.ai_label)}</dd></dl>
      </details>
      <div class="ins-acts"><button type="button" class="abtn a-good sm sc-tp">▶ Teleprompter</button><button type="button" class="abtn a-ghost sm sc-copy">📋 Copy for editor</button></div>
    </article>`}).join('')||empty('No scripts match this filter.')}</div>`;
}
function copyText(t){
  const fall=()=>{const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();return ok};
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(()=>true,()=>fall());
  return Promise.resolve(fall());
}
function sendScriptStatus(id,status){
  if(window.DP_ACTION) return window.DP_ACTION({scriptStatus:{id,status}});
  return new Promise(res=>{try{google.script.run.withSuccessHandler(res).withFailureHandler(e=>res({error:'net',message:String(e&&e.message||e)})).setScriptStatus(id,status)}catch(e){res({error:'net',message:'Not available here.'})}});
}
function afterScripts(){
  const seg=(id,key)=>{const el=$(id);if(el)el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state[key]=b.dataset.v;save();render()})};
  seg('#sfSeg','sf');seg('#ssSeg','ss');
  document.querySelectorAll('.scard').forEach(card=>{
    const x=SC.find(s=>s.id===card.dataset.id);if(!x)return;
    card.querySelector('.sc-tp').addEventListener('click',()=>openTeleprompter(x));
    const cb=card.querySelector('.sc-copy');
    cb.addEventListener('click',()=>copyText(scriptText(x)).then(ok=>{cb.textContent=ok?'✓ Copied':'Copy failed';setTimeout(()=>cb.textContent='📋 Copy for editor',1800)}));
    const sel=card.querySelector('.sc-st');
    sel.addEventListener('change',()=>{const prev=x.status,v=sel.value;sel.disabled=true;
      sendScriptStatus(x.id,v).then(r=>{sel.disabled=false;if(r&&r.ok){x.status=v}else{sel.value=prev;alertBox((r&&r.message)||'Could not save.')}})});
  });
}
function alertBox(msg){const n=document.createElement('div');n.className='toast';n.textContent=msg;document.body.appendChild(n);setTimeout(()=>n.remove(),3500)}

/* ---------- Competition ---------- */
const CMP=DATA.comp||{}, HS='https:'+'/'+'/';
const CR=(CMP.creators||[]).map(c=>({...c,key:c.platform+':'+c.handle,isMe:c.self==='yes'}));
const CP=(CMP.posts||[]).map(p=>({...p,eng:Nn(p.eng),ratio:Nn(p.ratio),likes:Nn(p.likes),comments:Nn(p.comments),views:Nn(p.views)}));
if(![7,30].includes(state.cw)) state.cw=7;
const crOf=h=>CR.find(c=>c.handle===h)||{};
const profUrl=c=>c.platform==='yt'?HS+'www.youtube.com/@'+encodeURIComponent(c.handle):HS+'www.instagram.com/'+encodeURIComponent(c.handle)+'/';
const adLib=c=>HS+'www.facebook.com/ads/library/?active_status=active&ad_type=all&country=IN&search_type=keyword_unordered&q='+encodeURIComponent(c.name||c.handle);
const gAds=HS+'adstransparency.google.com/?region=IN';
function growth(c){
  const h=(CMP.history||[]).filter(r=>r.handle===c.key&&Nn(r.followers)!=null).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  if(h.length<2) return null;
  const last=h[h.length-1],lim=ymd(new Date(toDate(last.date).getTime()-7*864e5));
  const base=h.filter(r=>r.date<=lim).pop()||h[0];
  return {n:+last.followers-(+base.followers),days:Math.round((toDate(last.date)-toDate(base.date))/864e5)};
}
function compBrief(p){const c=crOf(p.handle);
  return ['REFERENCE (do not copy, make our version)','Creator: '+(c.name||p.handle)+' (@'+p.handle+')','Link: '+p.link,
    'Why: '+(p.ratio!=null?p.ratio+'x their usual engagement':'top post')+', posted '+p.date,'Their caption: '+(p.text||'—'),'',
    'OUR VERSION','Audience: homemakers (Road 1: marketer for local shops / Road 2: own skill online)','Type: CLONE / FACELESS / FACE / ANIMATION (pick one)',
    'Hook (first 2 sec): ','Our angle: ','CTA: comment keyword'].join('\n')}
function competition(){
  if(!CR.length) return `<section class="panel">${empty('No competition data yet. In the Google Sheet run <b>Digital Poonam → Competition → Sync competition now</b>, then reload.')}</section>`;
  const W=state.cw,from=ymd(new Date(Date.now()-W*864e5));
  const others=CR.filter(c=>!c.isMe).map(c=>c.handle);
  const inWin=CP.filter(p=>others.includes(p.handle)&&p.date>=from&&p.ratio!=null);
  let viral=inWin.filter(p=>p.ratio>=2).sort((a,b)=>b.ratio-a.ratio),fallback=false;
  if(!viral.length){viral=inWin.slice().sort((a,b)=>b.ratio-a.ratio).slice(0,6);fallback=true}
  const errs=CR.filter(c=>c.status&&c.status!=='ok');
  const rows=CR.slice().sort((a,b)=>(b.isMe-a.isMe)||((+b.followers||0)-(+a.followers||0)));
  const fmtBy={};CP.filter(p=>others.includes(p.handle)&&p.date>=ymd(new Date(Date.now()-30*864e5))).forEach(p=>{const f=fmtBy[p.kind]=fmtBy[p.kind]||{n:0,hit:0};f.n++;if(p.ratio>=2)f.hit++});
  const me=CR.find(c=>c.isMe),meP=me?CP.filter(p=>p.handle===me.handle):[];
  return `
  <div class="hhead"><div><h2 class="hello">Competitors</h2><p class="sub" style="margin:4px 0 0">What works for others, and ideas for your next post</p></div></div>
  <p class="sub" style="margin:6px 0 12px">Public data from ${CR.filter(c=>!c.isMe).length} creators you follow (Instagram business/creator accounts and YouTube). Refreshes every morning. <b>Viral</b> = a post with at least 2× that creator's usual engagement (likes + comments; views on YouTube).</p>
  ${errs.map(c=>`<p class="note">⚠️ @${esc(c.handle)}: ${esc(c.status)}</p>`).join('')}
  <div class="ytbar"><div class="seg" id="cwSeg" aria-label="Window"><button data-v="7" aria-pressed="${W===7}">This week</button><button data-v="30" aria-pressed="${W===30}">Last 30 days</button></div>
    <span class="sub" style="margin:0">${fallback?`No 2× outliers in the last ${W} days, showing their best posts instead.`:`${viral.length} viral post${viral.length===1?'':'s'} in the last ${W} days`}</span></div>
  <div class="section-title">🔥 ${fallback?'Best performing':'Viral'} · click a card to open, copy a brief for your editor</div>
  ${viral.length?`<div class="cards compcards">${viral.slice(0,12).map((p,i)=>{const c=crOf(p.handle);return `<div class="pcard">
    <a class="pc-link" href="${esc(p.link)}" target="_blank" rel="noopener"><div class="pc-img ${p.platform==='yt'?'yt':''}">${thumb({thumb:p.thumb,format:p.kind})}<span class="pc-badge" style="background:${p.ratio>=2?'#C4221A':'#57534E'}">${p.ratio!=null?p.ratio+'× usual':''}</span><span class="pc-kind">${esc(p.kind)}</span></div>
    <div class="pc-body"><p class="pc-who">${esc(c.name||p.handle)} <span>@${esc(p.handle)}</span></p><p class="pc-text">${esc(p.text||'(no caption)')}</p>
    <div class="pc-stats">${p.platform==='yt'?`<span><b>${compact(p.views||0)}</b> views</span>`:''}${p.likes!=null?`<span><b>${compact(p.likes)}</b> likes</span>`:`<span>likes hidden</span>`}<span><b>${compact(p.comments||0)}</b> comments</span></div>
    <p class="pc-date">${p.date?dlabel(toDate(p.date)):''}</p></div></a>
    <div class="pc-foot"><button class="abtn a-ghost cp-brief" data-i="${i}">📋 Copy brief for editor</button></div></div>`}).join('')}</div>`:empty('No posts from these creators in this window yet.')}
  <div class="section-title">Creators side by side</div>
  <section class="panel"><div class="tbl-wrap"><table><thead><tr><th>Creator</th><th>Followers</th><th>Growth</th><th>Posts (14 days)</th><th>Usual engagement</th><th>Engagement rate</th><th>Viral (30d)</th><th>Research</th></tr></thead>
  <tbody>${rows.map(c=>{const g=growth(c),v30=CP.filter(p=>p.handle===c.handle&&p.date>=ymd(new Date(Date.now()-30*864e5))&&p.ratio>=2).length,er=Nn(c.followers)&&Nn(c.median_eng)!=null?(+c.median_eng)/(+c.followers)*100:null;
    return `<tr class="${c.isMe?'me':''}"><td class="post-title"><div class="pt">${c.pic?`<img class="th th-sm" style="border-radius:50%" src="${esc(c.pic)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<a href="${esc(profUrl(c))}" target="_blank" rel="noopener" style="color:inherit"><b>${esc(c.name||c.handle)}</b>${c.isMe?' <span class="pill">You</span>':''}<br><span class="sub" style="margin:0">${c.platform==='yt'?'YouTube':'Instagram'} · @${esc(c.handle)}</span></a></div></td>
    <td>${Nn(c.followers)!=null?compact(+c.followers):'—'}</td><td>${g?`<span class="${g.n>=0?'up':'down'}">${g.n>=0?'+':''}${compact(g.n)}</span> <span class="sub" style="margin:0">${g.days}d</span>`:'<span class="sub" style="margin:0">from tomorrow</span>'}</td>
    <td>${Nn(c.posts_14d)!=null?num(+c.posts_14d):'—'}</td><td>${Nn(c.median_eng)!=null?compact(+c.median_eng)+(c.platform==='yt'?' views':''):'—'}</td><td>${er!=null&&c.platform!=='yt'?er.toFixed(2)+'%':'—'}</td><td>${v30||'—'}</td>
    <td class="rs">${c.isMe?'':`${c.platform==='ig'?`<a href="${esc(adLib(c))}" target="_blank" rel="noopener">Their ads</a>`:''}<a href="${esc(profUrl(c))}" target="_blank" rel="noopener">Profile</a>`}</td></tr>`}).join('')}</tbody></table></div>
  <p class="sub" style="margin-top:10px">Engagement rate = usual (median) likes + comments ÷ followers. Growth fills in as daily snapshots build up. "Their ads" opens Meta Ad Library (the official public list of running ads). For Google/YouTube ads use <a href="${esc(gAds)}" target="_blank" rel="noopener">Google Ads Transparency Center</a>.</p></section>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>What format wins for them</h2><p class="sub">Last 30 days, all creators</p>${Object.keys(fmtBy).length?`<ul class="clist">${Object.keys(fmtBy).sort((a,b)=>fmtBy[b].n-fmtBy[a].n).map(k=>`<li><b>${esc(k)}</b>: ${fmtBy[k].n} posts, ${fmtBy[k].hit} went viral (${Math.round(fmtBy[k].hit/fmtBy[k].n*100)}%)</li>`).join('')}</ul>`:empty('Not enough posts yet.')}</section>
    <section class="panel"><h2>How to use this</h2><ul class="clist">
      <li>Every Monday open <b>This week</b>. Pick 2 viral posts that fit Road 1 or Road 2.</li>
      <li>Tap <b>Copy brief</b>, paste it to your editor on WhatsApp, and fill the hook and type.</li>
      <li>Never copy words or visuals. Copy the <b>idea and structure</b>, then say it your way.</li>
      ${me?`<li>Your usual engagement is <b>${compact(+me.median_eng||0)}</b> per post; ${meP.filter(p=>p.ratio>=2).length} of your last ${meP.length} posts went 2× viral.</li>`:''}
    </ul></section>
  </div>`;
}
function afterCompetition(){
  const seg=$('#cwSeg');if(seg)seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.cw=+b.dataset.v;save();render()});
  const W=state.cw,from=ymd(new Date(Date.now()-W*864e5)),others=CR.filter(c=>!c.isMe).map(c=>c.handle);
  const inWin=CP.filter(p=>others.includes(p.handle)&&p.date>=from&&p.ratio!=null);
  let viral=inWin.filter(p=>p.ratio>=2).sort((a,b)=>b.ratio-a.ratio);if(!viral.length)viral=inWin.slice().sort((a,b)=>b.ratio-a.ratio).slice(0,6);
  document.querySelectorAll('.cp-brief').forEach(b=>b.addEventListener('click',()=>{const p=viral[+b.dataset.i];if(!p)return;
    copyText(compBrief(p)).then(ok=>{b.textContent=ok?'✓ Copied':'Copy failed';setTimeout(()=>b.textContent='📋 Copy brief for editor',1800)})}));
}

/* teleprompter: front camera behind, script in a see-through strip at the top */
let TP=null;
function openTeleprompter(x){
  closeTeleprompter();
  const lines=String(x.script||'').split('\n').filter(l=>l.trim()&&!/^\[/.test(l.trim()));
  const LS=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
  let tp={speed:+(LS('tpSpeed')||38),size:+(LS('tpSize')||30),h:+(LS('tpH')||34),off:0,run:false,last:0,stream:null,rec:null,chunks:[]};
  const el=document.createElement('div');el.className='tp';el.innerHTML=`
    <video class="tp-v" autoplay playsinline muted></video>
    <p class="tp-msg" hidden></p>
    <div class="tp-strip"><div class="tp-text">${lines.map(l=>`<p>${esc(l)}</p>`).join('')}<p class="tp-end">— end —</p></div></div>
    <div class="tp-count" hidden></div>
    <div class="tp-bar">
      <button data-a="close" aria-label="Close">✕</button>
      <button data-a="slow" aria-label="Slower">🐢</button><button data-a="play" class="tp-main">▶ Start</button><button data-a="fast" aria-label="Faster">🐇</button>
      <button data-a="small" aria-label="Smaller text">A−</button><button data-a="big" aria-label="Bigger text">A+</button>
      <button data-a="height" aria-label="Strip height">⇕</button>
      <button data-a="rec" class="tp-rec">⏺ Record</button>
    </div>
    <a class="tp-save" hidden>⬇ Save video</a>`;
  document.body.appendChild(el);document.body.style.overflow='hidden';
  const strip=el.querySelector('.tp-strip'),text=el.querySelector('.tp-text'),v=el.querySelector('.tp-v'),msg=el.querySelector('.tp-msg'),cnt=el.querySelector('.tp-count'),mainB=el.querySelector('.tp-main'),recB=el.querySelector('.tp-rec'),saveA=el.querySelector('.tp-save');
  const apply=()=>{strip.style.height=tp.h+'vh';text.style.fontSize=tp.size+'px';text.style.transform=`translateY(${-tp.off}px)`;try{localStorage.setItem('tpSpeed',tp.speed);localStorage.setItem('tpSize',tp.size);localStorage.setItem('tpH',tp.h)}catch(e){}};
  const loop=t=>{if(!tp.run)return;const dt=tp.last?(t-tp.last)/1000:0;tp.last=t;tp.off+=tp.speed*dt;const max=text.scrollHeight-strip.clientHeight*0.4;if(tp.off>=max){tp.off=max;stop()}apply();tp.raf=requestAnimationFrame(loop)};
  const start=()=>{let n=3;cnt.hidden=false;cnt.textContent=n;mainB.textContent='⏸ Pause';tp.cd=setInterval(()=>{n--;if(n<=0){clearInterval(tp.cd);cnt.hidden=true;tp.run=true;tp.last=0;tp.raf=requestAnimationFrame(loop)}else cnt.textContent=n},800)};
  const stop=()=>{tp.run=false;clearInterval(tp.cd);cnt.hidden=true;cancelAnimationFrame(tp.raf);mainB.textContent=tp.off>0?'▶ Resume':'▶ Start'};
  const toggle=()=>tp.run||!cnt.hidden?stop():start();
  strip.addEventListener('click',toggle);
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1080},height:{ideal:1920}},audio:true})
      .then(s=>{tp.stream=s;v.srcObject=s})
      .catch(()=>{msg.hidden=false;msg.textContent='Camera not available here. It works in the phone app (allow camera when asked). You can still read the script.';recB.disabled=true});
  } else {msg.hidden=false;msg.textContent='Camera not available here. Use the phone app for the camera view.';recB.disabled=true}
  el.querySelector('.tp-bar').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
    if(a==='close')return closeTeleprompter();
    if(a==='play')return toggle();
    if(a==='slow')tp.speed=Math.max(10,tp.speed-8);
    if(a==='fast')tp.speed=Math.min(160,tp.speed+8);
    if(a==='small')tp.size=Math.max(18,tp.size-3);
    if(a==='big')tp.size=Math.min(60,tp.size+3);
    if(a==='height')tp.h=tp.h>=50?25:tp.h+12;
    if(a==='rec'){
      if(tp.rec&&tp.rec.state==='recording'){tp.rec.stop();return}
      if(!tp.stream||!window.MediaRecorder){alertBox('Recording is not supported on this phone. Use your camera app, and keep this screen as the prompter.');return}
      const mt=['video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m))||'';
      tp.chunks=[];try{tp.rec=new MediaRecorder(tp.stream,mt?{mimeType:mt}:undefined)}catch(err){alertBox('Recording is not supported on this phone.');return}
      tp.rec.ondataavailable=ev=>{if(ev.data&&ev.data.size)tp.chunks.push(ev.data)};
      tp.rec.onstop=()=>{const blob=new Blob(tp.chunks,{type:tp.rec.mimeType||'video/webm'});const ext=/mp4/.test(blob.type)?'mp4':'webm';
        if(saveA.href)URL.revokeObjectURL(saveA.href);saveA.href=URL.createObjectURL(blob);saveA.download=(x.id+'-take-'+Date.now()).replace(/[^\w-]/g,'')+'.'+ext;saveA.hidden=false;recB.textContent='⏺ Record';recB.classList.remove('on');stop()};
      tp.rec.start(1000);recB.textContent='⏹ Stop';recB.classList.add('on');saveA.hidden=true;tp.off=0;apply();start();
    }
    apply();});
  apply();TP={el,tp};
}
function closeTeleprompter(){if(!TP)return;const {el,tp}=TP;tp.run=false;clearInterval(tp.cd);cancelAnimationFrame(tp.raf);
  try{if(tp.rec&&tp.rec.state==='recording')tp.rec.stop()}catch(e){}
  if(tp.stream)tp.stream.getTracks().forEach(t=>t.stop());el.remove();document.body.style.overflow='';TP=null}

/* ---------- header + render ---------- */
/* ---------- Home + Channels + Website (new look) ---------- */
const WEB=DATA.web||{};
const WEB_ON=!!(WEB.daily&&WEB.daily.length);
const PLAT={
  ig:{name:'Instagram',short:'IG',color:'#C92A72',tab:'instagram'},
  fb:{name:'Facebook',short:'FB',color:'#1565D8',tab:'facebook'},
  ads:{name:'Meta Ads',short:'Ad',color:'#0B7F62',tab:'ads'},
  yt:{name:'YouTube',short:'YT',color:'#C4221A',tab:'youtube'},
  web:{name:'Website',short:'W',color:'#5B4BC4',tab:'website'}
};
const PEND=[['gbp','Google Business','G','#1E7F3E','Waiting for Google approval','pend'],['pin','Pinterest','P','#C8102E','Trial access approved · connecting soon','pend'],
  ['li','LinkedIn','in','#0A66C2','Approval pending','pend'],['gads','Google Ads','GA','#475467','Not connected','off']];
const pbadge=k=>`<span class="pbadge" style="background:${PLAT[k].color}">${PLAT[k].short}</span>`;
function chg(c,p,invert){
  if(c==null||p==null||!p) return '';
  const ch=(c-p)/Math.abs(p)*100, good=invert?ch<0:ch>0;
  return `<span class="${Math.abs(ch)<0.5?'flat':good?'up':'down'}">${ch>0?'▲':'▼'} ${Math.abs(ch).toFixed(Math.abs(ch)<10?1:0)}%</span>`;
}
const fmtOr=(v,f)=>v==null?'—':f(v);
function webDaysArr(){
  const by={};(WEB.daily||[]).forEach(r=>by[String(r.date).slice(0,10)]=r);
  return days.map(o=>{const r=by[ymd(o.d)]||{};return {d:o.d,users:Nn(r.users),sessions:Nn(r.sessions),views:Nn(r.views),engaged:Nn(r.engaged),avg:Nn(r.avg_sec)}});
}
function platData(k){
  const R=state.range,c=slice(R),p=slice(R,1),last14=days.slice(-14);
  // bars follow the chosen range: one bar per day (7/30), one per week (90)
  const pick=(arr,f)=>{const s=arr.slice(-R);if(R<=30) return {v:s.map(f),d:s.map(x=>x.d)};const o={v:[],d:[]};for(let i=0;i<s.length;i+=7){const ch=s.slice(i,i+7);o.v.push(ch.reduce((t,x)=>t+(f(x)||0),0));o.d.push(ch[0].d)}return o};
  const per2=R>30?'week':'day';
  if(k==='ig'){
    if(!has(c,'ig_reach')&&!has(c,'ig_followers')) return null;
    const posts=(DATA.posts||[]).filter(x=>x.platform==='Instagram'&&x.date&&toDate(x.date)>=c[0].d).length;
    return {tile:{v:fmtOr(S(c,'ig_reach'),compact),l:'Reach · '+R+'d',d:chg(S(c,'ig_reach'),S(p,'ig_reach'))},
      row1:[['Reach',fmtOr(S(c,'ig_reach'),compact),chg(S(c,'ig_reach'),S(p,'ig_reach'))],['Followers',fmtOr(lastVal(c,'ig_followers'),num),chg(lastVal(c,'ig_followers'),lastVal(p,'ig_followers'))],['Posts',num(posts),'']],
      row2:[['Views',fmtOr(S(c,'ig_views'),compact)],['Interactions',fmtOr(S(c,'ig_interactions'),compact)],['Profile',fmtOr(S(c,'ig_profile_views'),compact)]],
      chart:'Reach per '+per2,...(o=>({bars:o.v,bdates:o.d}))(pick(days,d=>d.ig_reach)),fmt:num};
  }
  if(k==='fb'){
    if(!has(c,'fb_reach')&&!has(c,'fb_followers')) return null;
    return {tile:{v:fmtOr(lastVal(c,'fb_followers'),compact),l:'Followers',d:chg(lastVal(c,'fb_followers'),lastVal(p,'fb_followers'))},
      row1:[['Reach',fmtOr(S(c,'fb_reach'),compact),chg(S(c,'fb_reach'),S(p,'fb_reach'))],['Followers',fmtOr(lastVal(c,'fb_followers'),num),chg(lastVal(c,'fb_followers'),lastVal(p,'fb_followers'))],['Engaged',fmtOr(S(c,'fb_engagements'),compact),chg(S(c,'fb_engagements'),S(p,'fb_engagements'))]],
      row2:[['Views',fmtOr(S(c,'fb_views'),compact)],['New follows',fmtOr(S(c,'fb_new_follows'),num)],['',' ']],
      chart:'Reach per '+per2,...(o=>({bars:o.v,bdates:o.d}))(pick(days,d=>d.fb_reach)),fmt:num};
  }
  if(k==='ads'){
    if(!has(c,'ad_spend')&&!has(p,'ad_spend')) return null;
    const sp=S(c,'ad_spend'),ld=S(c,'ad_leads'),psp=S(p,'ad_spend'),pld=S(p,'ad_leads');
    const cpl=ld?sp/ld:null,pcpl=pld?psp/pld:null;
    return {tile:{v:fmtOr(sp,inr),l:'Spend · '+R+'d',d:chg(sp,psp)},
      row1:[['Spend',fmtOr(sp,inr),chg(sp,psp)],['Leads',fmtOr(ld,num),chg(ld,pld)],['Per lead',fmtOr(cpl,inr),chg(cpl,pcpl,true)]],
      row2:[['Reach',fmtOr(S(c,'ad_reach'),compact)],['Clicks',fmtOr(S(c,'ad_clicks'),compact)],['Link clicks',fmtOr(S(c,'ad_link_clicks'),compact)]],
      chart:'Spend per '+per2,...(o=>({bars:o.v,bdates:o.d}))(pick(days,d=>d.ad_spend)),fmt:inr};
  }
  if(k==='yt'){
    if(!YCH.length) return null;
    const {arr}=ytDays(YCH.map(x=>x.channel_id)); if(!arr.length) return null;
    const cc=arr.slice(DAYS-R),pp=arr.slice(DAYS-2*R,DAYS-R);
    const subs=YCH.reduce((s,x)=>s+(Nn(x.subs)||0),0),vids=YCH.reduce((s,x)=>s+(Nn(x.videos)||0),0);
    const net=a=>{const g=S(a,'gained'),l=S(a,'lost');return g==null?null:g-(l||0)};
    return {tile:{v:fmtOr(S(cc,'views'),compact),l:'Views · '+R+'d',d:chg(S(cc,'views'),S(pp,'views'))},
      row1:[['Subscribers',num(subs),net(cc)!=null?`<span class="up">+${num(net(cc))}</span>`:''],['Views',fmtOr(S(cc,'views'),compact),chg(S(cc,'views'),S(pp,'views'))],['Videos',num(vids),'']],
      row2:[['Watch hrs',fmtOr(S(cc,'minutes')!=null?S(cc,'minutes')/60:null,compact)],['Likes',fmtOr(S(cc,'likes'),num)],['Comments',fmtOr(S(cc,'comments'),num)]],
      chart:'Views per '+per2,...(o=>({bars:o.v,bdates:o.d}))(pick(arr,d=>d.views)),fmt:num};
  }
  if(k==='web'){
    if(!WEB_ON) return null;
    const a=webDaysArr(),cc=a.slice(DAYS-R),pp=a.slice(DAYS-2*R,DAYS-R);
    return {tile:{v:fmtOr(S(cc,'users'),compact),l:'Visitors · '+R+'d',d:chg(S(cc,'users'),S(pp,'users'))},
      row1:[['Visitors',fmtOr(S(cc,'users'),compact),chg(S(cc,'users'),S(pp,'users'))],['Sessions',fmtOr(S(cc,'sessions'),compact),chg(S(cc,'sessions'),S(pp,'sessions'))],['Page views',fmtOr(S(cc,'views'),compact),chg(S(cc,'views'),S(pp,'views'))]],
      row2:[['Engaged',fmtOr(S(cc,'engaged'),compact)],['',' '],['',' ']],
      chart:'Visitors per '+per2,...(o=>({bars:o.v,bdates:o.d}))(pick(a,d=>d.users)),fmt:num};
  }
  return null;
}
const ON=()=>['ig','ads','fb','yt','web'].filter(k=>platData(k));
if(!state.hp) state.hp='ig';

function homeInsights(){
  const c=slice(state.range),p=slice(state.range,1),ins=[];
  const igR=S(c,'ig_reach'),fbR=S(c,'fb_reach');
  const spend=S(c,'ad_spend'),leads=S(c,'ad_leads'),pSpend=S(p,'ad_spend'),pLeads=S(p,'ad_leads');
  const cpl=leads?spend/leads:null,pcpl=pLeads?pSpend/pLeads:null;
  const inP=(DATA.posts||[]).filter(x=>x.date&&toDate(x.date)>=c[0].d&&x.reach!=null).sort((a,b)=>b.reach-a.reach),best=inP[0];
  if(igR!=null&&fbR!=null&&igR+fbR>0) ins.push(['i',`Instagram brings <b>${(igR/(igR+fbR)*100).toFixed(0)}%</b> of your organic reach, Facebook ${(fbR/(igR+fbR)*100).toFixed(0)}%.`]);
  if(best) ins.push(['g',`Top post: <b>${esc(String(best.text||'(no caption)').slice(0,70))}</b> (${esc(best.format)}, ${esc(best.platform)}) reached ${compact(best.reach)} accounts.`]);
  if(cpl!=null&&pcpl!=null) ins.push([cpl<=pcpl?'g':'w',`Cost per lead ${cpl<=pcpl?'fell':'rose'} to <b>${inr2(cpl)}</b> from ${inr2(pcpl)}.`]);
  const v=CP.filter(x=>x.ratio>=2&&x.date>=ymd(new Date(Date.now()-7*864e5))&&!(CR.find(c=>c.handle===x.handle)||{}).isMe);
  if(v.length){const f={};v.forEach(x=>f[x.kind]=(f[x.kind]||0)+1);const top=Object.keys(f).sort((a,b)=>f[b]-f[a])[0];ins.push(['i',`Your creators had <b>${v.length} viral posts</b> this week, mostly <b>${esc(top)}s</b>. Try one this week.`]);}
  return ins;
}

function heroCard(k){
  const cur=platData(k); if(!cur) return '';
  const vals=cur.bars.map(v=>v==null?0:v), mx=Math.max(...vals), top=vals.indexOf(mx);
  const sel=state.hsel!=null&&state.hsel<vals.length?state.hsel:vals.length-1;
  const bd=cur.bdates, n=vals.length;
  const items=vals.map((v,i)=>({v,on:i===sel,best:i===top,tip:cur.fmt(v),label:n<=7?WD[bd[i].getDay()]:((i%(n>20?5:3)===0||i===n-1)?String(bd[i].getDate()):''),aria:dlabel(bd[i])+': '+cur.fmt(v)}));
  return `<section class="hero" data-k="${k}">
    <div class="h-top"><div class="h-sw">${pbadge(k)}<b>${PLAT[k].name}</b></div><span class="h-rg">last ${state.range} days</span></div>
    <div class="h-row">${cur.row1.map(s=>`<div><div class="h-k">${s[0]}</div><div class="h-v">${s[1]}</div><div class="h-d">${s[2]||'&nbsp;'}</div></div>`).join('')}</div>
    <div class="h-row">${cur.row2.filter(s=>s[0]).map(s=>`<div><div class="h-k">${s[0]}</div><div class="h-v">${s[1]}</div></div>`).join('')}</div>
    <div class="h-ch"><span>${cur.chart} · last ${state.range} days</span><span>${state.range>30?'week of ':''}${dlabel(bd[sel])}</span></div>
    <div class="bchart">${tapBars(items,{sm:true,label:cur.chart})}</div>
  </section>`;
}
function home(){
  const on=ON();
  const hr=new Date().getHours(), greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const today=new Date(), dstr=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][today.getDay()]+', '+today.getDate()+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][today.getMonth()];
  const todo=SC.filter(x=>x.status!=='Posted').slice(0,3);
  const vir=CP.filter(x=>x.ratio>=2&&x.date>=ymd(new Date(Date.now()-7*864e5))&&!(CR.find(c=>c.handle===x.handle)||{}).isMe).sort((a,b)=>b.ratio-a.ratio).slice(0,8);
  const ins=homeInsights();
  // total organic reach (Instagram + Facebook)
  const R=state.range, c=slice(R), p=slice(R,1), rows=R>30?groupWeeks(c):c;
  const reach=a=>{const x=S(a,'ig_reach'),y=S(a,'fb_reach');return x==null&&y==null?null:(x||0)+(y||0)};
  const tR=reach(c), pR=reach(p), ch=pctCh(tR,pR);
  const fol=(lastVal(c,'ig_followers')||0)+(lastVal(c,'fb_followers')||0)+YCH.reduce((t,x)=>t+(Nn(x.subs)||0),0);
  const eng=((S(c,'ig_interactions')||0)+(S(c,'fb_engagements')||0)), er=tR?eng/tR*100:null;
  const spend=S(c,'ad_spend');
  const bv=rows.map(r=>(r.ig_reach||0)+(r.fb_reach||0)), bmax=bv.indexOf(Math.max(...bv));
  if(state.hsel2==null||state.hsel2>=bv.length) state.hsel2=bv.length-1;
  const items=bv.map((v,i)=>({v,on:i===state.hsel2,best:i===bmax,tip:compact(v),label:(rows.length<=7?WD[rows[i].d.getDay()]:((i%5===0||i===rows.length-1)?String(rows[i].d.getDate()):'')),aria:dlabel(rows[i].d)+': '+num(v)}));
  const tiles=on.map(k=>{const d=platData(k);return `<button class="tile" type="button" data-tab="${PLAT[k].tab}">
    <span class="t-h">${pbadge(k)}${PLAT[k].name}</span><span class="t-v">${d.tile.v}</span><span class="t-l">${d.tile.l}</span>${spark(d.bars)}<span class="t-d">${d.tile.d||'&nbsp;'}</span></button>`}).join('');
  const upnext=`<div><div class="cap row"><span>Scripts to shoot</span><button class="linkbtn" type="button" data-tab="scripts">See all</button></div>
  ${todo.length?`<div class="list">${todo.map(x=>`<button class="li" type="button" data-tab="scripts"><span class="li-t"><b>${esc(x.title)}</b><span class="stype">${esc((STYPE[x.type]||{}).n||x.type)}</span></span>
    <span class="li-s">${esc(x.id)} · post ${esc(sdate(x.post_on))} · ${esc(x.status)}</span></button>`).join('')}</div>`:`<div class="list"><div class="li">${empty('All scripts are posted. Ask for new ones.')}</div></div>`}</div>`;
  const insH=`<div><div class="cap" id="homeIns">AI insights</div>
  <section class="panel">${ins.length?`<ul class="insights">${ins.map(x=>`<li><span class="ic ${x[0]}">${x[0]==='g'?'↑':x[0]==='w'?'!':'✦'}</span><span>${x[1]}</span></li>`).join('')}</ul>`:empty('Not enough data yet.')}</section></div>`;
  return `
  <div class="hhead"><div><p class="hdate">${dstr}</p><h2 class="hello">${greet}, ${esc(String(ME.role==='owner'&&/Owner/.test(ME.name)?'Poonam':ME.name).split(' ')[0])}</h2></div>${CAN('team')?`<button class="linkbtn" type="button" data-tab="team">Team · ${(DATA.team||[]).filter(u=>u.active).length}</button>`:''}</div>
  ${pubBanner()}
  ${tR!=null?`<section class="hsum">
    <div class="hs-top"><span>Total reach · IG + FB</span><span class="hs-live">${R} days</span></div>
    <div class="hs-main"><span class="hs-big">${compact(tR)}</span><span class="hs-d">${ch==null?'':`<span class="${Math.abs(ch)<0.5?'flat':ch>0?'up':'down'}">${ch>0?'▲':'▼'} ${Math.abs(ch).toFixed(Math.abs(ch)<10?1:0)}%</span>vs previous ${R} days`}</span></div>
    <div class="bchart">${tapBars(items,{label:'Reach per '+per(),grow:state._grow})}</div>
    <div class="hs-stats"><div><span>Followers</span><b>${compact(fol)}</b></div><div><span>Engagement</span><b>${er!=null?pct(er,1):'—'}</b></div>${CAN('ads')?`<div><span>Ad spend</span><b>${spend!=null?inr(spend):'—'}</b></div>`:`<div><span>Posts</span><b>${num((DATA.posts||[]).filter(x=>x.date&&String(x.date).slice(0,10)>=ymd(c[0].d)).length)}</b></div>`}</div>
  </section>`:''}
  ${on.length?`<div class="cap row"><span>Channels</span><button class="linkbtn" type="button" data-tab="channels">See all</button></div>
  <div class="tiles">${tiles}</div>`:''}
  <div class="hgrid2">${upnext}${insH}</div>
  ${vir.length?`<div class="cap row"><span>Viral this week</span><button class="linkbtn" type="button" data-tab="competition">All ideas</button></div>
  <div class="vrow">${vir.map(p=>`<a class="vc" href="${esc(p.link)}" target="_blank" rel="noopener"><span class="vc-img">${thumb({thumb:p.thumb,format:p.kind})}<span class="vc-b">${p.ratio}× usual</span></span>
    <span class="vc-t"><b>@${esc(p.handle)}</b><span>${esc(p.kind)} · ${p.date?dlabel(toDate(p.date)):''}</span></span></a>`).join('')}</div>`:''}`;
}
function afterHome(){
  const v=$('#view');
  v.querySelectorAll('.hsum .bc-b').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();state.hsel2=+b.dataset.i;render()}));
  growBars(v);
  v.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();goTab(b.dataset.tab)}));
}
function channelsView(){
  const on=ON(), total=on.length+PEND.length+(WEB_ON?0:1);
  const rows=k=>{const d=platData(k);return d.row1.slice(0,2).map(s=>`<span class="c-r"><span>${s[0]}</span><b>${s[1]}</b></span>`).join('')};
  return `<div class="hhead"><div><h2 class="hello">Channels</h2><p class="sub" style="margin:2px 0 0">${total} sources · ${on.length} connected</p></div></div>
  <div class="cgrid">
    ${on.map(k=>`<button class="cc dk" type="button" data-tab="${PLAT[k].tab}"><span class="c-h">${pbadge(k)}<b>${PLAT[k].name}</b><i class="st on"></i></span>${rows(k)}</button>`).join('')}
    ${WEB_ON?'':`<button class="cc" type="button" data-tab="website"><span class="c-h"><span class="pbadge" style="background:#6D28D9">W</span><b>Website</b><i class="st off"></i></span><span class="c-note">Not connected yet · tap to see how</span></button>`}
    ${PEND.map(x=>`<div class="cc"><span class="c-h"><span class="pbadge" style="background:${x[3]}">${x[2]}</span><b>${x[1]}</b><i class="st ${x[5]}"></i></span><span class="c-note">${x[4]}</span></div>`).join('')}
  </div>
  <div class="c-legend"><span><i class="st on"></i>Connected</span><span><i class="st pend"></i>Waiting for approval</span><span><i class="st off"></i>Not connected</span></div>
  <div class="cap">More</div>
  <div class="list">
    <button class="li" type="button" data-tab="posts"><span class="li-t"><b>All posts</b></span><span class="li-s">Every Instagram and Facebook post, sortable</span></button>
    ${CAN('team')?`<button class="li" type="button" data-tab="team"><span class="li-t"><b>Team</b><span class="stype">${(DATA.team||[]).filter(u=>u.active).length} people</span></span><span class="li-s">Add people, roles and PINs · activity log</span></button>`:''}
    <button class="li" type="button" data-tab="audience"><span class="li-t"><b>Audience</b></span><span class="li-s">Who follows you and when they are online</span></button>
  </div>`;
}

/* ---------- Team (Owners only) ---------- */
const ROLE_ORDER=['owner','smm','editor','ads','writer','viewer'];
const ROLE_INFO={owner:['Owner','Everything. Approves every post. Manages the team.'],smm:['Social Media Manager','Makes drafts and captions, schedules. Posts only after an Owner approves.'],
  editor:['Video Editor','Organic analytics, scripts, uploads finished videos. No ads.'],ads:['Ads Manager','Meta Ads: pause, budget, boost (with Action PIN).'],
  writer:['Script Writer','Adds and edits scripts, uses Ideas. No analytics.'],viewer:['Viewer','Read-only analytics.']};
const APP_URL='https:'+'/'+'/flapoox.github.io/dp-insights-app/';
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';
const ago=iso=>{if(!iso)return '';const d=(Date.now()-new Date(iso).getTime())/864e5;return d<1?'today':d<2?'yesterday':Math.floor(d)+' days ago'};
function sendTeam(op){
  if(window.DP_ACTION) return window.DP_ACTION({team:op});
  return new Promise(res=>{try{google.script.run.withSuccessHandler(res).withFailureHandler(e=>res({error:'net',message:String(e&&e.message||e)})).teamOp(op)}catch(e){res({error:'net',message:'Not available here.'})}});
}
function teamView(){
  const T=DATA.team||[];
  const row=u=>`<button type="button" class="tm-row${u.active?'':' off'}" data-uid="${esc(u.id)}"><span class="tm-av r-${esc(u.role)}">${esc(initials(u.name))}</span>
    <span class="tm-t"><b>${esc(u.name)}</b><span>${u.active?(u.last?'Last active '+ago(u.last):'Not opened the app yet'):'Switched off'}</span></span><span class="tm-role r-${esc(u.role)}">${esc(u.roleName)}</span></button>`;
  const groups=ROLE_ORDER.map(r=>{const us=T.filter(u=>u.role===r);if(!us.length)return '';return `<div class="tm-cap">${esc(ROLE_INFO[r][0]).toUpperCase()}S · ${us.length}</div><div class="list">${us.map(row).join('')}</div>`}).join('');
  const act=(DATA.activity||[]).slice(0,40);
  return `<div class="hhead"><div><p class="sub" style="margin:0">${T.filter(u=>u.active).length} active · only Owners see this</p></div><button type="button" class="abtn a-good" id="tmAdd">＋ Add person</button></div>
  <div class="note" style="margin-top:12px">Everyone has their <b>own PIN</b>. Nothing is posted until an <b>Owner approves</b>. Any number of people can share a role.${DATA.me&&DATA.me.id==='main'?' You are signed in with the main PIN; add yourself and Poonam as Owners to get personal PINs.':''}</div>
  ${groups||`<section class="panel" style="margin-top:14px">${empty('No team members yet. Tap “Add person” to add the first one.')}</section>`}
  <div class="tm-cap">ACTIVITY · WHO DID WHAT</div>
  <section class="panel">${act.length?`<ul class="alog">${act.map(x=>`<li><span class="sub">${esc(new Date(x.time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}))}</span> · <b>${esc(x.who)}</b>${x.role?` <span class="sub">(${esc(x.role)})</span>`:''}<br>${esc(x.what)}${x.detail?` · <span class="sub">${esc(x.detail)}</span>`:''}</li>`).join('')}</ul>`:empty('Nothing yet. Changes by team members appear here.')}</section>`;
}
function pinScreen(u,pin){
  const msg=`Hi ${u.name}, you are added to DP Insights as ${u.roleName}.\nOpen: ${APP_URL}\nYour PIN: ${pin}\nPlease keep it private.`;
  const wa='https:'+'/'+'/wa.me/'+(String(u.phone||'').replace(/\D/g,'')||'')+'?text='+encodeURIComponent(msg);
  return `<p><b>${esc(u.name)}</b> · ${esc(u.roleName)}</p><p class="sub">Their PIN (shown only now):</p>
    <div class="pinbig" aria-label="PIN">${esc(pin)}</div>
    <div class="dlg-acts" style="justify-content:stretch"><button type="button" class="abtn a-ghost" id="pinCopy" style="flex:1">Copy message</button><a class="abtn a-good" style="flex:1" href="${esc(wa)}" target="_blank" rel="noopener">Share on WhatsApp</a></div>`;
}
function openTeamDlg(mode,u){
  const dlg=$('#actDlg'), R=DATA.roles||ROLE_ORDER.map(k=>({key:k,name:ROLE_INFO[k][0]}));
  const roleOpts=sel=>`<div class="tm-roles" role="radiogroup" aria-label="Role">${ROLE_ORDER.map(k=>`<label class="tm-ro"><input type="radio" name="tmRole" value="${k}" ${k===sel?'checked':''}><span><b>${ROLE_INFO[k][0]}</b><span>${ROLE_INFO[k][1]}</span></span></label>`).join('')}</div>`;
  let body='';
  if(mode==='add') body=`<h2>Add person</h2>
    <label class="fld">Name<input id="tmName" autocomplete="off" required maxlength="80"></label>
    <label class="fld">Email (optional, for notifications)<input id="tmEmail" type="email" autocomplete="off"></label>
    <label class="fld">WhatsApp number (optional)<input id="tmPhone" type="tel" inputmode="tel" autocomplete="off" placeholder="+91"></label>
    <p class="sub" style="margin-top:6px">Role</p>${roleOpts('editor')}
    <p class="err" id="tmErr" role="alert"></p>
    <div class="dlg-acts"><button type="button" class="abtn a-ghost" id="tmCancel">Cancel</button><button type="submit" class="abtn a-good" id="tmGo">Add &amp; create PIN</button></div>`;
  else body=`<h2>${esc(u.name)}</h2><p class="sub">${u.active?(u.last?'Last active '+ago(u.last):'Has not opened the app yet'):'Switched off'}${u.email?' · '+esc(u.email):''}${u.phone?' · '+esc(u.phone):''}</p>
    <p class="sub" style="margin-top:6px">Role</p>${roleOpts(u.role)}
    <p class="err" id="tmErr" role="alert"></p>
    <div class="tm-acts"><button type="button" class="abtn a-ghost" id="tmPin">New PIN</button><button type="button" class="abtn a-ghost" id="tmOnOff">${u.active?'Switch off':'Switch on'}</button><button type="button" class="abtn a-ghost" id="tmDel" style="color:var(--bad)">Remove</button></div>
    <div class="dlg-acts"><button type="button" class="abtn a-ghost" id="tmCancel">Close</button><button type="submit" class="abtn a-good" id="tmGo">Save role</button></div>`;
  dlg.innerHTML=`<form method="dialog" class="dlg" id="tmForm">${body}</form>`;
  const err=t=>{$('#tmErr').textContent=t||''};
  const done=r=>{if(r&&r.team){DATA.team=r.team}};
  const showPin=(r)=>{dlg.innerHTML=`<div class="dlg">${pinScreen(r.user,r.pin)}<div class="dlg-acts"><button type="button" class="abtn a-ghost" id="tmCancel">Done</button></div></div>`;
    const msg=`Hi ${r.user.name}, you are added to DP Insights as ${r.user.roleName}.\nOpen: ${APP_URL}\nYour PIN: ${r.pin}\nPlease keep it private.`;
    $('#pinCopy').onclick=()=>copyText(msg).then(ok=>{$('#pinCopy').textContent=ok?'✓ Copied':'Copy failed'});
    $('#tmCancel').onclick=()=>dlg.close();};
  const call=(op,btnEl,after)=>{err('');if(btnEl){btnEl.disabled=true}sendTeam(op).then(r=>{if(btnEl)btnEl.disabled=false;if(!r||!r.ok){err((r&&r.message)||'Something went wrong.');return}done(r);after(r)})};
  $('#tmCancel').onclick=()=>dlg.close();
  dlg.addEventListener('close',()=>render(),{once:true});
  const role=()=>{const x=dlg.querySelector('input[name="tmRole"]:checked');return x?x.value:null};
  $('#tmForm').onsubmit=e=>{e.preventDefault();
    if(mode==='add'){const name=$('#tmName').value.trim();if(!name)return err('Please enter a name.');
      call({op:'add',name,email:$('#tmEmail').value,phone:$('#tmPhone').value,role:role()},$('#tmGo'),showPin);}
    else call({op:'update',id:u.id,role:role()},$('#tmGo'),()=>dlg.close());};
  if(mode!=='add'){
    $('#tmPin').onclick=()=>{if(!confirmInline($('#tmPin'),'Old PIN stops working. Tap again'))return;call({op:'pin',id:u.id},$('#tmPin'),showPin)};
    $('#tmOnOff').onclick=()=>call({op:'update',id:u.id,active:!u.active},$('#tmOnOff'),()=>dlg.close());
    $('#tmDel').onclick=()=>{if(!confirmInline($('#tmDel'),'Tap again to remove'))return;call({op:'remove',id:u.id},$('#tmDel'),()=>dlg.close())};
  }
  dlg.showModal();
}
function confirmInline(b,txt){if(b.dataset.armed)return true;b.dataset.armed='1';b.dataset.orig=b.textContent;b.textContent=txt;setTimeout(()=>{if(b.isConnected){b.textContent=b.dataset.orig;delete b.dataset.armed}},4000);return false}
function afterTeam(){
  const v=$('#view');
  const add=$('#tmAdd'); if(add) add.addEventListener('click',()=>openTeamDlg('add'));
  v.querySelectorAll('[data-uid]').forEach(b=>b.addEventListener('click',()=>{const u=(DATA.team||[]).find(x=>x.id===b.dataset.uid);if(u)openTeamDlg('edit',u)}));
}

/* ---------- Publish: one video → every platform, after an Owner's OK ---------- */
const PB={ig:['IG','var(--ig)','Instagram'],fb:['FB','var(--fb)','Facebook'],yt:['YT','var(--yt)','YouTube'],li:['in','#0A66C2','LinkedIn']};
const PKEYS=['ig','fb','yt','li'];
const PST={draft:['Draft',''],sentback:['Sent back','warn'],pending:['Waiting for approval','acc'],approved:['Approved','good'],scheduled:['Scheduled','good'],
  posting:['Posting…','acc'],posted:['Posted','good'],manual:['Post by hand','warn'],partly:['Partly posted','bad'],failed:['Failed','bad']};
let PV={mode:'list'};
const PUB=()=>DATA.pub||{posts:[],ready:[],conn:{}};
const pbx=k=>`<span class="pbadge" style="background:${PB[k][1]}" aria-hidden="true">${PB[k][0]}</span>`;
const mb=n=>n>=1048576?(n/1048576).toFixed(n>=1e8?0:1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
const when=iso=>iso?new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'';
const pstPill=s=>{const x=PST[s]||[s,''];return `<span class="pill ${x[1]}">${esc(x[0])}</span>`};
const PLAY='<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"></path></svg>';
function sendPub(op){
  if(window.DP_ACTION) return window.DP_ACTION({publish:op});
  return new Promise(res=>{try{google.script.run.withSuccessHandler(res).withFailureHandler(e=>res({error:'net',message:String(e&&e.message||e)})).publishOp(op)}catch(e){res({error:'net',message:'Not available here.'})}});
}
function pubLine(p){
  const r=p.res||{},on=PKEYS.filter(k=>p.plats&&p.plats[k]&&p.plats[k].mode!=='off');
  if(p.status==='sentback') return 'Sent back'+(p.note?': '+p.note:'');
  if(p.status==='pending') return 'By '+p.by+' · '+when(p.updated||p.created);
  if(p.status==='scheduled') return 'Goes live '+when(p.when);
  if(p.status==='posting'||p.status==='approved'){const w=on.map(k=>r[k]&&r[k].msg).filter(Boolean)[0];return w||'Starts within 5 minutes'}
  if(p.status==='posted'||p.status==='partly'||p.status==='manual'||p.status==='failed'){const ok=on.filter(k=>r[k]&&r[k].st==='ok').length;return 'Live on '+ok+' of '+on.length+(p.status==='manual'?' · post the rest by hand':'')}
  return 'Draft by '+p.by+' · '+when(p.updated||p.created);
}
function pubRowHtml(p){
  const on=PKEYS.filter(k=>p.plats&&p.plats[k]&&p.plats[k].mode!=='off');
  return `<button type="button" class="pq" data-pid="${esc(p.id)}"><span class="pq-v">${PLAY}</span>
    <span class="pq-t"><b>${esc(p.title)}</b><span>${esc(pubLine(p))}</span><span class="pq-b">${on.map(pbx).join('')}</span></span>${pstPill(p.status)}</button>`;
}
function pubDefaults(){
  const c=PUB().conn||{};
  return {modes:{ig:'auto',fb:'auto',yt:c.yt&&c.yt.public?'auto':'manual',li:c.li&&c.li.days>0?'auto':'off'},ai:!!c.ai,when:'best',pick:'',scriptId:''};
}
let PS=null;
const t730=()=>{const n=new Date(),t=new Date();t.setHours(19,30,0,0);if(t<n)t.setDate(t.getDate()+1);return t};
const dayWord=d=>{const n=new Date();return d.toDateString()===n.toDateString()?'Today':'Tomorrow'};
const whenISO=s=>s.when==='best'?t730().toISOString():s.when==='pick'?(s.pick?new Date(s.pick).toISOString():''):'';
const localDT=iso=>{const x=new Date(iso);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16)};
const segBtns=(k,mode,attr)=>`<div class="pseg" role="group" aria-label="${PB[k][2]}">${[['auto','Auto'],['manual','Manual'],['off','Off']].map(m=>`<button type="button" ${attr}="${k}" data-m="${m[0]}" aria-pressed="${mode===m[0]}">${m[1]}</button>`).join('')}</div>`;
function publishView(){
  if(PV.mode==='edit') return pubEditView();
  if(PV.mode==='view') return pubDetailView();
  const P=PUB(),posts=P.posts||[],own=CAN('approve'),c=P.conn||{},ready=P.ready||[];
  if(!PS) PS=pubDefaults();
  if(PS.fi==null||PS.fi>=ready.length) PS.fi=0;
  const f=ready[PS.fi];
  const waiting=posts.filter(p=>p.status==='pending');
  const active=posts.filter(p=>['draft','sentback','approved','scheduled','posting','failed','partly','manual'].includes(p.status)&&(own||p.status!=='draft'||p.byId===P.me));
  const done=posts.filter(p=>p.status==='posted').slice(0,10);
  const scr=(DATA.scripts||[]).find(x=>x.id===PS.scriptId);
  const conn={ig:c.meta&&c.cld,fb:c.meta&&c.cld,yt:!!c.yt,li:!!(c.li&&c.li.days>0)};
  const SUB={ig:'Reel · Manual for trending audio',fb:'Reel on your Page',yt:c.yt&&c.yt.public?'Short':'Short · Private until Google’s audit',li:'Your profile · English'};
  const prow=k=>`<div class="prow pp">${pbx(k)}<span class="t"><b>${PB[k][2]}</b><span>${SUB[k]}</span>${PS.modes[k]==='auto'&&!conn[k]?`<span class="w">Not connected yet${own?' · see Connections below':''}</span>`:''}</span>${segBtns(k,PS.modes[k],'data-mode')}</div>`;
  const nA=PKEYS.filter(k=>PS.modes[k]==='auto').length,nM=PKEYS.filter(k=>PS.modes[k]==='manual').length;
  const cta=(nA?nA+' draft'+(nA>1?'s':''):'')+(nA&&nM?' + ':'')+(nM?nM+' manual':'');
  const bt=t730();
  const appr=p=>{const on=PKEYS.filter(k=>p.plats[k]&&p.plats[k].mode!=='off');return `<article class="apr">
    <div class="apr-h"><span class="pq-v lg">${PLAY}</span><div class="apr-t"><b>${esc(p.title)}</b><span>Drafts by ${esc(p.by)} · ${esc(when(p.updated||p.created))}</span><span class="pq-b">${on.map(pbx).join('')}</span></div></div>
    <div class="apr-n">${on.filter(k=>p.plats[k].mode==='auto').length} captions ready · ${p.when?'goes live '+esc(when(p.when))+' after approval':'goes live right after approval'}</div>
    <div class="apr-a"><button type="button" class="abtn a-ghost" data-pback="${esc(p.id)}">Send back</button><button type="button" class="abtn a-ghost" data-pid="${esc(p.id)}">Open</button><button type="button" class="abtn a-good" data-pok="${esc(p.id)}">Approve</button></div>
    <p class="err" data-perr="${esc(p.id)}" role="alert"></p></article>`};
  const hero=f?`<section class="vhero"><div class="vh-top"><span>NEW IN "READY TO POST"</span><span>Google Drive</span></div>
      <div class="vh-v"><span class="vh-thumb">${PLAY}</span><div class="vh-t"><b>${esc(f.name)}</b><span>${mb(f.size)} · added ${esc(ago(f.created))}${scr?' · '+esc(scr.id):''}</span>
      <span class="vh-chips">${scr?`<span class="vchip">${esc((STYPE[scr.type]||{}).n||scr.type)}</span>`:''}<a class="vchip ok" href="${esc(f.url)}" target="_blank" rel="noopener">▶ Watch</a></span></div></div>
      ${ready.length>1?`<div class="vh-nav"><button type="button" class="vh-b" id="vPrev" aria-label="Previous video" ${PS.fi?'':'disabled'}>‹</button><span>${PS.fi+1} of ${ready.length} new videos</span><button type="button" class="vh-b" id="vNext" aria-label="Next video" ${PS.fi<ready.length-1?'':'disabled'}>›</button></div>`:''}</section>`
    :`<section class="vhero"><div class="vh-top"><span>"READY TO POST"</span><span>Google Drive</span></div><div class="vh-empty"><b>No new video yet</b><span>Editors put the finished video (MP4, 9:16) in the Google Drive folder “Ready to post”. It shows up here.</span>${P.folderUrl?`<a class="vchip ok" href="${esc(P.folderUrl)}" target="_blank" rel="noopener">Open folder</a>`:''}${P.folderErr?`<span>(${esc(P.folderErr)})</span>`:''}</div></section>`;
  return `<div class="hhead"><div><h2 class="hello">Publish</h2><p class="sub" style="margin:4px 0 0">One video → every platform, after an Owner's OK</p></div></div>
  ${P.error?`<div class="note">Could not load Publish: ${esc(P.error)}</div>`:''}
  ${own&&waiting.length?`<div class="cap">Waiting for you · ${waiting.length}</div><div class="note dk">Either Owner can approve. The first approval posts it; the other Owner sees who approved.</div><div class="aprs" style="margin-top:12px">${waiting.map(appr).join('')}</div>`:''}
  <div class="pgrid"><div class="pcol">
  ${hero}
  ${f?`<label class="fld" style="margin-top:14px">Which script is this? (fills captions for free)<select id="pScript"><option value="">— None —</option>${(DATA.scripts||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===PS.scriptId?'selected':''}>${esc(x.id+' · '+x.title)}</option>`).join('')}</select></label>
  <div class="cap">Post to</div>
  <div class="list">${PKEYS.map(prow).join('')}
    <div class="prow pp dim"><span class="pbadge" style="background:#C8102E">P</span><span class="t"><b>Pinterest</b><span>Trial approved · coming soon</span></span><span class="pill">Soon</span></div>
    <div class="prow pp dim"><span class="pbadge" style="background:#1E7F3E">G</span><span class="t"><b>Google Business</b><span>Waiting for Google</span></span><span class="pill">Waiting</span></div></div>
  <p class="sub" style="margin:8px 4px 0"><b>Manual</b> = DP Insights gets the video and caption ready, and you post it yourself in the app (for trending audio, collab tags or location).</p>`:''}
  </div><div class="pcol">
  ${f?`<div class="cap">Captions</div>
  <section class="panel aiw"><div class="aiw-h"><span class="aiw-i" aria-hidden="true">✦</span><div><b>Auto-write captions</b><span>Hinglish for Instagram + Facebook, English for LinkedIn, title + description for YouTube.</span></div>
    <button type="button" class="tgl" id="pAiT" role="switch" aria-checked="${PS.ai&&!!c.ai}" aria-label="Auto-write captions" ${c.ai?'':'disabled'}><span></span></button></div>
    <div class="aiw-c"><span>Uses Claude credit</span><b>${c.ai?'≈ ₹0.50 per video':'Not switched on yet'}</b></div>
    <p class="sub" style="margin:0">${c.ai?'Switch off to write captions yourself'+(PS.scriptId?' (the script caption is filled in for free)':'')+'.':(own?'Owner: Sheet → Digital Poonam → Publish → 5. Save Claude key. ':'')+'For now, captions come from the script, or you write them on the next screen.'}</p></section>
  <div class="cap">When</div>
  <div class="whens">
    <button type="button" class="whn" data-w="best" aria-pressed="${PS.when==='best'}"><span>Best time</span><b>${dayWord(bt)} 7:30 pm</b></button>
    <label class="whn ${PS.when==='pick'?'on':''}" id="wPickL"><span>Custom</span><input type="datetime-local" id="pWhen" value="${PS.pick||''}" min="${localDT(new Date().toISOString())}" aria-label="Pick date and time"></label>
    <button type="button" class="whn" data-w="now" aria-pressed="${PS.when==='now'}"><span>Right away</span><b>After approval</b></button>
  </div>
  <p class="err" id="pErr" role="alert"></p>
  <button type="button" class="abtn a-good big wide" id="pMake" ${nA+nM?'':'disabled'}>✦ ${nA+nM?'Make '+cta:'Turn on a platform'}</button>
  <p class="sub" style="text-align:center;margin-top:8px">Nothing is posted until ${own?'you approve':'an Owner approves'}</p>`:''}
  </div></div>
  ${!own&&waiting.length?`<div class="cap">Waiting for an Owner · ${waiting.length}</div><div class="list">${waiting.map(pubRowHtml).join('')}</div>`:''}
  <div class="cap">In progress</div>
  ${active.length?`<div class="list">${active.map(pubRowHtml).join('')}</div>`:`<section class="panel">${empty('Nothing in progress.')}</section>`}
  ${done.length?`<div class="cap">Posted</div><div class="list">${done.map(pubRowHtml).join('')}</div>`:''}
  ${pubConnHtml()}`;
}
function pubOpen(id){
  const p=(PUB().posts||[]).find(x=>x.id===id);if(!p)return;
  const own=CAN('approve'),mine=own||p.byId===PUB().me;
  const editable=(['draft','sentback','pending'].includes(p.status)&&mine)||(own&&['approved','scheduled'].includes(p.status)&&!(p.res&&Object.values(p.res).some(r=>r&&(r.st==='ok'||r.st==='working'))));
  PV=editable?{mode:'edit',id,ok:{},d:JSON.parse(JSON.stringify({title:p.title,scriptId:p.scriptId,ai:p.ai,when:p.when,plats:p.plats}))}:{mode:'view',id};
}
const PSUB2={ig:['9:16','Reel'],fb:['9:16','Reel'],yt:['9:16','Short'],li:['4:5','Native video']};
function pubEditView(){
  const p=(PUB().posts||[]).find(x=>x.id===PV.id);
  if(!p) return `<div class="pback"><button type="button" class="linkbtn" id="pBack">← Publish</button></div><section class="panel">${empty('This post is gone.')}</section>`;
  const d=PV.d,c=PUB().conn||{},own=CAN('approve');
  const on=PKEYS.filter(k=>d.plats[k].mode!=='off'),skipped=PKEYS.filter(k=>d.plats[k].mode==='off');
  const nOk=on.filter(k=>PV.ok[k]).length;
  const wtxt=d.when?when(d.when):'right after approval';
  const card=k=>{const x=d.plats[k],man=x.mode==='manual',okd=!!PV.ok[k];
    const lab=k==='yt'?'Title + description':k==='li'?'Post text (English)':'Caption';
    const chips=[d.ai?'AI label on':'',k==='yt'?(c.yt?esc(c.yt.title):'YouTube not connected'):'',k==='yt'&&!(c.yt&&c.yt.public)&&!man?'Private until audit':'',k==='li'?'Personal profile':'',(d.when?'Scheduled ':'Posts ')+esc(wtxt)].filter(Boolean);
    const pill=man?'<span class="pill warn">Manual</span>':okd?'<span class="pill good">Approved</span>':'<span class="pill acc">Draft</span>';
    return `<article class="dcard${man?' man':''}${okd?' okd':''}">
      <div class="dc-h">${pbx(k)}<b>${PB[k][2]}${k==='yt'?' Short':''}</b>${pill}</div>
      ${man?`<p class="dc-m">You post this one yourself${k==='ig'?' (e.g. with trending audio)':''}. After approval, the video and this caption are ready in the app to copy.</p>`:''}
      <div class="dc-b"><span class="dc-th">${PLAY}<i>${PSUB2[k][0]}</i></span><div class="dc-f">
        <div class="dc-l"><span>${lab}</span>${c.ai?`<button type="button" class="rw" data-rw="${k}">✦ Rewrite</button>`:''}</div>
        ${k==='yt'?`<input class="dc-in" data-cap="yt" data-f="title" maxlength="100" value="${esc(x.title||'')}" placeholder="YouTube title" aria-label="YouTube title">`:''}
        <textarea class="dc-ta" data-cap="${k}" data-f="cap" maxlength="${{ig:2200,fb:5000,yt:5000,li:3000}[k]}" aria-label="${PB[k][2]} ${lab}" placeholder="${k==='li'?'Write in English':'Write the caption'}">${esc(x.cap||'')}</textarea>
        <span class="cnt" data-cnt="${k}cap">${(x.cap||'').length}</span></div></div>
      <div class="dc-c">${chips.map(t=>`<span class="pill">${t}</span>`).join('')}</div>
      ${okd?`<button type="button" class="dc-ok" data-unok="${k}">✓ Approved · tap to undo</button>`
        :`<div class="dc-a"><button type="button" class="abtn a-ghost" data-skip="${k}">Skip</button>${own?`<button type="button" class="abtn a-good" data-okc="${k}">Approve</button>`:man?`<button type="button" class="abtn a-ghost" data-copy="${k}">Copy caption</button>`:''}</div>`}
    </article>`};
  const sentBy=p.status==='sentback'?((p.history||[]).slice().reverse().find(h=>/^Sent back/.test(h.what))||{}).who:'';
  return `<div class="pback"><button type="button" class="linkbtn" id="pBack">← Publish</button>${pstPill(p.status)}</div>
  <h2 class="hello" style="margin:2px 0 2px">Review drafts</h2><p class="sub" style="margin:0">${esc(p.title)} · ${esc(wtxt)}</p>
  ${own?`<div class="prog" aria-hidden="true">${on.map(k=>`<span class="${PV.ok[k]?'on':''}"></span>`).join('')}</div><p class="sub" style="margin:6px 0 0;font-weight:700">${nOk} of ${on.length} approved</p>`:''}
  ${p.status==='sentback'?`<div class="note warnb"><b>Sent back${sentBy?' by '+esc(sentBy):''}:</b> ${esc(p.note||'Please make changes.')}</div>`:''}
  ${p.status==='pending'&&!own?`<div class="note">Sent for approval. You can still change captions until an Owner approves.</div>`:''}
  <p class="ok" id="pAiMsg" role="status"></p>
  <div class="dcards">${on.map(card).join('')}</div>
  ${skipped.length?`<div class="skips"><span class="sub">Skipped:</span>${skipped.map(k=>`<button type="button" class="vchip" data-unskip="${k}">${pbx(k)} ${PB[k][2]} · bring back</button>`).join('')}</div>`:''}
  <section class="apanel">
    <label class="ap-w"><span>Goes live</span><select id="pWhenSel"><option value="now" ${!d.when?'selected':''}>Right after approval</option><option value="best" ${d.when&&Math.abs(new Date(d.when)-t730())<60000?'selected':''}>${dayWord(t730())} 7:30 pm</option><option value="pick" ${d.when&&Math.abs(new Date(d.when)-t730())>=60000?'selected':''}>${d.when&&Math.abs(new Date(d.when)-t730())>=60000?esc(when(d.when)):'Pick date & time…'}</option></select></label>
    <input type="datetime-local" id="pWhenPick" hidden min="${localDT(new Date().toISOString())}" aria-label="Pick date and time">
    <p class="err" id="pErr" role="alert"></p>
    <button type="button" class="ap-go" id="pGo" ${on.length?'':'disabled'}>${own?'Approve '+(on.length>1?'all '+on.length:'')+' & '+(d.when?'schedule':'post now'):(p.status==='pending'?'Save changes':'Send for approval')}</button>
    <div class="ap-row"><button type="button" class="ap-l" id="pSave">Save &amp; close</button>${own&&['pending','approved','scheduled'].includes(p.status)&&p.byId!==PUB().me?`<button type="button" class="ap-l" id="pSendBack">Send back with a note</button>`:''}<button type="button" class="ap-l bad" id="pDel">Remove</button></div>
  </section>`;
}
function afterPublish(){
  const v=$('#view');
  const back=$('#pBack');if(back)back.onclick=()=>{PV={mode:'list'};render();window.scrollTo(0,0)};
  v.querySelectorAll('[data-pid]').forEach(b=>b.addEventListener('click',()=>{pubOpen(b.dataset.pid);render();window.scrollTo(0,0)}));
  v.querySelectorAll('[data-pok]').forEach(b=>b.addEventListener('click',()=>{if(!confirmInline(b,'Tap again'))return;pubCall({op:'approve',id:b.dataset.pok},b,()=>render())}));
  v.querySelectorAll('[data-pback]').forEach(b=>b.addEventListener('click',()=>pubAskNote(n=>pubCall({op:'sendback',id:b.dataset.pback,note:n},b,()=>render()))));
  if(PV.mode==='edit') return afterPubEdit();
  if(PV.mode==='view'){
    const p=(PUB().posts||[]).find(x=>x.id===PV.id);if(!p)return;
    v.querySelectorAll('[data-mcopy]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.mcopy;copyText((k==='yt'?(p.plats.yt.title||p.title)+'\n\n':'')+(p.plats[k].cap||'')).then(ok=>{b.textContent=ok?'✓ Copied':'Copy failed'})}));
    v.querySelectorAll('[data-mdone]').forEach(b=>b.addEventListener('click',()=>{if(!confirmInline(b,'Posted? Tap again'))return;pubCall({op:'manualDone',id:p.id,plat:b.dataset.mdone},b,()=>render())}));
    const rt=$('#pRetry');if(rt)rt.onclick=()=>pubCall({op:'retry',id:p.id},rt,()=>render());
    const rf=$('#pRefresh');if(rf)rf.onclick=()=>pubCall({op:'list'},rf,()=>render());
    const sb=$('#pSendBack');if(sb)sb.onclick=()=>pubAskNote(n=>pubCall({op:'sendback',id:p.id,note:n},sb,()=>render()));
    const dl=$('#pDel');if(dl)dl.onclick=()=>{if(!confirmInline(dl,'Tap again to remove'))return;pubCall({op:'delete',id:p.id},dl,()=>{PV={mode:'list'};render()})};
    return;
  }
  // step 1: new video
  const ready=PUB().ready||[],f=ready[PS.fi];
  const pv=$('#vPrev'),nx=$('#vNext');if(pv)pv.onclick=()=>{PS.fi--;render()};if(nx)nx.onclick=()=>{PS.fi++;render()};
  if(!f) return;
  const sc=$('#pScript');sc.addEventListener('change',()=>{PS.scriptId=sc.value;render()});
  v.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{PS.modes[b.dataset.mode]=b.dataset.m;render()}));
  const tg=$('#pAiT');if(tg)tg.onclick=()=>{PS.ai=!PS.ai;render()};
  v.querySelectorAll('[data-w]').forEach(b=>b.addEventListener('click',()=>{PS.when=b.dataset.w;render()}));
  const pw=$('#pWhen');pw.addEventListener('change',()=>{if(!pw.value)return;if(new Date(pw.value)<new Date()){$('#pErr').textContent='Pick a time in the future.';return}PS.pick=pw.value;PS.when='pick';render()});
  $('#pMake').onclick=async()=>{
    const b=$('#pMake'),err=$('#pErr');err.textContent='';
    if(PS.when==='pick'&&!PS.pick){err.textContent='Pick the date and time first.';return}
    const s=(DATA.scripts||[]).find(x=>x.id===PS.scriptId),c=PUB().conn||{};
    const title=s?s.title:f.name.replace(/\.[^.]+$/,'');
    const ai=s?/^yes/i.test(String(s.ai_label)):false;
    const plats={};PKEYS.forEach(k=>plats[k]={mode:PS.modes[k],cap:''});plats.yt.title='';
    if(s){plats.ig.cap=s.caption||'';plats.fb.cap=s.caption||'';plats.yt.cap=s.caption||'';plats.yt.title=String(s.title||'').slice(0,90)+' #Shorts'}
    b.disabled=true;b.textContent='Making drafts…';
    let cost=null;
    if(PS.ai&&c.ai){const r=await sendPub({op:'caption',title,fileName:f.name,scriptId:PS.scriptId,ai});
      if(r&&r.ok){const x=r.caps;plats.ig.cap=x.ig;plats.fb.cap=x.fb;plats.li.cap=x.li;plats.yt.title=x.yt_title;plats.yt.cap=x.yt_desc;cost=r.cost}
      else err.textContent='Auto-write did not work ('+((r&&r.message)||'no internet')+'). Drafts are made without it; write captions on the next screen.'}
    const r=await sendPub({op:'save',post:{fileId:f.id,title,scriptId:PS.scriptId,ai,when:whenISO(PS),plats}});
    if(!r||!r.ok){b.disabled=false;b.textContent='Try again';err.textContent=(r&&r.message)||'Something went wrong. Check your internet.';return}
    DATA.pub=r.pub;PS=null;pubOpen(r.id);render();window.scrollTo(0,0);
    const m=$('#pAiMsg');if(m)m.textContent=cost!=null?'✓ Captions written · cost ₹'+cost+'. Read them, change anything, then approve.':'Drafts ready. Check each caption, then approve.';
  };
}
function afterPubEdit(){
  const d=PV.d,v=$('#view'),p=(PUB().posts||[]).find(x=>x.id===PV.id);if(!p)return;
  const keep=()=>{};
  v.querySelectorAll('[data-cap]').forEach(el=>el.addEventListener('input',()=>{d.plats[el.dataset.cap][el.dataset.f]=el.value;delete PV.ok[el.dataset.cap];const c=v.querySelector(`[data-cnt="${el.dataset.cap}${el.dataset.f}"]`);if(c)c.textContent=el.value.length}));
  v.querySelectorAll('[data-skip]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.skip;d.plats[k].modeWas=d.plats[k].mode;d.plats[k].mode='off';delete PV.ok[k];render()}));
  v.querySelectorAll('[data-unskip]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.unskip;d.plats[k].mode=d.plats[k].modeWas||'auto';render()}));
  v.querySelectorAll('[data-okc]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.okc,x=d.plats[k];
    if(x.mode==='auto'&&!(k==='yt'?x.title:x.cap)){$('#pErr').textContent='';b.textContent=k==='yt'?'Add a title first':'Add a caption first';return}
    PV.ok[k]=true;render()}));
  v.querySelectorAll('[data-unok]').forEach(b=>b.addEventListener('click',()=>{delete PV.ok[b.dataset.unok];render()}));
  v.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.copy;copyText((k==='yt'?(d.plats.yt.title||'')+'\n\n':'')+(d.plats[k].cap||'')).then(ok=>{b.textContent=ok?'✓ Copied':'Copy failed'})}));
  v.querySelectorAll('[data-rw]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.rw;
    pubCall({op:'caption',title:d.title,fileName:p.file.name,scriptId:d.scriptId,ai:d.ai},b,r=>{const x=r.caps;
      if(k==='yt'){d.plats.yt.title=x.yt_title;d.plats.yt.cap=x.yt_desc}else d.plats[k].cap=x[k];delete PV.ok[k];
      if(DATA.pub&&DATA.pub.conn)DATA.pub.conn.aiMonth=r.month;render();const m=$('#pAiMsg');if(m)m.textContent='✓ '+PB[k][2]+' rewritten · cost ₹'+r.cost})}));
  const ws=$('#pWhenSel'),wp=$('#pWhenPick');
  ws.addEventListener('change',()=>{if(ws.value==='now'){d.when='';render()}else if(ws.value==='best'){d.when=t730().toISOString();render()}else{wp.hidden=false;wp.focus();try{wp.showPicker()}catch(e){}}});
  wp.addEventListener('change',()=>{if(!wp.value)return;const x=new Date(wp.value);if(x<new Date()){$('#pErr').textContent='Pick a time in the future.';return}d.when=x.toISOString();render()});
  const payload=()=>{const pl=JSON.parse(JSON.stringify(d.plats));PKEYS.forEach(k=>delete pl[k].modeWas);return {title:d.title,scriptId:d.scriptId,ai:d.ai,when:d.when||'',plats:pl}};
  const check=()=>{const on=PKEYS.filter(k=>d.plats[k].mode!=='off');if(!on.length)return 'Bring back at least one platform.';
    const miss=on.filter(k=>d.plats[k].mode==='auto'&&!(k==='yt'?d.plats.yt.title:d.plats[k].cap));if(miss.length)return 'Add the '+(miss[0]==='yt'?'YouTube title':PB[miss[0]][2]+' caption')+' first.';
    if(d.when&&new Date(d.when)<new Date())return 'The time has passed. Pick a new time.';return ''};
  $('#pGo').onclick=()=>{const e=check();if(e){$('#pErr').textContent=e;return}const b=$('#pGo'),own=CAN('approve');
    const op=own?'approve':(p.status==='pending'?'save':'submit');
    if(own&&!confirmInline(b,'Tap again to approve'))return;
    pubCall({op,id:PV.id,post:payload()},b,r=>{const q=(PUB().posts||[]).find(x=>x.id===r.id);PV=q&&['approved','scheduled','posting','posted','manual'].includes(q.status)?{mode:'view',id:r.id}:{mode:'list'};render();window.scrollTo(0,0)})};
  $('#pSave').onclick=()=>pubCall({op:'save',id:PV.id,post:payload()},$('#pSave'),()=>{PV={mode:'list'};render();window.scrollTo(0,0)});
  const sb=$('#pSendBack');if(sb)sb.onclick=()=>pubAskNote(n=>pubCall({op:'sendback',id:PV.id,note:n},sb,()=>{PV={mode:'list'};render()}));
  const dl=$('#pDel');dl.onclick=()=>{if(!confirmInline(dl,'Tap again to remove'))return;pubCall({op:'delete',id:PV.id},dl,()=>{PV={mode:'list'};render()})};
}
function pubBanner(){
  if(!DATA.pub||!CAN('publish'))return '';const ps=DATA.pub.posts||[];
  const w=CAN('approve')?ps.filter(p=>p.status==='pending').length:0,sb=ps.filter(p=>p.status==='sentback'&&p.byId===DATA.pub.me).length,rd=(DATA.pub.ready||[]).length,fl=CAN('approve')?ps.filter(p=>p.status==='failed'||p.status==='partly').length:0;
  if(w) return `<button type="button" class="pbanner" data-tab="publish"><span><b>${w}</b> post${w>1?'s':''} waiting for your approval</span><span aria-hidden="true">→</span></button>`;
  if(sb) return `<button type="button" class="pbanner soft" data-tab="publish"><span><b>${sb}</b> post${sb>1?'s were':' was'} sent back to you</span><span aria-hidden="true">→</span></button>`;
  if(fl) return `<button type="button" class="pbanner soft" data-tab="publish"><span><b>${fl}</b> post${fl>1?'s':''} need${fl>1?'':'s'} a fix</span><span aria-hidden="true">→</span></button>`;
  if(rd) return `<button type="button" class="pbanner soft" data-tab="publish"><span><b>${rd}</b> new video${rd>1?'s':''} ready to post</span><span aria-hidden="true">→</span></button>`;
  return '';
}
function pubConnHtml(){
  const c=PUB().conn||{},own=CAN('approve');
  const row=(b,name,ok,txt,fix)=>`<div class="prow">${b}<span class="t"><b>${name}</b><span class="${ok?'':'w'}">${esc(txt)}</span>${!ok&&own&&fix?`<span class="fix">${esc(fix)}</span>`:''}</span><span class="st ${ok?'on':'pend'}" aria-label="${ok?'ready':'needs setup'}"></span></div>`;
  const meta=c.meta&&c.metaMissing&&!c.metaMissing.length;
  const icon=t=>`<span class="pbadge" style="background:#141414;color:#F8A01B">${t}</span>`;
  return `<div class="cap">Connections</div><div class="list">
    ${row(pbx('fb')+pbx('ig'),'Facebook + Instagram',meta,!c.meta?'Meta token not saved':c.metaMissing==null?'Could not check permissions':c.metaMissing.length?'Needs: '+c.metaMissing.join(', '):'Ready to post','Sheet → Digital Poonam → Publish → Check Meta posting permissions')}
    ${row(icon('☁'),'Video link (Cloudinary)',!!c.cld,c.cld?'Ready':'Not set up · needed for Facebook + Instagram','Sheet → Publish → 2. Save Cloudinary key')}
    ${row(pbx('yt'),'YouTube',!!c.yt,c.yt?c.yt.title+(c.yt.public?' · public uploads':' · uploads stay Private until Google’s audit'):'Not connected','Sheet → Publish → 4. Connect YouTube for posting')}
    ${row(pbx('li'),'LinkedIn',!!(c.li&&c.li.days>3),c.li?(c.li.days>0?c.li.name+' · sign-in valid '+c.li.days+' more days':'Sign-in expired'):'Not connected','Sheet → Publish → 3. Connect LinkedIn')}
    ${row(icon('✦'),'Auto-write captions',!!c.ai,c.ai?'Claude · ₹'+(c.aiMonth||0)+' used this month':'Off · write captions yourself','Sheet → Publish → 5. Save Claude key')}
  </div>`;
}
function pubDetailView(){
  const p=(PUB().posts||[]).find(x=>x.id===PV.id);
  if(!p) return `<div class="pback"><button type="button" class="linkbtn" id="pBack">← Publish</button></div><section class="panel">${empty('This post is gone. It may have been removed.')}</section>`;
  const own=CAN('approve'),on=PKEYS.filter(k=>p.plats[k]&&p.plats[k].mode!=='off'),r=p.res||{};
  const ok=on.filter(k=>r[k]&&r[k].st==='ok').length;
  const big={posted:'Live on '+ok+' of '+on.length,manual:'Live on '+ok+' of '+on.length,partly:'Live on '+ok+' of '+on.length,failed:'Not posted',posting:'Posting now',approved:'Starting soon',scheduled:'Scheduled',pending:'Waiting for approval',draft:'Draft',sentback:'Sent back'}[p.status]||p.status;
  const sub={posted:'Everything is live',manual:'Post the rest by hand below',partly:'Some platforms need a fix',failed:'See what went wrong below',posting:'Big videos take a few minutes. Tap Refresh status.',approved:'Starts within 5 minutes',scheduled:when(p.when),pending:'An Owner needs to approve it'}[p.status]||'';
  const ic=['posted'].includes(p.status)?'<span class="dn-i good">✓</span>':['failed','partly'].includes(p.status)?'<span class="dn-i bad">!</span>':'<span class="dn-i">⏱</span>';
  const line=k=>{const x=r[k]||{},m=p.plats[k].mode;
    let s='',cls='',act='';
    if(x.st==='ok'){s=(x.note||'Live')+(x.at?' · '+when(x.at):'');cls=x.note&&/Private/.test(x.note)?'w':'g';act=x.url?`<a class="linkbtn" href="${esc(x.url)}" target="_blank" rel="noopener">Open</a>`:''}
    else if(x.st==='err'){s=x.msg||'Failed';cls='b'}
    else if(x.st==='manual'){s='Post this yourself, then tap Done';cls='w';act=`<button type="button" class="linkbtn" data-mdone="${k}">Done</button>`}
    else if(x.st==='working'||x.st==='queued'){s=x.msg||'Waiting to start';cls=''}
    else s=m==='manual'?'By hand, after approval':'After approval';
    return `<div class="prow">${pbx(k)}<span class="t"><b>${PB[k][2]}</b><span class="${cls}">${esc(s)}</span>${x.st==='manual'?`<span class="mrow"><button type="button" class="abtn a-ghost sm" data-mcopy="${k}">Copy caption</button>${p.file.url?`<a class="abtn a-ghost sm" href="${esc(p.file.url)}" target="_blank" rel="noopener">Get video</a>`:''}</span>`:''}</span>${act}</div>`};
  const capPrev=on.map(k=>`<div class="cprev">${pbx(k)}<div>${k==='yt'?`<b>${esc(p.plats.yt.title||p.title)}</b><br>`:''}${esc(p.plats[k].cap||'—').replace(/\n/g,'<br>')}</div></div>`).join('');
  return `<div class="pback"><button type="button" class="linkbtn" id="pBack">← Publish</button>${pstPill(p.status)}</div>
  <section class="pubhero dn"><div class="dn-row">${ic}<div><h2>${esc(big)}</h2><p>${esc(p.title)}${sub?' · '+esc(sub):''}</p></div></div></section>
  <div class="list" style="margin-top:14px">${on.map(line).join('')}</div>
  <p class="err" id="pErr" role="alert"></p>
  <div class="pacts">
    ${own&&['failed','partly'].includes(p.status)?`<button type="button" class="abtn a-good big" id="pRetry">Try failed ones again</button>`:''}
    ${['posting','approved','scheduled'].includes(p.status)?`<button type="button" class="abtn a-ghost big" id="pRefresh">Refresh status</button>`:''}
    ${own&&['approved','scheduled'].includes(p.status)&&!on.some(k=>r[k]&&(r[k].st==='ok'||r[k].st==='working'))?`<button type="button" class="abtn a-ghost big" id="pSendBack">Stop &amp; send back</button>`:''}
    ${(own||p.byId===PUB().me)&&['posted','manual','failed','partly'].includes(p.status)?`<button type="button" class="abtn a-ghost big danger" id="pDel">Remove from list</button>`:''}
  </div>
  <details class="panel pdet"><summary>Captions</summary>${capPrev}</details>
  <details class="panel pdet"><summary>History</summary><ul class="alog">${(p.history||[]).slice().reverse().map(h=>`<li><span class="sub">${esc(when(h.t))}</span> · <b>${esc(h.who)}</b><br>${esc(h.what)}</li>`).join('')}</ul></details>`;
}
function pubCall(op,btn,after){
  const err=$('#pErr')||document.querySelector(`[data-perr="${op.id}"]`);if(err)err.textContent='';
  if(btn){btn.disabled=true;btn.dataset.t=btn.textContent;btn.textContent='Please wait…'}
  return sendPub(op).then(r=>{
    if(btn&&btn.isConnected){btn.disabled=false;btn.textContent=btn.dataset.t}
    if(!r||!r.ok){const e=$('#pErr')||document.querySelector(`[data-perr="${op.id}"]`);if(e)e.textContent=(r&&r.message)||'Something went wrong. Check your internet.';return null}
    if(r.pub)DATA.pub=r.pub;if(after)after(r);return r});
}
function pubAskNote(cb){
  const dlg=$('#actDlg');
  dlg.innerHTML=`<form method="dialog" class="dlg" id="nbForm"><h2>Send back</h2><p class="sub">Tell them what to change. They see this note on the post.</p>
    <label class="fld">Note<textarea id="nbNote" rows="4" maxlength="500" placeholder="e.g. Change the hook, add the free class link"></textarea></label>
    <div class="dlg-acts"><button type="button" class="abtn a-ghost" id="nbCancel">Cancel</button><button type="submit" class="abtn a-good">Send back</button></div></form>`;
  $('#nbCancel').onclick=()=>dlg.close();
  $('#nbForm').onsubmit=e=>{e.preventDefault();const n=$('#nbNote').value.trim();dlg.close();cb(n)};
  dlg.showModal();
}
function websiteView(){
  if(!WEB_ON) return `<section class="panel"><h2>Website analytics</h2><p class="sub">Visitors, pages and where they come from (Google Analytics)</p>
    <p style="margin:0 0 8px">Not connected yet. When you have a minute:</p>
    <ol class="steps"><li>Open the Google Sheet → <b>Digital Poonam → Website → Connect Google Analytics</b>.</li>
    <li>Sign in with <b>the Google account that owns the website's Analytics</b> and click Allow.</li>
    <li>Pick your website from the list. Data appears after the next sync.</li></ol></section>`;
  const R=state.range,a=webDaysArr(),cc=a.slice(DAYS-R),pp=a.slice(DAYS-2*R,DAYS-R),col='#6D28D9';
  const tp=(WEB.pages||[]).slice(0,10),src=(WEB.sources||[]).slice(0,8),smax=Math.max(1,...src.map(s=>+s.users||0));
  return `<div class="grid kpis k4">
    ${kpi('Visitors',S(cc,'users'),S(pp,'users'),compact,cc.map(r=>r.users),col)}
    ${kpi('Sessions',S(cc,'sessions'),S(pp,'sessions'),compact,cc.map(r=>r.sessions),col)}
    ${kpi('Page views',S(cc,'views'),S(pp,'views'),compact,cc.map(r=>r.views),col)}
    ${kpi('Engaged sessions',S(cc,'engaged'),S(pp,'engaged'),compact,cc.map(r=>r.engaged),col)}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="panel"><h2>Top pages</h2><p class="sub">Last ${WEB.window||30} days</p>${tp.length?`<div class="tbl-wrap"><table><thead><tr><th>Page</th><th>Views</th><th>Visitors</th></tr></thead><tbody>${tp.map(r=>`<tr><td class="post-title">${esc(r.title||r.path)}<br><span class="sub" style="margin:0">${esc(r.path)}</span></td><td>${num(+r.views||0)}</td><td>${num(+r.users||0)}</td></tr>`).join('')}</tbody></table></div>`:empty('No pages yet.')}</section>
    <section class="panel"><h2>Where visitors come from</h2><p class="sub">Last ${WEB.window||30} days</p>${src.length?`<div class="hbars">${src.map(s=>`<div class="hb"><span>${esc(s.source)}</span><div class="track"><div class="fill" style="width:${(+s.users||0)/smax*100}%;background:${col}"></div></div><span class="n">${num(+s.users||0)}</span></div>`).join('')}</div>`:empty('No data yet.')}</section>
  </div>`;
}

(function header(){
  const L=DATA.lastSync, n=dates.length;
  const when=L&&L.time?new Date(L.time).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):null;
  $('#conns').innerHTML=[['--fb','Facebook Page'],['--ig','Instagram'],['--ads','Ad account']].concat(YCH.map(c=>[c.colorName,c.title])).map(x=>`<span class="conn"><span class="dot" style="background:var(${x[0]})"></span>${x[1]}</span>`).join('');
  const who=`<span class="who">${esc(ME.name)} · ${esc(ME.roleName)}</span>`;
  $('#syncNote').innerHTML = (n||!CAN('analytics'))
    ? `<span class="live-dot" aria-hidden="true"></span><span><b>Live</b> · synced ${when?esc(when):dates.length+' days'}</span>${who}`
    : `<span aria-hidden="true">◆</span><span><b>No data yet.</b> Open the Google Sheet and run <b>Digital Poonam → 2. Load last 90 days</b>, then reload this page.</span>`;
})();
const views={home:[home,afterHome],team:[teamView,afterTeam],publish:[publishView,afterPublish],channels:[channelsView,()=>{}],website:[websiteView,()=>{}],instagram:[()=>platform('ig'),()=>afterPlatform('ig')],facebook:[()=>platform('fb'),()=>afterPlatform('fb')],
  ads:[ads,afterAds],youtube:[youtube,afterYoutube],scripts:[scriptsView,afterScripts],competition:[competition,afterCompetition],posts:[postsView,bindSort],audience:[audience,afterAudience]};
if(!views[state.tab]||!allowed(state.tab)) state.tab='home';
document.querySelectorAll('.tab,#bnav button').forEach(b=>{if(!allowed(b.dataset.tab))b.hidden=true});
if(CAN('team')){const t=document.createElement('button');t.className='tab';t.setAttribute('role','tab');t.dataset.tab='team';t.id='t-team';t.textContent='Team';$('#tabs').appendChild(t);}
function render(){
  const keepY=window.scrollY;
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.tab===state.tab));
  document.body.setAttribute('data-screen',state.tab);
  document.querySelectorAll('#range button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.d===state.range));
  const c=slice(state.range);
  $('#rangeLabel').textContent=dlabel(c[0].d)+' – '+dlabel(c[c.length-1].d)+' '+c[c.length-1].d.getFullYear();
  const [html,after]=views[state.tab];
  const pk={ads:'ads',youtube:'yt',website:'web'}[state.tab];
  try{ $('#view').innerHTML=(pk&&platData(pk)?`<div class="chero">${heroCard(pk)}</div>`:'')+html(); after();
    document.querySelectorAll('.chero .bc-b').forEach(b=>b.addEventListener('click',()=>{state.hsel=+b.dataset.i;render()})); }
  catch(err){ $('#view').innerHTML=`<section class="panel">${empty('Could not show this screen: '+esc(err.message))}</section>`; }
  document.querySelectorAll('#bnav button').forEach(x=>x.setAttribute('aria-current',x.dataset.tab===state.tab?'page':'false'));
  const plat={team:'Team',instagram:'Instagram',facebook:'Facebook',ads:'Meta Ads',youtube:'YouTube',website:'Website',posts:'All posts',audience:'Audience'}[state.tab];
  const pk2={instagram:'ig',facebook:'fb',ads:'ads',youtube:'yt',website:'web'}[state.tab];
  $('#backRow').hidden=!plat; $('#backTitle').innerHTML=plat?(pk2?pbadge(pk2):'')+'<span>'+esc(plat)+'</span>':'';
  window.scrollTo(0,keepY);
}
const goTab=t=>{if(!views[t]||!allowed(t))return;state.tab=t;save();render();window.scrollTo({top:0,behavior:'smooth'})};
/* light / dark switch: remembers your choice, otherwise follows the phone */
const SUN='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
const MOON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path></svg>';
const curTheme=()=>document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';
function paintThemeBtn(){const b=$('#themeBtn');if(!b)return;const d=curTheme()==='dark';b.innerHTML=(d?SUN:MOON)+'<span class="tl">'+(d?'Light':'Dark')+'</span>';b.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0B0B0C':'#FAF8F5');}
$('#themeBtn').addEventListener('click',()=>{const n=curTheme()==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);try{localStorage.setItem('dp-theme',n)}catch(e){}paintThemeBtn();render()});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{let saved=null;try{saved=localStorage.getItem('dp-theme')}catch(x){}if(saved)return;document.documentElement.setAttribute('data-theme',e.matches?'dark':'light');paintThemeBtn();render()})}catch(e){}
paintThemeBtn();
document.addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b||b.classList.contains('tab'))return;e.preventDefault();goTab(b.dataset.tab)});
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(!b)return;state.tab=b.dataset.tab;save();render()});
$('#range').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.range=+b.dataset.d;state.hsel=null;state.hsel2=null;save();render()});
let rt,lastW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-lastW)<2)return;lastW=innerWidth;clearTimeout(rt);rt=setTimeout(render,150)}); // only redraw when the width really changes
render();
})();
