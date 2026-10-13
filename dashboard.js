// SeanOS owner dashboard: edit portfolio content and publish it with one Save.
// Content is a single object (same shape as data.js); /api/content stores it, uploads go to Vercel Blob
// (or .data/uploads when running locally with `npm run dev`).

const BLOB_CLIENT = "https://cdn.jsdelivr.net/npm/@vercel/blob@2.8.1/client/+esm";
const MAX_UPLOAD = 50 * 1024 * 1024;

const ICONS = {
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21 7.5v9l-5.5-3"/></svg>',
  deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 7v13M15 7v13"/></svg>',
  award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 8l4 4 4-4"/></svg>',
};

/* ---------- Small helpers ---------- */
const $ = (sel) => document.querySelector(sel);
let uid = 0;

// Build elements without innerHTML, so typed text can never become markup.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only ever used with the constant ICONS above
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k.startsWith("aria-") || k.startsWith("data-") || !(k in el)) el.setAttribute(k, v === true ? "" : v);
    else el[k] = v;
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}

const api = (path, options = {}) =>
  fetch(path, { ...options, headers: { "content-type": "application/json", "x-seanos": "1", ...options.headers } });

let toastTimer;
function toast(message, kind = "") {
  const t = $("#toast");
  t.textContent = message;
  t.className = "show " + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = kind), kind === "error" || kind === "warn" ? 6000 : 3200);
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = h("input", { type: "file", accept });
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

const isUpload = (u) => typeof u === "string" && (u.startsWith("/uploads/") || /\.public\.blob\.vercel-storage\.com\//.test(u));

/* ---------- State ---------- */
let session = null;
let state = null;      // the content being edited
let snapshot = "";     // last saved version, for "unsaved changes"
let everSaved = true;  // false until the first save (content came from data.js)
const removedUploads = new Set(); // files to delete after the next successful save
const openSections = new Set(["videos"]);

// Transient editor fields start with "_" and are never saved.
const serialize = (c) => JSON.stringify(c, (k, v) => (k.startsWith("_") ? undefined : v));

function normalize(c) {
  const base = window.PORTFOLIO || {};
  const out = { ...base, ...c };
  for (const k of ["roles", "languages", "experiences", "videoTools", "otherTools", "videos", "presentations"]) out[k] = Array.isArray(out[k]) ? out[k] : [];
  out.folders = (base.folders || []).map((f) => ({ ...f, ...(out.folders || []).find((x) => x.id === f.id) }));
  return structuredClone(out);
}

function changed() {
  setStatus(serialize(state) === snapshot && everSaved ? "saved" : "dirty");
}

function setStatus(kind) {
  const pill = $("#status");
  const labels = { saved: "Published", dirty: everSaved ? "Unsaved changes" : "Not published yet", saving: "Saving…" };
  pill.textContent = labels[kind] || kind;
  pill.className = "pill " + kind;
  $("#save").disabled = kind !== "dirty";
}

/* ---------- Uploads ---------- */
async function uploadFile(file, kind, onProgress) {
  if (file.size > MAX_UPLOAD) throw new Error("That file is larger than 50 MB.");
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "file";
  const pathname = `uploads/${kind}/${Date.now()}-${safe}`;
  if (session.storage === "local") {
    const r = await fetch(`/api/upload?name=${encodeURIComponent(pathname)}`, {
      method: "POST",
      headers: { "content-type": file.type, "x-seanos": "1" },
      body: file,
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) return expired();
    if (!r.ok) throw new Error(d.error || "Upload failed");
    onProgress?.(100);
    return d.url;
  }
  const { upload } = await import(BLOB_CLIENT);
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    headers: { "x-seanos": "1" },
    contentType: file.type,
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: (e) => onProgress?.(e.percentage),
  });
  return blob.url;
}

function expired() {
  toast("Your session has ended. Please log in again.", "error");
  setTimeout(() => location.replace("/#login"), 1200);
  throw new Error("Not signed in");
}

