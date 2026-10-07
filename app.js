(() => {
  const P = window.PORTFOLIO;
  const tpl = document.getElementById("tpl-window");
  const windows = new Map(); // key -> element
  let z = 10;
  let cascade = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isTouch = matchMedia("(hover: none)").matches;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Remember what the visitor just activated so a window can grow out of it (genie effect).
  let lastOrigin = null, lastOriginAt = 0;
  ["pointerdown", "keydown"].forEach((type) =>
    addEventListener(type, (e) => {
      const o = e.target.closest?.(".icon, .f-item, .dock-item, .menu-item");
      if (o) (lastOrigin = o), (lastOriginAt = performance.now());
    }, true)
  );
  const takeOrigin = () => {
    const o = performance.now() - lastOriginAt < 1500 ? lastOrigin : null;
    lastOrigin = null;
    return o;
  };

  document.getElementById("dock-linkedin").href = P.linkedin;

  /* ---------- Window manager ---------- */
  // Genie: the window stretches out of (or back into) the icon it was opened from.
  function genie(win, origin, closing) {
    if (reduceMotion || !origin?.isConnected || !origin.getClientRects().length) return null;
    win.style.animation = "none"; // replace the default pop so it doesn't skew the measurement
    const r = win.getBoundingClientRect(), o = origin.getBoundingClientRect();
    const dx = o.left + o.width / 2 - (r.left + r.width / 2);
    const dy = o.top + o.height / 2 - (r.top + r.height / 2);
    const sx = Math.max(o.width / r.width, 0.02), sy = Math.max(o.height / r.height, 0.02);
    const skew = Math.max(-12, Math.min(12, -dx / 40));
    const frames = [
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.2 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.5}px) scale(${Math.max(sx, 0.45)}, ${Math.max(sy, 0.25)}) skewX(${skew}deg)`, opacity: 0.85, offset: 0.5 },
      { transform: "none", opacity: 1 },
    ];
    return win.animate(closing ? frames.reverse() : frames, {
      duration: closing ? 380 : 480,
      easing: closing ? "cubic-bezier(.5,0,.75,0)" : "cubic-bezier(.2,.8,.2,1)",
    });
  }

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
    win._origin = takeOrigin();
    genie(win, win._origin, false);
  }

  function closeWindow(key) {
    const win = windows.get(key);
    if (!win) return;
    windows.delete(key);
    if (win._dock) document.querySelector(`[data-open="${win._dock}"]`)?.classList.remove("running");
    const anim = genie(win, win._origin, true);
    if (anim) return void (anim.onfinish = () => win.remove());
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
    if (e.key !== "Escape" || !document.getElementById("control-center").hidden) return; // Escape closes Control Center first
    const top =[...windows.entries()].sort((a, b) => b[1].style.zIndex - a[1].style.zIndex)[0];
    if (top) closeWindow(top[0]);
  });

  /* ---------- Desktop folders ---------- */
  const iconsEl = document.getElementById("icons");
  const folderSVG = `<svg class="folder-svg" viewBox="0 0 64 50" aria-hidden="true">
    <path d="M3 7a4 4 0 0 1 4-4h15.5a4 4 0 0 1 2.9 1.2L29 8h28a4 4 0 0 1 4 4v4H3z" fill="#4c9fe0"/>
    <rect x="3" y="12" width="58" height="35" rx="4" fill="#6fb8f2"/>
    <rect x="3" y="12" width="58" height="2" rx="1" fill="#a3d3fa"/>
  </svg>`;

  // A folder's own artwork when it has one, otherwise the generic drawn folder.
  const folderIcon = (f) => f.icon ? `<img class="folder-img" src="${esc(f.icon)}" alt="" draggable="false">` : folderSVG;
  const videosIn = (folderId) => P.videos.filter((v) => v.folder === folderId);
  const isTikTok = (v) => v.platform === "tiktok";
  const thumbFor = (v) => v.cover || (isTikTok(v) ? null : `https://i.ytimg.com/vi/${v.id}/${v.short ? "oar2" : "hqdefault"}.jpg`);
  // Thumbnail markup: the image, or a placeholder tile when there is none (TikTok without a cover).
  const thumbHTML = (v) => {
    const src = thumbFor(v);
    return src ? `<img src="${esc(src)}" alt="" loading="lazy">`
      : `<span class="tt-cover" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg></span>`;
  };
  const kindOf = (v) => (isTikTok(v) ? "TikTok Video" : v.short ? "YouTube Short" : "YouTube Video");

  // Click selects, double-click (or tap on touch, Enter on keyboard) opens.
  function bindOpen(el, group, open) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el._suppressClick) return void (el._suppressClick = false); // the click that ended a drag
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
    el.dataset.id = f.id;
    el.innerHTML = `<span class="thumb">${folderIcon(f)}</span><span class="label">${esc(f.name)}</span>`;
    bindOpen(el, iconsEl, () => openFinder(f.id));
    makeIconDraggable(el);
    iconsEl.appendChild(el);
  });

  /* ---------- Draggable desktop icons ---------- */
  // Icons start in the grid; once laid out they're pinned with left/top so they can move freely.
  // Positions are remembered per visitor. Phones and touch screens keep the plain grid.
  const POS_KEY = "iconPositions";
  let positions = {};
  try { positions = JSON.parse(localStorage.getItem(POS_KEY)) || {}; } catch {}
  const canDrag = () => !isTouch && innerWidth > 640;

  function placeIcon(el, x, y) {
    const maxX = iconsEl.clientWidth - el.offsetWidth, maxY = iconsEl.clientHeight - el.offsetHeight;
    el.style.left = Math.max(0, Math.min(x, maxX)) + "px";
    el.style.top = Math.max(0, Math.min(y, maxY)) + "px";
  }

  function layoutIcons() {
    const icons = [...iconsEl.children];
    iconsEl.classList.remove("free");
    icons.forEach((el) => (el.style.left = el.style.top = ""));
    if (!canDrag()) return;
    // Read the grid slots in page coordinates, then convert them against the free (full-width) box.
    const rects = icons.map((el) => el.getBoundingClientRect());
    iconsEl.classList.add("free");
    const box = iconsEl.getBoundingClientRect();
    const slots = rects.map((r) => ({ x: r.left - box.left, y: r.top - box.top }));
    icons.forEach((el, i) => {
      const p = positions[el.dataset.id] || slots[i];
      placeIcon(el, p.x, p.y);
    });
  }

  function makeIconDraggable(el) {
    el.addEventListener("pointerdown", (e) => {
      if (!canDrag() || e.button !== 0) return;
      const startX = e.clientX, startY = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      let dragging = false;
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < 4) return; // still a click, not a drag
          dragging = true;
          el.classList.add("dragging");
        }
        placeIcon(el, ox + dx, oy + dy);
      };
      // Listen on the window so the release is caught wherever it happens, and always clean up.
      const end = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", end);
        removeEventListener("pointercancel", end);
        if (!dragging) return;
        el.classList.remove("dragging");
        el.classList.add("dropped");
        setTimeout(() => el.classList.remove("dropped"), 260);
        el._suppressClick = true;
        positions[el.dataset.id] = { x: el.offsetLeft, y: el.offsetTop };
        try { localStorage.setItem(POS_KEY, JSON.stringify(positions)); } catch {}
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", end);
      addEventListener("pointercancel", end);
    });
  }

  // Clean Up: forget the saved layout and slide every icon back to its grid slot.
  function cleanUp() {
    positions = {};
    try { localStorage.removeItem(POS_KEY); } catch {}
    const icons = [...iconsEl.children];
    const from = icons.map((el) => ({ x: el.offsetLeft, y: el.offsetTop }));
    layoutIcons(); // jumps to the default slots (same frame, so nothing flashes)
    if (reduceMotion || !iconsEl.classList.contains("free")) return;
    const to = icons.map((el) => ({ x: el.offsetLeft, y: el.offsetTop }));
    icons.forEach((el, i) => ((el.style.left = from[i].x + "px"), (el.style.top = from[i].y + "px")));
    iconsEl.offsetHeight; // commit the start positions before animating
    iconsEl.classList.add("tidying");
    icons.forEach((el, i) => ((el.style.left = to[i].x + "px"), (el.style.top = to[i].y + "px")));
    setTimeout(() => iconsEl.classList.remove("tidying"), 450);
  }

  /* ---------- Desktop right-click menu ---------- */
  const ctxMenu = document.getElementById("ctx-menu");
  function hideMenu() { ctxMenu.hidden = true; }
  document.getElementById("desktop").addEventListener("contextmenu", (e) => {
    if (e.target.id !== "desktop" && e.target.id !== "icons") return; // only on empty desktop
    if (!canDrag()) return;
    e.preventDefault();
    ctxMenu.hidden = false;
    const x = Math.min(e.clientX, innerWidth - ctxMenu.offsetWidth - 6);
    const y = Math.min(e.clientY, innerHeight - ctxMenu.offsetHeight - 6);
    ctxMenu.style.left = x + "px";
    ctxMenu.style.top = y + "px";
    ctxMenu.querySelector("button").focus({ preventScroll: true });
  });
  ctxMenu.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    hideMenu();
    if (action === "cleanup") cleanUp();
  });
  addEventListener("pointerdown", (e) => { if (!ctxMenu.contains(e.target)) hideMenu(); }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape") hideMenu(); });
  addEventListener("blur", hideMenu);
  addEventListener("resize", hideMenu);

  layoutIcons();
  let relayout;
  addEventListener("resize", () => {
    clearTimeout(relayout);
    relayout = setTimeout(layoutIcons, 150);
  });

  document.getElementById("desktop").addEventListener("click", (e) => {
    if (e.target.id === "desktop" || e.target.id === "icons")
      iconsEl.querySelectorAll(".selected").forEach((s) => s.classList.remove("selected"));
  });

  /* ---------- Finder ---------- */
  let finderView = "icons";
  try { finderView = localStorage.getItem("finderView") || "icons"; } catch {}

  let finderCount = 0;

  // One Finder window per folder opened from the desktop; reuse a window already showing it.
  function openFinder(folderId) {
    for (const w of windows.values()) {
      if (w._folder !== folderId) continue;
      history.replaceState(null, "", "#" + folderId);
      return focus(w);
    }
    const key = "finder-" + ++finderCount;
    openWindow(key, {
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
                  ${folderIcon(f)}<span>${esc(f.name)}</span>
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

    const win = windows.get(key);
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
      win._folder = f.id;
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
          ? `<span class="f-name">${thumbHTML(v)}${esc(v.title)}</span><span class="f-kind">${kindOf(v)}</span>`
          : `<span class="f-thumb">${thumbHTML(v)}</span><span class="f-label">${esc(v.title)}</span>`;
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
        const id = encodeURIComponent(v.id);
        const src = isTikTok(v)
          ? `https://www.tiktok.com/player/v1/${id}?autoplay=1&rel=0&description=0&music_info=0`
          : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
        c.innerHTML = `<div class="player"><iframe src="${src}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
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
    const day = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); // "Wednesday 7 October"
    clock.textContent = innerWidth > 640 ? `${day}  ${time}` : time; // date hidden on phones
    clock.dateTime = now.toISOString();
    return now;
  }
  (function tick() {
    const now = renderClock();
    setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds())); // next minute boundary
  })();
  addEventListener("resize", renderClock);

  /* ---------- Desktop widgets ---------- */
  // Calendar: this month at a glance; the whole widget opens the booking page.
  const calWidget = document.getElementById("widget-cal");
  calWidget.href = P.bookingUrl;
  calWidget.title = "Book a call with " + P.name;
  calWidget.setAttribute("aria-label", `Book a call with ${P.name} (opens in a new tab)`);

  function renderCalendar() {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
    const lead = new Date(y, m, 1).getDay(); // weeks start on Sunday
    const days = new Date(y, m + 1, 0).getDate();
    const cells = Array(lead).fill("<span></span>");
    for (let d = 1; d <= days; d++) {
      const dow = (lead + d - 1) % 7, cls = [d === today && "today", (dow === 0 || dow === 6) && "weekend"].filter(Boolean);
      cells.push(`<span${cls.length ? ` class="${cls.join(" ")}"` : ""}>${d}</span>`);
    }
    calWidget.innerHTML = `
      <div class="cal-month">${now.toLocaleDateString("en-GB", { month: "long" })}</div>
      <div class="cal-grid" aria-hidden="true">
        ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<b>${d}</b>`).join("")}${cells.join("")}
      </div>`;
    calWidget._day = today;
  }

  // Clock: Sean's local time, digital, with minute ticks around the edge of the widget.
  const clockWidget = document.getElementById("widget-clock");
  const city = P.timeZone.split("/").pop().replace(/_/g, " ");
  const cityCode = (P.cityCode || city.slice(0, 3)).toUpperCase();
  // 60 ticks on a squircle just inside the widget's rounded edge.
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI, c = Math.sin(a), s2 = -Math.cos(a), n = 5;
    const edge = (r) => r / Math.pow(Math.abs(c) ** n + Math.abs(s2) ** n, 1 / n);
    const r1 = edge(72), r2 = edge(66);
    return `<line x1="${(79 + c * r1).toFixed(1)}" y1="${(79 + s2 * r1).toFixed(1)}" x2="${(79 + c * r2).toFixed(1)}" y2="${(79 + s2 * r2).toFixed(1)}"/>`;
  }).join("");
  clockWidget.innerHTML = `
    <svg class="dclock-ticks" viewBox="0 0 158 158" aria-hidden="true">${ticks}</svg>
    <div class="dclock-city">${esc(cityCode)}</div>
    <div class="dclock-hm"></div>
    <div class="dclock-offset"></div>`;
  const tickEls = clockWidget.querySelectorAll(".dclock-ticks line");
  const clockFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: P.timeZone });

  function zonedNow() {
    // Wall-clock time in the chosen zone, as a local Date (good enough for drawing hands and offsets).
    return new Date(new Date().toLocaleString("en-US", { timeZone: P.timeZone }));
  }
  function renderWidgetClock() {
    const local = new Date(), t = zonedNow(), sec = local.getSeconds();
    const hm = clockFmt.format(local);
    clockWidget.querySelector(".dclock-hm").textContent = hm;
    tickEls.forEach((el, i) => el.classList.toggle("now", i === sec)); // the current second glows
    const diff = Math.round((t - local) / 36e5);
    clockWidget.querySelector(".dclock-offset").textContent = (diff < 0 ? "−" : "+") + Math.abs(diff);
    const rel = diff === 0 ? "same time as you" : `${Math.abs(diff)} hours ${diff > 0 ? "ahead of" : "behind"} you`;
    clockWidget.setAttribute("aria-label", `Time in ${city}: ${hm}, ${rel}`);
    if (calWidget._day !== local.getDate()) renderCalendar(); // roll the calendar over at midnight
  }
  renderCalendar();
  renderWidgetClock();
  setInterval(renderWidgetClock, 1000);

  /* ---------- Control Center (transparency slider) ---------- */
  const ccBtn = document.getElementById("cc-toggle");
  const cc = document.getElementById("control-center");
  const glassSlider = document.getElementById("glass-slider");
  const glassValue = document.getElementById("glass-value");

  // 0% = nearly solid windows (the original look), 100% = very clear glass.
  function setGlass(pct, save) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    document.documentElement.style.setProperty("--glass-alpha", (0.92 - (pct / 100) * 0.8).toFixed(3));
    glassSlider.value = pct;
    glassSlider.parentElement.style.setProperty("--p", pct / 100);
    glassValue.textContent = pct + "%";
    if (save) try { localStorage.setItem("glass", pct); } catch {}
  }
  let savedGlass = null;
  try { savedGlass = localStorage.getItem("glass"); } catch {}
  setGlass(savedGlass === null ? 50 : Number(savedGlass), false);
  glassSlider.addEventListener("input", () => setGlass(glassSlider.value, true));

  // Lens map for the glass edges: a displacement image whose red/green channels push the backdrop
  // inward near the rim, so the wallpaper bends at the edges like light through thick glass.
  const lensOK = !!navigator.userAgentData?.brands?.some((b) => /Chromium/i.test(b.brand)); // url() in backdrop-filter
  const lensMap = document.getElementById("cc-lens-map");
  const lensDisp = document.querySelector("#cc-lens feDisplacementMap");
  const LENS_SCALE = 36;
  let lensSize = "";
  if (lensOK) cc.classList.add("lens");

  function drawLens(w, h, r = 22, band = 20) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d"), img = g.createImageData(w, h), d = img.data;
    const hw = w / 2, hh = h / 2;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Signed distance to the rounded rectangle (negative inside) and its outward normal.
        const px = x + 0.5 - hw, py = y + 0.5 - hh;
        const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
        const depth = -(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
        let dx = 0, dy = 0;
        if (depth > 0 && depth < band) {
          const m = (1 - depth / band) ** 2;
          let nx, ny;
          if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); nx = qx / l; ny = qy / l; }
          else if (qx > qy) { nx = 1; ny = 0; } else { nx = 0; ny = 1; }
          dx = -nx * Math.sign(px || 1) * m;
          dy = -ny * Math.sign(py || 1) * m;
        }
        const i = (y * w + x) * 4;
        d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function fitLens() {
    const w = cc.offsetWidth, h = cc.offsetHeight, key = w + "x" + h;
    if (!lensOK || key === lensSize) return;
    lensSize = key;
    const url = drawLens(w, h);
    lensMap.setAttribute("href", url);
    lensMap.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
    for (const el of [lensMap, lensMap.parentElement]) {
      el.setAttribute("width", w);
      el.setAttribute("height", h);
    }
  }

  // Glass materialises by ramping its light-bending, not just its opacity.
  function rampLens(from, to, ms) {
    if (!lensOK) return;
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / ms), e = 1 - (1 - k) ** 3;
      lensDisp.setAttribute("scale", (from + (to - from) * e).toFixed(1));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // Control Center morphs out of its menu-bar button (and back into it), with a springy settle.
  let ccAnim = null;
  function toggleCC(open = cc.hidden) {
    if (open === !cc.hidden && !ccAnim) return;
    ccAnim?.cancel();
    ccBtn.setAttribute("aria-expanded", open);
    if (open) cc.hidden = false;
    fitLens();
    if (reduceMotion) {
      cc.hidden = !open;
      lensDisp?.setAttribute("scale", LENS_SCALE);
      if (open) glassSlider.focus({ preventScroll: true });
      return;
    }
    const p = cc.getBoundingClientRect(), b = ccBtn.getBoundingClientRect();
    const fromBtn = `translate(${b.left - p.left}px, ${b.top - p.top}px) scale(${b.width / p.width}, ${b.height / p.height})`;
    const spring = getComputedStyle(document.documentElement).getPropertyValue("--spring").trim();
    const frames = [
      { transform: fromBtn, borderRadius: "999px", opacity: 0.4 },
      { transform: "none", borderRadius: "22px", opacity: 1 },
    ];
    if (open) {
      ccAnim = cc.animate(frames, { duration: 560, easing: spring });
      cc.querySelector(".cc-content").animate(
        [{ opacity: 0, transform: "translateY(-6px) scale(.97)" }, { opacity: 1, transform: "none" }],
        { duration: 300, delay: 140, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
      );
      rampLens(LENS_SCALE * 2.5, LENS_SCALE, 480);
      glassSlider.focus({ preventScroll: true });
    } else {
      ccAnim = cc.animate(frames.reverse(), { duration: 240, easing: "cubic-bezier(.4,0,1,1)" });
      rampLens(LENS_SCALE, LENS_SCALE * 2.5, 220);
    }
    ccAnim.onfinish = () => {
      ccAnim = null;
      if (!open) cc.hidden = true;
    };
  }

  ccBtn.addEventListener("click", (e) => {
    toggleCC();
    if (e.detail !== 0) glassSlider.blur(); // mouse/touch open: no focus ring; keyboard open keeps focus
  });
  // Track keyboard vs pointer use so focus rings only show for keyboard navigation.
  addEventListener("keydown", (e) => { if (e.key === "Tab") document.documentElement.classList.add("kbd"); }, true);
  addEventListener("pointerdown", () => document.documentElement.classList.remove("kbd"), true);
  addEventListener("pointerdown", (e) => {
    if (!cc.hidden && !cc.contains(e.target) && !ccBtn.contains(e.target)) toggleCC(false);
  }, true);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !cc.hidden) toggleCC(false); });

  /* ---------- Glass light & scroll edges ---------- */
  // The rim highlight on glass surfaces tracks the pointer, like light catching the edge.
  let lightFrame = 0;
  addEventListener("pointermove", (e) => {
    if (lightFrame || reduceMotion) return;
    lightFrame = requestAnimationFrame(() => {
      lightFrame = 0;
      const el = e.target.closest?.(".window, #control-center, .widget");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", e.clientX - r.left + "px");
      el.style.setProperty("--my", e.clientY - r.top + "px");
    });
  }, { passive: true });

  // Content softly dissolves under a toolbar once it has been scrolled.
  addEventListener("scroll", (e) => {
    const t = e.target;
    if (t.classList?.contains("finder-items") || t.classList?.contains("notes-body"))
      t.classList.toggle("scrolled", t.scrollTop > 0);
  }, true);

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

  /* ---------- Boot screen (once per browser session) ---------- */
  function boot(done) {
    const el = document.getElementById("boot");
    let seen = false;
    try { seen = sessionStorage.getItem("booted") === "1"; } catch {}
    if (seen) return el.remove(), done();
    try { sessionStorage.setItem("booted", "1"); } catch {}
    el.querySelector(".boot-logo").appendChild(document.querySelector(".logo-seanos").cloneNode(true));
    const total = reduceMotion ? 600 : 2200;
    el.style.setProperty("--boot-ms", total + "ms");
    el.classList.add("run");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      el.classList.add("out");
      setTimeout(() => (el.remove(), done()), 500);
    };
    const timer = setTimeout(finish, total);
    el.addEventListener("click", finish); // click or any key skips it
    addEventListener("keydown", finish, { once: true });
  }

  boot(() => {
    openFromHash();
    addEventListener("hashchange", openFromHash);
  });
})();
