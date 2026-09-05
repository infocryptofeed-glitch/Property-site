import { supabaseConfig } from "./supabase-config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

let allListings = [];
let allCategories = [];
let activeCategory = "all";
let searchTerm = "";

// ---------- Theme toggle ----------
const sunIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`;
function applyTheme(mode) {
  document.body.classList.toggle("light-theme", mode === "light");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = mode === "light" ? moonIcon : sunIcon;
}
const savedTheme = localStorage.getItem("siteTheme") || "dark";
applyTheme(savedTheme);
document.getElementById("themeToggle").addEventListener("click", () => {
  const isLight = document.body.classList.contains("light-theme");
  const next = isLight ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem("siteTheme", next);
});

const SOCIAL_ICONS = {
  facebook: `<svg viewBox="0 0 24 24"><path d="M13.5 21v-7h2.4l.4-2.8h-2.8v-1.8c0-.8.2-1.4 1.4-1.4h1.5V5.5c-.3 0-1.1-.1-2.1-.1-2.1 0-3.6 1.3-3.6 3.7v2.1H8.3V14h2.4v7h2.8Z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1"/></svg>`,
  tiktok: `<svg viewBox="0 0 24 24"><path d="M15 3c.4 2 1.9 3.4 4 3.6v2.7c-1.5 0-2.9-.5-4-1.3v6.4a5.1 5.1 0 1 1-5.1-5.1c.3 0 .6 0 .9.1v2.8a2.4 2.4 0 1 0 1.7 2.3V3H15Z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.6.6-.9 1.3-.9 2.1 0 1.4 1 2.8 1.2 3 .1.2 2 3.1 4.9 4.2.7.3 1.2.4 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.2-.4-.3Z"/></svg>`
};

// ---------- Site settings (banner title, logo, social links, contact) ----------
async function loadSiteSettings() {
  const { data } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
  const s = data || {};
  document.getElementById("siteName").textContent = s.site_name || "Your Property Brand";

  const brandMark = document.getElementById("brandMark");
  if (s.logo_url) {
    brandMark.innerHTML = `<img src="${s.logo_url}" alt="logo">`;
  } else {
    brandMark.textContent = (s.site_name || "P").charAt(0).toUpperCase();
  }

  applyThemeColors(s.theme_colors);

  document.getElementById("heroTitle").textContent = s.banner_title || "Find your next property";
  document.getElementById("heroSubtitle").textContent = s.banner_subtitle || "Browse verified listings, straight from the dealer.";
  document.getElementById("contactLine").textContent = s.contact_phone
    ? `Call or WhatsApp: ${s.contact_phone}${s.contact_email ? " · " + s.contact_email : ""}`
    : "Contact the dealer for more details.";

  const socialRow = document.getElementById("socialRow");
  socialRow.innerHTML = "";
  const socials = s.social_links || {};
  ["facebook", "instagram", "tiktok", "whatsapp"].forEach(key => {
    const url = socials[key];
    const a = document.createElement("a");
    a.className = "social-icon" + (url ? " active" : "");
    a.innerHTML = SOCIAL_ICONS[key];
    a.title = key.charAt(0).toUpperCase() + key.slice(1);
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; }
    else { a.href = "javascript:void(0)"; }
    socialRow.appendChild(a);
  });
}

function applyThemeColors(colors) {
  if (!colors) return;
  const root = document.documentElement.style;
  if (colors.accent) root.setProperty("--brass", colors.accent);
  if (colors.accentHi) root.setProperty("--brass-hi", colors.accentHi);
  if (colors.background) root.setProperty("--ink-950", colors.background);
  if (colors.card) { root.setProperty("--ink-800", colors.card); root.setProperty("--ink-900", colors.card); }
  if (colors.text) root.setProperty("--text-hi", colors.text);
}

// ---------- Admin profile badge ----------
async function loadAdminProfile() {
  const { data } = await supabase.from("admin_profile").select("*").eq("id", "main").maybeSingle();
  if (!data) return;
  document.getElementById("profileBadgeImg").src = data.photo_url || "";
  document.getElementById("profileCardImg").src = data.photo_url || "";
  document.getElementById("profileCardName").textContent = data.name || "Dealer";
  document.getElementById("profileCardBio").textContent = data.bio || "";
  document.getElementById("profileCardContact").href = data.phone ? `https://wa.me/${data.phone.replace(/\D/g,"")}` : "#";
}

document.getElementById("profileBadge").addEventListener("click", () => {
  document.getElementById("profileCard").classList.toggle("open");
});

