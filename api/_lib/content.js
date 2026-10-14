// Shape and sanity checks for the portfolio content the dashboard saves. Unknown fields are dropped,
// strings are trimmed to sensible lengths, and links must be http(s) (or mailto/tel where relevant).

const str = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v, max = 50) => (Array.isArray(v) ? v.slice(0, max) : []);
const isUrl = (v) => /^https?:\/\/[^\s]+$/i.test(v) || /^\/(uploads|assets)\/[^\s]*$/.test(v) || /^assets\/[^\s]+$/.test(v);
const url = (v, max = 2000) => {
  const s = str(v, max);
  return s && isUrl(s) ? s : "";
};

// The original folders always exist (new videos and decks default to them); the owner can add more.
const CORE_FOLDERS = ["short-form", "long-form", "case-studies", "passion-projects"];
const FOLDER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; // also the #link, e.g. #behind-the-scenes
const MAX_FOLDERS = 20; // dashboard.js uses the same limit

export function cleanContent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Content must be an object");

  // Folders in the owner's order; ids must be unique slugs.
  const folders = [];
  for (const f of list(input.folders, MAX_FOLDERS)) {
    const id = str(f?.id, 40);
    if (!FOLDER_ID.test(id) || folders.some((x) => x.id === id)) continue;
    folders.push({
      id, name: str(f.name, 40) || id,
      ...(url(f.icon) && { icon: url(f.icon) }),
      ...(f.hidden === true && { hidden: true }), // switched off: not shown on the desktop
    });
  }
  for (const id of CORE_FOLDERS) if (!folders.some((x) => x.id === id)) folders.push({ id, name: id });
  const folderIds = new Set(folders.map((f) => f.id));
  const folderOf = (v, fallback) => (folderIds.has(v) ? v : fallback);

  const videos = list(input.videos, 200)
    .map((v) => {
      const platform = v?.platform === "tiktok" ? "tiktok" : undefined;
      const id = str(v?.id, 40);
      if (!(platform ? /^\d{8,25}$/ : /^[\w-]{6,20}$/).test(id)) return null;
      return {
        id,
        title: str(v.title, 120) || "Untitled video",
        ...(v.short && { short: true }),
        ...(platform && { platform }),
        folder: folderOf(v.folder, v.short ? "short-form" : "long-form"),
        ...(url(v.cover) && { cover: url(v.cover) }),
        ...(url(v.link) && { link: url(v.link) }), // the link as pasted in the dashboard
      };
    })
    .filter(Boolean);

  const presentations = list(input.presentations, 100)
    .map((p) => {
      const pdf = url(p?.pdf);
      const slides = list(p?.slides, 300).map((s) => url(s)).filter(Boolean);
      if (!pdf && !slides.length) return null;
      return {
        title: str(p.title, 120) || "Untitled presentation",
        ...(pdf ? { pdf } : { slides }),
        folder: folderOf(p.folder, "case-studies"),
        ...(url(p.cover) && { cover: url(p.cover) }),
      };
    })
    .filter(Boolean);

  const email = str(input.email, 120);
  const phone = str(input.phone, 40);
  return {
    name: str(input.name, 80) || "SeanOS",
    location: str(input.location, 80),
    bio: str(input.bio, 3000),
    roles: list(input.roles, 20).map((r) => str(r, 60)).filter(Boolean),
    languages: list(input.languages, 20).map((r) => str(r, 40)).filter(Boolean),
    experiences: list(input.experiences, 50)
      .map((x) => ({ title: str(x?.title, 80), company: str(x?.company, 80), year: Math.trunc(Number(x?.year)) || null }))
      .filter((x) => x.title || x.company),
    videoTools: list(input.videoTools, 30).map((r) => str(r, 40)).filter(Boolean),
    otherTools: list(input.otherTools, 30).map((r) => str(r, 40)).filter(Boolean),
    email: /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(email) ? email : "",
    phone: /^[+\d][\d\s()-]{3,}$/.test(phone) ? phone : "",
    linkedin: url(input.linkedin),
    bookingUrl: url(input.bookingUrl),
    timeZone: /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(str(input.timeZone, 60)) ? str(input.timeZone, 60) : "Africa/Johannesburg",
    cityCode: str(input.cityCode, 4).toUpperCase(),
    folders,
    videos,
    presentations,
  };
}
