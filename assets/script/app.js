const API_KEY = "30306838-b48cda5bf7da4b98cecbab85f";
const PER_PAGE = 24;
const TRENDING = [
  "ocean",
  "mountains",
  "city night",
  "coffee",
  "space",
  "minimal",
  "architecture",
  "flowers",
  "autumn",
  "desert",
];

const $ = (id) => document.getElementById(id);
const grid = $("grid"),
  tabs = $("tabs"),
  searchInput = $("searchInput"),
  clearBtn = $("clearBtn");
const title = $("title"),
  subtitle = $("subtitle"),
  spinner = $("spinner"),
  endMsg = $("end"),
  sentinel = $("sentinel");
const lb = $("lb"),
  sbar = $("sbar"),
  fpop = $("filters");
const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

const categories = [
  { name: "Featured", value: "", icon: "fa-star" },
  { name: "Nature", value: "nature", icon: "fa-leaf" },
  { name: "Backgrounds", value: "backgrounds", icon: "fa-layer-group" },
  { name: "Places", value: "places", icon: "fa-location-dot" },
  { name: "Animals", value: "animals", icon: "fa-paw" },
  { name: "Technology", value: "computer", icon: "fa-microchip" },
  { name: "Food", value: "food", icon: "fa-utensils" },
  { name: "Buildings", value: "buildings", icon: "fa-building" },
  { name: "Transport", value: "transportation", icon: "fa-car-side" },
  { name: "Fashion", value: "fashion", icon: "fa-shirt" },
  { name: "Science", value: "science", icon: "fa-flask" },
  { name: "Education", value: "education", icon: "fa-graduation-cap" },
  { name: "Sports", value: "sports", icon: "fa-futbol" },
];

const TYPES = [
  { label: "Photos", value: "photo", icon: "fa-camera" },
  { label: "Illustrations", value: "illustration", icon: "fa-palette" },
  { label: "Vectors", value: "vector", icon: "fa-bezier-curve" },
  { label: "All", value: "all", icon: "fa-border-all" },
];
const ORIENTS = [
  { label: "Any", value: "", icon: "fa-border-all" },
  { label: "Landscape", value: "horizontal", icon: "fa-panorama" },
  { label: "Portrait", value: "vertical", icon: "fa-mobile-screen" },
];
const SIZES = [
  { label: "Any", value: 0 },
  { label: "1280 px", value: 1280 },
  { label: "1920 px", value: 1920 },
  { label: "3840 px", value: 3840 },
];
const COLORS = {
  grayscale: "linear-gradient(135deg,#fff 0%,#000 100%)",
  transparent:
    "conic-gradient(#d4d4d8 25%,#fff 0 50%,#d4d4d8 0 75%,#fff 0) 0 0/10px 10px",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#facc15",
  green: "#22c55e",
  turquoise: "#14b8a6",
  blue: "#3b82f6",
  lilac: "#a78bfa",
  pink: "#ec4899",
  white: "#ffffff",
  gray: "#9ca3af",
  black: "#0f172a",
  brown: "#92400e",
};

const state = {
  query: "",
  category: "",
  order: "popular",
  page: 1,
  imageType: "photo",
  orientation: "",
  minWidth: 0,
  editors: false,
  colors: new Set(),
  loading: false,
  done: false,
  view: "explore",
  token: 0,
  total: 0,
};
let items = [];

const nf = new Intl.NumberFormat("en-US", { notation: "compact" });
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  },
};