/* ---------- Shared bits of UI ---------- */
function textField(label, get, set, opts = {}) {
  const input = opts.multiline
    ? h("textarea", { rows: opts.rows || 6 })
    : h("input", { type: opts.type || "text", placeholder: opts.placeholder || "", autocomplete: "off", spellcheck: opts.type ? false : true });
  input.value = get() ?? "";
  input.addEventListener("input", () => {
    set(input.value);
    changed();
    opts.onInput?.();
  });
  return h("label", { class: "field" }, h("span", { class: "field-label" }, label), input, opts.hint && h("small", {}, opts.hint));
}

function plainInput(value, set, placeholder, type = "text") {
  const input = h("input", { type, placeholder, autocomplete: "off" });
  input.value = value ?? "";
  input.addEventListener("input", () => {
    set(input.value);
    changed();
  });
  return input;
}

function folderSelect(value, set, label = "Folder") {
  const sel = h("select", { class: "folder", "aria-label": label },
    state.folders.map((f) => h("option", { value: f.id, selected: f.id === value }, f.name)));
  sel.addEventListener("change", () => {
    set(sel.value);
    changed();
  });
  return sel;
}

function iconBtn(label, text, onclick, { disabled = false, danger = false } = {}) {
  return h("button", { type: "button", class: "icon-btn" + (danger ? " danger" : ""), title: label, "aria-label": label, disabled, onclick }, text);
}

// Up / down / remove for a row in an array.
function rowActions(arr, i, section, onRemove) {
  const move = (d) => () => {
    [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
    changed();
    render(section);
  };
  return h("div", { class: "row-actions" },
    iconBtn("Move up", "↑", move(-1), { disabled: i === 0 }),
    iconBtn("Move down", "↓", move(1), { disabled: i === arr.length - 1 }),
    iconBtn("Remove", "✕", () => {
      onRemove?.(arr[i]);
      arr.splice(i, 1);
      changed();
      render(section);
    }, { danger: true }));
}

// Editable list of short strings shown as chips (tools, languages).
function chipList(label, arr, hint) {
  const wrap = h("div", { class: "chips" });
  const input = h("input", { type: "text", placeholder: "Type and press Enter", "aria-label": `Add to ${label}` });
  const draw = () => {
    wrap.replaceChildren(
      ...arr.map((item, i) => h("span", { class: "chip" }, item,
        h("button", { type: "button", "aria-label": `Remove ${item}`, onclick: () => { arr.splice(i, 1); changed(); draw(); } }, "✕"))),
      input);
  };
  const add = () => {
    const v = input.value.trim();
    if (v && !arr.includes(v)) arr.push(v), changed();
    input.value = "";
    draw();
    input.focus();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") e.preventDefault(), add();
    else if (e.key === "Backspace" && !input.value && arr.length) arr.pop(), changed(), draw(), input.focus();
  });
  input.addEventListener("blur", () => input.value.trim() && add());
  draw();
  return h("div", { class: "field" }, h("span", { class: "field-label" }, label), wrap, hint && h("small", {}, hint));
}

/* ---------- Videos ---------- */
const ytThumb = (v) => `https://i.ytimg.com/vi/${v.id}/${v.short ? "oar2" : "hqdefault"}.jpg`;
function videoLink(v) {
  if (v.link) return v.link;
  if (!v.id) return "";
  return v.platform === "tiktok" ? `https://www.tiktok.com/@/video/${v.id}` : v.short ? `https://youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`;
}

function videoThumb(v) {
  const box = h("div", { class: "thumb" + (v.short ? " tall" : "") });
  const src = v.cover || (v.id && v.platform !== "tiktok" ? ytThumb(v) : "");
  box.append(src ? h("img", { src, alt: "" }) : h("span", { html: ICONS.video }));
  return box;
}

