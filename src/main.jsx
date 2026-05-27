import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Activity, BarChart3, CalendarDays, ChevronRight, Download, Flame, Gauge, Layers,
  LineChart as LineIcon, Search, Shield, Sparkles, Trophy, Users, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import './styles.css';

const ESPN_49ERS_LOGO = 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png';
const ESPN_ROSTER = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/sf/roster';
const ESPN_SCHEDULE_2026 = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/sf/schedule?season=2026';

const navItems = [
  { id: 'command', label: 'Command Center', icon: BarChart3 },
  { id: 'players', label: 'Player Lab', icon: Users },
  { id: 'schedule', label: '2026 Schedule', icon: CalendarDays },
  { id: 'visuals', label: 'Visual Lab', icon: LineIcon },
];

const chartOptions = [
  { id: 'epa', label: 'EPA Profile', desc: 'Offense, pass, rush, and defensive EPA trend', icon: Activity },
  { id: 'success', label: 'Success Rate', desc: 'Weekly efficiency and consistency', icon: Gauge },
  { id: 'explosive', label: 'Explosive Rate', desc: 'Chunk-play creation and turnover impact', icon: Zap },
  { id: 'situational', label: 'Situational Football', desc: '3rd down and red zone performance', icon: Shield },
  { id: 'radar', label: 'Team Radar', desc: 'At-a-glance efficiency profile', icon: Sparkles },
];

const labels = {
  off_epa: 'Off EPA', def_epa_allowed: 'Def EPA Allowed', pass_epa: 'Pass EPA', rush_epa: 'Rush EPA',
  success_rate: 'Success %', explosive_rate: 'Explosive %', third_down: '3rd Down %', red_zone: 'Red Zone %',
  turnover_margin: 'TO Margin'
};

function useJson(path) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(path).then(r => r.json()).then(setData).catch(() => setData(null));
  }, [path]);
  return data;
}

function useEspnRoster() {
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    fetch(ESPN_ROSTER)
      .then(r => r.json())
      .then(json => {
        const groups = json.athletes || [];
        const flat = groups.flatMap(group => (group.items || []).map(a => ({
          id: a.id,
          name: a.displayName || a.fullName,
          pos: a.position?.abbreviation || group.position || '',
          number: a.jersey || '',
          age: a.age || '',
          height: a.displayHeight || '',
          weight: a.displayWeight || '',
          photo: a.headshot?.href || `https://a.espncdn.com/i/headshots/nfl/players/full/${a.id}.png`
        })));
        setPlayers(flat);
      })
      .catch(() => setPlayers([]));
  }, []);
  return players;
}

function useEspnSchedule2026() {
  const [games, setGames] = useState([]);
  useEffect(() => {
    fetch(ESPN_SCHEDULE_2026)
      .then(r => r.json())
      .then(json => {
        const events = json.events || [];
        const mapped = events.map((e, i) => {
          const comp = e.competitions?.[0] || {};
          const teams = comp.competitors || [];
          const away = teams.find(t => t.homeAway === 'away');
          const home = teams.find(t => t.homeAway === 'home');
          const opp = teams.find(t => t.team?.abbreviation !== 'SF');
          return {
            week: e.week?.text || `Week ${i + 1}`,
            date: e.date ? new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD',
            name: e.name || '49ers Game',
            opponent: opp?.team?.displayName || 'Opponent TBD',
            logo: opp?.team?.logos?.[0]?.href || '',
            homeAway: home?.team?.abbreviation === 'SF' ? 'vs' : '@',
            venue: comp.venue?.fullName || 'TBD',
            status: e.status?.type?.description || 'Scheduled'
          };
        });
        setGames(mapped);
      })
      .catch(() => setGames([]));
  }, []);
  return games;
}

function StatCard({ label, value, detail, icon: Icon }) {
  return <motion.div whileHover={{ y: -3 }} className="metric-card">
    <div className="metric-icon"><Icon size={18}/></div>
    <span>{label}</span>
    <b>{value}</b>
    <small>{detail}</small>
  </motion.div>;
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="tip"><b>Week {label}</b>{payload.map(p => <p key={p.dataKey}>{labels[p.dataKey] || p.dataKey}: {Number(p.value).toFixed(2)}</p>)}</div>;
}

