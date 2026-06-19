# EIHA Field Trial Manager v7.0

Progressive Web App for managing EIHA field trial events — registrations, heat scheduling, collar assignments, scoring, and live display boards.

## Features

- Dog & handler registration with CSV import
- Heat scheduling across multiple event classes
- Collar assignment tracker
- Live scoreboard & display board (TV popout)
- Bear Pack, Bear Drag, and Iron Dog special events
- Google Sheets sync
- Fully offline-capable (PWA)

## Deployment (GitHub Pages)

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Source** and select `main` branch, `/ (root)`.
3. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

## Install as App

Once deployed, visit the URL on any device and use your browser's **"Add to Home Screen"** or **"Install App"** prompt.

## Local Development

Just open `index.html` directly in a browser, or serve locally:

```bash
npx serve .
# or
python3 -m http.server 8080
```

> Note: The service worker requires HTTPS or `localhost` to activate.