async function resolveVideo(v, link, btn) {
  if (!link.trim()) return toast("Paste a YouTube or TikTok link first.", "warn");
  btn.disabled = true;
  btn.textContent = "Getting…";
  try {
    const r = await fetch(`/api/resolve?url=${encodeURIComponent(link.trim())}`);
    if (r.status === 401) return expired();
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Couldn't get that video");
    const isNew = !v.id || v.id !== d.id;
    if (v.cover && v.cover !== d.cover && isNew) removedUploads.add(v.cover), delete v.cover;
    Object.assign(v, { id: d.id, link: link.trim(), short: !!d.short });
    if (d.platform === "tiktok") v.platform = "tiktok";
    else delete v.platform;
    if (d.cover) v.cover = d.cover;
    if (d.title && (isNew || !v.title)) v.title = d.title;
    if (isNew) v.folder = d.short ? "short-form" : "long-form";
    delete v._link;
    changed();
    render("videos");
    toast(d.warning || "Got it. Check the title and folder, then Save.", d.warning ? "warn" : "");
  } catch (e) {
    if (e.message !== "Not signed in") toast(e.message, "error");
    btn.disabled = false;
    btn.textContent = "Get";
  }
}

function videoRow(v, i) {
  const link = h("input", { type: "url", placeholder: "Paste a YouTube or TikTok link", "aria-label": `Video ${i + 1} link` });
  link.value = v._link ?? videoLink(v);
  link.addEventListener("input", () => (v._link = link.value));
  const get = h("button", { type: "button", class: "btn small", onclick: () => resolveVideo(v, link.value, get) }, "Get");
  link.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), get.click()));

  const cover = h("button", { type: "button", class: "btn small", title: "Use your own thumbnail image" }, v.cover ? "Change cover" : "Add cover");
  cover.onclick = async () => {
    const file = await pickFile("image/jpeg,image/png,image/webp");
    if (!file) return;
    cover.disabled = true;
    cover.textContent = "Uploading…";
    try {
      const url = await uploadFile(file, "covers");
      if (isUpload(v.cover)) removedUploads.add(v.cover);
      v.cover = url;
      changed();
      render("videos");
    } catch (e) {
      if (e.message !== "Not signed in") toast(e.message, "error");
      cover.disabled = false;
      cover.textContent = "Add cover";
    }
  };

  const kind = !v.id ? "Not fetched yet: press Get" : v.platform === "tiktok" ? "TikTok video" : v.short ? "YouTube Short" : "YouTube video";
  return h("div", { class: "row" },
    h("span", { class: "num" }, "#" + (i + 1)),
    videoThumb(v),
    h("div", { class: "row-main" },
      h("div", { class: "line" }, link, get, rowActions(state.videos, i, "videos", (x) => isUpload(x.cover) && removedUploads.add(x.cover))),
      h("div", { class: "line" }, plainInput(v.title, (val) => (v.title = val), "Title", "text"), folderSelect(v.folder, (val) => (v.folder = val))),
      h("div", { class: "line" }, h("span", { class: "meta" + (v.id ? "" : " warn") }, kind), h("span", { style: "flex:1" }), cover)));
}

function renderVideos() {
  return [
    h("div", { class: "rows" }, state.videos.length ? state.videos.map(videoRow) : h("p", { class: "empty" }, "No videos yet.")),
    h("button", {
      type: "button", class: "btn add",
      onclick: () => {
        state.videos.push({ id: "", title: "", folder: "long-form", _link: "" });
        changed();
        render("videos");
        [...document.querySelectorAll('#sec-videos input[type="url"]')].pop()?.focus();
      },
    }, "+ Add video"),
  ];
}