// ---------- Categories ----------
function renderCategories() {
  const row = document.getElementById("categoryRow");
  row.innerHTML = "";
  const allPill = document.createElement("div");
  allPill.className = "cat-pill" + (activeCategory === "all" ? " active" : "");
  allPill.textContent = "All";
  allPill.onclick = () => { activeCategory = "all"; renderCategories(); renderListings(); };
  row.appendChild(allPill);

  allCategories.forEach(cat => {
    const pill = document.createElement("div");
    pill.className = "cat-pill" + (activeCategory === cat.name ? " active" : "");
    pill.textContent = cat.name;
    pill.onclick = () => { activeCategory = cat.name; renderCategories(); renderListings(); };
    row.appendChild(pill);
  });
}

function loadCategories() {
  fetchCategories();
  supabase.channel("public-categories")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, fetchCategories)
    .subscribe();
}
async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("created_at");
  if (error) return;
  allCategories = data || [];
  renderCategories();
}

// ---------- Listings ----------
function loadListings() {
  fetchListings();
  supabase.channel("public-listings")
    .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, fetchListings)
    .subscribe();
}
async function fetchListings() {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) return;
  allListings = (data || []).filter(l => l.status !== "hidden");
  renderListings();
}

function renderListings() {
  const grid = document.getElementById("listingGrid");
  const empty = document.getElementById("emptyState");
  grid.innerHTML = "";

  let items = allListings;
  if (activeCategory !== "all") items = items.filter(l => l.category === activeCategory);
  if (searchTerm.trim()) {
    const t = searchTerm.toLowerCase();
    items = items.filter(l =>
      (l.title || "").toLowerCase().includes(t) ||
      (l.custom_fields || []).some(f => (f.value || "").toLowerCase().includes(t))
    );
  }

  if (items.length === 0) { empty.style.display = "block"; return; }
  empty.style.display = "none";

  items.forEach(listing => {
    const card = document.createElement("div");
    card.className = "card";
    const media = (listing.media && listing.media.photos && listing.media.photos[0]) || "";
    card.innerHTML = `
      <div class="card-media">
        ${media ? `<img src="${media}" alt="${escapeHtml(listing.title)}">` : ""}
        <div class="card-cat">${escapeHtml(listing.category || "")}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(listing.title || "Untitled")}</div>
        <div class="card-price">${listing.price ? "Rs. " + Number(listing.price).toLocaleString() : ""}</div>
      </div>`;
    card.onclick = () => openListing(listing);
    grid.appendChild(card);
  });
}

document.getElementById("searchBtn").addEventListener("click", () => {
  searchTerm = document.getElementById("searchInput").value;
  renderListings();
});
document.getElementById("searchInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { searchTerm = e.target.value; renderListings(); }
});

// ---------- Listing detail modal ----------
function openListing(listing) {
  const backdrop = document.getElementById("modalBackdrop");
  const content = document.getElementById("modalContent");

  const photos = (listing.media && listing.media.photos) || [];
  const videos = (listing.media && listing.media.videos) || [];
  const galleryItems = [
    ...photos.map(url => `
      <div class="gallery-item" data-type="image" data-url="${escapeAttr(url)}">
        <img src="${url}" loading="lazy">
      </div>`),
    ...videos.map(url => `
      <div class="gallery-item" data-type="video" data-url="${escapeAttr(url)}">
        ${videoThumbHtml(url)}
        <div class="play-badge"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg></div>
      </div>`)
  ].join("");

  const fieldsHtml = (listing.custom_fields || []).map(f => `
    <div class="field-row">
      <span class="field-name">${escapeHtml(f.name)}</span>
      <span class="field-val">${escapeHtml(f.value)}</span>
    </div>`).join("");

  content.innerHTML = `
    <button class="modal-close" id="closeModal">&times;</button>
    <div class="pill-badge" style="margin-bottom:8px;display:inline-block;">${escapeHtml(listing.category || "")}</div>
    <h2 class="display" style="font-size:26px;">${escapeHtml(listing.title || "Untitled")}</h2>
    <div class="card-price" style="margin-top:6px;">${listing.price ? "Rs. " + Number(listing.price).toLocaleString() : ""}</div>
    <div class="modal-gallery">${galleryItems}</div>
    ${listing.voice_note_url ? `<div class="voice-player"><audio controls src="${listing.voice_note_url}" style="width:100%;"></audio></div>` : ""}
    <div>${fieldsHtml}</div>
    <div class="action-row">
      <button class="btn primary" id="shareBtn">Share listing</button>
      <button class="btn" id="copyLinkBtn">Copy link</button>
    </div>
    <div class="offer-form">
      <h3 style="font-size:15px;margin-top:20px;">Make an offer / leave a suggestion</h3>
      <input type="text" id="offerName" placeholder="Your name">
      <input type="text" id="offerPhone" placeholder="Phone / WhatsApp (optional)">
      <input type="number" id="offerAmount" placeholder="Your offer amount (Rs.)">
      <textarea id="offerComment" placeholder="Comment or suggestion (optional)" rows="2"></textarea>
      <button class="btn primary" id="submitOffer">Submit offer</button>
    </div>
    <div class="offer-list" id="offerList"></div>
  `;

  backdrop.style.display = "flex";
  document.getElementById("closeModal").onclick = () => backdrop.style.display = "none";
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.style.display = "none"; };

  content.querySelectorAll(".gallery-item").forEach(el => {
    el.addEventListener("click", () => openLightbox(el.dataset.url, el.dataset.type));
  });

  const shareUrl = `${window.location.origin}${window.location.pathname}?listing=${listing.id}`;
  document.getElementById("shareBtn").onclick = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: listing.title, url: shareUrl }); } catch (e) {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard");
    }
  };
  document.getElementById("copyLinkBtn").onclick = () => {
    navigator.clipboard.writeText(shareUrl);
    showToast("Link copied to clipboard");
  };

  loadOffers(listing.id);
  document.getElementById("submitOffer").onclick = () => submitOffer(listing.id);
}

