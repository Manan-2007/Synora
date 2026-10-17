# Synora

One calm home for everything you're studying — tasks, calendar, timetable, quick notes,
CGPA, attendance, achievements and notifications in a single client-side workspace.
Built with React + Vite.

Live site: https://synora-v1.vercel.app/

## Quick start

Needs Node.js 22.22 or newer. Run the launcher from this folder. It installs dependencies on
first run, starts the dev server and opens Synora in your browser; press Ctrl+C (or close the
window) to stop it.

| macOS / Linux | Windows |
| :--- | :--- |
| `./start.sh` | double-click `start.bat` |

Or by hand:

```bash
npm install
npm run dev
```

## Deployment

Vercel builds this folder (Project Settings → Build and Deployment → Root Directory =
`Synora_react`). [`vercel.json`](vercel.json) sends every route to `index.html` so React
Router can handle deep links such as `/dashboard` on refresh.
