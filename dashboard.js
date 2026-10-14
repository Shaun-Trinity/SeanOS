// SeanOS owner dashboard, laid out like macOS System Settings: a sidebar of sections and one page at a time.
// Content is a single object (same shape as data.js); /api/content stores it, uploads go to Vercel Blob
// (or .data/uploads when running locally with `npm run dev`).

const BLOB_CLIENT = "https://cdn.jsdelivr.net/npm/@vercel/blob@2.8.1/client/+esm";
const MAX_UPLOAD = 50 * 1024 * 1024;

const LOGO = '<svg viewBox="0 0 754 1136" fill="currentColor"><g transform="matrix(1,0,0,1,-2963.32125,-389.850192)"><g transform="matrix(4.166667,0,0,4.166667,2262,0)"><g transform="matrix(1.739946,0,0,1.739946,293.993375,261.44645)"><path d="M0,-36.859L-6.787,-30.674L7.842,-14.621C22.402,1.357 21.248,26.203 5.27,40.763C-2.471,47.817 -12.515,51.434 -22.954,50.948C-33.415,50.462 -43.061,45.932 -50.114,38.191L-59.26,28.155L-49.069,18.869L-40.476,28.299C-35.902,33.317 -29.649,36.254 -22.867,36.569C-22.464,36.587 -22.062,36.597 -21.661,36.597C-15.318,36.597 -9.288,34.266 -4.569,29.966C0.449,25.393 3.387,19.14 3.701,12.357C4.017,5.576 1.671,-0.923 -2.901,-5.941L-16.902,-21.305L-16.931,-21.28L-30.852,-36.557C-33.772,-39.762 -35.271,-43.914 -35.069,-48.245C-34.868,-52.577 -32.992,-56.571 -29.786,-59.493C-26.582,-62.413 -22.438,-63.907 -18.099,-63.711C-13.767,-63.509 -9.772,-61.633 -6.852,-58.428L1.742,-48.998L1.688,-48.949L7.872,-42.162L31.69,-63.866L16.36,-80.69C7.655,-90.243 -4.249,-95.834 -17.16,-96.434C-30.061,-97.032 -42.442,-92.568 -51.995,-83.863C-61.549,-75.158 -67.14,-63.254 -67.739,-50.343C-68.339,-37.432 -63.874,-25.061 -55.169,-15.508L-40.541,0.545L-33.754,-5.639L-48.382,-21.692C-55.436,-29.433 -59.053,-39.456 -58.567,-49.917C-58.081,-60.378 -53.551,-70.023 -45.812,-77.076C-38.07,-84.13 -28.048,-87.744 -17.586,-87.261C-7.125,-86.776 2.521,-82.246 9.573,-74.505L18.72,-64.469L8.529,-55.182L-0.064,-64.612C-4.638,-69.63 -10.891,-72.567 -17.673,-72.882C-24.453,-73.199 -30.953,-70.852 -35.971,-66.279C-40.989,-61.707 -43.927,-55.453 -44.241,-48.671C-44.557,-41.889 -42.211,-35.391 -37.639,-30.373L-23.639,-15.008L-23.61,-15.034L-9.688,0.244C-6.768,3.449 -5.27,7.6 -5.471,11.932C-5.672,16.264 -7.548,20.258 -10.753,23.179C-13.959,26.099 -18.114,27.598 -22.441,27.397C-26.773,27.196 -30.768,25.32 -33.688,22.114L-42.282,12.684L-42.229,12.635L-48.412,5.848L-72.23,27.553L-56.901,44.376C-48.195,53.929 -36.291,59.52 -23.381,60.12C-22.612,60.156 -21.847,60.173 -21.083,60.173C-9.009,60.173 2.47,55.737 11.454,47.55C31.175,29.579 32.599,-1.085 14.629,-20.806L0,-36.859Z"/></g></g></g></svg>';

const ICONS = {
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21 7.5v9l-5.5-3"/></svg>',
  deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 7v13M15 7v13"/></svg>',
  award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
  up: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15V5M5.5 9.5 10 5l4.5 4.5"/></svg>',
  down: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5v10M5.5 10.5 10 15l4.5-4.5"/></svg>',
  remove: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="currentColor"/><path d="M6.5 10h7" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>',
  alert: '<svg viewBox="0 0 20 20"><path d="M10 4.5v7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="10" cy="15" r="1.4" fill="currentColor"/></svg>',
};

