# Sean Sesing — Portfolio

A self-hosted, macOS-desktop-style video portfolio. Plain HTML/CSS/JS, no build step.

- **Desktop folders** — Short-form Videos, Long-form Videos, Case Studies, Passion Projects. Double-click
  (tap on mobile, Enter on keyboard) to open a Finder-style window with icon/list views and back/forward;
  double-click a video to play it.
- **Dock** — DaVinci Resolve, CapCut, Notes (About me / CV), Mail (contact), LinkedIn.
- Windows drag by the title bar, red light closes, green zooms, Esc closes the top one.
- Deep links: `/#about`, `/#cv`, `/#contact`, or a folder: `/#short-form`, `/#long-form`, `/#case-studies`, `/#passion-projects`.

## Edit content
Everything is in `data.js` — bio, roles, experience, contact details, the folder list, and the video list
(`id` = YouTube video id, `short: true` for Shorts, `folder` = which folder it appears in).

## Case Studies (presentations)
Export a deck from PowerPoint or Keynote as a **PDF** (File › Export › PDF), put it in `assets/decks/`,
and add it to `presentations` in `data.js`:

    { title: "Absa campaign case study", pdf: "assets/decks/absa-campaign.pdf" },

Or export every slide as an image and list them: `slides: ["assets/decks/absa/1.png", ...]`.
Opening a deck starts presentation mode (arrows / Space / click to move, Esc to leave); the slide
window has a Play button to present again. PDFs are drawn with PDF.js, loaded from cdnjs only when needed.

## Wallpaper
The wallpaper is `assets/wallpaper.webp`. Replace that file to change it; if it's missing, a painted CSS landscape is used.

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