/* ---------- Presentations ---------- */
function deckRow(p, i) {
  const cover = h("button", { type: "button", class: "btn small" }, p.cover ? "Change cover" : "Add cover");
  cover.onclick = async () => {
    const file = await pickFile("image/jpeg,image/png,image/webp");
    if (!file) return;
    try {
      const url = await uploadFile(file, "covers");
      if (isUpload(p.cover)) removedUploads.add(p.cover);
      p.cover = url;
      changed();
      render("decks");
    } catch (e) {
      if (e.message !== "Not signed in") toast(e.message, "error");
    }
  };
  const thumb = h("div", { class: "thumb" }, p.cover ? h("img", { src: p.cover, alt: "" }) : h("span", { html: ICONS.pdf }));
  const src = p.pdf || p.slides?.[0];
  return h("div", { class: "row" },
    h("span", { class: "num" }, "#" + (i + 1)),
    thumb,
    h("div", { class: "row-main" },
      h("div", { class: "line" }, plainInput(p.title, (val) => (p.title = val), "Presentation title"),
        rowActions(state.presentations, i, "decks", (x) => [x.pdf, x.cover].filter(isUpload).forEach((u) => removedUploads.add(u)))),
      h("div", { class: "line" }, folderSelect(p.folder || "case-studies", (val) => (p.folder = val)),
        h("span", { style: "flex:1" }),
        src && h("a", { class: "btn small", href: src, target: "_blank", rel: "noopener" }, p.pdf ? "Open PDF ↗" : "Open slides ↗"),
        cover)));
}

function renderDecks() {
  const input = h("input", { type: "file", accept: "application/pdf" });
  const progress = h("div", { class: "progress", hidden: true }, h("i"));
  const zone = h("label", { class: "dropzone" },
    input, h("span", { html: ICONS.upload }),
    h("span", {}, h("b", {}, "Drop a PDF here"), " or click to choose"),
    h("small", {}, "In PowerPoint or Keynote: File › Export › PDF. Up to 50 MB."));

  async function add(file) {
    if (!file) return;
    if (file.type !== "application/pdf") return toast("Please choose a PDF file.", "error");
    progress.hidden = false;
    zone.style.pointerEvents = "none";
    try {
      const url = await uploadFile(file, "decks", (pct) => (progress.firstChild.style.width = pct + "%"));
      state.presentations.push({
        title: file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim(),
        pdf: url,
        folder: "case-studies",
      });
      changed();
      render("decks");
      toast("Uploaded. Give it a title, then Save to publish.");
    } catch (e) {
      if (e.message !== "Not signed in") toast(e.message, "error");
      progress.hidden = true;
      zone.style.pointerEvents = "";
    }
  }
  input.onchange = () => add(input.files[0]);
  zone.addEventListener("dragover", (e) => (e.preventDefault(), zone.classList.add("over")));
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("over");
    add(e.dataTransfer.files[0]);
  });

  return [
    zone, progress,
    h("div", { class: "rows" }, state.presentations.length ? state.presentations.map(deckRow) : h("p", { class: "empty" }, "No presentations yet.")),
  ];
}

/* ---------- Profile, roles, experience, skills, contact, widgets, folders ---------- */
function renderProfile() {
  return [
    h("div", { class: "grid2" },
      textField("Name", () => state.name, (v) => (state.name = v)),
      textField("Location", () => state.location, (v) => (state.location = v), { placeholder: "e.g. Johannesburg" })),
    textField("Bio", () => state.bio, (v) => (state.bio = v), { multiline: true, rows: 7, hint: "Shown in the About me window." }),
  ];
}

function renderRoles() {
  return [
    h("div", { class: "rows" }, state.roles.length
      ? state.roles.map((r, i) => h("div", { class: "row simple" },
        plainInput(r, (v) => (state.roles[i] = v), "e.g. Video Editor"),
        rowActions(state.roles, i, "roles")))
      : h("p", { class: "empty" }, "No roles yet.")),
    h("button", { type: "button", class: "btn add", onclick: () => { state.roles.push(""); changed(); render("roles"); } }, "+ Add role"),
  ];
}

function renderExperience() {
  return [
    h("div", { class: "rows" }, state.experiences.length
      ? state.experiences.map((x, i) => h("div", { class: "row simple" },
        h("div", { class: "line" },
          plainInput(x.title, (v) => (x.title = v), "Position / role"),
          plainInput(x.company, (v) => (x.company = v), "Company"),
          (() => {
            const y = plainInput(x.year ?? "", (v) => (x.year = v ? Number(v) : null), "Year", "number");
            y.style.flex = "0 0 100px";
            return y;
          })()),
        rowActions(state.experiences, i, "experience")))
      : h("p", { class: "empty" }, "No experience yet.")),
    h("button", { type: "button", class: "btn add", onclick: () => { state.experiences.push({ title: "", company: "", year: new Date().getFullYear() }); changed(); render("experience"); } }, "+ Add experience"),
    h("p", { class: "meta" }, "Your CV lists these newest first."),
  ];
}

