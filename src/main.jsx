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

const SKILL_POSITIONS = ['QB','RB','WR','TE'];

const fallbackPlayers = [
 {name:'Brock Purdy',pos:'QB',team:'SF',espn:'4361741',usage:610,stats:{attempts:444,completions:300,pass_yards:4110,pass_tds:31,interceptions:11,sacks:28,epa:.194,cpoe:3.8,success:.51,adot:8.2,deep:.094,pressure_epa:.13,third:.49,red:.28,play_action_epa:.32}},
 {name:'Mac Jones',pos:'QB',team:'SF',espn:'4241464',usage:304,stats:{attempts:304,completions:203,pass_yards:2250,pass_tds:15,interceptions:7,sacks:18,epa:.127,cpoe:3.7,success:.48,adot:7.4,deep:.077,pressure_epa:.08,third:.45,red:.18,play_action_epa:.24}},
 {name:'Christian McCaffrey',pos:'RB',team:'SF',espn:'3117251',usage:390,stats:{carries:311,rush_yards:1202,rush_tds:12,targets:129,receptions:102,receiving_yards:904,touches:413,yards_per_carry:3.86,epa:-.068,success:.235,explosive:.082,yac:4.1,redShare:.77}},
 {name:'Kyle Juszczyk',pos:'RB',team:'SF',espn:'15979',usage:90,stats:{carries:21,rush_yards:78,targets:42,receptions:34,receiving_yards:272,touches:55,yards_per_carry:3.71,epa:.018,success:.42,explosive:.055,yac:3.2,redShare:.09}},
 {name:'George Kittle',pos:'TE',team:'SF',espn:'3040151',usage:88,stats:{targets:69,receptions:57,receiving_yards:628,receiving_tds:7,share:.125,catch:.826,adot:6.7,yprr:1.82,epaTarget:.671,yac:4.4,yac_oe:-13.7,explosive:.18,red_targets:12,first_down_rate:.58}},
 {name:'Jake Tonges',pos:'TE',team:'SF',espn:'4570209',usage:32,stats:{targets:24,receptions:17,receiving_yards:176,receiving_tds:2,share:.046,catch:.708,adot:5.2,yprr:1.08,epaTarget:.11,yac:3.5,explosive:.09,red_targets:4,first_down_rate:.42}},
 {name:'Jauan Jennings',pos:'WR',team:'SF',espn:'4040655',usage:118,stats:{targets:93,receptions:55,receiving_yards:643,receiving_tds:6,share:.168,catch:.591,adot:9.7,yprr:1.38,epaTarget:-.024,yac:3.3,yac_oe:-34.1,explosive:.13,red_targets:11,first_down_rate:.49}},
 {name:'Ricky Pearsall',pos:'WR',team:'SF',espn:'4430878',usage:86,stats:{targets:70,receptions:46,receiving_yards:640,receiving_tds:5,share:.126,catch:.657,adot:10.4,yprr:1.74,epaTarget:.16,yac:4.5,explosive:.16,red_targets:6,first_down_rate:.51}},
 {name:'Brandon Aiyuk',pos:'WR',team:'SF',espn:'4372019',usage:78,stats:{targets:62,receptions:41,receiving_yards:612,receiving_tds:4,share:.112,catch:.661,adot:11.1,yprr:1.92,epaTarget:.22,yac:4.2,explosive:.17,red_targets:5,first_down_rate:.55}},
 {name:'Demarcus Robinson',pos:'WR',team:'SF',espn:'16988',usage:60,stats:{targets:48,receptions:29,receiving_yards:394,receiving_tds:3,share:.087,catch:.604,adot:12.3,yprr:1.22,epaTarget:.03,yac:2.9,explosive:.14,red_targets:6,first_down_rate:.46}},
 // league comparison rows so demo context is not fake roster-only ranking
 ...['LAR','SEA','ARI','KC','PHI','DAL','DET','GB','BUF','MIN','CIN','HOU'].flatMap((team,i)=>[
   {name:`${TEAM_NAMES[team]} QB`,pos:'QB',team,usage:360+i*8,stats:{attempts:340+i*7,completions:218+i*3,pass_yards:2500+i*95,pass_tds:16+i%13,interceptions:6+i%8,sacks:20+i%18,epa:-.04+i*.018,cpoe:-1.5+i*.52,success:.42+i*.006,adot:7.1+i*.15,deep:.06+i*.005,pressure_epa:-.08+i*.018,third:.36+i*.008,red:.02+i*.019,play_action_epa:.04+i*.02}},
   {name:`${TEAM_NAMES[team]} WR1`,pos:'WR',team,usage:80+i*4,stats:{targets:70+i*5,receptions:42+i*3,receiving_yards:520+i*58,receiving_tds:3+i%7,share:.12+i*.006,catch:.58+i*.008,adot:8.2+i*.34,yprr:1.15+i*.09,epaTarget:-.08+i*.025,yac:3.1+i*.16,explosive:.08+i*.008,red_targets:5+i%8,first_down_rate:.38+i*.018}},
   {name:`${TEAM_NAMES[team]} TE1`,pos:'TE',team,usage:45+i*3,stats:{targets:38+i*3,receptions:24+i*2,receiving_yards:260+i*30,receiving_tds:2+i%5,share:.07+i*.004,catch:.61+i*.01,adot:4.9+i*.16,yprr:.82+i*.055,epaTarget:-.05+i*.022,yac:3.0+i*.1,explosive:.06+i*.006,red_targets:4+i%6,first_down_rate:.34+i*.017}},
   {name:`${TEAM_NAMES[team]} RB1`,pos:'RB',team,usage:130+i*8,stats:{carries:110+i*8,rush_yards:430+i*44,rush_tds:3+i%8,targets:25+i*2,receptions:19+i*2,receiving_yards:130+i*18,touches:135+i*10,yards_per_carry:3.5+i*.08,epa:-.08+i*.014,success:.34+i*.012,explosive:.045+i*.006,yac:2.7+i*.11,redShare:.12+i*.024}},
 ])
];
function playerHeadshot(id){ return id ? `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png` : ''; }
function pick(obj, aliases){ for(const a of aliases){ const v = obj?.[a]; if(v!==undefined && v!==null && v!=='' && Number.isFinite(Number(v))) return Number(v); } return null; }
function normalizePlayerStats(p){
  const raw = {...(p.stats||{}), ...p};
  const s = {
    attempts: pick(raw,['attempts','pass_attempts','passing_attempts','att']),
    completions: pick(raw,['completions','passing_completions','cmp']),
    pass_yards: pick(raw,['pass_yards','passing_yards','yards']),
    pass_tds: pick(raw,['pass_tds','passing_tds','td','passing_touchdowns']),
    interceptions: pick(raw,['interceptions','ints','passing_interceptions']),
    sacks: pick(raw,['sacks','times_sacked']),
    carries: pick(raw,['carries','rush_attempts','rushing_attempts']),
    rush_yards: pick(raw,['rush_yards','rushing_yards']),
    rush_tds: pick(raw,['rush_tds','rushing_tds']),
    targets: pick(raw,['targets','receiving_targets']),
    receptions: pick(raw,['receptions','receiving_receptions','rec']),
    receiving_yards: pick(raw,['receiving_yards','rec_yards']),
    receiving_tds: pick(raw,['receiving_tds','rec_tds']),
    touches: pick(raw,['touches','opportunities']),
    share: pick(raw,['share','target_share','team_target_share']),
    catch: pick(raw,['catch','catch_rate','reception_rate']),
    adot: pick(raw,['adot','avg_depth_of_target','air_yards_per_target']),
    yprr: pick(raw,['yprr','yards_per_route_run']),
    epa: pick(raw,['epa','epa_per_play','rush_epa','epa_per_rush','epa_per_dropback']),
    epaTarget: pick(raw,['epaTarget','epa_per_target','receiving_epa_per_target','target_epa']),
    pressure_epa: pick(raw,['pressure_epa','epa_under_pressure','pressured_epa']),
    cpoe: pick(raw,['cpoe','completion_percentage_over_expected']),
    success: pick(raw,['success','success_rate']),
    explosive: pick(raw,['explosive','explosive_rate','explosive_play_rate']),
    deep: pick(raw,['deep','deep_rate','deep_ball_rate']),
    yac: pick(raw,['yac','yards_after_catch','yac_per_reception']),
    yac_oe: pick(raw,['yac_oe','yac_over_expected']),
    redShare: pick(raw,['redShare','red_zone_share','inside5_share']),
    red_targets: pick(raw,['red_targets','red_zone_targets']),
    first_down_rate: pick(raw,['first_down_rate','first_down_pct']),
    third: pick(raw,['third','third_down_rate','third_down_success']),
    red: pick(raw,['red','red_zone_epa','red_zone_success']),
    play_action_epa: pick(raw,['play_action_epa','pa_epa']),
  };
  if(s.catch==null && s.targets && s.receptions!=null) s.catch = s.receptions / s.targets;
  if(s.yards_per_carry==null && s.carries && s.rush_yards!=null) s.yards_per_carry = s.rush_yards / s.carries;
  if(s.epaTarget==null && raw.receiving_epa!=null && s.targets) s.epaTarget = Number(raw.receiving_epa)/s.targets;
  if(s.share==null && s.targets!=null) s.share = s.targets / 552; // fallback approximation only when team targets unavailable
  if(s.touches==null) s.touches = (s.carries||0) + (s.receptions||0);
  return s;
}
const PLAYER_METRICS = {
  QB:[
    {key:'attempts',label:'Attempts',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Passing workload in the selected filter.'},
    {key:'pass_yards',label:'Pass Yards',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Raw production through the air.'},
    {key:'pass_tds',label:'Pass TD',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Touchdown production.'},
    {key:'interceptions',label:'INT',type:'raw',fmt:v=>String(Math.round(v)),lower:true,meaning:'Turnover mistakes. Lower is better.'},
    {key:'epa',label:'EPA / Dropback',type:'advanced',fmt:v=>fmt(v,'off_epa'),meaning:'Per-play passing value.'},
    {key:'cpoe',label:'CPOE',type:'advanced',fmt:v=>`${v>0?'+':''}${v.toFixed(1)}%`,meaning:'Completion percentage over expected.'},
    {key:'success',label:'Success Rate',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'How often dropbacks keep the offense on schedule.'},
    {key:'adot',label:'ADOT',type:'advanced',fmt:v=>v.toFixed(1),meaning:'Average target depth.'},
    {key:'deep',label:'Deep Ball Rate',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Share of throws attacking 20+ yards.'},
    {key:'pressure_epa',label:'Pressure EPA',type:'advanced',fmt:v=>fmt(v,'off_epa'),meaning:'Passing value when the pocket is disrupted.'},
    {key:'third',label:'3rd Down',type:'situational',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Money-down efficiency.'},
    {key:'red',label:'Red Zone EPA',type:'situational',fmt:v=>fmt(v,'off_epa'),meaning:'Value near scoring territory.'},
    {key:'play_action_epa',label:'Play-Action EPA',type:'situational',fmt:v=>fmt(v,'off_epa'),meaning:'Value created off run-action looks.'},
  ],
  RB:[
    {key:'carries',label:'Carries',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Rushing workload.'},
    {key:'rush_yards',label:'Rush Yards',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Raw rushing production.'},
    {key:'rush_tds',label:'Rush TD',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Rushing touchdowns.'},
    {key:'targets',label:'Targets',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Passing-game usage.'},
    {key:'yards_per_carry',label:'Yards / Carry',type:'advanced',fmt:v=>v.toFixed(2),meaning:'Rushing yardage efficiency.'},
    {key:'epa',label:'EPA / Rush',type:'advanced',fmt:v=>fmt(v,'off_epa'),meaning:'Rushing value per carry.'},
    {key:'success',label:'Success Rate',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'How often runs keep the offense on schedule.'},
    {key:'explosive',label:'Explosive Run',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Chunk-run creation.'},
    {key:'yac',label:'YAC / Touch',type:'advanced',fmt:v=>v.toFixed(1),meaning:'Yards created after contact/catch proxy.'},
    {key:'redShare',label:'Red-Zone Share',type:'situational',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Goal-line and scoring-area role.'},
    {key:'receptions',label:'Receptions',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Receiving production.'},
    {key:'receiving_yards',label:'Rec Yards',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Receiving yards.'},
  ],
  WR:[
    {key:'targets',label:'Targets',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Passing-game workload.'},
    {key:'receptions',label:'Receptions',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Caught targets.'},
    {key:'receiving_yards',label:'Rec Yards',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Raw receiving production.'},
    {key:'receiving_tds',label:'Rec TD',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Receiving touchdowns.'},
    {key:'catch',label:'Catch Rate',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Catch efficiency relative to role.'},
    {key:'adot',label:'ADOT',type:'advanced',fmt:v=>v.toFixed(1),meaning:'Average target depth.'},
    {key:'yprr',label:'YPRR',type:'advanced',fmt:v=>v.toFixed(2),meaning:'Yards per route run.'},
    {key:'epaTarget',label:'EPA / Target',type:'advanced',fmt:v=>fmt(v,'off_epa'),meaning:'Value created when targeted.'},
    {key:'yac',label:'YAC / Rec',type:'advanced',fmt:v=>v.toFixed(1),meaning:'Yards after catch per reception.'},
    {key:'explosive',label:'Explosive Catch',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Chunk-play receiving rate.'},
    {key:'share',label:'Target Share',type:'situational',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'How central the player is to the passing game.'},
    {key:'first_down_rate',label:'1st Down Rate',type:'situational',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Chain-moving conversion rate.'},
  ],
  TE:[
    {key:'targets',label:'Targets',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Passing-game workload.'},
    {key:'receptions',label:'Receptions',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Caught targets.'},
    {key:'receiving_yards',label:'Rec Yards',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Raw receiving production.'},
    {key:'receiving_tds',label:'Rec TD',type:'raw',fmt:v=>String(Math.round(v)),meaning:'Receiving touchdowns.'},
    {key:'catch',label:'Catch Rate',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Reliability at the TE position.'},
    {key:'adot',label:'ADOT',type:'advanced',fmt:v=>v.toFixed(1),meaning:'Seam and intermediate-depth usage.'},
    {key:'yprr',label:'YPRR',type:'advanced',fmt:v=>v.toFixed(2),meaning:'TE receiving efficiency independent of volume.'},
    {key:'epaTarget',label:'EPA / Target',type:'advanced',fmt:v=>fmt(v,'off_epa'),meaning:'Value created per TE target.'},
    {key:'yac',label:'YAC / Rec',type:'advanced',fmt:v=>v.toFixed(1),meaning:'After-catch value from TE targets.'},
    {key:'explosive',label:'Explosive Catch',type:'advanced',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'Seam/chunk-play threat.'},
    {key:'share',label:'Target Share',type:'situational',fmt:v=>`${(v*100).toFixed(1)}%`,meaning:'How central the TE is in the pass game.'},
    {key:'red_targets',label:'Red-Zone Targets',type:'situational',fmt:v=>String(Math.round(v)),meaning:'Scoring-area target role.'},
  ],
};
function qualifierFor(p){ const s=p.stats||{}; if(p.pos==='QB') return (s.attempts||p.usage||0)>=150; if(p.pos==='RB') return (s.carries||s.touches||p.usage||0)>=50; if(p.pos==='WR') return (s.targets||p.usage||0)>=30; if(p.pos==='TE') return (s.targets||p.usage||0)>=20; return false; }
function addPlayerContexts(players){
  const out = players.map(p=>({...p, metricContext:{}, qualified:qualifierFor(p)}));
  for(const pos of SKILL_POSITIONS){
    const group = out.filter(p=>p.pos===pos && p.qualified);
    for(const m of (PLAYER_METRICS[pos]||[])){
      const vals = group.map(p=>({p, v:num(p.stats?.[m.key])})).filter(x=>x.v!==null);
      vals.sort((a,b)=> m.lower ? a.v-b.v : b.v-a.v);
      vals.forEach((x,i)=>{ const target=out.find(p=>p.id===x.p.id); if(target) target.metricContext[m.key]={rank:i+1,total:vals.length,percentile:percentile(i+1,vals.length),qualified:true}; });
    }
  }
  return out;
}
function normalizePlayers(raw){
  let arr = Array.isArray(raw) ? raw : (raw?.players || raw?.data || []);
  if(!arr.length) arr = fallbackPlayers;
  const base = arr.map((p,i)=>{
    const f = fallbackPlayers[i%fallbackPlayers.length];
    const name = p.name || p.player_name || p.full_name || p.display_name || f.name;
    const pos = String(p.pos || p.position || p.position_group || f.pos || 'UNK').toUpperCase();
    const team = String(p.team || p.recent_team || p.club || f.team || 'SF').toUpperCase();
    const stats = normalizePlayerStats(p);
    const usage = num(p.usage ?? p.routes ?? stats.targets ?? stats.carries ?? stats.attempts ?? p.snaps ?? stats.touches) ?? f.usage ?? 80;
    return { id:String(p.id || p.player_id || p.gsis_id || p.espn || name), name, pos, team, usage, headshot:p.headshot || p.headshot_url || p.espn_headshot || playerHeadshot(p.espn || p.espn_id || f.espn), stats, archetype:archetype({pos,stats})};
  }).filter(p=>SKILL_POSITIONS.includes(p.pos));
  return addPlayerContexts(base.length ? base : fallbackPlayers.filter(p=>SKILL_POSITIONS.includes(p.pos)));
}
function archetype(p){
  const s=p.stats||{};
  if(p.pos==='QB') return (s.deep||0)>.09 ? 'Vertical Timing Distributor' : 'Structure Operator';
  if(p.pos==='RB') return (s.explosive||0)>.09 ? 'Space Creator' : 'Efficiency Back';
  if(p.pos==='TE') return (s.adot||0)>6 ? 'Seam Manipulator' : 'Hybrid TE';
  if(p.pos==='WR') return (s.explosive||0)>.15 ? 'Vertical / YAC Weapon' : 'Chain Mover';
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

function Players({players}){
  const [pos,setPos]=useState('QB');
  const sfPlayers = players.filter(p=>p.team==='SF' && SKILL_POSITIONS.includes(p.pos));
  const playersForPos = sfPlayers.filter(p=>p.pos===pos).sort((a,b)=> (b.usage||0)-(a.usage||0));
  const [selectedId,setSelectedId]=useState('');
  useEffect(()=>{ if(!playersForPos.find(p=>p.id===selectedId)) setSelectedId(playersForPos[0]?.id || ''); }, [pos, players.length]);
  const active = playersForPos.find(p=>p.id===selectedId) || playersForPos[0];
  return <>
    <SectionHeader eyebrow="PLAYER SPOTLIGHT" title="Skill Player Intelligence" sub="QB, RB, WR, and TE profiles only. Every metric is ranked against the same position — WRs vs WRs, TEs vs TEs."/>
    <Panel className="playerControlPanel">
      <div className="playerSelectors">
        <label><span>Position</span><select value={pos} onChange={e=>{setPos(e.target.value);setSelectedId('')}}>{SKILL_POSITIONS.map(p=><option key={p}>{p}</option>)}</select></label>
        <label><span>Player</span><select value={active?.id||''} onChange={e=>setSelectedId(e.target.value)}>{playersForPos.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      <div className="controlNote"><b>No Player NVI score.</b><span>Profiles use raw production, advanced efficiency, position rank, percentile, and football-language context.</span></div>
    </Panel>
    {active ? <PlayerProfile player={active}/> : <Panel><p className="emptyState">No {pos} data found for the selected season/filter. Add real generated player data to public/data.</p></Panel>}
  </>;
}
function PlayerProfile({player}){
  const cards = playerCards(player);
  const raw = cards.filter(c=>c.type==='raw');
  const adv = cards.filter(c=>c.type==='advanced');
  const situ = cards.filter(c=>c.type==='situational');
  return <Panel className="playerSpotlight">
    <div className="spotlightHero">
      <div className="spotlightPhoto"><img src={player.headshot}/></div>
      <div>
        <span>{player.pos} · {player.qualified?'Qualified sample':'Limited sample'}</span>
        <h3>{player.name}</h3>
        <p>{player.archetype} · San Francisco 49ers</p>
        <div className="profileMeta"><em>{player.pos} position context</em><em>2025 data ready</em><em>{player.qualified?'High confidence':'Use with caution'}</em></div>
      </div>
    </div>
    <MetricSection title="Raw Production" sub="Traditional box-score production for the selected filter." cards={raw}/>
    <MetricSection title="Advanced Efficiency" sub="Position-relative efficiency. WR and TE are ranked separately." cards={adv}/>
    <MetricSection title="Situational + Role Context" sub="Usage, role, and high-leverage value." cards={situ}/>
    <div className="filmNote"><b>What this means</b><p>{playerInterpretation(player)}</p></div>
  </Panel>;
}
function MetricSection({title,sub,cards}){ if(!cards.length) return null; return <div className="metricSection"><div className="metricSectionHead"><b>{title}</b><span>{sub}</span></div><div className="metricCards proCards">{cards.map(c=><PlayerMetricCard key={c.label} card={c}/>)}</div></div> }
function PlayerMetricCard({card}){ return <div className="playerMetric proMetric"><span>{card.label}</span><b>{card.value}</b><em>{card.context}</em>{card.percentile!=null&&<div className="pctBar"><i><strong style={{width:`${card.percentile}%`}}/></i><small>{card.percentile}th pct</small></div>}<p>{card.meaning}</p></div> }
function playerCards(p){
  const defs = PLAYER_METRICS[p.pos] || [];
  return defs.map(def=>{
    const v = num(p.stats?.[def.key]);
    if(v===null) return null;
    const ctx = p.metricContext?.[def.key];
    const total = ctx?.total || 0;
    const context = ctx?.rank ? `#${ctx.rank}/${total} ${p.pos}s · ${ctx.percentile}th pct` : (p.qualified ? `No ${p.pos} rank` : 'Limited sample');
    return {label:def.label, value:def.fmt(v), context, meaning:def.meaning, percentile:ctx?.percentile, type:def.type};
  }).filter(Boolean);
}
function playerInterpretation(p){
  const best = Object.entries(p.metricContext||{}).filter(([,c])=>c?.percentile).sort((a,b)=>b[1].percentile-a[1].percentile)[0];
  const bestDef = (PLAYER_METRICS[p.pos]||[]).find(m=>m.key===best?.[0]);
  if(p.pos==='QB') return `${p.name}'s profile should be read through efficiency, CPOE, pressure response, and situational value rather than a fake overall score. ${bestDef ? `Best current signal: ${bestDef.label} (${best[1].percentile}th percentile among QBs).` : ''}`;
  if(p.pos==='RB') return `${p.name}'s profile is built from rushing workload, EPA/rush, success rate, explosive runs, receiving role, and red-zone share compared only against RBs. ${bestDef ? `Best current signal: ${bestDef.label} (${best[1].percentile}th percentile among RBs).` : ''}`;
  if(p.pos==='WR') return `${p.name}'s profile separates true WR value from TE/RB context: targets, YPRR, EPA/target, depth, YAC, and target share are compared only to WRs. ${bestDef ? `Best current signal: ${bestDef.label} (${best[1].percentile}th percentile among WRs).` : ''}`;
  return `${p.name}'s profile is TE-specific: catch reliability, seam depth, YPRR, EPA/target, YAC, red-zone usage, and target share are compared only to TEs. ${bestDef ? `Best current signal: ${bestDef.label} (${best[1].percentile}th percentile among TEs).` : ''}`;
}
function QBLab({qbs}){ return <><SectionHeader eyebrow="QUARTERBACK COMMAND" title="QB Intelligence Center" sub="EPA + CPOE matrix with all qualified NFL quarterbacks."/><Panel><QBScatter qbs={qbs}/></Panel><Panel><div className="panelHead"><div><span>Quarterback Board</span><h3>EPA / Dropback Ranking</h3></div></div><RankingBars rows={qbs.map(q=>({...q, team:q.team, name:q.name, logo:q.logo, off_epa:q.epa}))} metric="off_epa"/></Panel></>}
function QBScatter({qbs}){ const w=760,h=440,p=56; const xs=q=>p+scale(q.epa,-.10,.28)*(w-2*p)/100; const ys=q=>h-p-scale(q.cpoe,-5,8)*(h-2*p)/100; return <div className="chartFrame"><svg className="tierSvg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet"><rect width={w} height={h} rx="24" fill="#05070b"/><line x1={w/2} x2={w/2} y1={p} y2={h-p} className="avgLine"/><line x1={p} x2={w-p} y1={h/2} y2={h/2} className="avgLine"/><text x={w-p-130} y={p+24} className="tierLabel">High efficiency + accuracy</text><text x={w/2} y={h-12} className="axis">EPA / Dropback →</text><text x="18" y={h/2} transform={`rotate(-90 18 ${h/2})`} className="axis">CPOE →</text>{qbs.map(q=><g key={`${q.team}-${q.name}`} transform={`translate(${xs(q)} ${ys(q)})`}><circle r={q.team==='SF'?21:13} className={q.team==='SF'?'sfHalo':'logoBack'}/><image href={q.logo} x={q.team==='SF'?-17:-10} y={q.team==='SF'?-17:-10} width={q.team==='SF'?34:20} height={q.team==='SF'?34:20}/><title>{q.name} · {q.team} · EPA ${fmt(q.epa,'off_epa')} · CPOE ${q.cpoe.toFixed(1)}%</title></g>)}</svg></div> }

function Intelligence({sf}){return <><SectionHeader eyebrow="WINNING FOOTBALL" title="Situational Center" sub="Critical downs, pressure, and coaching identity in one place."/><div className="grid three"><Panel><h3>Situational Football</h3><SituationRows sf={sf}/></Panel><Panel><h3>Pressure Map</h3><PressureMap sf={sf}/></Panel><Panel><h3>Coaching Fingerprint</h3><CoachingRows sf={sf}/></Panel></div></>}
function SituationRows({sf}){ const rows=[['Money Downs',sf.third_down,'third_down'],['Finish Rate',sf.red_zone_epa,'red_zone_epa'],['Strike Rate',sf.explosive_rate,'explosive_rate'],['Drive Stability',sf.success_rate,'success_rate']]; return <div className="miniRows">{rows.map(([label,val,k])=><div key={label}><span>{label}</span><b>{fmt(val,k)}</b><i><em style={{width:`${METRICS[k].unit==='%'?val*100:scale(val,METRICS[k].min,METRICS[k].max)}%`}}/></i><small>{METRICS[k].sub}</small></div>)}</div>}
function PressureMap({sf}){ const zones=[['Left Edge',72],['Interior',58],['Right Edge',69],['Blitz Pickup',63]]; return <div className="pressureViz"><div className="pocket"><span></span><b>POCKET</b></div>{zones.map((z,i)=><div key={z[0]} className={`pressureZone z${i}`}><b>{z[1]}</b><small>{z[0]}</small></div>)}</div>}
function CoachingRows({sf}){return <div className="miniRows"><div><span>Aggression Profile</span><b>{fmt(sf.neutral_pass_rate,'neutral_pass_rate')}</b><i><em style={{width:`${sf.neutral_pass_rate*100}%`}}/></i><small>Neutral pass rate</small></div><div><span>Motion Stress</span><b>{fmt(sf.motion_rate,'motion_rate')}</b><i><em style={{width:`${sf.motion_rate*100}%`}}/></i><small>Formation conflict</small></div><div><span>Play-Action Identity</span><b>{fmt(sf.play_action,'play_action')}</b><i><em style={{width:`${sf.play_action*100}%`}}/></i><small>Run-action stress</small></div></div>}

function Personnel({players,sf}){ const starters = players.filter(p=>['QB','RB','WR','TE','OL','EDGE','LB','CB'].includes(p.pos)).slice(0,11); return <><SectionHeader eyebrow="FORMATION DNA" title="Personnel Intelligence" sub="Formation usage and player role context with league comparison-ready structure."/><div className="grid two"><Panel><h3>Top Offensive Personnel</h3><Formation name="11 Personnel" use="62%" value={sf.off_epa} context="Primary spread package"/><Formation name="12 Personnel" use="18%" value={sf.red_zone_epa} context="Red-zone and play-action fit"/><Formation name="21 Personnel" use="11%" value={sf.success_rate} context="Shanahan conflict package"/></Panel><Panel><h3>Starting 11 Board</h3><div className="fieldBoard">{starters.map((p,i)=><div key={p.id} className={`playerNode node${i}`}><img src={p.headshot}/><b>{p.pos}</b><span>{p.name.split(' ').slice(-1)[0]}</span></div>)}</div></Panel></div></>}
function Formation({name,use,value,context}){return <div className="formationCard"><div><b>{name}</b><span>{context}</span></div><em>{use}</em><p>Effectiveness: {fmt(value,'off_epa')} · League context and situational splits are generated by the data pipeline.</p></div>}

const schedule = [
  {week:1,opponent:'LAR',opponentName:'Rams',home:true,tag:'Division opener'},
  {week:2,opponent:'SEA',opponentName:'Seahawks',home:true,tag:'NFC West'},
  {week:3,opponent:'ARI',opponentName:'Cardinals',home:true,tag:'Division leverage'},
  {week:4,opponent:'KC',opponentName:'Chiefs',home:true,tag:'Measuring-stick game'},
  {week:5,opponent:'PHI',opponentName:'Eagles',home:false,tag:'NFC contender test'},
  {week:6,opponent:'DAL',opponentName:'Cowboys',home:true,tag:'Prime matchup'},
  {week:7,opponent:'MIA',opponentName:'Dolphins',home:false,tag:'Speed stress'},
  {week:8,opponent:'MIN',opponentName:'Vikings',home:true,tag:'Scheme conflict'},
  {week:9,opponent:'DEN',opponentName:'Broncos',home:false,tag:'Altitude + defense'},
  {week:10,opponent:'LAC',opponentName:'Chargers',home:true,tag:'Trench game'},
  {week:11,opponent:'LV',opponentName:'Raiders',home:false,tag:'Road spot'},
  {week:12,opponent:'ATL',opponentName:'Falcons',home:true,tag:'Run-game identity'},
  {week:13,opponent:'TB',opponentName:'Buccaneers',home:false,tag:'Pressure response'},
  {week:14,opponent:'TEN',opponentName:'Titans',home:true,tag:'Physicality test'},
  {week:15,opponent:'IND',opponentName:'Colts',home:false,tag:'QB mobility'},
  {week:16,opponent:'NYG',opponentName:'Giants',home:true,tag:'Finish stretch'},
  {week:17,opponent:'CHI',opponentName:'Bears',home:false,tag:'Late-season weather'},
].map(g=>({...g,logo:logo(g.opponent)}));
function Matchups({league}){
  const [week,setWeek]=useState(schedule[0].week);
  const game=schedule.find(g=>g.week===Number(week))||schedule[0];
  const sf=league.find(t=>t.team==='SF')||{};
  const opp=league.find(t=>t.team===game.opponent)||{};
  const edges=[
    {label:'Efficiency Edge', sf:sf.off_epa, opp:opp.def_epa_allowed, metric:'off_epa', winner:(sf.off_epa??0)>(opp.def_epa_allowed??0)?'SF':game.opponent},
    {label:'Strike Rate', sf:sf.explosive_rate, opp:opp.explosive_rate, metric:'explosive_rate', winner:(sf.explosive_rate_rank||99)<(opp.explosive_rate_rank||99)?'SF':game.opponent},
    {label:'Pressure', sf:sf.pressure_rate, opp:opp.pressure_rate, metric:'pressure_rate', winner:(sf.pressure_rate_rank||99)<(opp.pressure_rate_rank||99)?'SF':game.opponent},
    {label:'Money Downs', sf:sf.third_down, opp:opp.third_down, metric:'third_down', winner:(sf.third_down_rank||99)<(opp.third_down_rank||99)?'SF':game.opponent},
    {label:'Finish Rate', sf:sf.red_zone_epa, opp:opp.red_zone_epa, metric:'red_zone_epa', winner:(sf.red_zone_epa_rank||99)<(opp.red_zone_epa_rank||99)?'SF':game.opponent},
  ];
  const sfWins=edges.filter(e=>e.winner==='SF').length;
  const grade = sfWins>=4?'A-':sfWins===3?'B':sfWins===2?'C+':'C';
  return <>
    <SectionHeader eyebrow="GAME WARFARE" title="Weekly Matchup Intelligence" sub="Use the dropdown to open one game report at a time. Full schedule shell is included; 2026 official data can replace these opponents when generated."/>
    <Panel className="matchupSelectorPanel"><div className="playerSelectors"><label><span>Select Game</span><select value={week} onChange={e=>setWeek(Number(e.target.value))}>{schedule.map(g=><option key={g.week} value={g.week}>Week {g.week}: 49ers {g.home?'vs':'at'} {g.opponent}</option>)}</select></label></div></Panel>
    <Panel className="gameReport">
      <div className="gameHero"><img src={logo('SF')}/><div><span>Week {game.week} · {game.home?'Home':'Away'} · {game.tag}</span><h3>49ers {game.home?'vs':'at'} {game.opponentName}</h3><p>Matchup Grade: <b>{grade}</b> · Projected Edge: <b>{sfWins}/5 key categories</b></p></div><img src={game.logo}/></div>
      <div className="matchMatrix expanded">{edges.map(e=><div key={e.label}><span>{e.label}</span><b>{fmt(e.sf,e.metric)}</b><em>{e.winner}</em><b>{fmt(e.opp,e.metric)}</b></div>)}</div>
      <div className="grid three matchupModules">
        <div className="meaning"><b>Win Conditions</b><p>San Francisco needs early-down efficiency, pressure without blitzing, and red-zone finishing. The opponent path is explosive variance and forcing long-yardage snaps.</p></div>
        <div className="meaning"><b>Danger Zones</b><p>Watch explosive pass rate, QB escape value, and whether the 49ers can avoid negative plays that create obvious passing downs.</p></div>
        <div className="meaning"><b>Game Script</b><p>{sfWins>=3?'If the 49ers control neutral downs, this projects as a sustainable advantage game.':'This profiles as a higher-variance matchup that may require explosive creation and turnover control.'}</p></div>
      </div>
      <div className="meaning"><b>Tactical Summary</b><p>{game.opponentName} matchup context is driven by league baselines until current-week game data is generated. The report is structured for trench edge, QB environment, explosive profile, situational football, and coaching tendency expansion.</p></div>
    </Panel>
  </>;
}
function Creator({league}){ const ref=useRef(null); const exportPng=()=>{ const svg=ref.current?.querySelector('svg'); if(!svg) return; const clone=svg.cloneNode(true); clone.querySelectorAll('image').forEach(img=>{ const p=img.parentNode; const code=(p?.querySelector('title')?.textContent||'NFL').slice(0,3).replace(/[^A-Z]/g,''); const txt=document.createElementNS('http://www.w3.org/2000/svg','text'); txt.setAttribute('x',img.getAttribute('x')); txt.setAttribute('y',Number(img.getAttribute('y'))+17); txt.setAttribute('fill','#fff'); txt.setAttribute('font-size','10'); txt.setAttribute('font-weight','900'); txt.textContent=code; p.replaceChild(txt,img); }); const data=new XMLSerializer().serializeToString(clone); const blob=new Blob([data],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob); const image=new Image(); image.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=1200; canvas.height=800; const c=canvas.getContext('2d'); c.fillStyle='#050609'; c.fillRect(0,0,1200,800); const g=c.createLinearGradient(0,0,1200,0); g.addColorStop(0,'rgba(170,0,0,.35)'); g.addColorStop(1,'rgba(179,153,93,.18)'); c.fillStyle=g; c.fillRect(0,0,1200,110); c.fillStyle='#fff'; c.font='800 34px Arial'; c.fillText('NINERVISION',44,50); c.fillStyle='#d7c28c'; c.font='700 17px Arial'; c.fillText('49ers Intelligence · League Identity Matrix',44,78); c.drawImage(image,42,126,1116,600); c.fillStyle='#8c96aa'; c.font='15px Arial'; c.fillText('niner-vision.vercel.app · branded export',44,764); const a=document.createElement('a'); a.href=canvas.toDataURL('image/png'); a.download='ninervision-export.png'; a.click(); URL.revokeObjectURL(url); }; image.src=url; };
 return <><SectionHeader eyebrow="BROADCAST GRAPHICS STUDIO" title="Creator Exports" sub="Professional share graphics with NinerVision framing."/><Panel><div className="exportHead"><div><b>NINERVISION</b><span>49ers Intelligence</span></div><button onClick={exportPng}><Download size={16}/> Export PNG</button></div><div ref={ref}><TeamTierChart rows={league}/></div></Panel></>}

createRoot(document.getElementById('root')).render(<App/>);
