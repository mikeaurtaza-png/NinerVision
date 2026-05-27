import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Activity, BarChart3, CalendarDays, Download, Flame, Gauge, MapPin, Plane, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import './styles.css';

const tabs = [
  { id: 'dashboard', label: 'Command Center', icon: BarChart3 },
  { id: 'schedule', label: '2026 Schedule', icon: CalendarDays },
  { id: 'players', label: 'Player Lab', icon: Trophy },
];

const statOptions = [
  { id: 'epa', label: 'EPA Trend', desc: 'Offensive EPA vs defensive EPA allowed', icon: Activity },
  { id: 'success', label: 'Success Rate', desc: 'Weekly play efficiency', icon: Gauge },
  { id: 'explosive', label: 'Explosive Rate', desc: 'Chunk-play creation', icon: Zap },
  { id: 'situational', label: 'Situational Football', desc: '3rd down + red zone', icon: Shield },
  { id: 'players', label: 'Player Advanced Board', desc: 'Usage + efficiency leaders', icon: Trophy },
  { id: 'radar', label: 'Team Profile Radar', desc: 'Premium all-around view', icon: Sparkles },
];

const metricLabels = {
  off_epa: 'Off EPA', def_epa_allowed: 'Def EPA Allowed', success_rate: 'Success %', explosive_rate: 'Explosive %',
  proe: 'PROE', pass_epa: 'Pass EPA', rush_epa: 'Rush EPA', third_down: '3rd Down %', red_zone: 'Red Zone %', turnover_margin: 'TO Margin'
};

function useJson(path) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(path).then(r => r.json()).then(setData).catch(() => setData(null));
  }, [path]);
  return data;
}

function useSeasonData(season) {
  return useJson(`/data/metrics_${season}.json`);
}

function GlassCard({ children, className = '' }) { return <div className={`glass ${className}`}>{children}</div>; }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="tip"><b>Week {label}</b>{payload.map((p) => <div key={p.dataKey}>{metricLabels[p.dataKey] || p.name}: {Number(p.value).toFixed(2)}</div>)}</div>;
}

function MainChart({ data, chart }) {
  const weeks = data?.weeks || [];
  if (!weeks.length) return <GlassCard className="empty"><h2>2026 is ready when the data is.</h2><p>Once 2026 games exist, run the update script and this dashboard will populate automatically.</p></GlassCard>;
  if (chart === 'epa') return <ResponsiveContainer height={360}><LineChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="off_epa" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="def_epa_allowed" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="pass_epa" strokeWidth={2} dot={false}/><Line type="monotone" dataKey="rush_epa" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>;
  if (chart === 'success') return <ResponsiveContainer height={360}><AreaChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="success_rate" strokeWidth={3}/></AreaChart></ResponsiveContainer>;
  if (chart === 'explosive') return <ResponsiveContainer height={360}><BarChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<ChartTooltip/>}/><Bar dataKey="explosive_rate" radius={[10,10,0,0]}/><Bar dataKey="turnover_margin" radius={[10,10,0,0]}/></BarChart></ResponsiveContainer>;
  if (chart === 'situational') return <ResponsiveContainer height={360}><LineChart data={weeks}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="week"/><YAxis/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="third_down" strokeWidth={3}/><Line type="monotone" dataKey="red_zone" strokeWidth={3}/></LineChart></ResponsiveContainer>;
  if (chart === 'radar') {
    const avg = (k) => weeks.reduce((a,w)=>a+(w[k]||0),0)/weeks.length;
    const radar = [{m:'EPA',v:Math.max(0,avg('off_epa')*200+50)},{m:'Success',v:avg('success_rate')},{m:'Explosive',v:avg('explosive_rate')*4},{m:'3rd Down',v:avg('third_down')},{m:'Red Zone',v:avg('red_zone')},{m:'Defense',v:Math.max(0,50-avg('def_epa_allowed')*200)}];
    return <ResponsiveContainer height={360}><RadarChart data={radar}><PolarGrid/><PolarAngleAxis dataKey="m"/><PolarRadiusAxis/><Radar dataKey="v" fillOpacity={0.45}/><Tooltip/></RadarChart></ResponsiveContainer>;
  }
  return <PlayerBoard players={data.players}/>;
}