function renderSkills() {
  return [
    chipList("Video tools", state.videoTools),
    chipList("Design & AI tools", state.otherTools),
    chipList("Languages", state.languages),
  ];
}

function renderContact() {
  return [
    h("div", { class: "grid2" },
      textField("Email", () => state.email, (v) => (state.email = v), { type: "email" }),
      textField("Phone", () => state.phone, (v) => (state.phone = v), { type: "tel", placeholder: "+27…" })),
    textField("LinkedIn", () => state.linkedin, (v) => (state.linkedin = v), { type: "url", placeholder: "https://linkedin.com/in/…" }),
    textField("Booking link", () => state.bookingUrl, (v) => (state.bookingUrl = v), {
      type: "url", placeholder: "https://calendar.com/your-name", hint: "Opens when visitors click the calendar widget.",
    }),
  ];
}

function renderWidgets() {
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch {}
  const list = h("datalist", { id: "tz-list" }, zones.map((z) => h("option", { value: z })));
  const tz = textField("Time zone", () => state.timeZone, (v) => (state.timeZone = v), { placeholder: "Africa/Johannesburg", hint: "Your local time is shown on the clock widget." });
  tz.querySelector("input").setAttribute("list", "tz-list");
  return [
    list,
    h("div", { class: "grid2" }, tz,
      textField("City code", () => state.cityCode, (v) => (state.cityCode = v.toUpperCase()), { placeholder: "JHB", hint: "Up to 4 letters, shown on the clock." })),
  ];
}

function renderFolders() {
  return h("div", { class: "rows" }, state.folders.map((f) => {
    const icon = h("button", { type: "button", class: "btn small" }, "Change icon");
    icon.onclick = async () => {
      const file = await pickFile("image/png,image/webp,image/jpeg");
      if (!file) return;
      try {
        const url = await uploadFile(file, "folders");
        if (isUpload(f.icon)) removedUploads.add(f.icon);
        f.icon = url;
        changed();
        render("folders");
      } catch (e) {
        if (e.message !== "Not signed in") toast(e.message, "error");
      }
    };
    return h("div", { class: "folder-row" },
      f.icon ? h("img", { src: f.icon, alt: "" }) : h("span", { class: "thumb", html: ICONS.folder }),
      plainInput(f.name, (v) => (f.name = v), "Folder name"),
      icon);
  }));
}

/* ---------- Sections ---------- */
const SECTIONS = [
  { id: "videos", title: "Video Portfolio", icon: ICONS.video, tone: "red", render: renderVideos,
    sub: () => `${state.videos.length} video${state.videos.length === 1 ? "" : "s"} · paste a YouTube or TikTok link and press Get` },
  { id: "decks", title: "Presentations", icon: ICONS.deck, tone: "orange", render: renderDecks,
    sub: () => `${state.presentations.length} in your folders · upload PDF decks for Case Studies` },
  { id: "profile", title: "Profile Information", icon: ICONS.user, tone: "blue", render: renderProfile, sub: "Your name, location and bio" },
  { id: "roles", title: "Professional Roles", icon: ICONS.users, tone: "indigo", render: renderRoles, sub: "Shown as a ticked list in About me" },
  { id: "experience", title: "Professional Experience", icon: ICONS.briefcase, tone: "orange", render: renderExperience, sub: "The roles in your CV" },
  { id: "skills", title: "Skills & Expertise", icon: ICONS.award, tone: "purple", render: renderSkills, sub: "Your tools and languages" },
  { id: "contact", title: "Social & Contact", icon: ICONS.link, tone: "pink", render: renderContact, sub: "Email, phone, LinkedIn and booking link" },
  { id: "widgets", title: "Clock & Calendar", icon: ICONS.clock, tone: "teal", render: renderWidgets, sub: "Your time zone for the desktop widgets" },
  { id: "folders", title: "Folders", icon: ICONS.folder, tone: "slate", render: renderFolders, sub: "Rename the desktop folders or change their icons" },
];
const sectionEls = {};

