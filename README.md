# NinerVision V10

Premium 49ers Intelligence platform. Free-first architecture: React/Vite frontend, local JSON data generated from nflverse/free public data.

## Deploy
- Upload project contents to GitHub.
- Delete any `package-lock.json` if it points to a private/internal registry.
- Import to Vercel.

## Real data
Run locally when you need fresh data:

```bash
pip3 install nflreadpy pandas pyarrow numpy
python3 scripts/build_real_nflverse_data.py
```

Then upload the generated `public/data` files to GitHub.
