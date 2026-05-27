"""
NinerVision real-data pipeline starter.

Run locally, not inside Vercel:
  python scripts/build_real_nflverse_data.py

Goal:
  Pull nflverse/nflreadpy data, calculate clean 2025 JSON outputs,
  then commit public/data/*.json to GitHub for a fast free Vercel site.

Notes:
  - This starter is intentionally defensive. Column names can vary by dataset/version.
  - It creates JSON files that match the frontend shape.
  - You should verify formulas before publishing as official stats.
"""
from __future__ import annotations
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def safe_rank(rows, key, higher=True):
    ordered = sorted(rows, key=lambda r: (r.get(key) is None, r.get(key, 0)), reverse=higher)
    if not higher:
        ordered = sorted(rows, key=lambda r: (r.get(key) is None, r.get(key, 0)))
    for i, row in enumerate(ordered, 1):
        row[f"{key}_rank"] = i


def espn_logo(team: str) -> str:
    code = "wsh" if team == "WAS" else team.lower()
    return f"https://a.espncdn.com/i/teamlogos/nfl/500/{code}.png"


def main(season: int = 2025):
    try:
        import pandas as pd  # noqa
        import nflreadpy as nfl
    except Exception as exc:
        raise SystemExit(
            "Install dependencies first: pip install pandas nflreadpy\n"
            f"Original import error: {exc}"
        )

    print(f"Loading nflverse data for {season}...")
    pbp = nfl.load_pbp([season])
    schedules = nfl.load_schedules([season])
    rosters = nfl.load_rosters([season])

    # Team-level summary from play-by-play. This is a starter; add filters for postseason, garbage time, etc.
    teams = sorted(set(pbp["posteam"].dropna()) | set(pbp["defteam"].dropna()))
    rows = []
    for team in teams:
        off = pbp[pbp["posteam"] == team]
        deff = pbp[pbp["defteam"] == team]
        def mean_col(df, col):
            return float(df[col].dropna().mean()) if col in df.columns and len(df[col].dropna()) else None
        explosive = None
        if "yards_gained" in off.columns:
            explosive = float(((off["pass"] == 1) & (off["yards_gained"] >= 20) | ((off["rush"] == 1) & (off["yards_gained"] >= 10))).mean())
        third_down = None
        if {"down", "first_down"}.issubset(off.columns):
            third = off[off["down"] == 3]
            third_down = float(third["first_down"].fillna(0).mean()) if len(third) else None
        neutral_pass = None
        if {"wp", "pass", "down"}.issubset(off.columns):
            neutral = off[(off["wp"].between(.2,.8)) & (off["down"].isin([1,2]))]
            neutral_pass = float(neutral["pass"].fillna(0).mean()) if len(neutral) else None
        red_zone = None
        if "yardline_100" in off.columns and "epa" in off.columns:
            rz = off[off["yardline_100"] <= 20]
            red_zone = float(rz["epa"].dropna().mean()) if len(rz) else None
        points_per_drive = None  # Add drive table calc if needed.
        off_epa = mean_col(off, "epa")
        def_epa_allowed = mean_col(deff, "epa")
        two_min = None
        if {"half_seconds_remaining", "epa"}.issubset(off.columns):
            tm = off[off["half_seconds_remaining"] <= 120]
            two_min = float(tm["epa"].dropna().mean()) if len(tm) else None
        nv_index = None
        if off_epa is not None and def_epa_allowed is not None:
            nv_index = round(75 + off_epa*120 - def_epa_allowed*70 + (explosive or 0)*100)
        rows.append({
            "team": team,
            "name": team,
            "logo": espn_logo(team),
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
        "off_epa": True,
        "def_epa_allowed": False,
        "neutral_pass_rate": True,
        "explosive_rate": True,
        "red_zone_epa": True,
        "third_down": True,
        "two_min_epa": True,
        "nv_index": True,
    }.items():
        valid = [r for r in rows if r.get(key) is not None]
        safe_rank(valid, key, higher=higher)

    (OUT / f"league_{season}.json").write_text(json.dumps(rows, indent=2))
    print(f"Wrote league_{season}.json")

    # Roster: active/relevant 49ers. nflverse roster columns commonly include team, player_name, position, headshot_url.
    sf_roster = rosters[rosters.get("team", "") == "SF"] if "team" in rosters.columns else rosters.iloc[0:0]
    players = []
    for _, r in sf_roster.iterrows():
        name = r.get("player_name") or r.get("full_name") or r.get("display_name")
        if not name:
            continue
        players.append({
            "id": str(r.get("gsis_id") or r.get("player_id") or name).lower().replace(" ", "-"),
            "name": name,
            "pos": r.get("position") or "",
            "status": r.get("status") or "ACTIVE",
            "headshot": r.get("headshot_url") or r.get("espn_headshot") or "",
            "stats": {},
            "rank": "—",
        })
    (OUT / f"players_{season}.json").write_text(json.dumps(players, indent=2))
    print(f"Wrote players_{season}.json")


if __name__ == "__main__":
    main(2025)
