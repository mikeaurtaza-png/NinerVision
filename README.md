# 49ers Elite Analytics

A free Vercel-ready React app for premium San Francisco 49ers analytics dashboards using saved nflverse-style data.

## Run locally
```bash
npm install
npm run dev
```

## Deploy free on Vercel
1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.

## Refresh real nflverse data later
Run:
```bash
pip install -r scripts/requirements.txt
python scripts/update_nflverse_data.py
```
Then commit the updated files in `public/data`.

Sources: nflverse data is distributed through the nflverse/nflverse-data releases, and Python access is available through nflreadpy.