/* ---------- API with in-memory cache ---------- */
const cache = new Map();
async function api(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

const favs = new Map();
store.get("lumen_favs", []).forEach((p) => favs.set(p.id, p));
const heart = (on) =>
  `<i class="${on ? "fa-solid text-rose-500" : "fa-regular"} fa-heart"></i>`;

const slim = (p) => ({
  id: p.id,
  tags: p.tags,
  user: p.user,
  userImageURL: p.userImageURL,
  pageURL: p.pageURL,
  webformatURL: p.webformatURL,
  webformatWidth: p.webformatWidth,
  webformatHeight: p.webformatHeight,
  previewURL: p.previewURL,
  largeImageURL: p.largeImageURL,
  imageWidth: p.imageWidth,
  imageHeight: p.imageHeight,
  likes: p.likes,
  views: p.views,
  downloads: p.downloads,
});

function toggleFav(p) {
  if (favs.has(p.id)) {
    favs.delete(p.id);
    toast('<i class="fa-regular fa-heart"></i> Removed from favorites');
  } else {
    favs.set(p.id, slim(p));
    toast('<i class="fa-solid fa-heart text-rose-500"></i> Saved to favorites');
  }
  store.set("lumen_favs", [...favs.values()]);
  syncFavUI();
  if (state.view === "favorites") showFavorites();
}

function syncFavUI() {
  const n = favs.size,
    b = $("favBadge");
  b.textContent = n;
  b.classList.toggle("hidden", n === 0);
  b.classList.toggle("flex", n > 0);
  document.querySelectorAll("[data-fav]").forEach((btn) => {
    btn.innerHTML = heart(favs.has(+btn.dataset.fav));
  });
  const cur = lbCurrent();
  if (cur) $("lbFav").innerHTML = heart(favs.has(cur.id));
}

let toastTimer;
function toast(html) {
  const t = $("toast");
  t.innerHTML = html;
  t.classList.remove("hidden");
  t.classList.add("flex", "toast-in");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add("hidden");
    t.classList.remove("flex", "toast-in");
  }, 1900);
}

function renderTabs() {
  tabs.innerHTML = "";
  categories.forEach((cat) => {
    const b = document.createElement("button");
    const active =
      state.view === "explore" && !state.query && cat.value === state.category;
    b.className =
      "rail tap shrink-0 w-12 h-12 rounded-3xl items-center justify-center " +
      (cat.value ? "hidden md:flex" : "flex") +
      (active ? " active" : "");
    b.title = cat.name;
    b.setAttribute("aria-label", cat.name);
    b.innerHTML = `<i class="fa-solid ${cat.icon} text-lg"></i>`;
    b.onclick = () => {
      setQuery("");
      setExplore({ query: "", category: cat.value });
    };
    tabs.appendChild(b);
  });
}

function renderRail() {
  document.querySelectorAll("[data-nav]").forEach((b) => {
    const n = b.dataset.nav;
    const on =
      (n === "favorites" && state.view === "favorites") ||
      (n === "latest" && state.view === "explore" && state.order === "latest");
    b.classList.toggle("active", on);
  });
}

function setQuery(q) {
  searchInput.value = q;
  clearBtn.classList.toggle("hidden", !q);
}

function setExplore(patch) {
  Object.assign(state, patch, { view: "explore" });
  const cat = categories.find((c) => c.value === state.category);
  title.textContent = state.query
    ? `Results for “${state.query}”`
    : state.category
      ? cat.name
      : "Discover";
  renderTabs();
  renderRail();
  renderFilters();
  load(true);
}

function showFavorites() {
  state.view = "favorites";
  state.token++;
  state.loading = false;
  items = [...favs.values()];
  grid.innerHTML = "";
  endMsg.classList.add("hidden");
  setSpinner(false);
  title.textContent = "Favorites";
  subtitle.textContent = items.length
    ? `${items.length} saved photo${items.length === 1 ? "" : "s"}`
    : "\u00A0";
  renderTabs();
  renderRail();
  if (!items.length) {
    grid.insertAdjacentHTML(
      "beforeend",
      message(
        "fa-heart",
        "No favorites yet",
        "Tap the heart on any photo to save it here.",
      ),
    );
    return;
  }
  appendCards(items, 0);
}