/* ---------- Small helpers ---------- */
const $ = (sel) => document.querySelector(sel);

// Build elements without innerHTML, so typed text can never become markup.
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only ever used with the constant ICONS / LOGO above
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k.startsWith("aria-") || k.startsWith("data-") || !(k in el)) el.setAttribute(k, v === true ? "" : v);
    else el[k] = v;
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}

const api = (path, options = {}) =>
  fetch(path, { ...options, headers: { "content-type": "application/json", "x-seanos": "1", ...options.headers } });

// macOS-style notification banner in the top-right corner.
function toast(message, kind = "") {
  const box = $("#toasts");
  const note = h("div", { class: "toast " + kind, role: kind === "error" ? "alert" : "status" },
    h("span", { class: "toast-icon", html: kind ? ICONS.alert : LOGO }),
    h("div", {}, h("b", {}, "System Settings"), h("span", {}, message)));
  box.append(note);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => {
    note.classList.add("out");
    setTimeout(() => note.remove(), 300);
  }, kind === "error" || kind === "warn" ? 6000 : 3200);
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
let leaving = false;   // set when logging out, so the page doesn't ask to stay
const removedUploads = new Set(); // files to delete after the next successful save

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
  const badge = $("#status");
  const labels = { saved: "Published", dirty: everSaved ? "Unsaved changes" : "Not published yet", saving: "Saving…" };
  badge.textContent = labels[kind] || kind;
  badge.className = "badge " + kind;
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

/* ---------- Building blocks: grouped boxes and rows, like System Settings ---------- */
const group = (...kids) => h("div", { class: "group" }, ...kids);
const sec = (title, body, foot) => h("section", { class: "sec" }, title && h("h4", { class: "sec-title" }, title), body, foot && h("p", { class: "foot" }, foot));
const label = (text, hint) => h("span", { class: "row-label" }, text, hint && h("small", {}, hint));
const adder = (text, onclick) => h("div", { class: "adder" }, h("button", { type: "button", class: "push", onclick }, text));
const focusLast = () => [...$("#page").querySelectorAll("input:not([type=file])")].pop()?.focus();

function textField(text, get, set, opts = {}) {
  const input = opts.multiline
    ? h("textarea", { rows: opts.rows || 6 })
    : h("input", { type: opts.type || "text", class: "ctl", placeholder: opts.placeholder || "", autocomplete: "off", spellcheck: opts.type ? false : true });
  input.value = get() ?? "";
  input.addEventListener("input", () => {
    set(input.value);
    changed();
  });
  return h("label", { class: "row" + (opts.multiline ? " stack" : "") }, label(text, opts.hint), input);
}

function plainInput(value, set, placeholder, type = "text") {
  const input = h("input", { type, class: "ctl", placeholder, "aria-label": placeholder, autocomplete: "off" });
  input.value = value ?? "";
  input.addEventListener("input", () => {
    set(input.value);
    changed();
  });
  return input;
}

function folderSelect(value, set, text = "Folder") {
  const sel = h("select", { "aria-label": text },
    state.folders.map((f) => h("option", { value: f.id, selected: f.id === value }, f.name)));
  sel.addEventListener("change", () => {
    set(sel.value);
    changed();
  });
  return sel;
}

function iconBtn(text, icon, onclick, { disabled = false, danger = false } = {}) {
  return h("button", { type: "button", class: "ibtn" + (danger ? " remove" : ""), title: text, "aria-label": text, disabled, onclick, html: icon });
}

