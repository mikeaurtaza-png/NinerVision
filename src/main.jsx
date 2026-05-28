import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart,
  ResponsiveContainer, Radar, RadarChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Tooltip, XAxis, YAxis
} from 'recharts';
import {
  Activity, BarChart3, CalendarDays, ChevronRight, Download, Gauge, Home, Layers,
  LineChart as LineIcon, Search, Shield, Sparkles, Trophy, Users, Zap, Target, Swords,
  TrendingUp, Flame, Eye, Table2
} from 'lucide-react';
import { motion } from 'framer-motion';
import './styles.css';

const pages = [
  { id: 'command', label: 'Command Center', icon: Home },
  { id: 'players', label: 'Player Lab', icon: Users },
  { id: 'charts', label: 'Visual Lab', icon: LineIcon },
  { id: 'schedule', label: '2026 Schedule', icon: CalendarDays },
  { id: 'data', label: 'Data Table', icon: Table2 },
];

const chartOptions = [
  { id: 'epa', label: 'EPA Trend', desc: 'Offense, pass, rush, and defensive EPA', icon: Activity },
  { id: 'success', label: 'Success Rate', desc: 'Weekly consistency and efficiency', icon: Gauge },
  { id: 'explosive', label: 'Explosive Profile', desc: 'Chunk plays, YAC and play-action', icon: Zap },
  { id: 'situational', label: 'Situational Football', desc: '3rd down, red zone, goal-to-go', icon: Shield },
  { id: 'scoring', label: 'Game Flow', desc: 'Points, EPA and win-probability swings', icon: TrendingUp },
  { id: 'radar', label: 'Team Radar', desc: 'Premium all-around team profile', icon: Sparkles },
];

const colors = { red: '#c31828', gold: '#b3995d', white: '#ffffff', gray: '#9da0a6', dark: '#090909' };

function useJson(path, fallback) {
  const [data, setData] = useState(fallback);
  useEffect(() => { fetch(path).then(r => r.json()).then(setData).catch(() => setData(fallback)); }, [path]);
  return data;
}

function useEspnRoster() {
  const [live, setLive] = useState([]);
  useEffect(() => {
    fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/sf/roster')
      .then(r => r.json())
      .then(json => {
        const groups = json.athletes || [];
        const flat = groups.flatMap(group => (group.items || []).map(a => ({
          id: a.id, name: a.displayName || a.fullName, pos: a.position?.abbreviation || '', number: a.jersey || '',
          photo: a.headshot?.href || `https://a.espncdn.com/i/headshots/nfl/players/full/${a.id}.png`
        })));
        setLive(flat);
      })
      .catch(() => setLive([]));
  }, []);
  return live;
}

function StatCard({ kpi, index }) {
  return <motion.div className="stat-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
    <div className="stat-label">{kpi.label}</div>
    <div className="stat-value">{kpi.value}</div>
    <div className="stat-foot"><span>{kpi.rank}</span><b>{kpi.trend}</b></div>
  </motion.div>;
}

function TopNav({ page, setPage, team }) {
  return <aside className="sidebar">
    <div className="brand"><div><span>NINER</span><b>VISION</b></div><small>Elite 49ers Intelligence</small></div>
    <img className="team-logo-xl" src={team.logo} alt="49ers logo" />
    <nav>{pages.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setPage(item.id)} className={page === item.id ? 'active' : ''}><Icon size={18} />{item.label}</button>; })}</nav>
    <div className="side-card"><small>Data Stack</small><b>nflverse + ESPN</b><p>Local JSON first. Live assets second. Built for fast Vercel deployment.</p></div>
  </aside>;
}

function Header({ team }) {
  return <header className="header">
    <div>
      <div className="eyebrow"><Flame size={13}/> NINERVISION COMMAND</div>
      <h1>49ers Intelligence Center</h1>
      <p>Advanced EPA, success rate, player usage, matchup and schedule analytics with real team/player assets.</p>
    </div>
    <div className="header-rank"><img src={team.logo} alt="49ers"/><div><small>Overall Profile</small><b>#{team.summary?.overall_rank || 5}</b><span>NFL efficiency index</span></div></div>
  </header>;
}