function render(id) {
  const s = SECTIONS.find((x) => x.id === id);
  const els = sectionEls[id];
  els.body.replaceChildren(...[s.render()].flat());
  els.sub.textContent = typeof s.sub === "function" ? s.sub() : s.sub;
}

function toggleSection(id, open = !openSections.has(id)) {
  open ? openSections.add(id) : openSections.delete(id);
  sectionEls[id].card.classList.toggle("open", open);
  sectionEls[id].head.setAttribute("aria-expanded", open);
}

function buildAll() {
  const main = $("#sections"), nav = $("#nav");
  main.replaceChildren();
  nav.replaceChildren();
  for (const s of SECTIONS) {
    const sub = h("span");
    const body = h("div", { class: "card-body", id: `body-${s.id}` });
    const head = h("button", { type: "button", class: "card-head", "aria-controls": `body-${s.id}`, onclick: () => toggleSection(s.id) },
      h("span", { class: `tile tone-${s.tone}`, html: s.icon }),
      h("span", { class: "card-title" }, h("b", {}, s.title), sub),
      h("span", { html: ICONS.chev }));
    const card = h("section", { class: "card", id: `sec-${s.id}` }, head, body);
    sectionEls[s.id] = { card, body, sub, head };
    main.append(card);
    render(s.id);
    toggleSection(s.id, openSections.has(s.id));
    nav.append(h("li", {}, h("button", {
      type: "button", "data-sec": s.id, html: s.icon,
      onclick: () => {
        toggleSection(s.id, true);
        card.scrollIntoView({ block: "start" });
      },
    }, s.title)));
  }
  // Highlight the section in view in the side menu.
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      const id = e.target.id.slice(4);
      nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.sec === id));
    }
  }, { rootMargin: "-90px 0px -60% 0px" });
  Object.values(sectionEls).forEach(({ card }) => spy.observe(card));
}

/* ---------- Save ---------- */
async function save() {
  const missing = state.videos.map((v, i) => (!v.id ? i + 1 : 0)).filter(Boolean);
  if (missing.length) {
    toggleSection("videos", true);
    $("#sec-videos").scrollIntoView({ block: "start" });
    return toast(`Video #${missing.join(", #")} has no video yet. Paste a link and press Get, or remove it.`, "error");
  }
  setStatus("saving");
  try {
    const r = await api("/api/content", { method: "PUT", body: serialize(state) });
    if (r.status === 401) return expired();
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Couldn't save");
    state = normalize(d.content);
    snapshot = serialize(state);
    everSaved = true;
    // Delete uploads that were replaced or removed and aren't used any more.
    const gone = [...removedUploads].filter((u) => !snapshot.includes(u));
    removedUploads.clear();
    if (gone.length) api("/api/delete", { method: "POST", body: JSON.stringify({ urls: gone }) }).catch(() => {});
    buildAll();
    setStatus("saved");
    toast("Saved. Your live site updates within a minute.");
  } catch (e) {
    if (e.message === "Not signed in") return;
    setStatus("dirty");
    toast(e.message, "error");
  }
}

