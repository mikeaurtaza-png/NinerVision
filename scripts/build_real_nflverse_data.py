"""
NinerVision real-data pipeline.

Run locally, then commit the generated JSON files to GitHub:
  pip install pandas nflreadpy pyarrow
  python scripts/build_real_nflverse_data.py --season 2025

What it creates:
  public/data/2025/regular_season.json
  public/data/2025/regular_plus_playoffs.json
  public/data/2025/weeks/week_01.json ... week_18.json
  public/data/2025/playoffs/wild_card.json ...
  public/data/league_2025.json
  public/data/players_2025.json
  public/data/qbs_2025.json

The app ships with demo fallback data so Vercel always builds. Replace/import the generated
JSON when you are ready to turn on verified real data.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

TEAM_NAMES = {
    "ARI":"Cardinals","ATL":"Falcons","BAL":"Ravens","BUF":"Bills","CAR":"Panthers","CHI":"Bears","CIN":"Bengals","CLE":"Browns","DAL":"Cowboys","DEN":"Broncos","DET":"Lions","GB":"Packers","HOU":"Texans","IND":"Colts","JAX":"Jaguars","KC":"Chiefs","LAC":"Chargers","LAR":"Rams","LV":"Raiders","MIA":"Dolphins","MIN":"Vikings","NE":"Patriots","NO":"Saints","NYG":"Giants","NYJ":"Jets","PHI":"Eagles","PIT":"Steelers","SEA":"Seahawks","SF":"49ers","TB":"Buccaneers","TEN":"Titans","WAS":"Commanders"
}


def out_dir() -> Path:
    p = Path(__file__).resolve().parents[1] / "public" / "data"
    p.mkdir(parents=True, exist_ok=True)
    return p


def logo(team: str) -> str:
    code = "wsh" if team == "WAS" else team.lower()
    return f"https://a.espncdn.com/i/teamlogos/nfl/500/{code}.png"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False, default=str), encoding="utf-8")
    print(f"wrote {path.relative_to(Path.cwd()) if path.is_absolute() else path}")


def as_pandas(df):
    """nflreadpy may return Polars DataFrames on newer installs.
    Convert everything to pandas so the rest of this script uses one API.
    """
    if df is None:
        return None
    if hasattr(df, "to_pandas"):
        return df.to_pandas()
    return df


def mean(series):
    s = series.dropna()
    return None if len(s) == 0 else round(float(s.mean()), 6)


def rank(rows: list[dict], key: str, higher: bool = True) -> None:
    valid = [r for r in rows if r.get(key) is not None]
    valid.sort(key=lambda r: r[key], reverse=higher)
    for i, r in enumerate(valid, 1):
        r[f"{key}_rank"] = i


def tier(row: dict) -> str:
    off = row.get("off_epa") or 0
    deff = row.get("def_epa_allowed") or 0
    idx = row.get("nv_index") or 0
    if idx >= 92 and off > 0 and deff < 0.02:
        return "Elite Contender"
    if off > 0.04 and deff < 0.04:
        return "Balanced Contender"
    if off > 0.05:
        return "Offense-Carried"
    if deff < -0.005:
        return "Defense-Carried"
    if idx < 76:
        return "Rebuild Tier"
    return "Middle Class"


def summarize_teams(pbp):
    teams = sorted(set(pbp["posteam"].dropna()) | set(pbp["defteam"].dropna()))
    rows = []
    for team in teams:
        off = pbp[pbp["posteam"] == team].copy()
        deff = pbp[pbp["defteam"] == team].copy()
        if off.empty and deff.empty:
            continue
        off_epa = mean(off["epa"]) if "epa" in off else None
        def_epa_allowed = mean(deff["epa"]) if "epa" in deff else None
        explosive = None
        if {"yards_gained", "pass", "rush"}.issubset(off.columns):
            explosive = round(float((((off["pass"] == 1) & (off["yards_gained"] >= 20)) | ((off["rush"] == 1) & (off["yards_gained"] >= 10))).mean()), 6)
        third_down = None
        if {"down", "first_down"}.issubset(off.columns):
            third = off[off["down"] == 3]
            third_down = round(float(third["first_down"].fillna(0).mean()), 6) if len(third) else None
        neutral_pass = None
        if {"wp", "pass", "down"}.issubset(off.columns):
            neutral = off[(off["wp"].between(.2, .8)) & (off["down"].isin([1, 2]))]
            neutral_pass = round(float(neutral["pass"].fillna(0).mean()), 6) if len(neutral) else None
        red_zone = None
        if {"yardline_100", "epa"}.issubset(off.columns):
            rz = off[off["yardline_100"] <= 20]
            red_zone = mean(rz["epa"]) if len(rz) else None
        two_min = None
        if {"half_seconds_remaining", "epa"}.issubset(off.columns):
            tm = off[off["half_seconds_remaining"] <= 120]
            two_min = mean(tm["epa"]) if len(tm) else None
        points_per_drive = None
        if {"drive", "posteam_score_post", "posteam_score"}.issubset(off.columns):
            # Starter approximation. Replace with drive table when available.
            drives = off.groupby("drive", dropna=True).tail(1)
            if len(drives):
                delta = (drives["posteam_score_post"].fillna(drives["posteam_score"]) - drives["posteam_score"].fillna(0)).clip(lower=0)
                points_per_drive = round(float(delta.mean()), 3)
        nv_index = None
        if off_epa is not None and def_epa_allowed is not None:
            nv_index = round(78 + off_epa * 120 - def_epa_allowed * 70 + (explosive or 0) * 90 + (red_zone or 0) * 18, 1)
        rows.append({
            "team": team,
            "name": TEAM_NAMES.get(team, team),
            "logo": logo(team),
            "off_epa": off_epa,
            "def_epa_allowed": def_epa_allowed,
            "neutral_pass_rate": neutral_pass,
            "explosive_rate": explosive,
            "points_per_drive": points_per_drive,
            "red_zone_epa": red_zone,
            "third_down": third_down,
            "two_min_epa": two_min,
            "nv_index": nv_index,
        })
    for key, higher in {
        "nv_index": True,
        "off_epa": True,
        "def_epa_allowed": False,
        "neutral_pass_rate": True,
        "explosive_rate": True,
        "points_per_drive": True,
        "red_zone_epa": True,
        "third_down": True,
        "two_min_epa": True,
    }.items():
        rank(rows, key, higher)
    for r in rows:
        r["tier"] = tier(r)
    return rows


def summarize_players(rosters, weekly, pbp, season: int):
    """Create a league-wide QB/RB/WR/TE player file.
    The frontend shows only SF in selectors but uses all NFL players for true position-relative ranks.
    """
    import pandas as pd
    team_col = "team" if "team" in rosters.columns else "recent_team" if "recent_team" in rosters.columns else None
    pos_col = "position" if "position" in rosters.columns else "position_group" if "position_group" in rosters.columns else None
    skill = rosters[rosters[pos_col].isin(["QB", "RB", "WR", "TE"])] if pos_col else rosters.iloc[0:0]

    # weekly season totals by player name/id
    weekly_totals = {}
    if weekly is not None and not weekly.empty:
        id_col = "player_id" if "player_id" in weekly.columns else "gsis_id" if "gsis_id" in weekly.columns else None
        name_col = "player_name" if "player_name" in weekly.columns else "player_display_name" if "player_display_name" in weekly.columns else None
        group_cols = [c for c in [id_col, name_col, "recent_team"] if c and c in weekly.columns]
        if group_cols:
            for key, g in weekly.groupby(group_cols, dropna=False):
                if not isinstance(key, tuple): key = (key,)
                vals = dict(zip(group_cols, key))
                stats = {}
                for out_key, col in {
                    "attempts":"attempts", "completions":"completions", "pass_yards":"passing_yards", "pass_tds":"passing_tds", "interceptions":"interceptions", "sacks":"sacks",
                    "carries":"carries", "rush_yards":"rushing_yards", "rush_tds":"rushing_tds",
                    "targets":"targets", "receptions":"receptions", "receiving_yards":"receiving_yards", "receiving_tds":"receiving_tds"
                }.items():
                    if col in g.columns:
                        val = g[col].fillna(0).sum()
                        if float(val) != 0: stats[out_key] = int(val)
                weekly_totals[str(vals.get(id_col) or vals.get(name_col))] = stats
                if vals.get(name_col): weekly_totals[str(vals.get(name_col))] = stats

    # play-by-play advanced summaries
    adv_by_player = {}
    if pbp is not None and len(pbp):
        if {"passer_player_name", "passer_player_id", "epa"}.issubset(pbp.columns):
            passes = pbp[pbp.get("pass", 0).eq(1)] if "pass" in pbp.columns else pbp
            for (pid, name), g in passes.groupby(["passer_player_id", "passer_player_name"], dropna=True):
                if len(g) < 20: continue
                d = adv_by_player.setdefault(str(pid), {})
                adv_by_player.setdefault(str(name), d)
                d["epa"] = mean(g["epa"])
                d["success"] = round(float((g["epa"] > 0).mean()), 6)
                if "cpoe" in g.columns: d["cpoe"] = mean(g["cpoe"])
                if "air_yards" in g.columns: d["adot"] = mean(g["air_yards"])
                if "yardline_100" in g.columns:
                    rz = g[g["yardline_100"] <= 20]
                    if len(rz): d["red"] = mean(rz["epa"])
                third = g[g["down"] == 3] if "down" in g.columns else None
                if third is not None and len(third): d["third"] = round(float((third["epa"] > 0).mean()), 6)
        if {"receiver_player_name", "receiver_player_id", "epa"}.issubset(pbp.columns):
            rec = pbp[pbp["receiver_player_id"].notna()].copy()
            for (pid, name), g in rec.groupby(["receiver_player_id", "receiver_player_name"], dropna=True):
                d = adv_by_player.setdefault(str(pid), {})
                adv_by_player.setdefault(str(name), d)
                d["epaTarget"] = mean(g["epa"])
                d["success"] = round(float((g["epa"] > 0).mean()), 6)
                if "air_yards" in g.columns: d["adot"] = mean(g["air_yards"])
                if "yards_after_catch" in g.columns: d["yac"] = mean(g["yards_after_catch"])
                if "yards_gained" in g.columns:
                    d["explosive"] = round(float((g["yards_gained"].fillna(0) >= 20).mean()), 6)
                if "yardline_100" in g.columns:
                    d["red_targets"] = int((g["yardline_100"] <= 20).sum())
        if {"rusher_player_name", "rusher_player_id", "epa"}.issubset(pbp.columns):
            rush = pbp[pbp["rusher_player_id"].notna()].copy()
            for (pid, name), g in rush.groupby(["rusher_player_id", "rusher_player_name"], dropna=True):
                d = adv_by_player.setdefault(str(pid), {})
                adv_by_player.setdefault(str(name), d)
                d["epa"] = mean(g["epa"])
                d["success"] = round(float((g["epa"] > 0).mean()), 6)
                if "yards_gained" in g.columns:
                    d["explosive"] = round(float((g["yards_gained"].fillna(0) >= 10).mean()), 6)

    out = []
    for _, r in skill.iterrows():
        name = r.get("player_name") or r.get("full_name") or r.get("display_name") or r.get("football_name")
        if not name: continue
        pid = r.get("gsis_id") or r.get("player_id") or r.get("espn_id") or str(name).lower().replace(" ", "-")
        pos = r.get(pos_col) if pos_col else ""
        team = r.get(team_col) if team_col else r.get("recent_team") or ""
        headshot = r.get("headshot_url") or r.get("espn_headshot") or ""
        stats = {}
        stats.update(weekly_totals.get(str(pid), {}))
        stats.update(weekly_totals.get(str(name), {}))
        stats.update(adv_by_player.get(str(pid), {}))
        stats.update(adv_by_player.get(str(name), {}))
        if stats.get("targets") and stats.get("receptions") is not None:
            stats["catch"] = round(stats["receptions"] / stats["targets"], 6)
        if stats.get("carries") and stats.get("rush_yards") is not None:
            stats["yards_per_carry"] = round(stats["rush_yards"] / stats["carries"], 3)
        usage = stats.get("attempts") or stats.get("targets") or stats.get("carries") or stats.get("touches") or 0
        out.append({"id": str(pid), "name": name, "pos": pos, "team": team, "status": r.get("status") or "ACTIVE", "headshot": headshot, "usage": usage, "stats": stats})
    return out

def summarize_qbs(pbp):
    if not {"passer_player_name", "passer_player_id", "posteam", "epa"}.issubset(pbp.columns):
        return []
    passes = pbp[pbp["pass"] == 1].copy() if "pass" in pbp.columns else pbp.copy()
    grp = passes.groupby(["passer_player_id", "passer_player_name", "posteam"], dropna=True)
    rows = []
    for (pid, name, team), g in grp:
        if len(g) < 150:
            continue
        epa = mean(g["epa"])
        cpoe = mean(g["cpoe"]) if "cpoe" in g else None
        success = round(float((g["epa"] > 0).mean()), 6)
        pressure_epa = None
        if "was_pressure" in g.columns:
            pr = g[g["was_pressure"] == 1]
            pressure_epa = mean(pr["epa"]) if len(pr) else None
        rows.append({"id": str(pid), "name": name, "team": team, "logo": logo(team), "epa": epa, "cpoe": cpoe, "success": success, "pressure_epa": pressure_epa})
    rows.sort(key=lambda x: x.get("epa") or -999, reverse=True)
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows[:40]


def build(season: int):
    import nflreadpy as nfl
    base = out_dir()
    print(f"Loading nflverse season {season}...")
    pbp = as_pandas(nfl.load_pbp([season]))
    schedules = as_pandas(nfl.load_schedules([season]))
    rosters = as_pandas(nfl.load_rosters([season]))
    try:
        weekly = as_pandas(nfl.load_player_stats([season]))
    except Exception:
        weekly = None

    # season_type is usually REG/POST. If absent, write the full file only.
    reg = pbp[pbp["season_type"].eq("REG")] if "season_type" in pbp.columns else pbp
    all_games = pbp
    reg_summary = summarize_teams(reg)
    all_summary = summarize_teams(all_games)
    write_json(base / str(season) / "regular_season.json", reg_summary)
    write_json(base / str(season) / "regular_plus_playoffs.json", all_summary)
    write_json(base / f"league_{season}.json", reg_summary)

    if "week" in reg.columns:
        for week, frame in reg.groupby("week"):
            write_json(base / str(season) / "weeks" / f"week_{int(week):02d}.json", summarize_teams(frame))
    if "season_type" in pbp.columns:
        post = pbp[pbp["season_type"].eq("POST")]
        if len(post) and "week" in post.columns:
            for week, frame in post.groupby("week"):
                write_json(base / str(season) / "playoffs" / f"week_{int(week):02d}.json", summarize_teams(frame))

    players = summarize_players(rosters, weekly, reg, season)
    qbs = summarize_qbs(reg)
    write_json(base / f"players_{season}.json", players)
    write_json(base / f"qbs_{season}.json", qbs)

    if schedules is not None and len(schedules):
        write_json(base / f"schedule_{season}.json", schedules.to_dict(orient="records"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--season", type=int, default=2025)
    args = parser.parse_args()
    try:
        build(args.season)
    except ImportError as exc:
        raise SystemExit("Install first: pip install pandas nflreadpy pyarrow\n" + str(exc))