function ChartPanel({ weeks, chart }) {
  if (!weeks?.length) return <div className="empty-panel"><h3>Data loading zone</h3><p>Once a season has data, NinerVision renders it here instantly from optimized local JSON.</p></div>;
  if (chart === 'epa') return <ResponsiveContainer height={360}><LineChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<TooltipBox/>}/><Line type="monotone" dataKey="off_epa" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="pass_epa" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="rush_epa" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="def_epa_allowed" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>;
  if (chart === 'success') return <ResponsiveContainer height={360}><AreaChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<TooltipBox/>}/><Area type="monotone" dataKey="success_rate" strokeWidth={3}/></AreaChart></ResponsiveContainer>;
  if (chart === 'explosive') return <ResponsiveContainer height={360}><BarChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<TooltipBox/>}/><Bar dataKey="explosive_rate" radius={[10,10,0,0]}/><Bar dataKey="turnover_margin" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer>;
  if (chart === 'situational') return <ResponsiveContainer height={360}><LineChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<TooltipBox/>}/><Line type="monotone" dataKey="third_down" strokeWidth={3}/><Line type="monotone" dataKey="red_zone" strokeWidth={3}/></LineChart></ResponsiveContainer>;
  const avg = (k) => weeks.reduce((a,w)=>a+(w[k]||0),0)/weeks.length;
  const radar = [{m:'EPA',v:Math.max(0, avg('off_epa')*180+50)},{m:'Success',v:avg('success_rate')},{m:'Explosive',v:avg('explosive_rate')*4},{m:'3rd Down',v:avg('third_down')},{m:'Red Zone',v:avg('red_zone')},{m:'Defense',v:Math.max(0,50-avg('def_epa_allowed')*180)}];
  return <ResponsiveContainer height={360}><RadarChart data={radar}><PolarGrid/><PolarAngleAxis dataKey="m"/><PolarRadiusAxis/><Radar dataKey="v" fillOpacity={0.45}/><Tooltip/></RadarChart></ResponsiveContainer>;
}

function CommandCenter({ data }) {
  const [chart, setChart] = useState('epa');
  const weeks = data?.weeks || [];
  const summary = useMemo(() => {
    const avg = k => weeks.length ? weeks.reduce((a,w)=>a+(w[k]||0),0)/weeks.length : 0;
    return { epa: avg('off_epa').toFixed(2), success: avg('success_rate').toFixed(1)+'%', explosive: avg('explosive_rate').toFixed(1)+'%', rz: avg('red_zone').toFixed(1)+'%' };
  }, [weeks]);
  return <section className="page-grid">
    <div className="metrics-row">
      <StatCard label="Off EPA/Play" value={summary.epa} detail="local nflverse-ready feed" icon={Activity}/>
      <StatCard label="Success Rate" value={summary.success} detail="weekly efficiency" icon={Gauge}/>
      <StatCard label="Explosive Rate" value={summary.explosive} detail="chunk-play profile" icon={Zap}/>
      <StatCard label="Red Zone" value={summary.rz} detail="finishing drives" icon={Flame}/>
    </div>
    <div className="main-chart panel">
      <div className="panel-head"><div><p className="eyebrow">Visual Intelligence</p><h2>{chartOptions.find(c=>c.id===chart)?.label}</h2></div><button className="ghost"><Download size={16}/> Export</button></div>
      <ChartPanel weeks={weeks} chart={chart}/>
    </div>
    <aside className="chart-menu panel">
      <h3>Graph Library</h3>
      {chartOptions.map(({id,label,desc,icon:Icon}) => <button key={id} className={chart===id?'active':''} onClick={()=>setChart(id)}><Icon size={18}/><div><b>{label}</b><span>{desc}</span></div><ChevronRight size={15}/></button>)}
    </aside>
  </section>;
}