function ScheduleCenter({ schedule }) {
  if (!schedule) return <GlassCard className="empty"><h2>Loading schedule...</h2></GlassCard>;
  return <section className="scheduleWrap">
    <div className="scheduleHero glass">
      <div>
        <p className="eyebrow"><Plane size={16}/> International Season Preview</p>
        <h2>2026 49ers Schedule Center</h2>
        <p>{schedule.note}</p>
      </div>
      <div className="scheduleBadges">
        <span>Australia opener</span>
        <span>Mexico City game</span>
        <span>17-game slate</span>
      </div>
    </div>

    <div className="scheduleGrid">
      {schedule.games.map((g) => <motion.div whileHover={{ y: -4 }} className="gameCard glass" key={`${g.week}-${g.opponent}`}>
        <div className="gameTop"><span>{g.week}</span><b>{g.date || 'TBD'}</b></div>
        <div className="matchup"><img src="/logos/sf.svg"/><span>{g.homeAway === 'vs' ? 'vs' : '@'}</span><img src={g.logo}/></div>
        <h3>{g.opponent}</h3>
        <p><MapPin size={15}/> {g.venue || g.location}</p>
        <div className="tags"><span>{g.type}</span>{g.primetime && <span>Prime Time</span>}{g.international && <span>International</span>}</div>
      </motion.div>)}
    </div>
  </section>;
}

function PlayerBoard({ players }) {
  return <div className="players">{players.map(p => <motion.div whileHover={{ y: -4 }} className="player" key={p.player}><img src={p.headshot} /><div><b>{p.player}</b><span>{p.position}</span></div><div className="playerStats">{Object.entries(p).filter(([k]) => !['player','position','headshot'].includes(k)).slice(0,5).map(([k,v]) => <p key={k}><span>{k.replaceAll('_',' ')}</span><b>{v}</b></p>)}</div></motion.div>)}</div>;
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [season, setSeason] = useState(2025);
  const [chart, setChart] = useState('epa');
  const data = useSeasonData(season);
  const schedule = useJson('/data/schedule_2026.json');
  const selected = statOptions.find(s => s.id === chart);
  const summary = useMemo(() => {
    const weeks = data?.weeks || [];
    if (!weeks.length) return null;
    const avg = (k) => weeks.reduce((a,w)=>a+(w[k]||0),0)/weeks.length;
    return { off: avg('off_epa').toFixed(2), succ: avg('success_rate').toFixed(1), exp: avg('explosive_rate').toFixed(1), rz: avg('red_zone').toFixed(1) };
  }, [data]);
  return <main>
    <section className="hero compact">
      <div><p className="eyebrow"><Flame size={16}/> NinerVision</p><h1>Elite 49ers Intelligence Platform</h1><p className="sub">Advanced stats, player lab, game trends, and schedule intelligence built for speed.</p></div>
      <img className="logo" src="/logos/sf.svg" />
    </section>

    <nav className="tabs glass">{tabs.map(({id,label,icon:Icon}) => <button key={id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}><Icon size={18}/>{label}</button>)}</nav>

    {activeTab === 'dashboard' && <section className="controls glass">
      <label>Season<select value={season} onChange={e=>setSeason(e.target.value)}><option>2025</option><option>2026</option></select></label>
      <label>Graph Type<select value={chart} onChange={e=>setChart(e.target.value)}>{statOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <button onClick={() => window.print()}><Download size={18}/> Export</button>
    </section>}

    {activeTab === 'schedule' && <ScheduleCenter schedule={schedule}/>}
    {activeTab === 'players' && data && <GlassCard className="chartCard"><div className="chartHead"><div><h2>Player Lab</h2><p>Real headshots will plug in from nflverse/ESPN mapping next.</p></div><Trophy /></div><PlayerBoard players={data.players || []}/></GlassCard>}

    {activeTab === 'dashboard' && summary && <section className="kpis"><GlassCard><span>Off EPA</span><b>{summary.off}</b></GlassCard><GlassCard><span>Success Rate</span><b>{summary.succ}%</b></GlassCard><GlassCard><span>Explosive Rate</span><b>{summary.exp}%</b></GlassCard><GlassCard><span>Red Zone</span><b>{summary.rz}%</b></GlassCard></section>}

    {activeTab === 'dashboard' && <section className="grid">
      <GlassCard className="chartCard"><div className="chartHead"><div><h2>{selected?.label}</h2><p>{selected?.desc}</p></div><BarChart3 /></div>{data ? <MainChart data={data} chart={chart}/> : <p>Loading...</p>}</GlassCard>
      <GlassCard className="side"><h3>Graph Library</h3>{statOptions.map(({id,label,desc,icon:Icon}) => <button className={chart===id?'active':''} onClick={()=>setChart(id)} key={id}><Icon size={18}/><span><b>{label}</b><small>{desc}</small></span></button>)}</GlassCard>
    </section>}
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
