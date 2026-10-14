# India Spot

Geography games for India (Tamil Nadu first):

- **Spot the place** — GeoGuessr-style: photo → pin on OpenStreetMap → score by distance
- **Map quizzes (Seterra-style Pin)** — click named districts on a clean **vector** map; green/yellow/red attempts; accuracy % + timer (not distance). Live: **Tamil Nadu: Districts**. Placeholders: TN capitals, India states/capitals.

District boundaries: open GeoJSON from [geohacker/india](https://github.com/geohacker/india) (simplified). No Street View API keys.

## Play locally

```bash
npm install
npm run dev -- -p 3847 -H 127.0.0.1
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

## Build (static / GitHub Pages)

This app uses Next.js **static export** (`output: "export"`) so it can be hosted on **GitHub Pages**.

```bash
# Local static build (no base path)
npm run build
npx serve out -p 3847
```

### Deploy on GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Merge to `main` (or run the **Deploy to GitHub Pages** workflow).
4. Site URL will be `https://<user>.github.io/<repo>/`.

The workflow sets `BASE_PATH=/<repo-name>` so assets resolve under the project site path. For a custom domain or user site (`username.github.io`), set `BASE_PATH` to empty in the workflow.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS + shadcn-style UI primitives
- Leaflet / OpenStreetMap for Spot mode (no map API key)
- SVG district map + open GeoJSON for Seterra Pin
- Bundled Wikimedia Commons photos for Spot place views

## What’s included

- Home catalog: Spot entry + Seterra-style quiz list with Pin / Type / Place chips
- Spot: 5-round TN photo sessions, distance scoring
- Pin quiz: full TN district set on SVG polygons, attempt colours, % + time
- Region placeholders beyond TN
- Empty / loading / error states

## Limitations

- **No Google Street View** — uses static panoramic / landmark photos (Wikimedia) as the place view.
- Images are attributed in-UI; see files under `public/locations/`.
- Map tiles load from OpenStreetMap (needs network).
- Pin quiz uses an older 30-district TN boundary set (simplified).

## Scripts

| Command        | Description                |
| -------------- | -------------------------- |
| `npm run dev`  | Dev server                 |
| `npm run build`| Static export to `out/`    |
| `npm run lint` | ESLint                     |
