"""
NinerVision real-data builder.

Run locally when you want to replace demo JSON with real nflverse data:

  python -m venv .venv
  source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
  pip install nflreadpy pandas numpy requests pyarrow
  python scripts/build_real_nflverse_data.py --season 2025

Outputs optimized static JSON into public/data/ so Vercel stays fast/free.
"""
from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
import pandas as pd

OUT = Path(__file__).resolve().parents[1] / "public" / "data"
TEAM = "SF"
ESPN_LOGO = "https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png"

def pct_rank(series: pd.Series, lower_is_better=False) -> pd.Series:
    ranked = series.rank(method="min", ascending=lower_is_better)
    n = series.notna().sum()
    return ((n - ranked) / max(n - 1, 1) * 100).round().astype("Int64")

def rank(series: pd.Series, lower_is_better=False) -> pd.Series:
    return series.rank(method="min", ascending=lower_is_better).astype("Int64")

def safe_mean(s):
    return float(pd.to_numeric(s, errors="coerce").mean()) if len(s) else 0.0

def logo(team):
    aliases = {"LA":"lar", "LAR":"lar", "JAC":"jax", "WSH":"wsh"}
    return ESPN_LOGO.format(abbr=aliases.get(team, team).lower())

def main(season: int):
    try:
        import nflreadpy as nfl
    except Exception as e:
        raise SystemExit("Install nflreadpy first: pip install nflreadpy pandas numpy requests pyarrow") from e

    OUT.mkdir(parents=True, exist_ok=True)

    pbp = nfl.load_pbp([season])
    schedules = nfl.load_schedules([season])
    rosters = nfl.load_rosters([season])
    teams = nfl.load_teams()

    # Keep real regular-season plays with a posteam.
    pbp = pbp[pbp.get("season_type", "REG").eq("REG") if "season_type" in pbp else np.ones(len(pbp), dtype=bool)]
    pbp = pbp[pbp["posteam"].notna()]

    off = pbp.groupby("posteam").agg(
        off_epa=("epa", "mean"),
        success_rate=("success", "mean"),
        explosive_rate=("yards_gained", lambda x: (pd.to_numeric(x, errors="coerce") >= 20).mean()),
        third_down=("third_down_converted", "mean") if "third_down_converted" in pbp else ("success", "mean"),
    ).reset_index().rename(columns={"posteam":"team"})
    defense = pbp.groupby("defteam").agg(
        def_epa_allowed=("epa", "mean"),
        pressure_rate=("qb_hit", "mean") if "qb_hit" in pbp else ("sack", "mean"),
    ).reset_index().rename(columns={"defteam":"team"})
    rz = pbp[pbp["yardline_100"].le(20) & pbp["posteam"].notna()].groupby("posteam").agg(
        red_zone=("touchdown", "mean")
    ).reset_index().rename(columns={"posteam":"team"})

    league = off.merge(defense, on="team", how="outer").merge(rz, on="team", how="left").fillna(0)
    league["overall"] = (
        league["off_epa"].rank(pct=True)*35 +
        (1-league["def_epa_allowed"].rank(pct=True))*25 +
        league["success_rate"].rank(pct=True)*20 +
        league["explosive_rate"].rank(pct=True)*10 +
        league["red_zone"].rank(pct=True)*10
    ).round(1)
    for col in ["success_rate","explosive_rate","third_down","pressure_rate","red_zone"]:
        league[col] = (league[col] * 100).round(1)
    league["logo"] = league["team"].map(logo)
    league["name"] = league["team"]
    league = league.sort_values("overall", ascending=False)
    league.to_json(OUT/"league_teams_2025.json", orient="records", indent=2)

    sf_plays = pbp[pbp["posteam"].eq(TEAM)]
    weekly = sf_plays.groupby("week").agg(
        off_epa=("epa","mean"),
        success_rate=("success","mean"),
        explosive_rate=("yards_gained", lambda x: (pd.to_numeric(x, errors="coerce") >= 20).mean()),
        third_down=("third_down_converted", "mean") if "third_down_converted" in sf_plays else ("success","mean"),
    ).reset_index()
    sf_def = pbp[pbp["defteam"].eq(TEAM)].groupby("week").agg(def_epa_allowed=("epa","mean")).reset_index()
    weekly = weekly.merge(sf_def, on="week", how="left").fillna(0)
    for col in ["success_rate","explosive_rate","third_down"]:
        weekly[col] = (weekly[col]*100).round(1)
    weekly["off_epa"] = weekly["off_epa"].round(3)
    weekly["def_epa_allowed"] = weekly["def_epa_allowed"].round(3)

    sf = league[league.team.eq(TEAM)].iloc[0].to_dict()
    metric_map = [
        ("off_epa","Off EPA / Play", False), ("success_rate","Success Rate", False),
        ("explosive_rate","Explosive Rate", False), ("red_zone","Red Zone TD%", False),
        ("third_down","3rd Down", False), ("def_epa_allowed","Def EPA Allowed", True),
    ]
    metrics = []
    for key,label,lower in metric_map:
        r = int(rank(league[key], lower).loc[league.team.eq(TEAM)].iloc[0])
        p = int(pct_rank(league[key], lower).loc[league.team.eq(TEAM)].iloc[0])
        val = float(sf[key])
        display = f"{val:.2f}" if "epa" in key else f"{val:.1f}%"
        metrics.append({"key":key,"label":label,"value":val,"display":display,"rank":r,"pct":p,"trend":"Real","why":["Generated from nflverse play-by-play","Ranked against all 32 NFL teams","Refresh weekly by rerunning the script"]})

    team_json = {"team":TEAM,"season":season,"logo":logo(TEAM),"updated":"real nflverse output","metrics":metrics,"weekly":weekly.to_dict("records"),"leaders":[]}
    (OUT/"team.json").write_text(json.dumps(team_json, indent=2))

    # Basic QB lab from pass plays.
    pass_plays = pbp[pbp.get("pass_attempt", 0).eq(1) & pbp["passer_player_name"].notna()].copy()
    qbs = pass_plays.groupby(["passer_player_id","passer_player_name","posteam"]).agg(
        attempts=("play_id","count"), epa_db=("epa","mean"), success_rate=("success","mean"),
        aypa=("air_yards","mean"), sack_rate=("sack","mean")
    ).reset_index()
    qbs = qbs[qbs.attempts.ge(150)].sort_values("epa_db", ascending=False).head(40)
    qbs["composite"] = (qbs["epa_db"].rank(pct=True)*60 + qbs["success_rate"].rank(pct=True)*25 + (1-qbs["sack_rate"].rank(pct=True))*15).round(1)
    qbs["success_rate"] = (qbs["success_rate"]*100).round(1)
    qbs["sack_rate"] = (qbs["sack_rate"]*100).round(1)
    qbs["cpoe"] = 0
    qbs["pressure_epa"] = 0
    qbs["red_zone_epa"] = 0
    qbs["photo"] = qbs["passer_player_id"].apply(lambda x: f"https://a.espncdn.com/i/headshots/nfl/players/full/{x}.png")
    qbs = qbs.rename(columns={"passer_player_name":"name","posteam":"team"})
    qbs[["name","team","photo","composite","epa_db","cpoe","success_rate","aypa","pressure_epa","red_zone_epa","sack_rate"]].to_json(OUT/"qbs_2025.json", orient="records", indent=2)

    # Roster/player cards.
    sf_roster = rosters[rosters["team"].eq(TEAM)].copy() if "team" in rosters else rosters[rosters["team_abbr"].eq(TEAM)].copy()
    name_col = "player_name" if "player_name" in sf_roster else "full_name"
    id_col = "gsis_id" if "gsis_id" in sf_roster else "espn_id"
    pos_col = "position" if "position" in sf_roster else "position_group"
    head_col = "headshot_url" if "headshot_url" in sf_roster else None
    players=[]
    for _,r in sf_roster.head(30).iterrows():
        pid=str(r.get(id_col,""))
        players.append({"name":r.get(name_col,""),"pos":r.get(pos_col,""),"id":pid,"photo":r.get(head_col) if head_col else f"https://a.espncdn.com/i/headshots/nfl/players/full/{pid}.png","stats":{"Source":"nflverse roster","Rank":"Pending stat calc"}})
    (OUT/"players.json").write_text(json.dumps(players, indent=2))

    print(f"Wrote real NinerVision data to {OUT}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", type=int, default=2025)
    args = parser.parse_args()
    main(args.season)
