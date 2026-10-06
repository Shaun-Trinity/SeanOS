(() => {
  const P = window.PORTFOLIO;
  const tpl = document.getElementById("tpl-window");
  const windows = new Map(); // key -> element
  let z = 10;
  let cascade = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isTouch = matchMedia("(hover: none)").matches;

  document.getElementById("dock-linkedin").href = P.linkedin;

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

    const vw = innerWidth, vh = innerHeight - 90;
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

  /* ---------- Desktop icons ---------- */
  const iconsEl = document.getElementById("icons");
  const ordered = [...P.videos.filter((v) => !v.short), ...P.videos.filter((v) => v.short)];

  ordered.forEach((v) => {
    const el = document.createElement("button");
    el.className = "icon" + (v.short ? " short" : "");
    el.setAttribute("role", "listitem");
    el.title = v.title;
    const thumb = v.short
      ? `https://i.ytimg.com/vi/${v.id}/oar2.jpg`
      : `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
    el.innerHTML = `<span class="thumb"><img src="${thumb}" alt="" loading="lazy"></span><span class="label">${esc(v.title)}</span>`;
    const open = () => openVideo(v);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      select(el);
      if (isTouch) open();
    });
    el.addEventListener("dblclick", open);
    el.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), open()));
    iconsEl.appendChild(el);
  });

  function select(el) {
    iconsEl.querySelectorAll(".selected").forEach((s) => s.classList.remove("selected"));
    el?.classList.add("selected");
  }
  document.getElementById("desktop").addEventListener("click", (e) => {
    if (e.target.id === "desktop" || e.target.id === "icons") select(null);
  });

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

  // Deep links: #about, #cv, #contact
  const hash = location.hash.slice(1);
  if (hash === "about" || hash === "cv") openNotes(hash);
  else if (hash === "contact") openMail();
})();