document.querySelectorAll("[data-nav]").forEach(
  (b) =>
    (b.onclick = () => {
      const n = b.dataset.nav;
      if (n === "favorites") return showFavorites();
      if (n === "surprise") {
        const q = TRENDING[Math.floor(Math.random() * TRENDING.length)];
        setQuery(q);
        setExplore({ query: q, category: "", order: "popular" });
        return window.scrollTo({ top: 0, behavior: "smooth" });
      }
      setQuery("");
      setExplore({ order: "latest", query: "", category: "" });
    }),
);
$("toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

function setDensity(d) {
  grid.dataset.d = d;
  store.set("lumen_density", d);
  document
    .querySelectorAll("#density .seg")
    .forEach((b) => b.classList.toggle("active", b.dataset.d === d));
}
document
  .querySelectorAll("#density .seg")
  .forEach((b) => (b.onclick = () => setDensity(b.dataset.d)));
setDensity(store.get("lumen_density", "cozy"));

const SECS = [
  {
    id: "type",
    label: "Type",
    icon: "fa-shapes",
    desc: "Choose what kind of images you want to see.",
  },
  {
    id: "orient",
    label: "Orientation",
    icon: "fa-crop-simple",
    desc: "Pick the shape that fits your layout.",
  },
  {
    id: "size",
    label: "Size",
    icon: "fa-expand",
    desc: "Only show images at least this wide.",
  },
  {
    id: "color",
    label: "Colour",
    icon: "fa-droplet",
    desc: "Select one or more dominant colours.",
  },
  {
    id: "curation",
    label: "Curation",
    icon: "fa-award",
    desc: "Narrow things down to hand-picked images.",
  },
];
let fSec = "type",
  fAnimate = true;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const secActive = (id) =>
  ({
    type: state.imageType !== "photo",
    orient: !!state.orientation,
    size: !!state.minWidth,
    color: state.colors.size > 0,
    curation: state.editors,
  })[id];
const secSummary = (id) => {
  if (id === "type")
    return TYPES.find((t) => t.value === state.imageType).label;
  if (id === "orient")
    return ORIENTS.find((o) => o.value === state.orientation).label;
  if (id === "size")
    return state.minWidth ? `${state.minWidth}+ px` : "Any size";
  if (id === "color") {
    const c = [...state.colors];
    return c.length
      ? cap(c[0]) + (c.length > 1 ? ` +${c.length - 1}` : "")
      : "Any colour";
  }
  return state.editors ? "On" : "Off";
};

const TYPE_DESC = {
  photo: "Real-world photography",
  illustration: "Drawn & painted art",
  vector: "Scalable graphics",
  all: "Everything combined",
};
const ORIENT_VIS = {
  "": '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;width:44px"><div class="shape" style="height:18px"></div><div class="shape" style="height:18px"></div><div class="shape" style="height:18px"></div><div class="shape" style="height:18px"></div></div>',
  horizontal: '<div class="shape" style="width:64px;height:40px"></div>',
  vertical: '<div class="shape" style="width:36px;height:56px"></div>',
};

const card = (
  act,
  o,
  on,
  icon,
  sub,
) => `<button data-act="${act}" data-v="${o.value}" class="fcard tap ${on ? "on" : ""}">
      <span class="tick"><i class="fa-solid fa-check"></i></span>
      <span class="ic"><i class="fa-solid ${icon}"></i></span>
      <span><b>${o.label}</b><small>${sub}</small></span></button>`;

function paneHTML() {
  if (fSec === "type")
    return `<div class="grid grid-cols-2 gap-3">${TYPES.map((o) => card("type", o, state.imageType === o.value, o.icon, TYPE_DESC[o.value])).join("")}</div>`;
  if (fSec === "orient")
    return `<div class="grid grid-cols-3 gap-3">${ORIENTS.map(
      (o) => `
      <button data-act="orient" data-v="${o.value}" class="fcard tap ${state.orientation === o.value ? "on" : ""}" style="align-items:center;text-align:center">
        <span class="tick"><i class="fa-solid fa-check"></i></span>
        <span style="height:64px;display:flex;align-items:center;justify-content:center;color:${state.orientation === o.value ? "var(--ink)" : "#94a3b8"}">${ORIENT_VIS[o.value]}</span>
        <span><b>${o.label}</b></span></button>`,
    ).join("")}</div>`;
  if (fSec === "size") {
    const idx = SIZES.findIndex((o) => o.value === state.minWidth);
    return `<div class="steps"><div class="line"><div class="fill" style="width:${(idx / (SIZES.length - 1)) * 100}%"></div></div>
        ${SIZES.map(
          (
            o,
            i,
          ) => `<button data-act="size" data-v="${o.value}" class="stop ${i === idx ? "on" : ""} ${i < idx ? "pass" : ""}">
          <span class="d"></span><b>${o.value ? o.value : "Any"}</b><small>${o.value ? "px wide" : "No limit"}</small></button>`,
        ).join("")}</div>
        <p class="text-xs text-slate-500 font-semibold mt-8 text-center">${state.minWidth ? `Showing images ${state.minWidth}px wide or larger` : "Showing images of every size"}</p>`;
  }
  if (fSec === "color")
    return `<div class="grid grid-cols-4 sm:grid-cols-5 gap-2">${Object.entries(
      COLORS,
    )
      .map(([name, bg]) => {
        const on = state.colors.has(name);
        return `<button data-act="color" data-v="${name}" class="ctile tap ${on ? "on" : ""}"><span class="sw3" style="background:${bg}">${on ? '<i class="fa-solid fa-check"></i>' : ""}</span>${name}</button>`;
      })
      .join("")}</div>`;
  return `<button data-act="editors" role="switch" aria-checked="${state.editors}" class="tog fcard tap ${state.editors ? "on" : ""}" style="flex-direction:row;align-items:center;justify-content:space-between;width:100%;gap:16px">
        <span style="display:flex;align-items:center;gap:14px"><span class="ic"><i class="fa-solid fa-award"></i></span>
        <span><b>Editor’s choice</b><small>Only show hand-picked images</small></span></span>
        <span class="trk"><span class="knob"></span></span></button>`;
}

function syncShowBtn() {
  $("fDone").textContent = state.total
    ? `Show ${nf.format(state.total)} results`
    : "Show results";
}

function renderFilters() {
  $("fNav").innerHTML = SECS.map(
    (
      sc,
    ) => `<button data-sec="${sc.id}" class="fnav tap ${fSec === sc.id ? "on" : ""}">
        <span class="ic"><i class="fa-solid ${sc.icon}"></i></span>
        <span style="min-width:0"><b>${sc.label}</b><small>${esc(secSummary(sc.id))}</small></span>
        ${secActive(sc.id) ? '<span class="dot"></span>' : ""}</button>`,
  ).join("");

  const sc = SECS.find((x) => x.id === fSec);
  const pane = $("fPane");
  pane.innerHTML = `<div class="${fAnimate ? "pop-in" : ""}"><h3 class="text-2xl font-extrabold tracking-tight">${sc.label}</h3>
      <p class="text-sm text-slate-500 font-medium mt-1 mb-6">${sc.desc}</p>${paneHTML()}</div>`;
  fAnimate = false;

  const n = SECS.filter((x) => secActive(x.id)).length;
  const c = $("filterCount");
  c.textContent = n;
  c.classList.toggle("hidden", n === 0);
  c.classList.toggle("flex", n > 0);
  $("fReset").disabled = n === 0;
  syncShowBtn();
}

$("filters").addEventListener("click", (e) => {
  const sec = e.target.closest("[data-sec]");
  if (sec) {
    fSec = sec.dataset.sec;
    fAnimate = true;
    return renderFilters();
  }
  const a = e.target.closest("[data-act]");
  if (!a) return;
  const v = a.dataset.v;
  if (a.dataset.act === "type") setExplore({ imageType: v });
  else if (a.dataset.act === "orient") setExplore({ orientation: v });
  else if (a.dataset.act === "size") setExplore({ minWidth: +v });
  else if (a.dataset.act === "color") {
    state.colors.has(v) ? state.colors.delete(v) : state.colors.add(v);
    setExplore({});
  } else if (a.dataset.act === "editors")
    setExplore({ editors: !state.editors });
});
$("fReset").onclick = () => {
  state.colors.clear();
  setExplore({
    imageType: "photo",
    orientation: "",
    minWidth: 0,
    editors: false,
  });
};

const filtersOpen = () => !fpop.classList.contains("hidden");
function openFilters() {
  fAnimate = true;
  renderFilters();
  fpop.classList.remove("hidden");
  fpop.classList.add("flex");
  $("filterBtn").setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}
function closeFilters() {
  fpop.classList.add("hidden");
  fpop.classList.remove("flex");
  $("filterBtn").setAttribute("aria-expanded", "false");
  document.body.style.overflow = lbIndex >= 0 ? "hidden" : "";
}
$("filterBtn").onclick = openFilters;
$("fClose").onclick = $("fDone").onclick = closeFilters;
fpop.addEventListener("click", (e) => {
  if (e.target === fpop) closeFilters();
});

const searchOpen = () => sbar.classList.contains("open");
function openSearch() {
  if (isMobile()) {
    sbar.classList.add("open");
    $("sxBack").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  setTimeout(() => searchInput.focus(), 50);
}
function closeSearch() {
  sbar.classList.remove("open");
  $("sxBack").classList.add("hidden");
  document.body.style.overflow = lbIndex >= 0 ? "hidden" : "";
}
$("railSearch").onclick = openSearch;
$("sbClose").onclick = closeSearch;
$("sxBack").onclick = closeSearch;

function runSearch(q) {
  q = q.trim();
  setQuery(q);
  searchInput.blur();
  closeSearch();
  setExplore({ query: q, category: "" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  runSearch(searchInput.value);
});
searchInput.addEventListener("input", () =>
  clearBtn.classList.toggle("hidden", !searchInput.value),
);
clearBtn.onclick = () => {
  setQuery("");
  searchInput.focus();
  if (state.query) setExplore({ query: "", category: "" });
};
window.addEventListener("resize", () => {
  if (!isMobile() && searchOpen()) closeSearch();
});

function buildUrl() {
  let u = `https://pixabay.com/api/?key=${API_KEY}&safesearch=true&per_page=${PER_PAGE}&page=${state.page}&order=${state.order}&image_type=${state.imageType}`;
  if (state.query) u += `&q=${encodeURIComponent(state.query)}`;
  if (state.category) u += `&category=${state.category}`;
  if (state.orientation) u += `&orientation=${state.orientation}`;
  if (state.minWidth) u += `&min_width=${state.minWidth}`;
  if (state.editors) u += `&editors_choice=true`;
  if (state.colors.size) u += `&colors=${[...state.colors].join(",")}`;
  return u;
}

function showSkeletons(n) {
  const hs = [260, 340, 220, 400, 300, 360, 240, 320];
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    d.className = "sk shimmer mb-5 break-inside-avoid rounded-3xl";
    d.style.height = hs[i % hs.length] + "px";
    grid.appendChild(d);
  }
}
const clearSkeletons = () =>
  grid.querySelectorAll(".sk").forEach((el) => el.remove());
const setSpinner = (on) => {
  spinner.classList.toggle("hidden", !on);
  spinner.classList.toggle("flex", on);
};

async function load(reset) {
  if (state.view !== "explore") return;
  if (reset) {
    state.token++;
    state.page = 1;
    state.done = false;
    state.loading = false;
    state.total = 0;
    items = [];
    grid.innerHTML = "";
    subtitle.innerHTML = "&nbsp;";
    endMsg.classList.add("hidden");
  }
  if (state.loading || state.done) return;
  state.loading = true;
  const token = state.token;
  if (reset) showSkeletons(8);
  else setSpinner(true);

  try {
    const data = await api(buildUrl());
    if (token !== state.token) return;
    clearSkeletons();

    if (!data.hits || !data.hits.length) {
      state.done = true;
      if (!items.length)
        grid.innerHTML = message(
          "fa-image",
          "No photos found",
          "Try a different keyword, or reset your filters.",
        );
      else endMsg.classList.remove("hidden");
      return;
    }
    state.total = data.totalHits;
    syncShowBtn();
    const start = items.length;
    items = items.concat(data.hits);
    appendCards(data.hits, start);
    subtitle.textContent = `${nf.format(state.total)} free ${state.imageType === "all" ? "images" : state.imageType + "s"}`;
    state.page++;
    if (items.length >= state.total) {
      state.done = true;
      endMsg.classList.remove("hidden");
    }
  } catch (err) {
    if (token !== state.token) return;
    console.error(err);
    clearSkeletons();
    if (!items.length)
      grid.innerHTML = message(
        "fa-triangle-exclamation",
        "Couldn’t load photos",
        "Check your connection, then search again.",
      );
  } finally {
    if (token === state.token) {
      state.loading = false;
      setSpinner(false);
      io.unobserve(sentinel);
      io.observe(sentinel);
    }
  }
}

function message(icon, head, text) {
  return `<div class="glass rounded-[32px] py-20 px-6 text-center" style="column-span:all">
      <div class="w-14 h-14 mx-auto mb-4 rounded-3xl bg-white/80 flex items-center justify-center"><i class="fa-solid ${icon} text-xl text-slate-500"></i></div>
      <p class="text-lg font-bold">${head}</p><p class="text-sm text-slate-500 mt-1">${text}</p></div>`;
}

function appendCards(list, offset) {
  const frag = document.createDocumentFragment();
  list.forEach((p, i) => {
    const card = document.createElement("figure");
    card.className =
      "card relative mb-5 break-inside-avoid rounded-3xl overflow-hidden bg-slate-200";
    card.style.aspectRatio = `${p.webformatWidth} / ${p.webformatHeight}`;
    card.dataset.idx = offset + i;
    card.tabIndex = 0;
    card.innerHTML = `
        <img class="main absolute inset-0 w-full h-full object-cover" src="${p.webformatURL}" alt="${esc(p.tags)}" loading="lazy">
        <div class="scrim absolute inset-0 pointer-events-none"></div>
        <button data-fav="${p.id}" class="chrome glass-photo tap absolute top-3 right-3 w-10 h-10 rounded-full" aria-label="Save to favorites">${heart(favs.has(p.id))}</button>
        <div class="chrome absolute left-3 right-3 bottom-3 flex items-center justify-between gap-2">
          <div class="glass-photo rounded-full pl-1.5 pr-4 py-1.5 flex items-center gap-2 min-w-0">
            <img src="${p.userImageURL || ""}" alt="" class="w-7 h-7 rounded-full object-cover bg-white/40" style="opacity:1" onerror="this.style.display='none'">
            <span class="text-xs font-semibold truncate">${esc(p.user)}</span>
          </div>
          <button data-dl="${p.id}" class="glass-photo tap w-10 h-10 rounded-full flex items-center justify-center shrink-0" aria-label="Download photo"><i class="fa-solid fa-download"></i></button>
        </div>`;
    const img = card.querySelector("img.main");
    img.addEventListener("load", () => img.classList.add("loaded"));
    if (img.complete) img.classList.add("loaded");
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

grid.addEventListener("click", (e) => {
  const f = e.target.closest("[data-fav]");
  if (f) {
    const p = items.find((x) => x.id === +f.dataset.fav);
    if (p) toggleFav(p);
    return;
  }
  const d = e.target.closest("[data-dl]");
  if (d) {
    const p = items.find((x) => x.id === +d.dataset.dl);
    if (p) downloadPhoto(p);
    return;
  }
  const c = e.target.closest(".card");
  if (c) openLb(+c.dataset.idx, "grid");
});
grid.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.classList.contains("card"))
    openLb(+e.target.dataset.idx, "grid");
});

async function downloadPhoto(p) {
  toast('<i class="fa-solid fa-circle-notch fa-spin"></i> Preparing download');
  try {
    const res = await fetch(p.largeImageURL);
    if (!res.ok) throw new Error("bad response");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lumen-${p.id}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(
      '<i class="fa-solid fa-circle-check text-emerald-500"></i> Download started',
    );
  } catch (e) {
    window.open(p.largeImageURL, "_blank", "noopener");
    toast(
      '<i class="fa-solid fa-arrow-up-right-from-square"></i> Opened in a new tab',
    );
  }
}


const io = new IntersectionObserver(
  (entries) => {
    if (entries.some((en) => en.isIntersecting)) load(false);
  },
  { rootMargin: "600px 0px" },
);
io.observe(sentinel);


const lbMode = "grid";
let lbIndex = -1,
  slideTimer = null;
const lbCurrent = () => (lbIndex >= 0 ? items[lbIndex] : null);

function openLb(i) {
  if (i < 0 || i >= items.length) return;
  lbIndex = i;
  const p = items[i];
  const img = $("lbImg");
  img.classList.remove("zoomed");
  img.style.transformOrigin = "50% 50%";
  img.src = p.largeImageURL;
  img.alt = p.tags;
  $("lbAvatar").src = p.userImageURL || "";
  $("lbAvatar").style.visibility = p.userImageURL ? "visible" : "hidden";
  $("lbUser").textContent = p.user;
  $("lbSize").textContent = p.imageWidth
    ? `${p.imageWidth} × ${p.imageHeight} px`
    : "";
  $("lbFav").innerHTML = heart(favs.has(p.id));
  $("lbPrev").style.visibility = i > 0 ? "visible" : "hidden";
  $("lbNext").style.visibility = i < items.length - 1 ? "visible" : "hidden";
  lb.classList.remove("hidden");
  lb.classList.add("flex");
  document.body.style.overflow = "hidden";
  if (state.view === "explore" && i >= items.length - 4) load(false);
}

function closeLb() {
  stopSlides();
  lb.classList.add("hidden");
  lb.classList.remove("flex");
  document.body.style.overflow = "";
  lbIndex = -1;
}

function stopSlides() {
  clearInterval(slideTimer);
  slideTimer = null;
  $("lbPlay").innerHTML = '<i class="fa-solid fa-play"></i>';
}
function toggleSlides() {
  if (slideTimer) return stopSlides();
  $("lbPlay").innerHTML = '<i class="fa-solid fa-pause"></i>';
  slideTimer = setInterval(() => {
    if (lbIndex < items.length - 1) openLb(lbIndex + 1);
    else stopSlides();
  }, 3500);
}

$("lbImg").addEventListener("click", (e) => {
  const img = e.currentTarget,
    r = img.getBoundingClientRect();
  img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  img.classList.toggle("zoomed");
});
$("lbStage").addEventListener("click", (e) => {
  if (e.target === $("lbStage")) closeLb();
});


let touchX = null;
$("lbStage").addEventListener(
  "touchstart",
  (e) => {
    touchX = e.touches[0].clientX;
  },
  { passive: true },
);
$("lbStage").addEventListener("touchend", (e) => {
  if (touchX === null || $("lbImg").classList.contains("zoomed")) {
    touchX = null;
    return;
  }
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) < 60) return;
  stopSlides();
  openLb(lbIndex + (dx < 0 ? 1 : -1));
});