function PlayerLab({ roster, fallbackPlayers=[] }) {
  const [query, setQuery] = useState('');
  const source = roster.length ? roster : fallbackPlayers.map(p => ({ name:p.player, pos:p.position, photo:p.headshot }));
  const players = source.filter(p => `${p.name} ${p.pos}`.toLowerCase().includes(query.toLowerCase())).slice(0, 36);
  return <section className="panel full"><div className="panel-head"><div><p className="eyebrow">Real ESPN Headshots</p><h2>Player Lab</h2></div><label className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search roster"/></label></div>
    <div className="player-grid">{players.map(p => <motion.div whileHover={{ y:-4 }} className="player-card" key={`${p.id || p.name}`}><img src={p.photo} onError={(e)=>{e.currentTarget.src='/logos/sf.svg'}}/><div><b>{p.name}</b><span>#{p.number || '--'} · {p.pos}</span><small>{p.height} {p.weight}</small></div></motion.div>)}</div>
  </section>;
}

function ScheduleCenter({ localSchedule, espnGames }) {
  const games = espnGames.length ? espnGames : (localSchedule?.games || []);
  return <section className="panel full schedule"><div className="panel-head"><div><p className="eyebrow">Schedule Intelligence</p><h2>2026 Schedule Center</h2><span className="muted">ESPN schedule feed first, local fallback if unavailable.</span></div></div>
    <div className="schedule-grid">{games.map((g, i) => <motion.div whileHover={{ y:-4 }} className="game-card" key={`${g.week}-${g.opponent}-${i}`}><div className="game-week"><span>{g.week}</span><b>{g.date || 'TBD'}</b></div><div className="match"><img src={ESPN_49ERS_LOGO}/><strong>{g.homeAway === 'vs' ? 'VS' : '@'}</strong><img src={g.logo || ESPN_49ERS_LOGO}/></div><h3>{g.opponent}</h3><p>{g.venue || g.location || 'Venue TBD'}</p><div className="game-tags"><span>{g.status || g.type || 'Scheduled'}</span>{g.international && <span>International</span>}</div></motion.div>)}</div>
  </section>;
}

function VisualLab() {
  return <section className="panel full"><p className="eyebrow">Coming Next</p><h2>Visual Lab</h2><div className="feature-grid"><div><Layers/><h3>EPA Play Maps</h3><p>Best/worst plays, momentum swings, and drive cards.</p></div><div><Sparkles/><h3>Share Graphics</h3><p>One-click social graphics for X, YouTube, and Instagram.</p></div><div><Shield/><h3>Matchup Engine</h3><p>49ers offense vs opponent defense edge finder.</p></div></div></section>;
}

function App() {
  const [active, setActive] = useState('command');
  const [season, setSeason] = useState(2025);
  const data = useJson(`/data/metrics_${season}.json`);
  const localSchedule = useJson('/data/schedule_2026.json');
  const roster = useEspnRoster();
  const espnGames = useEspnSchedule2026();
  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><img src={ESPN_49ERS_LOGO}/><div><b>NinerVision</b><span>Elite 49ers Intelligence</span></div></div>{navItems.map(({id,label,icon:Icon}) => <button className={active===id?'active':''} onClick={()=>setActive(id)} key={id}><Icon size={18}/>{label}</button>)}</aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">Premium 49ers Analytics</p><h1>{active === 'command' ? 'Command Center' : navItems.find(n=>n.id===active)?.label}</h1></div><div className="filters"><select value={season} onChange={e=>setSeason(e.target.value)}><option value="2025">2025</option><option value="2026">2026</option></select><img src={ESPN_49ERS_LOGO}/></div></header>
      {active === 'command' && <CommandCenter data={data}/>} 
      {active === 'players' && <PlayerLab roster={roster} fallbackPlayers={data?.players || []}/>} 
      {active === 'schedule' && <ScheduleCenter localSchedule={localSchedule} espnGames={espnGames}/>} 
      {active === 'visuals' && <VisualLab/>}
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
