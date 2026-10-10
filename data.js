// All portfolio content lives here. Edit this file to update the site.
window.PORTFOLIO = {
  name: "Sean Sesing",
  location: "Johannesburg",
  bio: "I’m Sean Sesing, a short-form video editor and producer operating out of Johannesburg. I specialize in creating scroll-stopping Short and Long form video content for influencers, brands, and digital campaigns. Armed with DaVinci Resolve, CapCut, and a sharp eye for pacing and audience retention, I build social-first narratives that convert viewers into active communities. From scaling e-sports memberships to managing creator-led campaigns for student accommodations, my goal is simple: identify the strongest moments in raw footage and shape them into visual stories that hold attention and spark engagement.",
  roles: ["Color Grader", "Content Creator", "Videographer", "Video Editor", "Creative Director"],
  languages: ["English", "Sotho"],
  experiences: [
    { title: "Video Editor", company: "Absa", year: 2024 },
    { title: "Creative Director", company: "Counterfit", year: 2025 },
    { title: "Camera Operator and Video Editor", company: "Bipxlar Creative", year: 2026 },
    { title: "Video Editor", company: "Heineken", year: 2026 },
    { title: "Content Operator", company: "Joburg Theatre", year: 2026 },
    { title: "Marketing Manager", company: "Thooto", year: 2025 },
  ],
  videoTools: ["DaVinci Resolve", "CapCut"],
  otherTools: ["Canva", "Figma", "ChatGPT", "Notion AI"],
  email: "seansesing@gmail.com",
  phone: "+27683648494",
  linkedin: "https://linkedin.com/in/sean-sesing",
  // Calendar widget: replace with your personal Calendar.com booking link (e.g. https://calendar.com/your-name).
  bookingUrl: "https://calendar.com/",
  // Clock widget shows the time here, so visitors can see your local time.
  timeZone: "Africa/Johannesburg",
  cityCode: "JHB", // short label on the clock widget

  // Desktop folders, in display order. `icon` is the folder artwork; each video below names its folder.
  folders: [
    { id: "short-form", name: "Short-form Videos", icon: "assets/folders/short-form.png" },
    { id: "long-form", name: "Long-form Videos", icon: "assets/folders/long-form.png" },
    { id: "case-studies", name: "Case Studies", icon: "assets/folders/case-studies.png" },
    { id: "passion-projects", name: "Passion Projects", icon: "assets/folders/passion-projects.png" },
  ],

  // Case Studies: presentations. Export a deck from PowerPoint/Keynote as a PDF (File › Export › PDF)
  // and put it in assets/decks — or export each slide as an image and list them in `slides`.
  // Optional: `cover` (thumbnail image), `folder` (defaults to "case-studies").
  presentations: [
    // { title: "Absa campaign case study", pdf: "assets/decks/absa-campaign.pdf" },
    // { title: "Heineken launch", slides: ["assets/decks/heineken/1.png", "assets/decks/heineken/2.png"] },
  ],

  // `id` is the YouTube (or TikTok) video id. `short: true` renders a vertical (9:16) thumbnail and player.
  // `folder` is one of the folder ids above.
  videos: [
    { id: "g_2KfJXox1E", title: "Amarula is African Excellence in Action", folder: "long-form" },
    { id: "0Y-gBZg5nvs", title: "SunGereza x Absa SA", folder: "long-form" },
    { id: "dPDELgZwefg", title: "Built for Brave", folder: "long-form" },
    { id: "iYEI_2HUkTY", title: "It's the best school you could choose for your child!", folder: "long-form" },
    { id: "OiT6E_HrNhQ", title: "Grace Trinity School for Girls", folder: "long-form" },
    { id: "_4m_LQTcP2g", title: "This is Wits", folder: "long-form" },
    { id: "AYfg70sGQ34", title: "Thank You, INDIA! You Rock!", short: true, folder: "short-form" },
    { id: "4n7jGLQ-Tt0", title: "I Finally Understood HOW BIG the Congo is...", short: true, folder: "short-form" },
    // TikTok videos: `platform: "tiktok"` plays them in TikTok's embedded player.
    // Covers are saved locally (assets/covers) because TikTok's own thumbnail links expire.
    { id: "7436341205094370616", title: "Rating Campus Central", short: true, platform: "tiktok", folder: "short-form", cover: "assets/covers/7436341205094370616.jpg" },
    { id: "7561824933307829512", title: "Say Less with Pearl Thando podcast clip", short: true, platform: "tiktok", folder: "short-form", cover: "assets/covers/7561824933307829512.jpg" },
    { id: "7496026170639584518", title: "The Boys D3n Clip 1", short: true, platform: "tiktok", folder: "short-form", cover: "assets/covers/7496026170639584518.jpg" },
    { id: "7476720488358677766", title: "The Boys D3n Clip 2", short: true, platform: "tiktok", folder: "short-form", cover: "assets/covers/7476720488358677766.jpg" },
  ],
};