// Up / down / remove for a row in an array.
function rowActions(arr, i, section, onRemove) {
  const move = (d) => () => {
    [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
    changed();
    render(section);
  };
  return h("div", { class: "acts" },
    iconBtn("Move up", ICONS.up, move(-1), { disabled: i === 0 }),
    iconBtn("Move down", ICONS.down, move(1), { disabled: i === arr.length - 1 }),
    iconBtn("Remove", ICONS.remove, () => {
      onRemove?.(arr[i]);
      arr.splice(i, 1);
      changed();
      render(section);
    }, { danger: true }));
}

// Editable list of short strings shown as tokens (tools, languages).
function tokenList(title, arr, foot) {
  const wrap = h("div", { class: "tokens" });
  const input = h("input", { type: "text", placeholder: "Type and press Enter", "aria-label": `Add to ${title}` });
  const draw = () => {
    wrap.replaceChildren(
      ...arr.map((item, i) => h("span", { class: "token" }, item,
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
  wrap.addEventListener("click", (e) => e.target === wrap && input.focus());
  draw();
  return sec(title, group(h("div", { class: "row stack" }, wrap)), foot);
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

function videoItem(v, i) {
  const link = h("input", { type: "url", placeholder: "Paste a YouTube or TikTok link", "aria-label": `Video ${i + 1} link` });
  link.value = v._link ?? videoLink(v);
  link.addEventListener("input", () => (v._link = link.value));
  const get = h("button", { type: "button", class: "push", onclick: () => resolveVideo(v, link.value, get) }, "Get");
  link.addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), get.click()));

  const cover = h("button", { type: "button", class: "push", title: "Use your own thumbnail image" }, v.cover ? "Change…" : "Add Cover…");
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
      cover.textContent = "Add Cover…";
    }
  };

  const kind = !v.id ? "Not fetched yet: press Get" : v.platform === "tiktok" ? "TikTok video" : v.short ? "YouTube Short" : "YouTube video";
  const coverNote = v.cover ? "Saved image" : v.id && v.platform !== "tiktok" ? "YouTube thumbnail" : "No cover yet";
  const title = h("b", {}, v.title || "Untitled video");
  return group(
    h("div", { class: "item-head" },
      videoThumb(v),
      h("div", { class: "item-title" }, title, h("span", { class: v.id ? "" : "warn" }, `#${i + 1} · ${kind}`)),
      rowActions(state.videos, i, "videos", (x) => isUpload(x.cover) && removedUploads.add(x.cover))),
    h("div", { class: "row" }, label("Link"), h("div", { class: "ctl combo" }, link, get)),
    h("label", { class: "row" }, label("Title"), plainInput(v.title, (val) => {
      v.title = val;
      title.textContent = val || "Untitled video";
    }, "Video title")),
    h("label", { class: "row" }, label("Folder"), folderSelect(v.folder, (val) => (v.folder = val))),
    h("div", { class: "row" }, label("Cover", coverNote), cover),
  );
}

function renderVideos() {
  const add = () => {
    state.videos.push({ id: "", title: "", folder: "long-form", _link: "" });
    changed();
    render("videos");
    [...$("#page").querySelectorAll('input[type="url"]')].pop()?.focus();
  };
  return [
    h("div", { class: "adder top" }, h("button", { type: "button", class: "push", onclick: add }, "Add Video…")),
    state.videos.length ? state.videos.map((v, i) => h("div", { class: "item" }, videoItem(v, i))) : sec(null, group(h("p", { class: "empty" }, "No videos yet."))),
    state.videos.length > 2 && adder("Add Video…", add),
  ];
}

/* ---------- Presentations ---------- */
function deckItem(p, i) {
  const cover = h("button", { type: "button", class: "push" }, p.cover ? "Change…" : "Add Cover…");
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
  const title = h("b", {}, p.title || "Untitled presentation");
  return group(
    h("div", { class: "item-head" },
      thumb,
      h("div", { class: "item-title" }, title, h("span", {}, `#${i + 1} · ${p.pdf ? "PDF deck" : `${p.slides?.length || 0} slides`}`)),
      src && h("a", { class: "push", href: src, target: "_blank", rel: "noopener" }, "Open ↗"),
      rowActions(state.presentations, i, "decks", (x) => [x.pdf, x.cover].filter(isUpload).forEach((u) => removedUploads.add(u)))),
    h("label", { class: "row" }, label("Title"), plainInput(p.title, (val) => {
      p.title = val;
      title.textContent = val || "Untitled presentation";
    }, "Presentation title")),
    h("label", { class: "row" }, label("Folder"), folderSelect(p.folder || "case-studies", (val) => (p.folder = val))),
    h("div", { class: "row" }, label("Cover", p.cover ? "Saved image" : "First page of the deck"), cover),
  );
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
    sec("Add a presentation", group(zone, progress)),
    state.presentations.length
      ? sec("Your presentations", state.presentations.map((p, i) => h("div", { class: "item" }, deckItem(p, i))))
      : sec("Your presentations", group(h("p", { class: "empty" }, "No presentations yet."))),
  ];
}

