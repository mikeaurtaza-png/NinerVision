import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Brain, CalendarDays, ChevronDown, Download, Eye, Gauge, Home, Menu, Network, Search, Shield, Sparkles, Target, TrendingUp, Users, X, Zap } from 'lucide-react';
import './styles.css';

const TEAM_CODES = ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'];
const TEAM_NAMES = {ARI:'Cardinals',ATL:'Falcons',BAL:'Ravens',BUF:'Bills',CAR:'Panthers',CHI:'Bears',CIN:'Bengals',CLE:'Browns',DAL:'Cowboys',DEN:'Broncos',DET:'Lions',GB:'Packers',HOU:'Texans',IND:'Colts',JAX:'Jaguars',KC:'Chiefs',LAC:'Chargers',LAR:'Rams',LV:'Raiders',MIA:'Dolphins',MIN:'Vikings',NE:'Patriots',NO:'Saints',NYG:'Giants',NYJ:'Jets',PHI:'Eagles',PIT:'Steelers',SEA:'Seahawks',SF:'49ers',TB:'Buccaneers',TEN:'Titans',WAS:'Commanders'};
const ESPN = { WAS:'wsh' };
const logo = t => `https://a.espncdn.com/i/teamlogos/nfl/500/${(ESPN[t] || t || 'SF').toLowerCase()}.png`;
const SF = 'SF';

const PAGES = [
  {id:'vision', icon:Home, label:'Vision'},
  {id:'landscape', icon:Eye, label:'Landscape'},
  {id:'charts', icon:BarChart3, label:'Charts'},
  {id:'players', icon:Users, label:'Players'},
  {id:'qb', icon:Zap, label:'QB Lab'},
  {id:'intelligence', icon:Brain, label:'Intelligence'},
  {id:'personnel', icon:Network, label:'Personnel'},
  {id:'matchups', icon:CalendarDays, label:'Matchups'},
  {id:'creator', icon:Download, label:'Creator'},
];
const MOBILE_CORE = ['vision','landscape','charts','players'];

const METRICS = {
  nvi: {label:'NVI Score', sub:'Sustainable team profile', unit:'', better:'higher', min:45, max:98, meaning:'A composite read of sustainable winning traits: efficiency, balance, pressure, explosiveness, situational football, and recent form.'},
  off_epa: {label:'Efficiency Engine', sub:'Offensive EPA/play', unit:'', better:'higher', min:-.14, max:.18, meaning:'Down-to-down offensive value creation.'},
  def_epa_allowed: {label:'Resistance Score', sub:'Defensive EPA allowed', unit:'', better:'lower', min:-.15, max:.16, meaning:'How well a defense prevents offensive value. Lower is better.'},
  success_rate: {label:'Drive Stability', sub:'Success rate', unit:'%', better:'higher', min:.34, max:.54, meaning:'How often plays keep the offense on schedule.'},
  explosive_rate: {label:'Strike Rate', sub:'Explosive play rate', unit:'%', better:'higher', min:.055, max:.115, meaning:'How frequently a team creates chunk-play stress.'},
  points_per_drive: {label:'Drive Finish', sub:'Points per drive', unit:'', better:'higher', min:1.15, max:2.9, meaning:'How efficiently possessions turn into points.'},
  red_zone_epa: {label:'Finish Rate', sub:'Red-zone EPA', unit:'', better:'higher', min:-.18, max:.25, meaning:'Value created inside scoring territory.'},
  third_down: {label:'Money Downs', sub:'3rd down conversion', unit:'%', better:'higher', min:.30, max:.54, meaning:'Drive-extension ability when defenses expect the pass.'},
  neutral_pass_rate: {label:'Aggression Profile', sub:'Neutral pass rate', unit:'%', better:'higher', min:.42, max:.66, meaning:'How aggressive a team is in balanced game states.'},
  pressure_rate: {label:'Disruption Rate', sub:'Pressure rate', unit:'%', better:'higher', min:.24, max:.43, meaning:'How often a defense makes the pocket uncomfortable.'},
  pressure_allowed: {label:'Pocket Stress', sub:'Pressure allowed', unit:'%', better:'lower', min:.20, max:.42, meaning:'How often an offense allows disruption. Lower is better.'},
  pace: {label:'Tempo', sub:'Seconds/play index', unit:'', better:'higher', min:50, max:95, meaning:'How quickly a team stresses defenses between snaps.'},
  play_action: {label:'Play-Action Identity', sub:'PA usage', unit:'%', better:'higher', min:.10, max:.34, meaning:'How often the offense uses run-action conflict.'},
  motion_rate: {label:'Motion Stress', sub:'Motion usage', unit:'%', better:'higher', min:.28, max:.78, meaning:'How often the offense uses motion to create leverage.'},
};
const CHART_METRICS = ['off_epa','def_epa_allowed','success_rate','explosive_rate','points_per_drive','red_zone_epa','third_down','neutral_pass_rate','pressure_rate','pressure_allowed'];

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : null; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function mean(rows,k){ const xs = rows.map(r=>num(r[k])).filter(v=>v!==null); return xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0; }
function scale(v,min,max){ return clamp(((num(v) ?? min) - min) / (max - min) * 100, 0, 100); }
function fmt(v,k){ const n=num(v); if(n===null) return '—'; const m=METRICS[k]||{}; if(m.unit==='%') return `${(n*100).toFixed(1)}%`; if(k==='nvi') return `${Math.round(n)}`; if(Math.abs(n)<1) return `${n>0?'+':''}${n.toFixed(3)}`; return n.toFixed(2); }
function metricValue(row,k){ return num(row?.[k]); }
function sortRows(rows,k){ const high = METRICS[k]?.better !== 'lower'; return [...rows].filter(r=>metricValue(r,k)!==null).sort((a,b)=> high ? metricValue(b,k)-metricValue(a,k) : metricValue(a,k)-metricValue(b,k)); }
function rankOf(rows,k,team='SF'){ const sorted=sortRows(rows,k); const idx=sorted.findIndex(r=>r.team===team); return idx>=0 ? idx+1 : null; }
function percentile(rank,total){ return rank ? Math.round((1-(rank-1)/Math.max(total-1,1))*100) : null; }