function Filters({ chart, setChart }) {
  return <section className="toolbar">
    <label>Season<select><option>2025</option><option>2026 Preview</option></select></label>
    <label>Graph Type<select value={chart} onChange={e => setChart(e.target.value)}>{chartOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label>Lens<select><option>Team</option><option>Offense</option><option>Defense</option><option>Players</option></select></label>
    <button className="export"><Download size={16}/> Export</button>
  </section>;
}

function ChartPanel({ chart, team }) {
  const weekly = team.weekly || [];
  const radar = [
    { metric: 'EPA', value: 82 }, { metric: 'Success', value: 74 }, { metric: 'Explosive', value: 79 },
    { metric: 'Red Zone', value: 84 }, { metric: '3rd Down', value: 76 }, { metric: 'Defense', value: 71 }
  ];
  let title = chartOptions.find(c => c.id === chart)?.label || 'EPA Trend';
  let sub = chartOptions.find(c => c.id === chart)?.desc || '';
  let body;
  if (chart === 'radar') body = <ResponsiveContainer width="100%" height={330}><RadarChart data={radar}><PolarGrid stroke="rgba(255,255,255,.15)"/><PolarAngleAxis dataKey="metric" tick={{ fill: '#d8d8d8', fontSize: 12 }}/><PolarRadiusAxis tick={false} axisLine={false}/><Radar dataKey="value" stroke={colors.red} fill={colors.red} fillOpacity={0.45}/></RadarChart></ResponsiveContainer>;
  else if (chart === 'success') body = <ResponsiveContainer width="100%" height={330}><AreaChart data={weekly}><defs><linearGradient id="successG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={colors.red} stopOpacity={0.6}/><stop offset="95%" stopColor={colors.red} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis dataKey="week" stroke="#8d8d8d"/><YAxis stroke="#8d8d8d"/><Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:12}}/><Area dataKey="success_rate" stroke={colors.red} fill="url(#successG)" strokeWidth={3}/><Line dataKey="third_down" stroke={colors.gold} strokeWidth={2}/></AreaChart></ResponsiveContainer>;
  else if (chart === 'explosive') body = <ResponsiveContainer width="100%" height={330}><BarChart data={team.explosives || []}><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis dataKey="type" stroke="#8d8d8d"/><YAxis stroke="#8d8d8d"/><Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:12}}/><Bar dataKey="rate" fill={colors.red} radius={[10,10,0,0]}/><Bar dataKey="epa" fill={colors.gold} radius={[10,10,0,0]}/></BarChart></ResponsiveContainer>;
  else if (chart === 'situational') body = <ResponsiveContainer width="100%" height={330}><BarChart data={team.situational || []} layout="vertical"><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis type="number" stroke="#8d8d8d"/><YAxis type="category" dataKey="name" stroke="#d8d8d8" width={95}/><Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:12}}/><Bar dataKey="value" fill={colors.gold} radius={[0,10,10,0]}/></BarChart></ResponsiveContainer>;
  else if (chart === 'scoring') body = <ResponsiveContainer width="100%" height={330}><ComposedChart data={weekly}><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis dataKey="week" stroke="#8d8d8d"/><YAxis stroke="#8d8d8d"/><Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:12}}/><Bar dataKey="points_for" fill={colors.red} radius={[8,8,0,0]}/><Bar dataKey="points_against" fill="rgba(255,255,255,.18)" radius={[8,8,0,0]}/><Line dataKey="wp_swing" stroke={colors.gold} strokeWidth={3}/></ComposedChart></ResponsiveContainer>;
  else body = <ResponsiveContainer width="100%" height={330}><LineChart data={weekly}><CartesianGrid stroke="rgba(255,255,255,.07)"/><XAxis dataKey="week" stroke="#8d8d8d"/><YAxis stroke="#8d8d8d"/><Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:12}}/><Line dataKey="off_epa" stroke={colors.red} strokeWidth={3} dot={false}/><Line dataKey="pass_epa" stroke={colors.gold} strokeWidth={2} dot={false}/><Line dataKey="rush_epa" stroke="#fff" strokeWidth={2} dot={false}/><Line dataKey="def_epa_allowed" stroke="#707070" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>;
  return <section className="panel main-chart"><div className="panel-title"><div><h2>{title}</h2><p>{sub}</p></div><BarChart3/></div>{body}</section>;
}

function GraphLibrary({ chart, setChart }) {
  return <section className="panel graph-library"><h3>Graph Library</h3>{chartOptions.map(o => { const Icon = o.icon; return <button key={o.id} className={chart === o.id ? 'selected' : ''} onClick={() => setChart(o.id)}><Icon size={18}/><span><b>{o.label}</b><small>{o.desc}</small></span><ChevronRight size={16}/></button>})}</section>;
}