/* ---------- Profile, roles, experience, skills, contact, widgets, folders ---------- */
function renderProfile() {
  return [
    sec(null, group(
      textField("Name", () => state.name, (v) => {
        state.name = v;
        updateNav();
      }),
      textField("Location", () => state.location, (v) => (state.location = v), { placeholder: "Johannesburg" }))),
    sec(null, group(textField("Bio", () => state.bio, (v) => (state.bio = v), { multiline: true, rows: 8 })), "Shown in the About me window on your site."),
    sec(null, group(h("div", { class: "row" }, label("Website", location.host),
      h("a", { class: "push", href: "/", target: "_blank", rel: "noopener" }, "View Site ↗")))),
    h("div", { class: "signout" }, h("button", { type: "button", class: "push", onclick: logout }, "Log Out…")),
  ];
}

function renderRoles() {
  return [
    sec(null, group(state.roles.length
      ? state.roles.map((r, i) => h("div", { class: "row list" },
        plainInput(r, (v) => (state.roles[i] = v), "Video Editor"),
        rowActions(state.roles, i, "roles")))
      : h("p", { class: "empty" }, "No roles yet.")), "Shown as a ticked list in About me."),
    adder("Add Role", () => {
      state.roles.push("");
      changed();
      render("roles");
      focusLast();
    }),
  ];
}

function renderExperience() {
  return [
    sec(null, group(state.experiences.length
      ? state.experiences.map((x, i) => h("div", { class: "row list" },
        h("div", { class: "line" },
          plainInput(x.title, (v) => (x.title = v), "Position"),
          plainInput(x.company, (v) => (x.company = v), "Company"),
          (() => {
            const y = plainInput(x.year ?? "", (v) => (x.year = v ? Number(v) : null), "Year", "number");
            y.classList.add("year");
            return y;
          })()),
        rowActions(state.experiences, i, "experience")))
      : h("p", { class: "empty" }, "No experience yet.")), "Your CV lists these newest first."),
    adder("Add Experience", () => {
      state.experiences.push({ title: "", company: "", year: new Date().getFullYear() });
      changed();
      render("experience");
      [...$("#page").querySelectorAll('input[aria-label="Position"]')].pop()?.focus();
    }),
  ];
}

function renderSkills() {
  return [
    tokenList("Video tools", state.videoTools),
    tokenList("Design and AI tools", state.otherTools),
    tokenList("Languages", state.languages),
  ];
}

function renderContact() {
  return [
    sec(null, group(
      textField("Email", () => state.email, (v) => (state.email = v), { type: "email", placeholder: "name@example.com" }),
      textField("Phone", () => state.phone, (v) => (state.phone = v), { type: "tel", placeholder: "+27 …" }),
      textField("LinkedIn", () => state.linkedin, (v) => (state.linkedin = v), { type: "url", placeholder: "https://linkedin.com/in/…" }))),
    sec(null, group(
      textField("Booking link", () => state.bookingUrl, (v) => (state.bookingUrl = v), { type: "url", placeholder: "https://calendar.com/your-name" })),
    "Opens when visitors click the calendar widget."),
  ];
}

function renderWidgets() {
  let zones = [];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch {}
  const list = h("datalist", { id: "tz-list" }, zones.map((z) => h("option", { value: z })));
  const tz = textField("Time zone", () => state.timeZone, (v) => (state.timeZone = v), { placeholder: "Africa/Johannesburg", hint: "Your local time on the clock widget" });
  tz.querySelector("input").setAttribute("list", "tz-list");
  return [
    list,
    sec(null, group(tz,
      textField("City code", () => state.cityCode, (v) => (state.cityCode = v.toUpperCase()), { placeholder: "JHB", hint: "Up to 4 letters, shown on the clock" }))),
  ];
}

function renderFolders() {
  return sec(null, group(...state.folders.map((f) => {
    const icon = h("button", { type: "button", class: "push" }, "Change Icon…");
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
    return h("div", { class: "row list" },
      f.icon ? h("img", { class: "folder-icon", src: f.icon, alt: "" }) : h("span", { class: "tile", style: "--c:#1e90ff", html: ICONS.folder }),
      plainInput(f.name, (v) => (f.name = v), "Folder name"),
      icon);
  })), "Rename the folders on your desktop or give them new icons.");
}

