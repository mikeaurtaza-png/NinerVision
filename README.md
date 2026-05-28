# NinerVision V9

Premium 49ers Intelligence platform build.

## Upload to GitHub
Upload these files/folders:
- src/
- public/
- scripts/
- package.json
- package-lock.json
- index.html
- vite.config.js
- vercel.json
- README.md

Do not upload node_modules or dist.

## Real data refresh
From the project folder:

```bash
pip3 install nflreadpy pandas pyarrow numpy
python3 scripts/build_real_nflverse_data.py --season 2025
```

Then commit the generated `public/data` files.

## V9 highlights
- Futuristic NinerVision front page
- Real-data-first loader with demo fallbacks
- Team Tiers V3 with gradients, diagonal lines, logos, export PNG
- Unified chart system
- Advanced mobile UX with bottom nav
- Player Lab V2 foundation
- QB Lab
- Matchup Intelligence Center
- Content Creator Mode
- Full functionality pass for visible buttons/interactions