function PlayerCard({ player, live }) {
  const match = live.find(p => p.name === player.name || p.id === player.id);
  const photo = match?.photo || player.photo;
  return <motion.article className="player-card" whileHover={{ y: -4 }}><div className="photo-wrap"><img src={photo} alt={player.name}/><span>{player.pos}</span></div><h3>{player.name}</h3><div className="player-stats">{player.stats.map(s => <div key={s.label}><span>{s.label}</span><b>{s.value}</b></div>)}</div><ResponsiveContainer width="100%" height={70}><LineChart data={player.trend}><Line dataKey="value" stroke={colors.gold} strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></motion.article>;
}

function Command({ team, players, liveRoster, chart, setChart }) {
  return <><Filters chart={chart} setChart={setChart}/><section className="kpi-grid">{(team.kpis||[]).map((k,i)=><StatCard key={k.label} kpi={k} index={i}/>)}</section><section className="grid"><ChartPanel chart={chart} team={team}/><GraphLibrary chart={chart} setChart={setChart}/></section><section className="grid two"><section className="panel"><h2>Team Leaders</h2><div className="leader-list">{(team.leaders||[]).map(l=><div key={l.stat}><span>{l.stat}</span><b>{l.player}</b><strong>{l.value}</strong></div>)}</div></section><section className="panel"><h2>Featured Player Lab</h2><div className="mini-players">{players.slice(0,3).map(p=><PlayerCard key={p.name} player={p} live={liveRoster}/>)}</div></section></section></>;
}

function PlayerLab({ players, liveRoster }) {
  const [q, setQ] = useState('');
  const filtered = players.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.pos.toLowerCase().includes(q.toLowerCase()));
  return <><section className="toolbar"><label className="search"><Search size={16}/><input placeholder="Search player or position" value={q} onChange={e=>setQ(e.target.value)}/></label></section><section className="player-grid">{filtered.map(p=><PlayerCard key={p.name} player={p} live={liveRoster}/>)}</section></>;
}

function VisualLab({ team, chart, setChart }) {
  return <><GraphLibrary chart={chart} setChart={setChart}/><ChartPanel chart={chart} team={team}/><section className="panel"><h2>Advanced Metrics Table</h2><table><thead><tr><th>Metric</th><th>Offense</th><th>Defense</th><th>Rank</th></tr></thead><tbody>{(team.advancedTable||[]).map(r=><tr key={r.metric}><td>{r.metric}</td><td>{r.offense}</td><td>{r.defense}</td><td>{r.rank}</td></tr>)}</tbody></table></section></>;
}

function Schedule({ schedule }) {
  return <section className="schedule-grid">{schedule.map((g,i)=><article className="game-card" key={i}><div><img src={g.logo} alt={g.name}/><span>{g.type}</span></div><h3>{g.opponent} — {g.name}</h3><p>{g.site}</p><small>Week {g.week} · {g.note}</small></article>)}</section>;
}

function DataTable({ team }) { return <section className="panel"><h2>Weekly Data</h2><table><thead><tr>{['Week','Opp','Result','Off EPA','Pass EPA','Rush EPA','Success','Explosive','Red Zone','3rd Down'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{(team.weekly||[]).map(w=><tr key={w.week}><td>{w.week}</td><td>{w.opponent}</td><td className={w.result==='W'?'win':'loss'}>{w.result}</td><td>{w.off_epa}</td><td>{w.pass_epa}</td><td>{w.rush_epa}</td><td>{w.success_rate}%</td><td>{w.explosive_rate}%</td><td>{w.red_zone}%</td><td>{w.third_down}%</td></tr>)}</tbody></table></section> }

function App() {
  const team = useJson('/data/team.json', { logo:'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', kpis:[], weekly:[] });
  const players = useJson('/data/players.json', []);
  const schedule = useJson('/data/schedule_2026.json', []);
  const liveRoster = useEspnRoster();
  const [page, setPage] = useState('command');
  const [chart, setChart] = useState('epa');
  return <div className="app"><TopNav page={page} setPage={setPage} team={team}/><main><Header team={team}/>{page==='command' && <Command team={team} players={players} liveRoster={liveRoster} chart={chart} setChart={setChart}/>} {page==='players' && <PlayerLab players={players} liveRoster={liveRoster}/>} {page==='charts' && <VisualLab team={team} chart={chart} setChart={setChart}/>} {page==='schedule' && <Schedule schedule={schedule}/>} {page==='data' && <DataTable team={team}/>}</main></div>;
}

createRoot(document.getElementById('root')).render(<App/>);