$("lbClose").onclick = closeLb;
$("lbPrev").onclick = () => {
  stopSlides();
  openLb(lbIndex - 1);
};
$("lbNext").onclick = () => {
  stopSlides();
  openLb(lbIndex + 1);
};
$("lbPlay").onclick = toggleSlides;
$("lbFav").onclick = () => {
  const p = lbCurrent();
  if (p) toggleFav(p);
};
$("lbDl").onclick = () => {
  const p = lbCurrent();
  if (p) downloadPhoto(p);
};
$("lbLink").onclick = () => {
  const p = lbCurrent();
  if (!p) return;
  const link = p.pageURL || p.largeImageURL;
  (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
    .then(() =>
      toast(
        '<i class="fa-solid fa-circle-check text-emerald-500"></i> Link copied',
      ),
    )
    .catch(() =>
      toast(
        '<i class="fa-solid fa-triangle-exclamation"></i> Couldn’t copy the link',
      ),
    );
};
lb.addEventListener("click", (e) => {
  if (e.target === lb) closeLb();
});


document.addEventListener("keydown", (e) => {
  const typing = /input|textarea/i.test(document.activeElement.tagName);
  if (e.key === "Escape") {
    if (filtersOpen()) return closeFilters();
    if (searchOpen()) return closeSearch();
    if (typing) {
      searchInput.blur();
      return;
    }
  }
  if (e.key === "/" && !typing && lbIndex < 0 && !filtersOpen()) {
    e.preventDefault();
    openSearch();
    return;
  }
  if (lbIndex < 0 || typing) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowLeft") {
    stopSlides();
    openLb(lbIndex - 1, lbMode);
  }
  if (e.key === "ArrowRight") {
    stopSlides();
    openLb(lbIndex + 1, lbMode);
  }
  if (e.key.toLowerCase() === "f") {
    const p = lbCurrent();
    if (p) toggleFav(p);
  }
  if (e.key.toLowerCase() === "s") toggleSlides();
});


syncFavUI();
setExplore({ query: "", category: "" });