function fallbackLeague(){
  return TEAM_CODES.map((t,i)=>{
    const seed = (i*37)%29;
    const isSF=t==='SF';
    const off = isSF ? .118 : -.105 + ((seed+8)%29)/120;
    const def = isSF ? -.056 : -.115 + ((seed+3)%29)/115;
    const success = isSF ? .497 : .36 + ((seed+9)%19)/100;
    const explosive = isSF ? .094 : .061 + ((seed+5)%14)/1000;
    const ppd = isSF ? 2.48 : 1.25 + ((seed+2)%19)/10;
    const rz = isSF ? .138 : -.14 + ((seed+4)%28)/95;
    const third = isSF ? .462 : .31 + ((seed+6)%20)/100;
    const pass = isSF ? .542 : .44 + ((seed+1)%21)/100;
    const pr = isSF ? .374 : .25 + ((seed+2)%18)/100;
    const pa = isSF ? .289 : .22 + ((seed+12)%18)/100;
    return {team:t, name:TEAM_NAMES[t], logo:logo(t), off_epa:off, def_epa_allowed:def, success_rate:success, explosive_rate:explosive, points_per_drive:ppd, red_zone_epa:rz, third_down:third, neutral_pass_rate:pass, pressure_rate:pr, pressure_allowed:pa, pace:64+((seed+7)%25), play_action:.13+((seed+8)%20)/100, motion_rate:.31+((seed+10)%40)/100};
  });
}
function computeNVI(r){
  const off=scale(r.off_epa,-.14,.18), def=scale(-r.def_epa_allowed,-.16,.14), suc=scale(r.success_rate,.34,.54), exp=scale(r.explosive_rate,.055,.115), ppd=scale(r.points_per_drive,1.15,2.9), rz=scale(r.red_zone_epa,-.18,.25), th=scale(r.third_down,.30,.54), pr=scale(r.pressure_rate,.24,.43), pa=100-scale(r.pressure_allowed,.20,.42);
  return clamp(off*.23+def*.20+suc*.15+exp*.12+ppd*.10+rz*.08+th*.06+pr*.04+pa*.02,40,98);
}
function tierFor(r){
  const offense=scale(r.off_epa,-.14,.18), defense=scale(-r.def_epa_allowed,-.16,.14);
  const combo=offense+defense;
  if(combo>=160) return 'Elite';
  if(combo>=140) return 'Sustainable Contender';
  if(offense>=72 && defense<58) return 'Offense-Carried';
  if(defense>=72 && offense<58) return 'Defense-Carried';
  if(combo<88) return 'Rebuild / Volatile';
  return 'Volatile';
}
function normalizeLeague(raw){
  let arr = Array.isArray(raw) ? raw : (raw?.teams || raw?.league || raw?.data || []);
  if(!arr?.length) arr = fallbackLeague();
  const rows = arr.map((r,i)=>{
    const t = String(r.team || r.recent_team || r.abbr || TEAM_CODES[i%TEAM_CODES.length]).toUpperCase();
    const row = {
      ...r,
      team:t,
      name:r.name || r.team_name || TEAM_NAMES[t] || t,
      logo:r.logo || logo(t),
      off_epa: num(r.off_epa ?? r.epa_off ?? r.offensive_epa ?? r.off_epa_per_play ?? r.epa_per_play) ?? fallbackLeague()[i%32].off_epa,
      def_epa_allowed: num(r.def_epa_allowed ?? r.epa_allowed ?? r.defensive_epa_allowed ?? r.def_epa) ?? fallbackLeague()[i%32].def_epa_allowed,
      success_rate: num(r.success_rate ?? r.success) ?? fallbackLeague()[i%32].success_rate,
      explosive_rate: num(r.explosive_rate ?? r.explosive) ?? fallbackLeague()[i%32].explosive_rate,
      points_per_drive: num(r.points_per_drive ?? r.ppd) ?? fallbackLeague()[i%32].points_per_drive,
      red_zone_epa: num(r.red_zone_epa ?? r.rz_epa) ?? fallbackLeague()[i%32].red_zone_epa,
      third_down: num(r.third_down ?? r.third_down_rate ?? r.third_down_conv) ?? fallbackLeague()[i%32].third_down,
      neutral_pass_rate: num(r.neutral_pass_rate ?? r.pass_rate ?? r.neutral_pass) ?? fallbackLeague()[i%32].neutral_pass_rate,
      pressure_rate: num(r.pressure_rate ?? r.def_pressure_rate) ?? fallbackLeague()[i%32].pressure_rate,
      pressure_allowed: num(r.pressure_allowed ?? r.off_pressure_allowed) ?? fallbackLeague()[i%32].pressure_allowed,
      pace: num(r.pace) ?? fallbackLeague()[i%32].pace,
      play_action: num(r.play_action ?? r.play_action_rate) ?? fallbackLeague()[i%32].play_action,
      motion_rate: num(r.motion_rate ?? r.motion) ?? fallbackLeague()[i%32].motion_rate,
    };
    row.nvi = num(r.nvi ?? r.nvi_score ?? r.nv_index) ?? computeNVI(row);
    return row;
  }).slice(0,32);
  const keyed = Object.values(rows.reduce((acc,r)=>{acc[r.team]=r; return acc;},{}));
  const filled = TEAM_CODES.map(t=>keyed.find(r=>r.team===t) || fallbackLeague().find(r=>r.team===t));
  const withRanks = filled.map(r=>({...r}));
  ['nvi',...CHART_METRICS,'pace','play_action','motion_rate'].forEach(k=> sortRows(withRanks,k).forEach((r,i)=>{ const target=withRanks.find(x=>x.team===r.team); if(target) target[`${k}_rank`]=i+1; }));
  return withRanks.map(r=>({...r, tier:tierFor(r)}));
}

