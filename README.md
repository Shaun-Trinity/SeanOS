# Sean Sesing — Portfolio

A self-hosted, macOS-desktop-style video portfolio. Plain HTML/CSS/JS, no build step.

- **Desktop icons** — each video. Double-click (or tap on mobile, Enter on keyboard) to play in a window.
- **Dock** — DaVinci Resolve, CapCut, Notes (About me / CV), Mail (contact), LinkedIn.
- Windows drag by the title bar, red light closes, green zooms, Esc closes the top one.
- Deep links: `/#about`, `/#cv`, `/#contact`.

## Edit content
Everything is in `data.js` — bio, roles, experience, contact details, and the video list
(`id` = YouTube video id, `short: true` for Shorts).

## Custom wallpaper
Drop an image at `assets/wallpaper.jpg`. Without it, a painted CSS landscape is used.

## Run locally
    python3 -m http.server 8080
Then open http://localhost:8080.

## Self-host
**Docker:**

    docker compose up -d --build     # serves on :8080

Put it behind a reverse proxy (Caddy, Traefik, nginx) for HTTPS on your domain, e.g. Caddy:

    sean.example.com {
      reverse_proxy localhost:8080
    }

**Without Docker:** it's static — copy `index.html style.css app.js data.js assets/` to any web
root (nginx, Apache, Caddy `file_server`), or push to GitHub Pages / Cloudflare Pages / Netlify.
