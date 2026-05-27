import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Activity, BarChart3, Download, Flame, Gauge, Shield, Sparkles, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import './styles.css';

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

function useSeasonData(season) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/data/metrics_${season}.json`).then(r => r.json()).then(setData);
  }, [season]);
  return data;
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

function PlayerBoard({ players }) {
  return <div className="players">{players.map(p => <motion.div whileHover={{ y: -4 }} className="player" key={p.player}><img src={p.headshot} /><div><b>{p.player}</b><span>{p.position}</span></div><div className="playerStats">{Object.entries(p).filter(([k]) => !['player','position','headshot'].includes(k)).slice(0,5).map(([k,v]) => <p key={k}><span>{k.replaceAll('_',' ')}</span><b>{v}</b></p>)}</div></motion.div>)}</div>;
}

function App() {
  const [season, setSeason] = useState(2025);
  const [chart, setChart] = useState('epa');
  const data = useSeasonData(season);
  const selected = statOptions.find(s => s.id === chart);
  const summary = useMemo(() => {
    const weeks = data?.weeks || [];
    if (!weeks.length) return null;
    const avg = (k) => weeks.reduce((a,w)=>a+(w[k]||0),0)/weeks.length;
    return { off: avg('off_epa').toFixed(2), succ: avg('success_rate').toFixed(1), exp: avg('explosive_rate').toFixed(1), rz: avg('red_zone').toFixed(1) };
  }, [data]);
  return <main>
    <section className="hero">
      <div><p className="eyebrow"><Flame size={16}/> 49ers Elite Analytics</p><h1>Premium 49ers data visuals powered by nflverse-ready data.</h1><p className="sub">Fast, free, Vercel-ready dashboard with saved local data, advanced stats, player cards, and a clean sports-broadcast look.</p></div>
      <img className="logo" src="/logos/sf.svg" />
    </section>

    <section className="controls glass">
      <label>Season<select value={season} onChange={e=>setSeason(e.target.value)}><option>2025</option><option>2026</option></select></label>
      <label>Graph Type<select value={chart} onChange={e=>setChart(e.target.value)}>{statOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <button onClick={() => window.print()}><Download size={18}/> Export</button>
    </section>

    {summary && <section className="kpis"><GlassCard><span>Off EPA</span><b>{summary.off}</b></GlassCard><GlassCard><span>Success Rate</span><b>{summary.succ}%</b></GlassCard><GlassCard><span>Explosive Rate</span><b>{summary.exp}%</b></GlassCard><GlassCard><span>Red Zone</span><b>{summary.rz}%</b></GlassCard></section>}

    <section className="grid">
      <GlassCard className="chartCard"><div className="chartHead"><div><h2>{selected?.label}</h2><p>{selected?.desc}</p></div><BarChart3 /></div>{data ? <MainChart data={data} chart={chart}/> : <p>Loading...</p>}</GlassCard>
      <GlassCard className="side"><h3>Graph Library</h3>{statOptions.map(({id,label,desc,icon:Icon}) => <button className={chart===id?'active':''} onClick={()=>setChart(id)} key={id}><Icon size={18}/><span><b>{label}</b><small>{desc}</small></span></button>)}</GlassCard>
    </section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