async function loadOffers(listingId) {
  const { data, error } = await supabase.from("offers").select("*").eq("listing_id", listingId).order("created_at", { ascending: false });
  const list = document.getElementById("offerList");
  if (!list) return;
  if (error) { list.innerHTML = ""; return; }
  list.innerHTML = (data || []).map(o => `<div class="offer-item"><span class="offer-amount">Rs. ${o.amount ? Number(o.amount).toLocaleString() : "-"}</span>
    — ${escapeHtml(o.name || "Anonymous")} ${o.comment ? "· " + escapeHtml(o.comment) : ""}</div>`).join("");
}

async function submitOffer(listingId) {
  const name = document.getElementById("offerName").value.trim();
  const phone = document.getElementById("offerPhone").value.trim();
  const amount = document.getElementById("offerAmount").value;
  const comment = document.getElementById("offerComment").value.trim();

  if (!name || !amount) { showToast("Please enter your name and offer amount"); return; }

  const { error } = await supabase.from("offers").insert({
    listing_id: listingId, name, phone, amount: Number(amount), comment
  });
  if (error) { showToast("Could not submit offer: " + error.message); return; }

  await supabase.from("notifications").insert({
    type: "offer", listing_id: listingId,
    message: `${name} offered Rs. ${Number(amount).toLocaleString()}`,
    read: false
  });

  document.getElementById("offerName").value = "";
  document.getElementById("offerPhone").value = "";
  document.getElementById("offerAmount").value = "";
  document.getElementById("offerComment").value = "";
  showToast("Offer submitted!");
  loadOffers(listingId);
}

// ---------- Video helpers (YouTube/Vimeo links vs direct video files) ----------
function getYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}
function getVimeoId(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}
function embedHtml(url) {
  const yt = getYouTubeId(url);
  if (yt) return `<iframe src="https://www.youtube.com/embed/${yt}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  const vm = getVimeoId(url);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm}" allow="autoplay" allowfullscreen></iframe>`;
  return `<video src="${url}" controls autoplay></video>`;
}
function videoThumbHtml(url) {
  const yt = getYouTubeId(url);
  if (yt) return `<img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg">`;
  // Direct file: show a muted, non-controlled preview frame
  return `<video src="${url}" muted></video>`;
}

// ---------- Lightbox ----------
function openLightbox(url, type) {
  const lb = document.getElementById("lightbox");
  const content = document.getElementById("lightboxContent");
  content.innerHTML = type === "video" ? embedHtml(url) : `<img src="${url}">`;
  lb.style.display = "flex";
}
function closeLightbox() {
  document.getElementById("lightboxContent").innerHTML = "";
  document.getElementById("lightbox").style.display = "none";
}
document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
document.getElementById("lightbox").addEventListener("click", (e) => {
  if (e.target.id === "lightbox") closeLightbox();
});

function showToast(msg) {
  const host = document.getElementById("toastHost");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }

loadSiteSettings();
loadAdminProfile();
loadCategories();
loadListings();