const fallbackPlayers = [
 {name:'Brock Purdy',pos:'QB',team:'SF',espn:'4361741',usage:610,stats:{epa:.194,cpoe:3.8,success:.51,adot:8.2,deep:.094,pressure:.13,third:.49,red:.28}},
 {name:'Christian McCaffrey',pos:'RB',team:'SF',espn:'3117251',usage:295,stats:{epa:.062,success:.49,explosive:.105,touches:312,redShare:.33,yac:4.1}},
 {name:'George Kittle',pos:'TE',team:'SF',espn:'3040151',usage:92,stats:{targets:88,share:.19,catch:.76,yprr:2.21,epaTarget:.39,yac:6.1,explosive:.18}},
 {name:'Jauan Jennings',pos:'WR',team:'SF',espn:'4040655',usage:102,stats:{targets:94,share:.21,catch:.61,yprr:1.82,epaTarget:.09,yac:3.7,explosive:.13}},
 {name:'Ricky Pearsall',pos:'WR',team:'SF',espn:'4430878',usage:73,stats:{targets:70,share:.16,catch:.66,yprr:1.74,epaTarget:.16,yac:4.5,explosive:.16}},
 {name:'Trent Williams',pos:'OL',team:'SF',espn:'13241',usage:900,stats:{pressure:.06,success:.74,run:.68,pass:.81}},
 {name:'Fred Warner',pos:'LB',team:'SF',espn:'3138826',usage:950,stats:{stops:.103,coverage:.18,pressure:.11,success:.71,explosive:.05}},
 {name:'Nick Bosa',pos:'EDGE',team:'SF',espn:'4040605',usage:812,stats:{pressure:.168,sackConv:.14,stops:.085,success:.66,explosive:.04}},
 {name:'Deommodore Lenoir',pos:'CB',team:'SF',espn:'4361539',usage:790,stats:{coverage:.12,success:.62,explosive:.07,stops:.052,pressure:.03}},
];
function playerHeadshot(id){ return id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png` : ''; }
function normalizePlayers(raw){
  let arr = Array.isArray(raw) ? raw : (raw?.players || raw?.data || []);
  if(!arr.length) arr = fallbackPlayers;
  const base = arr.map((p,i)=>{
    const f = fallbackPlayers[i%fallbackPlayers.length];
    const name = p.name || p.player_name || p.full_name || f.name;
    const pos = String(p.pos || p.position || f.pos || 'UNK').toUpperCase();
    const team = String(p.team || p.recent_team || 'SF').toUpperCase();
    const stats = {...(p.stats || {})};
    const usage = num(p.usage ?? p.routes ?? p.targets ?? p.carries ?? p.attempts ?? p.snaps ?? stats.snaps ?? stats.targets ?? stats.touches) ?? f.usage ?? 80;
    return { id:p.id || p.player_id || name, name, pos, team, usage, headshot:p.headshot || p.headshot_url || p.espn_headshot || playerHeadshot(p.espn || p.espn_id || f.espn), stats:{...stats, epa:num(stats.epa ?? p.epa ?? p.epa_per_play), cpoe:num(stats.cpoe ?? p.cpoe), success:num(stats.success ?? stats.success_rate ?? p.success_rate), explosive:num(stats.explosive ?? stats.explosive_rate ?? p.explosive_rate)}};
  }).filter(p=>!p.team || p.team==='SF');
  return scorePlayers(base.length ? base : fallbackPlayers);
}
function scorePlayers(players){
  const scored = players.map(p=>{
    const s = p.stats || {}; const v=k=>num(s[k]);
    const pos = p.pos;
    let raw = 62;
    if(pos==='QB') raw = 45 + (v('epa')||0)*260 + (v('cpoe')||0)*3.3 + (v('success')||.42)*38 - (v('pressure')||.18)*24 + (v('third')||.39)*16 + (v('red')||0)*20;
    else if(['WR','TE'].includes(pos)) raw = 36 + (v('epaTarget')||v('epa')||0)*85 + (v('catch')||.62)*24 + (v('yprr')||1.2)*9 + (v('share')||.10)*45 + (v('explosive')||.10)*60;
    else if(pos==='RB') raw = 40 + (v('epa')||0)*135 + (v('success')||.42)*36 + (v('explosive')||.09)*75 + (v('redShare')||.12)*28;
    else if(pos==='OL') raw = 58 + (1-(v('pressure')||.10))*22 + (v('success')||.60)*18 + (v('pass')||.65)*10 + (v('run')||.60)*8;
    else if(['EDGE','DL'].includes(pos)) raw = 35 + (v('pressure')||.08)*210 + (v('stops')||.06)*110 + (v('success')||.55)*26;
    else if(['LB','CB','DB','S'].includes(pos)) raw = 38 + (v('coverage')||.05)*90 + (v('stops')||.05)*100 + (v('success')||.55)*32 - (v('explosive')||.08)*90;
    const threshold = pos==='QB' ? 150 : pos==='RB' ? 100 : ['WR','TE'].includes(pos) ? 45 : pos==='OL' ? 500 : 350;
    const confidence = p.usage >= threshold*1.5 ? 'High' : p.usage >= threshold ? 'Qualified' : p.usage >= threshold*.45 ? 'Limited' : 'Insufficient';
    const factor = confidence==='High' ? 1 : confidence==='Qualified' ? .94 : confidence==='Limited' ? .78 : .62;
    const nvi = clamp(raw*factor + 45*(1-factor), 35, 98);
    return {...p, nvi, confidence};
  });
  return scored.map(p=>{
    const group = scored.filter(x=>x.pos===p.pos).sort((a,b)=>b.nvi-a.nvi);
    const posRank = group.findIndex(x=>x.id===p.id)+1;
    const pct = percentile(posRank, group.length);
    const tier = p.nvi>=88?'Elite':p.nvi>=78?'Impact':p.nvi>=68?'Starter':p.nvi>=58?'Rotation':'Depth';
    return {...p,posRank,posTotal:group.length,percentile:pct,tier, archetype:archetype(p)};
  });
}
function archetype(p){
  if(p.pos==='QB') return 'Timing Distributor';
  if(p.pos==='RB') return 'Efficiency Back';
  if(p.pos==='TE') return 'Explosive TE';
  if(p.pos==='WR') return (p.stats?.explosive||0)>.15 ? 'Vertical / YAC Weapon' : 'Chain Mover';
  if(p.pos==='EDGE') return 'Pressure Creator';
  if(p.pos==='OL') return 'Pocket Stabilizer';
  if(p.pos==='LB') return 'Coverage Captain';
  if(['CB','DB','S'].includes(p.pos)) return 'Coverage Stabilizer';
  return 'Role Contributor';
}
function normalizeQbs(raw, players){
  let arr = Array.isArray(raw) ? raw : (raw?.qbs || raw?.data || []);
  if(!arr.length){
    const names=['Patrick Mahomes','Josh Allen','Lamar Jackson','Joe Burrow','Brock Purdy','Jalen Hurts','Justin Herbert','Matthew Stafford','Dak Prescott','Jordan Love','C.J. Stroud','Jared Goff','Tua Tagovailoa','Baker Mayfield','Kyler Murray','Geno Smith','Trevor Lawrence','Kirk Cousins','Caleb Williams','Jayden Daniels','Bo Nix','Aaron Rodgers','Sam Darnold','Derek Carr','Bryce Young','Drake Maye','Anthony Richardson','Daniel Jones','Russell Wilson','Will Levis','Gardner Minshew','Deshaun Watson'];
    arr = TEAM_CODES.map((t,i)=>({name:names[i]||`${TEAM_NAMES[t]} QB`, team:t, logo:logo(t), epa:-.08+(i%17)/75, cpoe:-3+(i%13), nvi:58+(i%20)}));
    const sf = arr.find(q=>q.team==='SF'); if(sf){ sf.name='Brock Purdy'; sf.epa=.194; sf.cpoe=3.8; sf.nvi=91; }
  }
  return arr.map((q,i)=>{ const t=String(q.team||q.recent_team||TEAM_CODES[i%32]).toUpperCase(); return {name:q.name||q.player_name||`${TEAM_NAMES[t]} QB`, team:t, logo:q.logo||logo(t), epa:num(q.epa ?? q.epa_per_dropback ?? q.epa_per_play) ?? 0, cpoe:num(q.cpoe) ?? 0, pressure:num(q.pressure_epa ?? q.pressure) ?? 0, deep:num(q.deep_rate ?? q.deep) ?? .09, nvi:num(q.nvi ?? q.nvi_score) ?? 60}; }).slice(0,32);
}

async function tryJson(paths){
  for(const p of paths){
    try{ const r = await fetch(p, {cache:'no-store'}); if(r.ok) return await r.json(); } catch(e){}
  }
  return null;
}
function useData(filters){
  const [data,setData] = useState({league:normalizeLeague([]), players:normalizePlayers([]), qbs:normalizeQbs([]), status:'Loading'});
  useEffect(()=>{ let dead=false; (async()=>{
    const base = filters.season || '2025';
    const weekPath = filters.week && filters.week !== 'all' ? `/data/${base}/week_${filters.week}.json` : null;
    const rangePath = filters.range === 'reg_plus_playoffs' ? `/data/${base}/regular_plus_playoffs.json` : `/data/${base}/regular_season.json`;
    const leagueRaw = await tryJson([weekPath, rangePath, `/data/league_${base}.json`, `/data/league_${base}_demo.json`].filter(Boolean));
    const playersRaw = await tryJson([`/data/players_${base}.json`, `/data/players_${base}_demo.json`]);
    const qbsRaw = await tryJson([`/data/qbs_${base}.json`, `/data/qbs_${base}_demo.json`]);
    if(dead) return;
    const league = normalizeLeague(leagueRaw);
    const players = normalizePlayers(playersRaw);
    const qbs = normalizeQbs(qbsRaw, players);
    setData({league, players, qbs, status: leagueRaw?'Real data loaded':'Demo fallback loaded'});
  })(); return ()=>{dead=true}; }, [filters.season, filters.range, filters.week]);
  return data;
}

function App(){
  const [page,setPage] = useState('vision');
  const [filters,setFilters] = useState({season:'2025', range:'regular_season', week:'all'});
  const [more,setMore] = useState(false);
  const [metric,setMetric] = useState('off_epa');
  const {league, players, qbs, status} = useData(filters);
  const sf = league.find(t=>t.team==='SF') || league[0] || {};
  const go = id => { setPage(id); setMore(false); window.scrollTo({top:0, behavior:'smooth'}); };
  const props = {league,players,qbs,sf,filters,setFilters,metric,setMetric,go,status};
  return <div className="app">
    <DesktopNav page={page} go={go}/>
    <main className="mainShell">
      <TopBar filters={filters} setFilters={setFilters} status={status}/>
      {page==='vision' && <Vision {...props}/>}      
      {page==='landscape' && <Landscape {...props}/>}      
      {page==='charts' && <Charts {...props}/>}      
      {page==='players' && <Players {...props}/>}      
      {page==='qb' && <QBLab {...props}/>}      
      {page==='intelligence' && <Intelligence {...props}/>}      
      {page==='personnel' && <Personnel {...props}/>}      
      {page==='matchups' && <Matchups {...props}/>}      
      {page==='creator' && <Creator {...props}/>}      
    </main>
    <MobileNav page={page} go={go} more={more} setMore={setMore}/>
  </div>
}

function DesktopNav({page,go}){return <aside className="sideNav"><div className="brandMark"><div className="nvOrb"><Eye size={18}/></div><div><b>NINERVISION</b><span>49ers Intelligence</span></div></div><nav>{PAGES.map(p=>{const I=p.icon; return <button key={p.id} className={page===p.id?'active':''} onClick={()=>go(p.id)}><I size={18}/><span>{p.label}</span></button>})}</nav></aside>}
function MobileNav({page,go,more,setMore}){ const visible=PAGES.filter(p=>MOBILE_CORE.includes(p.id)); const hidden=PAGES.filter(p=>!MOBILE_CORE.includes(p.id)); return <><div className="bottomNav">{visible.map(p=>{const I=p.icon; return <button key={p.id} className={page===p.id?'active':''} onClick={()=>go(p.id)}><I size={18}/><span>{p.label}</span></button>})}<button className={more?'active':''} onClick={()=>setMore(!more)}><Menu size={18}/><span>More</span></button></div>{more&&<div className="moreSheet"><div className="moreHead"><b>More Intelligence</b><button onClick={()=>setMore(false)}><X size={18}/></button></div>{hidden.map(p=>{const I=p.icon; return <button key={p.id} onClick={()=>go(p.id)}><I size={18}/><span>{p.label}</span></button>})}</div>}</>}
function TopBar({filters,setFilters,status}){return <div className="topBar"><div className="topLogo"><Eye size={16}/><b>NINERVISION</b><span>49ers Intelligence</span></div><div className="filters"><select value={filters.season} onChange={e=>setFilters(f=>({...f,season:e.target.value}))}><option>2025</option><option>2026</option></select><select value={filters.range} onChange={e=>setFilters(f=>({...f,range:e.target.value}))}><option value="regular_season">Regular</option><option value="reg_plus_playoffs">Reg + Playoffs</option></select><select value={filters.week} onChange={e=>setFilters(f=>({...f,week:e.target.value}))}><option value="all">All Weeks</option>{Array.from({length:18},(_,i)=><option key={i+1} value={i+1}>Week {i+1}</option>)}</select></div></div>}
function SectionHeader({eyebrow,title,sub}){return <header className="sectionHeader"><span>{eyebrow}</span><h2>{title}</h2>{sub&&<p>{sub}</p>}</header>}
function Panel({children,className=''}){return <section className={`panel ${className}`}>{children}</section>}
function Stat({label,value,rank,total=32,meaning,trend}){const pct=rank?percentile(rank,total):null; return <div className="statCard"><span>{label}</span><b>{value}</b><div className="statMeta">{rank&&<em>#{rank}/{total}</em>}{pct&&<em>{pct}th pct</em>}{trend&&<em className="up">{trend}</em>}</div>{meaning&&<p>{meaning}</p>}</div>}

function Vision({sf,league,go}){
  const nviRank = rankOf(league,'nvi');
  return <>
    <section className="heroCompact">
      <div className="heroCopy"><span className="eyebrow">Football Intelligence System</span><h1>NINERVISION</h1><p>49ers Intelligence built around context: league rank, sustainability, matchup pressure, and what the numbers actually mean.</p><div className="heroActions"><button onClick={()=>go('landscape')}>Open League Matrix</button><button className="ghost" onClick={()=>go('matchups')}>View Matchups</button></div></div>
      <div className="nviCard"><div><span>NVI Score</span><b>{fmt(sf.nvi,'nvi')}</b><em>#{nviRank || '—'} / 32</em></div><p>{sf.tier || 'Team profile'} · {sf.nvi>=85?'sustainable contender traits':'volatile profile needing context'}</p><div className="componentBars"><MiniBar label="Offense" value={scale(sf.off_epa,-.14,.18)}/><MiniBar label="Defense" value={scale(-sf.def_epa_allowed,-.16,.14)}/><MiniBar label="Stability" value={scale(sf.success_rate,.34,.54)}/></div></div>
    </section>
    <div className="insightStrip"><Insight text="No isolated numbers: every metric includes rank, percentile, and meaning."/><Insight text="NVI weights sustainable football traits more than box-score flash."/><Insight text="Player scores are position-relative with sample confidence."/></div>
    <div className="grid two featureGrid"><Panel><div className="panelHead"><div><span>Featured Visual</span><h3>League Identity Matrix</h3></div><button onClick={()=>go('landscape')}>Explore</button></div><TeamTierChart rows={league}/></Panel><Panel><div className="panelHead"><div><span>Why NVI Matters</span><h3>Built for sustainable winning</h3></div></div><div className="whyList"><Why title="Efficiency" text="EPA and success rate reveal whether production is repeatable."/><Why title="Balance" text="Offense and defense are scored together, not as isolated rankings."/><Why title="Pressure" text="Pocket disruption and pressure resistance shape playoff-style football."/><Why title="Situation" text="Red zone, money downs, and drive finishing matter more than raw yards."/></div></Panel></div>
  </>;
}
function Insight({text}){return <div><Sparkles size={14}/><span>{text}</span></div>}
function MiniBar({label,value}){return <div><span>{label}</span><i><em style={{width:`${clamp(value,0,100)}%`}}/></i><b>{Math.round(value)}</b></div>}
function Why({title,text}){return <div className="why"><b>{title}</b><p>{text}</p></div>}

function Landscape({league,sf}){return <><SectionHeader eyebrow="LEAGUE LANDSCAPE" title="NFL Identity Matrix" sub="All 32 teams plotted by offensive value and defensive resistance."/><div className="grid landscapeGrid"><Panel className="matrixPanel"><TeamTierChart rows={league}/></Panel><Panel className="insightRail"><h3>Landscape Read</h3><Stat label="49ers NVI" value={fmt(sf.nvi,'nvi')} rank={sf.nvi_rank}/><Stat label="Efficiency Engine" value={fmt(sf.off_epa,'off_epa')} rank={sf.off_epa_rank}/><Stat label="Resistance Score" value={fmt(sf.def_epa_allowed,'def_epa_allowed')} rank={sf.def_epa_allowed_rank}/><div className="meaning">San Francisco’s placement reflects whether the team is winning through balanced sustainability or leaning on one dominant unit.</div></Panel></div><TierBlocks rows={league}/></>}
function TeamTierChart({rows}){ const w=760,h=460,p=54; const xs=r=>p+scale(r.off_epa,-.14,.18)*(w-2*p)/100; const ys=r=>h-p-scale(-r.def_epa_allowed,-.16,.14)*(h-2*p)/100; const avgX=p+scale(mean(rows,'off_epa'),-.14,.18)*(w-2*p)/100; const avgY=h-p-scale(-mean(rows,'def_epa_allowed'),-.16,.14)*(h-2*p)/100; return <div className="chartFrame"><svg className="tierSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="tierA" x1="0" x2="1"><stop stopColor="#3c0b12"/><stop offset="1" stopColor="#b3995d"/></linearGradient><linearGradient id="tierB" x1="0" x2="1"><stop stopColor="#111827"/><stop offset="1" stopColor="#3c0b12"/></linearGradient><clipPath id="clip"><rect x={p} y={p} width={w-2*p} height={h-2*p} rx="18"/></clipPath></defs><rect width={w} height={h} rx="24" fill="#05070b"/><g clipPath="url(#clip)"><rect x={p} y={p} width={w-2*p} height={h-2*p} fill="#070b12"/><polygon points={`${p},${h-p} ${w-p},${p} ${w-p},${p+90} ${p+90},${h-p}`} fill="url(#tierA)" opacity=".32"/><polygon points={`${p},${h-p-95} ${w-p-95},${p} ${w-p},${p} ${p},${h-p}`} fill="#8b1e2d" opacity=".15"/><polygon points={`${p+95},${h-p} ${w-p},${p+95} ${w-p},${h-p} ${p},${h-p}`} fill="#b3995d" opacity=".10"/><polygon points={`${p},${p} ${w-p},${h-p} ${w-p},${h-p-90} ${p+90},${p}`} fill="#172032" opacity=".45"/><line x1={p} y1={h-p-62} x2={w-p-62} y2={p} className="tierLine gold"/><line x1={p+78} y1={h-p} x2={w-p} y2={p+78} className="tierLine red"/><line x1={p} y1={h-p-154} x2={w-p-154} y2={p} className="tierLine soft"/><line x1={avgX} x2={avgX} y1={p} y2={h-p} className="avgLine"/><line y1={avgY} y2={avgY} x1={p} x2={w-p} className="avgLine"/><text x={w-p-142} y={p+28} className="tierLabel">Elite Contender</text><text x={w-p-160} y={h-p-22} className="tierLabel">Offense-Carried</text><text x={p+12} y={p+28} className="tierLabel">Defense-Carried</text><text x={p+12} y={h-p-22} className="tierLabel">Rebuild / Volatile</text></g><text x={w/2} y={h-13} className="axis">Efficiency Engine →</text><text x="18" y={h/2} transform={`rotate(-90 18 ${h/2})`} className="axis">Resistance Score →</text>{rows.map(r=><g key={r.team} transform={`translate(${xs(r)} ${ys(r)})`} className="teamPoint"><circle r={r.team==='SF'?21:14} className={r.team==='SF'?'sfHalo':'logoBack'}/><image href={r.logo} x={r.team==='SF'?-17:-11} y={r.team==='SF'?-17:-11} width={r.team==='SF'?34:22} height={r.team==='SF'?34:22}/><title>{r.team} · {r.name} · NVI ${fmt(r.nvi,'nvi')} · ${r.tier}</title></g>)}</svg></div> }
function TierBlocks({rows}){ const groups=['Elite','Sustainable Contender','Offense-Carried','Defense-Carried','Volatile','Rebuild / Volatile']; return <Panel><div className="panelHead"><div><span>Power Structure</span><h3>Tiered League View</h3></div></div><div className="tierBlocks">{groups.map(g=>{const teams=rows.filter(r=>r.tier===g).sort((a,b)=>b.nvi-a.nvi); return <div key={g}><b>{g}</b><div>{teams.map(t=><span key={t.team} className={t.team==='SF'?'sf':''}><img src={t.logo}/>{t.team}</span>)}</div></div>})}</div></Panel>}

function Charts({league,metric,setMetric}){ const rows=sortRows(league,metric); return <><SectionHeader eyebrow="VISUAL INTELLIGENCE" title="Full-League Ranking Board" sub="All 32 teams shown by default. Compact rows keep mobile readable."/><Panel><div className="panelHead"><div><span>Metric</span><h3>{METRICS[metric].label}</h3><p>{METRICS[metric].meaning}</p></div><select value={metric} onChange={e=>setMetric(e.target.value)}>{CHART_METRICS.map(k=><option key={k} value={k}>{METRICS[k].label}</option>)}</select></div><RankingBars rows={rows} metric={metric}/></Panel></>}
function RankingBars({rows,metric}){ const vals=rows.map(r=>metricValue(r,metric)).filter(v=>v!==null); const lo=Math.min(...vals), hi=Math.max(...vals); return <div className="rankBars">{rows.map((r,i)=>{const pct=scale(metricValue(r,metric),lo,hi); return <div key={r.team} className={r.team==='SF'?'sf':''}><b>#{i+1}</b><img src={r.logo}/><span>{r.team}<small>{r.name}</small></span><i><em style={{width:`${pct}%`}}/></i><strong>{fmt(r[metric],metric)}</strong></div>;})}</div>}

function Players({players}){ const [pos,setPos]=useState('ALL'); const [selected,setSelected]=useState(null); const positions=['ALL',...Array.from(new Set(players.map(p=>p.pos)))]; const list=players.filter(p=>pos==='ALL'||p.pos===pos).sort((a,b)=>b.nvi-a.nvi); const active=selected || list[0]; return <><SectionHeader eyebrow="PLAYER INTELLIGENCE" title="49ers Player Profiles" sub="Cards are position-relative with confidence weighting."/><div className="playerFilters"><select value={pos} onChange={e=>{setPos(e.target.value);setSelected(null)}}>{positions.map(p=><option key={p}>{p}</option>)}</select></div><div className="grid playerGrid"><Panel><div className="playerList">{list.map(p=><button key={p.id} className={active?.id===p.id?'active':''} onClick={()=>setSelected(p)}><img src={p.headshot}/><span>{p.name}<small>{p.pos} · {p.archetype}</small></span><b>{Math.round(p.nvi)}</b></button>)}</div></Panel>{active&&<PlayerProfile player={active}/>}</div></>}
function PlayerProfile({player}){ return <Panel className="playerProfile"><div className="profileHero"><img src={player.headshot}/><div><span>{player.pos} · {player.confidence} Confidence</span><h3>{player.name}</h3><p>{player.archetype}</p></div><b>{Math.round(player.nvi)}</b></div><div className="profileMeta"><em>#{player.posRank}/{player.posTotal} {player.pos}</em><em>{player.percentile}th percentile</em><em>{player.tier}</em></div><div className="metricCards">{playerCards(player).map(c=><div className="playerMetric" key={c.label}><span>{c.label}</span><b>{c.value}</b><em>{c.context}</em><p>{c.meaning}</p></div>)}</div></Panel>}
function playerCards(p){ const s=p.stats||{}; const pct=`${p.percentile}th percentile among ${p.pos}s`; const base=[{label:'NVI',value:Math.round(p.nvi),context:pct,meaning:'Position-relative sustainable football value.'},{label:'Usage',value:p.usage,context:p.confidence,meaning:'Sample size and role confidence.'}]; if(p.pos==='QB') return [...base,{label:'EPA/DB',value:fmt(s.epa,'off_epa'),context:'Efficiency',meaning:'Value generated per dropback.'},{label:'CPOE',value:s.cpoe?`${s.cpoe.toFixed(1)}%`:'—',context:'Accuracy',meaning:'Completion rate over expectation.'},{label:'Pressure EPA',value:fmt(s.pressure,'off_epa'),context:'Chaos response',meaning:'Pocket performance when disrupted.'}]; if(['WR','TE'].includes(p.pos)) return [...base,{label:'EPA/Target',value:fmt(s.epaTarget??s.epa,'off_epa'),context:'Target value',meaning:'Value created when targeted.'},{label:'Yards/Route',value:s.yprr?.toFixed?.(2)||'—',context:'Efficiency',meaning:'Receiving output independent of raw volume.'},{label:'Target Share',value:s.share?`${(s.share*100).toFixed(1)}%`:'—',context:'Role',meaning:'How central the player is to the passing game.'}]; if(p.pos==='RB') return [...base,{label:'EPA/Rush',value:fmt(s.epa,'off_epa'),context:'Run value',meaning:'Value generated through carries.'},{label:'Success Rate',value:s.success?`${(s.success*100).toFixed(1)}%`:'—',context:'Stability',meaning:'How often runs stay on schedule.'},{label:'Explosive Rate',value:s.explosive?`${(s.explosive*100).toFixed(1)}%`:'—',context:'Strike potential',meaning:'Chunk-run creation.'}]; return [...base,{label:'Disruption',value:s.pressure?`${(s.pressure*100).toFixed(1)}%`:s.stops?`${(s.stops*100).toFixed(1)}%`:'—',context:'Impact',meaning:'Negative-play creation or stop value.'},{label:'Success',value:s.success?`${(s.success*100).toFixed(1)}%`:'—',context:'Snap stability',meaning:'Down-to-down reliability.'},{label:'Explosive Control',value:s.explosive?`${(s.explosive*100).toFixed(1)}%`:'—',context:'Limiter',meaning:'Big-play suppression profile.'}]; }

function QBLab({qbs}){ return <><SectionHeader eyebrow="QUARTERBACK COMMAND" title="QB Intelligence Center" sub="EPA + CPOE matrix with all qualified NFL quarterbacks."/><Panel><QBScatter qbs={qbs}/></Panel><Panel><div className="panelHead"><div><span>Quarterback Board</span><h3>EPA / Dropback Ranking</h3></div></div><RankingBars rows={qbs.map(q=>({...q, team:q.team, name:q.name, logo:q.logo, off_epa:q.epa}))} metric="off_epa"/></Panel></>}
function QBScatter({qbs}){ const w=760,h=440,p=56; const xs=q=>p+scale(q.epa,-.10,.28)*(w-2*p)/100; const ys=q=>h-p-scale(q.cpoe,-5,8)*(h-2*p)/100; return <div className="chartFrame"><svg className="tierSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"><rect width={w} height={h} rx="24" fill="#05070b"/><line x1={w/2} x2={w/2} y1={p} y2={h-p} className="avgLine"/><line x1={p} x2={w-p} y1={h/2} y2={h/2} className="avgLine"/><text x={w-p-130} y={p+24} className="tierLabel">High efficiency + accuracy</text><text x={w/2} y={h-12} className="axis">EPA / Dropback →</text><text x="18" y={h/2} transform={`rotate(-90 18 ${h/2})`} className="axis">CPOE →</text>{qbs.map(q=><g key={`${q.team}-${q.name}`} transform={`translate(${xs(q)} ${ys(q)})`}><circle r={q.team==='SF'?21:13} className={q.team==='SF'?'sfHalo':'logoBack'}/><image href={q.logo} x={q.team==='SF'?-17:-10} y={q.team==='SF'?-17:-10} width={q.team==='SF'?34:20} height={q.team==='SF'?34:20}/><title>{q.name} · {q.team} · EPA ${fmt(q.epa,'off_epa')} · CPOE ${q.cpoe.toFixed(1)}%</title></g>)}</svg></div> }

function Intelligence({sf}){return <><SectionHeader eyebrow="WINNING FOOTBALL" title="Situational Center" sub="Critical downs, pressure, and coaching identity in one place."/><div className="grid three"><Panel><h3>Situational Football</h3><SituationRows sf={sf}/></Panel><Panel><h3>Pressure Map</h3><PressureMap sf={sf}/></Panel><Panel><h3>Coaching Fingerprint</h3><CoachingRows sf={sf}/></Panel></div></>}
function SituationRows({sf}){ const rows=[['Money Downs',sf.third_down,'third_down'],['Finish Rate',sf.red_zone_epa,'red_zone_epa'],['Strike Rate',sf.explosive_rate,'explosive_rate'],['Drive Stability',sf.success_rate,'success_rate']]; return <div className="miniRows">{rows.map(([label,val,k])=><div key={label}><span>{label}</span><b>{fmt(val,k)}</b><i><em style={{width:`${METRICS[k].unit==='%'?val*100:scale(val,METRICS[k].min,METRICS[k].max)}%`}}/></i><small>{METRICS[k].sub}</small></div>)}</div>}
function PressureMap({sf}){ const zones=[['Left Edge',72],['Interior',58],['Right Edge',69],['Blitz Pickup',63]]; return <div className="pressureViz"><div className="pocket"><span></span><b>POCKET</b></div>{zones.map((z,i)=><div key={z[0]} className={`pressureZone z${i}`}><b>{z[1]}</b><small>{z[0]}</small></div>)}</div>}
function CoachingRows({sf}){return <div className="miniRows"><div><span>Aggression Profile</span><b>{fmt(sf.neutral_pass_rate,'neutral_pass_rate')}</b><i><em style={{width:`${sf.neutral_pass_rate*100}%`}}/></i><small>Neutral pass rate</small></div><div><span>Motion Stress</span><b>{fmt(sf.motion_rate,'motion_rate')}</b><i><em style={{width:`${sf.motion_rate*100}%`}}/></i><small>Formation conflict</small></div><div><span>Play-Action Identity</span><b>{fmt(sf.play_action,'play_action')}</b><i><em style={{width:`${sf.play_action*100}%`}}/></i><small>Run-action stress</small></div></div>}

function Personnel({players,sf}){ const starters = players.filter(p=>['QB','RB','WR','TE','OL','EDGE','LB','CB'].includes(p.pos)).slice(0,11); return <><SectionHeader eyebrow="FORMATION DNA" title="Personnel Intelligence" sub="Formation usage and player role context with league comparison-ready structure."/><div className="grid two"><Panel><h3>Top Offensive Personnel</h3><Formation name="11 Personnel" use="62%" value={sf.off_epa} context="Primary spread package"/><Formation name="12 Personnel" use="18%" value={sf.red_zone_epa} context="Red-zone and play-action fit"/><Formation name="21 Personnel" use="11%" value={sf.success_rate} context="Shanahan conflict package"/></Panel><Panel><h3>Starting 11 Board</h3><div className="fieldBoard">{starters.map((p,i)=><div key={p.id} className={`playerNode node${i}`}><img src={p.headshot}/><b>{p.pos}</b><span>{p.name.split(' ').slice(-1)[0]}</span></div>)}</div></Panel></div></>}
function Formation({name,use,value,context}){return <div className="formationCard"><div><b>{name}</b><span>{context}</span></div><em>{use}</em><p>Effectiveness: {fmt(value,'off_epa')} · League context and situational splits are generated by the data pipeline.</p></div>}

const schedule = [{week:1,opponent:'LAR',opponentName:'Rams'},{week:2,opponent:'SEA',opponentName:'Seahawks'},{week:3,opponent:'ARI',opponentName:'Cardinals'},{week:4,opponent:'KC',opponentName:'Chiefs'},{week:5,opponent:'PHI',opponentName:'Eagles'},{week:6,opponent:'DAL',opponentName:'Cowboys'}].map(g=>({...g,logo:logo(g.opponent)}));
function Matchups({league}){ const [game,setGame]=useState(schedule[0]); const sf=league.find(t=>t.team==='SF')||{}; const opp=league.find(t=>t.team===game.opponent)||{}; const edge=(sf.off_epa??0)-(opp.def_epa_allowed??0); return <><SectionHeader eyebrow="GAME WARFARE" title="Matchup Intelligence" sub="Opponent reports using current baselines until new-season data arrives."/><div className="grid matchupGrid"><Panel><div className="gameList">{schedule.map(g=><button key={g.week} className={game.week===g.week?'active':''} onClick={()=>setGame(g)}><img src={g.logo}/><span>Week {g.week}</span><b>49ers vs {g.opponent}</b><small>{g.opponentName}</small></button>)}</div></Panel><Panel><div className="versus"><img src={logo('SF')}/><b>49ers</b><span>VS</span><b>{game.opponent}</b><img src={game.logo}/></div><div className="matchMatrix"><div><span>Efficiency Edge</span><b>{fmt(sf.off_epa,'off_epa')}</b><em>{edge>0?'SF Edge':'Opponent Edge'}</em><b>{fmt(opp.def_epa_allowed,'def_epa_allowed')}</b></div><div><span>Strike Rate</span><b>{fmt(sf.explosive_rate,'explosive_rate')}</b><em>{(sf.explosive_rate_rank||99)<(opp.explosive_rate_rank||99)?'SF':'OPP'}</em><b>{fmt(opp.explosive_rate,'explosive_rate')}</b></div><div><span>Pressure</span><b>{fmt(sf.pressure_rate,'pressure_rate')}</b><em>{(sf.pressure_rate_rank||99)<(opp.pressure_rate_rank||99)?'SF':'OPP'}</em><b>{fmt(opp.pressure_rate,'pressure_rate')}</b></div></div><div className="meaning"><b>What this means</b><p>{edge>0?'San Francisco projects to hold the efficiency advantage if it stays ahead of the sticks and avoids long-yardage pressure.':'This matchup requires explosive creation and third-down stability to offset opponent resistance.'}</p></div></Panel></div></>}

function Creator({league}){ const ref=useRef(null); const exportPng=()=>{ const svg=ref.current?.querySelector('svg'); if(!svg) return; const clone=svg.cloneNode(true); clone.querySelectorAll('image').forEach(img=>{ const p=img.parentNode; const code=(p?.querySelector('title')?.textContent||'NFL').slice(0,3).replace(/[^A-Z]/g,''); const txt=document.createElementNS('http://www.w3.org/2000/svg','text'); txt.setAttribute('x',img.getAttribute('x')); txt.setAttribute('y',Number(img.getAttribute('y'))+17); txt.setAttribute('fill','#fff'); txt.setAttribute('font-size','10'); txt.setAttribute('font-weight','900'); txt.textContent=code; p.replaceChild(txt,img); }); const data=new XMLSerializer().serializeToString(clone); const blob=new Blob([data],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob); const image=new Image(); image.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=1200; canvas.height=800; const c=canvas.getContext('2d'); c.fillStyle='#050609'; c.fillRect(0,0,1200,800); const g=c.createLinearGradient(0,0,1200,0); g.addColorStop(0,'rgba(170,0,0,.35)'); g.addColorStop(1,'rgba(179,153,93,.18)'); c.fillStyle=g; c.fillRect(0,0,1200,110); c.fillStyle='#fff'; c.font='800 34px Arial'; c.fillText('NINERVISION',44,50); c.fillStyle='#d7c28c'; c.font='700 17px Arial'; c.fillText('49ers Intelligence · League Identity Matrix',44,78); c.drawImage(image,42,126,1116,600); c.fillStyle='#8c96aa'; c.font='15px Arial'; c.fillText('niner-vision.vercel.app · branded export',44,764); const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='ninervision-export.png'; a.click(); URL.revokeObjectURL(url); }; image.src=url; };
 return <><SectionHeader eyebrow="BROADCAST GRAPHICS STUDIO" title="Creator Exports" sub="Professional share graphics with NinerVision framing."/><Panel><div className="exportHead"><div><b>NINERVISION</b><span>49ers Intelligence</span></div><button onClick={exportPng}><Download size={16}/> Export PNG</button></div><div ref={ref}><TeamTierChart rows={league}/></div></Panel></>}

createRoot(document.getElementById('root')).render(<App/>);
