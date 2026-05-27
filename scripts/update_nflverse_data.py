"""
Refresh 49ers data into lightweight JSON for the Vercel app.
This script is designed to run locally, then you commit public/data/*.json to GitHub.
It intentionally avoids live data pulls inside Vercel so the site stays free and fast.
"""
import json
from pathlib import Path
import pandas as pd

OUT = Path(__file__).resolve().parents[1] / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)


def safe_mean(frame, col):
    return float(pd.to_numeric(frame.get(col, pd.Series(dtype=float)), errors="coerce").mean()) if col in frame else 0.0


def build_season(season=2025):
    try:
        import nflreadpy as nfl
    except ImportError as exc:
        raise SystemExit("Install first: pip install -r scripts/requirements.txt") from exc

    pbp = nfl.load_pbp(seasons=[season])
    if not isinstance(pbp, pd.DataFrame):
        pbp = pbp.to_pandas()

    sf = pbp[(pbp.get("posteam") == "SF") | (pbp.get("defteam") == "SF")].copy()
    weeks = []
    for week, g in sf.groupby("week"):
        off = g[g.get("posteam") == "SF"]
        defense = g[g.get("defteam") == "SF"]
        opp = None
        if "defteam" in off and len(off):
            opp = off["defteam"].mode().iat[0]
        weeks.append({
            "week": int(week),
            "opponent": str(opp or "TBD"),
            "result": "",
            "off_epa": round(safe_mean(off, "epa"), 3),
            "def_epa_allowed": round(safe_mean(defense, "epa"), 3),
            "success_rate": round(float((pd.to_numeric(off.get("success", pd.Series(dtype=float)), errors="coerce") == 1).mean() * 100), 1) if len(off) else 0,
            "explosive_rate": round(float(((pd.to_numeric(off.get("yards_gained", pd.Series(dtype=float)), errors="coerce") >= 20).mean()) * 100), 1) if len(off) else 0,
            "proe": round(safe_mean(off, "xpass") * 100 - float((off.get("pass", pd.Series(dtype=float)) == 1).mean() * 100), 1) if "xpass" in off else 0,
            "pass_epa": round(safe_mean(off[off.get("pass") == 1], "epa"), 3) if "pass" in off else 0,
            "rush_epa": round(safe_mean(off[off.get("rush") == 1], "epa"), 3) if "rush" in off else 0,
            "third_down": round(float((off[off.get("down") == 3].get("first_down", pd.Series(dtype=float)) == 1).mean() * 100), 1) if "down" in off and len(off[off.get("down") == 3]) else 0,
            "red_zone": round(float((off[off.get("yardline_100") <= 20].get("touchdown", pd.Series(dtype=float)) == 1).mean() * 100), 1) if "yardline_100" in off and len(off[off.get("yardline_100") <= 20]) else 0,
            "turnover_margin": int((defense.get("turnover", pd.Series(dtype=float)) == 1).sum() - (off.get("turnover", pd.Series(dtype=float)) == 1).sum()) if "turnover" in sf else 0,
        })

    payload = {"team": "SF", "season": season, "updated": pd.Timestamp.utcnow().isoformat(), "weeks": weeks, "players": []}
    (OUT / f"metrics_{season}.json").write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUT / f'metrics_{season}.json'}")


if __name__ == "__main__":
    build_season(2025)