/* ---------- Sections and sidebar ---------- */
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const SECTIONS = [
  { id: "profile", title: "Profile", render: renderProfile, keywords: "name location bio about log out sign out website",
    desc: () => "Your name, location and the bio in About me." },
  { id: "videos", title: "Videos", icon: ICONS.video, color: "#ff3b30", render: renderVideos, keywords: "youtube tiktok shorts link cover portfolio",
    count: () => state.videos.length, desc: () => `${plural(state.videos.length, "video")} on your desktop. Paste a YouTube or TikTok link and press Get.` },
  { id: "decks", title: "Case Studies", icon: ICONS.deck, color: "#ff9500", render: renderDecks, keywords: "presentations pdf deck slides upload keynote powerpoint",
    count: () => state.presentations.length, desc: () => "PDF decks that open as presentations. Export from PowerPoint or Keynote as a PDF." },
  { id: "folders", title: "Folders", icon: ICONS.folder, color: "#1e90ff", render: renderFolders, keywords: "desktop icons rename",
    desc: () => "The folders on your desktop: their names and icons." },
  { id: "roles", title: "Roles", icon: ICONS.users, color: "#5856d6", render: renderRoles, keywords: "titles about me",
    desc: () => "The roles listed with ticks in About me." },
  { id: "experience", title: "Experience", icon: ICONS.briefcase, color: "#a2845e", render: renderExperience, keywords: "cv jobs companies work",
    desc: () => "The jobs in your CV, newest first." },
  { id: "skills", title: "Skills & Tools", icon: ICONS.award, color: "#af52de", render: renderSkills, keywords: "software languages davinci capcut canva",
    desc: () => "The tools and languages in your CV." },
  { id: "contact", title: "Contact", icon: ICONS.link, color: "#34c759", render: renderContact, keywords: "email phone linkedin booking calendar social",
    desc: () => "How visitors reach you: email, phone, LinkedIn and your booking link." },
  { id: "widgets", title: "Clock & Calendar", icon: ICONS.clock, color: "#8e8e93", render: renderWidgets, keywords: "time zone city widgets",
    desc: () => "The time zone and city code for the widgets on your desktop." },
];
const NAV_GROUPS = [["videos", "decks", "folders"], ["roles", "experience", "skills"], ["contact", "widgets"]];
const byId = (id) => SECTIONS.find((s) => s.id === id);
const initials = () => (state.name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
const mobile = matchMedia("(max-width: 640px)");
let current = null;

function buildNav() {
  const card = h("button", { type: "button", class: "profile-card", "data-sec": "profile", onclick: () => go("profile") },
    h("span", { class: "avatar", "data-live": "initials" }),
    h("span", { class: "who" }, h("b", { "data-live": "name" }), h("small", {}, "Profile, bio and location")));
  const groups = NAV_GROUPS.map((ids) => h("ul", { class: "nav-group" }, ids.map((id) => {
    const s = byId(id);
    return h("li", {}, h("button", { type: "button", class: "nav-item", "data-sec": id, onclick: () => go(id) },
      h("span", { class: "tile", style: `--c:${s.color}`, html: s.icon }),
      h("span", { class: "nav-label" }, s.title),
      s.count && h("span", { class: "count" })));
  })));
  $("#nav").replaceChildren(card, ...groups);
  updateNav();
  filterNav();
}

// Refresh the bits of the sidebar (and page header) that depend on the content.
function updateNav() {
  document.querySelectorAll('[data-live="name"]').forEach((el) => (el.textContent = state.name || "Your name"));
  document.querySelectorAll('[data-live="initials"]').forEach((el) => (el.textContent = initials()));
  document.querySelectorAll("#nav [data-sec]").forEach((b) => {
    const s = byId(b.dataset.sec);
    if (s.count) b.querySelector(".count").textContent = s.count();
    if (b.dataset.sec === current) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}

// Sidebar search: hides sections that don't match every typed word. Returns the first match.
function filterNav() {
  const words = $("#search").value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let first = null;
  document.querySelectorAll("#nav [data-sec]").forEach((b) => {
    const s = byId(b.dataset.sec);
    const hay = `${s.title} ${s.keywords}`.toLowerCase();
    const hit = words.every((w) => hay.includes(w));
    (b.closest("li") || b).hidden = !hit;
    if (hit && !first) first = s.id;
  });
  document.querySelectorAll("#nav .nav-group").forEach((g) => (g.hidden = ![...g.children].some((li) => !li.hidden)));
  return first;
}

function hero(s) {
  const art = s.id === "profile"
    ? h("span", { class: "avatar big", "data-live": "initials" }, initials())
    : h("span", { class: "tile big", style: `--c:${s.color}`, html: s.icon });
  return h("div", { class: "hero" }, art,
    s.id === "profile" ? h("h3", { "data-live": "name" }, state.name || "Your name") : h("h3", {}, s.title),
    h("p", {}, s.desc()));
}

function drawPage() {
  const s = byId(current);
  if (!s) return;
  const page = $("#page");
  const top = page.scrollTop;
  page.replaceChildren(h("div", { class: "page-inner" }, hero(s), [s.render()].flat()));
  page.scrollTop = top;
}

// Re-draw a section after a change (only visible if it's the open page).
function render(id) {
  if (id === current) drawPage();
  updateNav();
}

/* ---------- Pages and history (back / forward like the macOS toolbar arrows) ---------- */
let histIndex = 0, histMax = 0;
const hashId = () => (byId(location.hash.slice(1)) ? location.hash.slice(1) : null);

function show(id) {
  current = id || (mobile.matches ? null : "videos");
  $("#win").classList.toggle("paged", !!current);
  const s = byId(current);
  $("#page-title").textContent = s ? s.title : "Settings";
  document.title = `${s ? s.title + " – " : ""}System Settings – SeanOS`;
  if (s) {
    drawPage();
    $("#page").scrollTop = 0;
    $("#toolbar").classList.remove("scrolled");
  }
  updateNav();
  $("#back").disabled = histIndex <= 0;
  $("#forward").disabled = histIndex >= histMax;
}

function go(id) {
  if (id !== current) {
    histMax = ++histIndex;
    history.pushState({ i: histIndex }, "", id ? "#" + id : location.pathname);
  }
  show(id);
}

/* ---------- Save ---------- */
async function save() {
  const missing = state.videos.map((v, i) => (!v.id ? i + 1 : 0)).filter(Boolean);
  if (missing.length) {
    go("videos");
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
    buildNav();
    drawPage();
    setStatus("saved");
    toast("Saved. Your live site updates within a minute.");
  } catch (e) {
    if (e.message === "Not signed in") return;
    setStatus("dirty");
    toast(e.message, "error");
  }
}

async function logout() {
  if (!$("#save").disabled && !confirm("You have unsaved changes. Log out anyway?")) return;
  await api("/api/logout", { method: "POST" });
  leaving = true; // don't trigger the leave warning
  location.href = "/";
}

const closeWindow = () => (location.href = "/");

/* ---------- Menu bar (laptops and tablets): logo, File and View menus, light/dark, clock ---------- */
const MENUS = {
  logo: () => [
    { label: "View Site", run: () => open("/", "_blank", "noopener") },
    null,
    { label: "Log Out…", run: logout },
  ],
  file: () => [
    { label: "Save", run: save, key: "⌘S", disabled: $("#save").disabled },
    null,
    { label: "Close Window", run: closeWindow },
  ],
  view: () => [
    { label: "Profile", run: () => go("profile"), checked: current === "profile" },
    ...NAV_GROUPS.flatMap((ids) => [null, ...ids.map((id) => ({ label: byId(id).title, run: () => go(id), checked: current === id }))]),
    null,
    { label: "Search", run: () => ($("#search").focus(), $("#search").select()), key: "⌘F" },
  ],
};
let openBtn = null;

function openMenu(btn) {
  const pop = $("#menu-pop");
  pop.replaceChildren(...MENUS[btn.dataset.menu]().map((it) => it
    ? h("button", { type: "button", role: "menuitem", disabled: it.disabled, onclick: () => (closeMenu(), it.run()) },
      h("span", { class: "check", "aria-hidden": "true" }, it.checked ? "✓" : ""), it.label, it.key && h("kbd", {}, it.key))
    : h("hr")));
  pop.style.left = Math.max(4, btn.getBoundingClientRect().left) + "px";
  pop.hidden = false;
  openBtn?.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-expanded", "true");
  openBtn = btn;
}

function closeMenu() {
  if (!openBtn) return;
  $("#menu-pop").hidden = true;
  openBtn.setAttribute("aria-expanded", "false");
  openBtn = null;
}

function setTheme(theme, remember) {
  document.documentElement.dataset.theme = theme;
  const btn = $("#theme-toggle");
  btn.setAttribute("aria-pressed", theme === "dark");
  btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  if (remember) try { localStorage.setItem("theme", theme); } catch {} // shared with the site's moon button
}

function setupMenubar() {
  $(".menu-logo").innerHTML = LOGO;
  const bar = $("#menubar"), pop = $("#menu-pop");
  bar.querySelectorAll("[data-menu]").forEach((btn) => {
    btn.addEventListener("click", () => (openBtn === btn ? closeMenu() : openMenu(btn)));
    btn.addEventListener("pointerenter", () => openBtn && openBtn !== btn && openMenu(btn)); // like macOS: slide across open menus
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (openBtn !== btn) openMenu(btn);
        pop.querySelector("button:not(:disabled)")?.focus();
      }
    });
  });
  pop.addEventListener("keydown", (e) => {
    const items = [...pop.querySelectorAll("button:not(:disabled)")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  });
  addEventListener("pointerdown", (e) => openBtn && !bar.contains(e.target) && !pop.contains(e.target) && closeMenu());
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openBtn) {
      const btn = openBtn;
      closeMenu();
      btn.focus();
    }
  });

  $("#theme-toggle").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark", true);
  setTheme(document.documentElement.dataset.theme || "light", false);

  const clock = $("#clock");
  (function tick() {
    const now = new Date();
    const day = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }); // "Wednesday 7 October"
    clock.textContent = `${day}  ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    clock.dateTime = now.toISOString();
    setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds())); // next minute boundary
  })();
}

/* ---------- Start ---------- */
async function start() {
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

  history.replaceState({ i: 0 }, "", location.href);
  buildNav();
  show(hashId());
  changed();
  setupMenubar();
  if (!everSaved) toast("This is your current site content. Press Save once to start managing it here.");

  const win = $("#win");
  try { win.classList.toggle("zoomed", localStorage.getItem("dashboard-zoom") === "1"); } catch {}
  $("#zoom").onclick = () => {
    const on = win.classList.toggle("zoomed");
    try { localStorage.setItem("dashboard-zoom", on ? "1" : "0"); } catch {}
  };
  $("#close").onclick = $("#minimize").onclick = closeWindow;
  $("#zoom").disabled = mobile.matches; // phones are always full screen
  $("#save").onclick = save;
  $("#back").onclick = () => history.back();
  $("#forward").onclick = () => history.forward();
  $("#home-back").onclick = () => (histIndex > 0 ? history.back() : go(null));
  $("#page").addEventListener("scroll", (e) => $("#toolbar").classList.toggle("scrolled", e.target.scrollTop > 4), { passive: true });

  const search = $("#search");
  search.addEventListener("input", filterNav);
  search.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const id = filterNav();
      if (id) go(id);
    } else if (e.key === "Escape") {
      search.value = "";
      filterNav();
    }
  });

  addEventListener("popstate", (e) => {
    if (e.state?.i == null) {
      // A hash typed into the address bar: treat it as a new page visit.
      histMax = ++histIndex;
      history.replaceState({ i: histIndex }, "");
    } else histIndex = e.state.i;
    show(hashId());
  });
  mobile.addEventListener("change", () => {
    $("#zoom").disabled = mobile.matches;
    show(current || hashId());
  });
  // Follow the site's light/dark switch if it changes in another tab.
  addEventListener("storage", (e) => e.key === "theme" && e.newValue && setTheme(e.newValue, false));
  addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key === "s") {
      e.preventDefault();
      if (!$("#save").disabled) save();
    } else if (key === "f") {
      e.preventDefault();
      if (mobile.matches && current) go(null);
      search.focus();
      search.select();
    }
  });
  addEventListener("beforeunload", (e) => {
    if (!leaving && !$("#save").disabled) e.preventDefault();
  });
}

start();
