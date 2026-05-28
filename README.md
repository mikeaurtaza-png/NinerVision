# NinerVision V8 Master Build

Premium, mobile-first 49ers Intelligence platform for Vercel.

## Included
- Compact premium layout
- Mobile bottom nav
- Full data filters: season, regular season, regular + playoffs, week selection
- Team Tier Chart V2 with gradient zones and team logos
- NFL Landscape page
- Visual Lab with focus mode
- QB Lab
- Player Lab with search/status filters
- Clickable Matchup Intelligence Center
- Why Engine V2
- Trend/State of Team sections
- Content Creator Mode
- Data Engine with real nflverse pipeline starter

## Deploy
Upload these to GitHub root:
- src/
- public/
- scripts/
- index.html
- package.json
- package-lock.json optional
- vite.config.js
- vercel.json

Vercel build command: npm run build
Output directory: dist

## Real data
The app currently imports demo fallback JSON so the site always builds. To generate real data locally:

```bash
pip install pandas nflreadpy pyarrow
python scripts/build_real_nflverse_data.py --season 2025
```

Then commit generated JSON files from public/data/.
