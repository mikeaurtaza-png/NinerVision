# NinerVision V6 Elite

Premium 49ers Intelligence web app for Vercel.

## Upload to GitHub
Upload these:
- `src/`
- `public/`
- `scripts/`
- `index.html`
- `package.json`
- `vite.config.js`
- `vercel.json`
- `README.md`

Do not upload `node_modules` or `dist`.

## Run locally
```bash
npm install
npm run build
npm run dev
```

## Data
The app includes demo fallback JSON so the UI builds. Run the pipeline script locally to replace demo files with real nflverse output.

```bash
pip install pandas nflreadpy
python scripts/build_real_nflverse_data.py
```
