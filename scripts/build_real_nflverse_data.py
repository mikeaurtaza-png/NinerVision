"""
NinerVision data pipeline blueprint.
Run locally when you are ready to replace sample JSON with real nflverse data.

Install:
  pip install nflreadpy pandas numpy

Goal:
  1. Load 2025 play-by-play / schedules / rosters
  2. Calculate team ranks for all 32 teams
  3. Calculate QB ranks among starters
  4. Save optimized JSON into public/data for fast Vercel hosting

This file is intentionally safe: it does not run by default on Vercel.
"""
from pathlib import Path
import json

OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def main():
    try:
        import pandas as pd
        import nflreadpy as nfl
    except Exception as exc:
        raise SystemExit("Install dependencies first: pip install nflreadpy pandas numpy") from exc

    season = 2025
    pbp = nfl.load_pbp([season])
    teams = nfl.load_teams()
    rosters = nfl.load_rosters([season])

    # Example core team calculations. Expand as needed.
    plays = pbp[pbp["play"].notna()].copy()
    plays = plays[plays["posteam"].notna()]
    plays["success"] = plays["epa"] > 0
    plays["explosive"] = ((plays["pass"] == 1) & (plays["yards_gained"] >= 20)) | ((plays["rush"] == 1) & (plays["yards_gained"] >= 10))

    offense = plays.groupby("posteam").agg(
        off_epa=("epa", "mean"),
        success_rate=("success", "mean"),
        explosive_rate=("explosive", "mean"),
    ).reset_index().rename(columns={"posteam": "team"})

    defense = plays.groupby("defteam").agg(
        def_epa_allowed=("epa", "mean"),
    ).reset_index().rename(columns={"defteam": "team"})

    league = offense.merge(defense, on="team", how="left")
    league["success_rate"] = (league["success_rate"] * 100).round(1)
    league["explosive_rate"] = (league["explosive_rate"] * 100).round(1)
    league["off_epa"] = league["off_epa"].round(3)
    league["def_epa_allowed"] = league["def_epa_allowed"].round(3)

    # Add rank columns.
    league["off_epa_rank"] = league["off_epa"].rank(ascending=False, method="min").astype(int)
    league["def_epa_allowed_rank"] = league["def_epa_allowed"].rank(ascending=True, method="min").astype(int)
    league["success_rate_rank"] = league["success_rate"].rank(ascending=False, method="min").astype(int)
    league["explosive_rate_rank"] = league["explosive_rate"].rank(ascending=False, method="min").astype(int)

    league.to_json(OUT / "league_teams_2025.json", orient="records", indent=2)

    print(f"Saved {OUT / 'league_teams_2025.json'}")
    print("Next: add QB starter filtering, weekly splits, drive metrics, schedule, and player cards.")


if __name__ == "__main__":
    main()