/* ---------- Start ---------- */
async function start() {
  $(".brand-logo").innerHTML = '<svg viewBox="0 0 754 1136" fill="currentColor"><g transform="matrix(1,0,0,1,-2963.32125,-389.850192)"><g transform="matrix(4.166667,0,0,4.166667,2262,0)"><g transform="matrix(1.739946,0,0,1.739946,293.993375,261.44645)"><path d="M0,-36.859L-6.787,-30.674L7.842,-14.621C22.402,1.357 21.248,26.203 5.27,40.763C-2.471,47.817 -12.515,51.434 -22.954,50.948C-33.415,50.462 -43.061,45.932 -50.114,38.191L-59.26,28.155L-49.069,18.869L-40.476,28.299C-35.902,33.317 -29.649,36.254 -22.867,36.569C-22.464,36.587 -22.062,36.597 -21.661,36.597C-15.318,36.597 -9.288,34.266 -4.569,29.966C0.449,25.393 3.387,19.14 3.701,12.357C4.017,5.576 1.671,-0.923 -2.901,-5.941L-16.902,-21.305L-16.931,-21.28L-30.852,-36.557C-33.772,-39.762 -35.271,-43.914 -35.069,-48.245C-34.868,-52.577 -32.992,-56.571 -29.786,-59.493C-26.582,-62.413 -22.438,-63.907 -18.099,-63.711C-13.767,-63.509 -9.772,-61.633 -6.852,-58.428L1.742,-48.998L1.688,-48.949L7.872,-42.162L31.69,-63.866L16.36,-80.69C7.655,-90.243 -4.249,-95.834 -17.16,-96.434C-30.061,-97.032 -42.442,-92.568 -51.995,-83.863C-61.549,-75.158 -67.14,-63.254 -67.739,-50.343C-68.339,-37.432 -63.874,-25.061 -55.169,-15.508L-40.541,0.545L-33.754,-5.639L-48.382,-21.692C-55.436,-29.433 -59.053,-39.456 -58.567,-49.917C-58.081,-60.378 -53.551,-70.023 -45.812,-77.076C-38.07,-84.13 -28.048,-87.744 -17.586,-87.261C-7.125,-86.776 2.521,-82.246 9.573,-74.505L18.72,-64.469L8.529,-55.182L-0.064,-64.612C-4.638,-69.63 -10.891,-72.567 -17.673,-72.882C-24.453,-73.199 -30.953,-70.852 -35.971,-66.279C-40.989,-61.707 -43.927,-55.453 -44.241,-48.671C-44.557,-41.889 -42.211,-35.391 -37.639,-30.373L-23.639,-15.008L-23.61,-15.034L-9.688,0.244C-6.768,3.449 -5.27,7.6 -5.471,11.932C-5.672,16.264 -7.548,20.258 -10.753,23.179C-13.959,26.099 -18.114,27.598 -22.441,27.397C-26.773,27.196 -30.768,25.32 -33.688,22.114L-42.282,12.684L-42.229,12.635L-48.412,5.848L-72.23,27.553L-56.901,44.376C-48.195,53.929 -36.291,59.52 -23.381,60.12C-22.612,60.156 -21.847,60.173 -21.083,60.173C-9.009,60.173 2.47,55.737 11.454,47.55C31.175,29.579 32.599,-1.085 14.629,-20.806L0,-36.859Z"/></g></g></g></svg>';
  $(".site-url").textContent = location.host;

  try {
    session = await (await fetch("/api/session", { cache: "no-store" })).json();
  } catch {
    session = null;
  }
  if (!session?.signedIn) return location.replace("/#login");

  const r = await fetch("/api/content?draft=1", { cache: "no-store" });
  if (r.ok) {
    state = normalize(await r.json());
  } else {
    state = normalize(window.PORTFOLIO || {}); // first run: start from the built-in content
    everSaved = false;
  }
  snapshot = everSaved ? serialize(state) : "";
  buildAll();
  changed();
  if (!everSaved) toast("This is your current site content. Press Save once to start managing it here.");

  $("#save").onclick = save;
  $("#logout").onclick = async () => {
    if (!$("#save").disabled && !confirm("You have unsaved changes. Log out anyway?")) return;
    await api("/api/logout", { method: "POST" });
    snapshot = serialize(state); // don't trigger the leave warning
    everSaved = true;
    location.href = "/";
  };
  addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (!$("#save").disabled) save();
    }
  });
  addEventListener("beforeunload", (e) => {
    if (!$("#save").disabled) e.preventDefault();
  });
}

start();
