(() => {
  const P = window.PORTFOLIO;
  const tpl = document.getElementById("tpl-window");
  const windows = new Map(); // key -> element
  let z = 10;
  let cascade = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isTouch = matchMedia("(hover: none)").matches;

  document.getElementById("dock-linkedin").href = P.linkedin;

  // Apple devices can render the Apple logo glyph from the system font.
  if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) document.documentElement.classList.add("apple");

  /* ---------- Window manager ---------- */
  function focus(win) {
    windows.forEach((w) => w.classList.remove("focused"));
    win.classList.add("focused");
    win.style.zIndex = ++z;
  }

  function openWindow(key, { title, width, height, render, dock }) {
    if (windows.has(key)) return focus(windows.get(key));

    const win = tpl.content.firstElementChild.cloneNode(true);
    win.querySelector(".title").textContent = title;
    win.setAttribute("aria-label", title);
    render(win.querySelector(".content"));

    const vw = innerWidth, vh = innerHeight - 90 - 28; // dock + menu bar
    const w = Math.min(width, vw - 24), h = Math.min(height, vh - 24);
    const off = (cascade++ % 6) * 28;
    win.style.width = w + "px";
    win.style.height = h + "px";
    win.style.left = Math.max(12, (vw - w) / 2 + off - 60) + "px";
    win.style.top = Math.max(12, (vh - h) / 2 + off - 60) + "px";

    win.querySelector(".close").onclick = () => closeWindow(key);
    win.querySelector(".min").onclick = () => closeWindow(key);
    win.querySelector(".max").onclick = () => win.classList.toggle("zoomed");
    win.querySelector(".titlebar").addEventListener("dblclick", () => win.classList.toggle("zoomed"));
    win.addEventListener("pointerdown", () => focus(win));
    makeDraggable(win);

    document.getElementById("desktop").appendChild(win);
    windows.set(key, win);
    if (dock) document.querySelector(`[data-open="${dock}"]`)?.classList.add("running");
    win._dock = dock;
    focus(win);
  }

  function closeWindow(key) {
    const win = windows.get(key);
    if (!win) return;
    windows.delete(key);
    if (win._dock) document.querySelector(`[data-open="${win._dock}"]`)?.classList.remove("running");
    win.classList.add("closing");
    win.addEventListener("animationend", () => win.remove(), { once: true });
    setTimeout(() => win.remove(), 250); // in case animations are disabled
  }

  function makeDraggable(win) {
    const bar = win.querySelector(".titlebar");
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".lights") || win.classList.contains("zoomed") || innerWidth <= 640) return;
      const sx = e.clientX - win.offsetLeft, sy = e.clientY - win.offsetTop;
      bar.setPointerCapture(e.pointerId);
      // Stop iframes swallowing pointer events mid-drag.
      win.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = "none"));
      const move = (ev) => {
        const x = Math.min(Math.max(ev.clientX - sx, 40 - win.offsetWidth), innerWidth - 40);
        const y = Math.min(Math.max(ev.clientY - sy, 0), innerHeight - 40);
        win.style.left = x + "px";
        win.style.top = y + "px";
      };
      const up = () => {
        bar.removeEventListener("pointermove", move);
        win.querySelectorAll("iframe").forEach((f) => (f.style.pointerEvents = ""));
      };
      bar.addEventListener("pointermove", move);
      bar.addEventListener("pointerup", up, { once: true });
      bar.addEventListener("pointercancel", up, { once: true });
    });
  }

  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const top = [...windows.entries()].sort((a, b) => b[1].style.zIndex - a[1].style.zIndex)[0];
    if (top) closeWindow(top[0]);
  });

  /* ---------- Desktop folders ---------- */
  const iconsEl = document.getElementById("icons");
  const folderSVG = `<svg class="folder-svg" viewBox="0 0 64 50" aria-hidden="true">
    <path d="M3 7a4 4 0 0 1 4-4h15.5a4 4 0 0 1 2.9 1.2L29 8h28a4 4 0 0 1 4 4v4H3z" fill="#4c9fe0"/>
    <rect x="3" y="12" width="58" height="35" rx="4" fill="#6fb8f2"/>
    <rect x="3" y="12" width="58" height="2" rx="1" fill="#a3d3fa"/>
  </svg>`;

  const videosIn = (folderId) => P.videos.filter((v) => v.folder === folderId);
  const thumbFor = (v) => `https://i.ytimg.com/vi/${v.id}/${v.short ? "oar2" : "hqdefault"}.jpg`;

  // Click selects, double-click (or tap on touch, Enter on keyboard) opens.
  function bindOpen(el, group, open) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      group.querySelectorAll(".selected").forEach((s) => s.classList.remove("selected"));
      el.classList.add("selected");
      if (isTouch) open();
    });
    el.addEventListener("dblclick", open);
    el.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), open()));
  }

  P.folders.forEach((f) => {
    const el = document.createElement("button");
    el.className = "icon folder";
    el.setAttribute("role", "listitem");
    el.title = f.name;
    el.innerHTML = `<span class="thumb">${folderSVG}</span><span class="label">${esc(f.name)}</span>`;
    bindOpen(el, iconsEl, () => openFinder(f.id));
    iconsEl.appendChild(el);
  });

  document.getElementById("desktop").addEventListener("click", (e) => {
    if (e.target.id === "desktop" || e.target.id === "icons")
      iconsEl.querySelectorAll(".selected").forEach((s) => s.classList.remove("selected"));
  });

  /* ---------- Finder ---------- */
  let finderView = "icons";
  try { finderView = localStorage.getItem("finderView") || "icons"; } catch {}

  function openFinder(folderId) {
    const existing = windows.get("finder");
    if (existing) {
      existing._navigate(folderId, true);
      return focus(existing);
    }
    openWindow("finder", {
      title: "",
      width: 760,
      height: 480,
      render(c) {
        c.innerHTML = `
          <div class="finder">
            <aside class="finder-side">
              <div class="finder-side-head">Favorites</div>
              ${P.folders.map((f) => `
                <button class="finder-side-item" data-folder="${f.id}">
                  ${folderSVG}<span>${esc(f.name)}</span>
                </button>`).join("")}
            </aside>
            <section class="finder-main">
              <div class="finder-toolbar">
                <div class="seg">
                  <button class="tb-btn" data-nav="back" aria-label="Back">‹</button>
                  <button class="tb-btn" data-nav="fwd" aria-label="Forward">›</button>
                </div>
                <h3 class="finder-title"></h3>
                <div class="seg" role="group" aria-label="View">
                  <button class="tb-btn" data-view="icons" aria-label="Icon view">
                    <svg viewBox="0 0 16 16"><g fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1.2"/><rect x="9" y="1" width="6" height="6" rx="1.2"/><rect x="1" y="9" width="6" height="6" rx="1.2"/><rect x="9" y="9" width="6" height="6" rx="1.2"/></g></svg>
                  </button>
                  <button class="tb-btn" data-view="list" aria-label="List view">
                    <svg viewBox="0 0 16 16"><g fill="currentColor"><rect x="1" y="2" width="14" height="2" rx="1"/><rect x="1" y="7" width="14" height="2" rx="1"/><rect x="1" y="12" width="14" height="2" rx="1"/></g></svg>
                  </button>
                </div>
              </div>
              <div class="finder-items"></div>
              <div class="finder-status"></div>
            </section>
          </div>`;
      },
    });

    const win = windows.get("finder");
    const items = win.querySelector(".finder-items");
    const status = win.querySelector(".finder-status");
    const back = win.querySelector('[data-nav="back"]');
    const fwd = win.querySelector('[data-nav="fwd"]');
    const hist = [];
    let pos = -1;

    function show(folderId) {
      const f = P.folders.find((x) => x.id === folderId) || P.folders[0];
      const vids = videosIn(f.id);
      win.querySelector(".title").textContent = f.name;
      win.querySelector(".finder-title").textContent = f.name;
      win.setAttribute("aria-label", f.name);
      win.querySelectorAll("[data-folder]").forEach((b) => b.classList.toggle("active", b.dataset.folder === f.id));
      win.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === finderView));
      back.disabled = pos <= 0;
      fwd.disabled = pos >= hist.length - 1;
      status.textContent = `${vids.length} item${vids.length === 1 ? "" : "s"}`;
      history.replaceState(null, "", "#" + f.id);

      items.className = "finder-items view-" + finderView;
      items.scrollTop = 0;
      if (!vids.length) {
        items.innerHTML = `<div class="finder-empty">This folder is empty</div>`;
        return;
      }
      items.innerHTML = finderView === "list"
        ? `<div class="list-head"><span>Name</span><span>Kind</span></div>`
        : "";
      vids.forEach((v) => {
        const el = document.createElement("button");
        el.className = "f-item" + (v.short ? " short" : "");
        el.title = v.title;
        el.innerHTML = finderView === "list"
          ? `<span class="f-name"><img src="${thumbFor(v)}" alt="" loading="lazy">${esc(v.title)}</span><span class="f-kind">${v.short ? "YouTube Short" : "YouTube Video"}</span>`
          : `<span class="f-thumb"><img src="${thumbFor(v)}" alt="" loading="lazy"></span><span class="f-label">${esc(v.title)}</span>`;
        bindOpen(el, items, () => openVideo(v));
        items.appendChild(el);
      });
    }

    win._navigate = (folderId, push) => {
      if (push) {
        if (hist[pos] === folderId) return show(folderId);
        hist.splice(pos + 1);
        hist.push(folderId);
        pos = hist.length - 1;
      }
      show(folderId);
    };
    back.onclick = () => pos > 0 && win._navigate(hist[--pos]);
    fwd.onclick = () => pos < hist.length - 1 && win._navigate(hist[++pos]);
    win.querySelectorAll("[data-folder]").forEach((b) => (b.onclick = () => win._navigate(b.dataset.folder, true)));
    win.querySelectorAll("[data-view]").forEach((b) => (b.onclick = () => {
      finderView = b.dataset.view;
      try { localStorage.setItem("finderView", finderView); } catch {}
      show(hist[pos]);
    }));
    items.addEventListener("click", (e) => {
      if (e.target === items) items.querySelectorAll(".selected").forEach((s) => s.classList.remove("selected"));
    });

    win._navigate(folderId, true);
  }

  function openVideo(v) {
    const vh = innerHeight - 140;
    const size = v.short
      ? { width: Math.round(Math.min(vh, 760) * 9 / 16), height: Math.min(vh, 760) + 38 }
      : { width: 880, height: 495 + 38 };
    openWindow("video:" + v.id, {
      title: v.title,
      ...size,
      render(c) {
        c.innerHTML = `<div class="player"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      },
    });
  }

  /* ---------- Notes (About / CV) ---------- */
  function openNotes(tab = "about") {
    openWindow("notes", {
      title: `Information about: ${P.name}`,
      width: 620,
      height: 520,
      dock: "notes",
      render(c) {
        c.innerHTML = `
          <div class="notes-app">
            <div class="notes-side" role="tablist">
              <button role="tab" data-tab="about">About me</button>
              <button role="tab" data-tab="cv">CV</button>
            </div>
            <div class="notes-body" role="tabpanel"></div>
          </div>`;
        const body = c.querySelector(".notes-body");
        const show = (t) => {
          c.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t));
          body.innerHTML = t === "cv" ? cvHTML() : aboutHTML();
          body.scrollTop = 0;
          history.replaceState(null, "", t === "cv" ? "#cv" : "#about");
        };
        c.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => show(b.dataset.tab)));
        show(tab);
      },
    });
  }

  const aboutHTML = () => `
    <p>${esc(P.bio)}</p>
    <p>📍 ${esc(P.location)}</p>
    <ul class="roles">${P.roles.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
    <p>Languages: ${P.languages.map(esc).join(", ")}</p>`;

  const cvHTML = () => {
    const rows = [...P.experiences].sort((a, b) => b.year - a.year)
      .map((x) => `<tr><td>${esc(x.title)}</td><td>${esc(x.company)}</td><td>${x.year}</td></tr>`).join("");
    return `
      <h3>Experience</h3>
      <table><thead><tr><th>Position / Role</th><th>Company</th><th>Year</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Video tools</h3>
      <div class="chips">${P.videoTools.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <h3>Design &amp; AI tools</h3>
      <div class="chips">${P.otherTools.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      <h3>Languages</h3>
      <div class="chips">${P.languages.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;
  };

  /* ---------- Mail (Contact) ---------- */
  function openMail() {
    openWindow("mail", {
      title: "Let's talk",
      width: 420,
      height: 260,
      dock: "mail",
      render(c) {
        const site = location.origin + location.pathname;
        c.innerHTML = `
          <div class="mail-app">
            <div class="mail-row">
              <span class="dock-icon mail" aria-hidden="true">${document.querySelector(".dock-icon.mail").innerHTML}</span>
              <div>Email: <a href="mailto:${esc(P.email)}">${esc(P.email)}</a></div>
            </div>
            <ul>
              <li>📞 <a href="tel:${esc(P.phone)}">${esc(P.phone)}</a></li>
              <li>🔗 <a href="${esc(P.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></li>
              <li>🌐 <a href="${esc(site)}">${esc(site.replace(/^https?:\/\//, ""))}</a></li>
            </ul>
            <a class="btn" href="mailto:${esc(P.email)}?subject=${encodeURIComponent("Video project enquiry")}">Send email</a>
          </div>`;
      },
    });
  }

  document.querySelectorAll("[data-open]").forEach((b) =>
    b.addEventListener("click", () => {
      const key = b.dataset.open;
      if (windows.has(key)) return focus(windows.get(key));
      key === "notes" ? openNotes() : openMail();
    })
  );

  /* ---------- Menu bar ---------- */
  document.querySelectorAll("[data-menu]").forEach((b) =>
    b.addEventListener("click", () => {
      const m = b.dataset.menu;
      if (m === "contact") return openMail();
      const notes = windows.get("notes");
      if (notes) {
        notes.querySelector(`[data-tab="${m}"]`).click();
        focus(notes);
      } else openNotes(m);
    })
  );

  const clock = document.getElementById("clock");
  function renderClock() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const day = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
    clock.textContent = innerWidth > 640 ? `${day}  ${time}` : time; // date hidden on phones
    clock.dateTime = now.toISOString();
    return now;
  }
  (function tick() {
    const now = renderClock();
    setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds())); // next minute boundary
  })();
  addEventListener("resize", renderClock);

  // Theme: remembers the visitor's choice; otherwise follows their system setting.
  const themeBtn = document.getElementById("theme-toggle");
  function setTheme(theme, save) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    themeBtn.setAttribute("aria-pressed", dark);
    themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    if (save) try { localStorage.setItem("theme", theme); } catch {}
  }
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch {}
  setTheme(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), false);
  themeBtn.addEventListener("click", () =>
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true)
  );

  // Deep links: #about, #cv, #contact, or a folder id like #long-form
  function openFromHash() {
    const hash = location.hash.slice(1);
    if (hash === "about" || hash === "cv") {
      const notes = windows.get("notes");
      notes ? (notes.querySelector(`[data-tab="${hash}"]`).click(), focus(notes)) : openNotes(hash);
    } else if (hash === "contact") openMail();
    else if (P.folders.some((f) => f.id === hash)) openFinder(hash);
  }
  openFromHash();
  addEventListener("hashchange", openFromHash);
})();
