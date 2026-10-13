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

## Dashboard (owner only)
Click the SeanOS logo → **Log In…** to open `/dashboard`. From there you can add videos (paste a YouTube or
TikTok link and press **Get**), upload PDF decks, edit your profile, roles, CV, tools, contact links, the
clock/calendar settings and folder names/icons, then press **Save changes** to publish.

How it works: Vercel serves the site and runs the small functions in `api/`. Content is saved as one JSON
file in Vercel Blob (the site falls back to `data.js` until the first save); uploads go straight from your
browser to Vercel Blob. Your password lives only in Vercel's environment variables.

### Try it locally
1. `cp .env.example .env.local` and set `ADMIN_PASSWORD` and `SESSION_SECRET` (a long random string).
2. `npm install`, then `npm run dev` and open http://localhost:3000. Local saves go to `.data/` (git-ignored).

### Put it on Vercel (one-time setup)
1. Sign up at vercel.com (free Hobby plan) with your GitHub account.
2. **Add New → Project →** import the `SeanOS` repo. Framework preset: **Other**. No build command. Deploy.
3. In the project: **Storage → Create → Blob**, connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`).
4. **Settings → Environment Variables**: add `ADMIN_PASSWORD` (a strong, unique password) and
   `SESSION_SECRET` (`openssl rand -base64 48`). Then **Deployments → Redeploy**.
5. Open your site, click the logo → **Log In…**, and press **Save changes** once to start managing content
   from the dashboard. Every push to GitHub redeploys automatically; dashboard saves don't need a redeploy.

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
