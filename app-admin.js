import { supabaseConfig } from "./supabase-config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

// ---------------- THEME TOGGLE ----------------
const sunIcon = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/></svg>`;
const moonIcon = `<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>`;
function applyTheme(mode) {
  document.body.classList.toggle("light-theme", mode === "light");
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = mode === "light" ? moonIcon : sunIcon;
}
applyTheme(localStorage.getItem("siteTheme") || "dark");
document.getElementById("themeToggle").addEventListener("click", () => {
  const next = document.body.classList.contains("light-theme") ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem("siteTheme", next);
});

// Uploads a File or Blob to Supabase Storage and returns its public URL
async function uploadToSupabase(fileOrBlob, folder, filename) {
  const path = `${folder}/${Date.now()}_${filename}`;
  const { error } = await supabase.storage.from(supabaseConfig.bucket).upload(path, fileOrBlob, {
    contentType: fileOrBlob.type || undefined,
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(supabaseConfig.bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------- AUTH ----------------
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById("loginError").textContent = "Login failed. Check email/password.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => supabase.auth.signOut());

function reflectSession(session) {
  const user = session?.user || null;
  document.getElementById("loginWrap").style.display = user ? "none" : "flex";
  document.getElementById("adminShell").style.display = user ? "grid" : "none";
  if (user) initAdminData();
}

supabase.auth.onAuthStateChange((_event, session) => reflectSession(session));
supabase.auth.getSession().then(({ data }) => reflectSession(data.session));

// ---------------- SIDEBAR NAV ----------------
document.querySelectorAll(".side-link[data-panel]").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".side-link").forEach(l => l.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    link.classList.add("active");
    document.getElementById(link.dataset.panel).classList.add("active");
  });
});

function showToast(msg) {
  const host = document.getElementById("toastHost");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

let initialized = false;
function initAdminData() {
  if (initialized) return;
  initialized = true;
  loadCategories();
  loadListings();
  loadNotifications();
  loadSiteSettingsForm();
  loadProfileForm();
}

// ---------------- CATEGORIES (merged into Add Listing) ----------------
let categoriesCache = [];
function loadCategories() {
  fetchCategories();
  supabase.channel("admin-categories")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, fetchCategories)
    .subscribe();
}
async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("created_at");
  if (error) { showToast("Could not load categories: " + error.message); return; }
  categoriesCache = data || [];
  renderCategoryHints();
}

function renderCategoryHints() {
  const dl = document.getElementById("categoryOptions");
  dl.innerHTML = categoriesCache.map(c => `<option value="${escapeAttr(c.name)}">`).join("");

  const chips = document.getElementById("categoryChips");
  chips.innerHTML = categoriesCache.map(c => `
    <span class="chip">${escapeHtml(c.name)}<button type="button" data-id="${c.id}" title="Remove category">✕</button></span>
  `).join("");
  chips.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", async () => {
      const { error } = await supabase.from("categories").delete().eq("id", btn.dataset.id);
      if (error) showToast("Could not remove category: " + error.message);
      else showToast("Category removed");
    });
  });
}

// Ensures a category exists; creates it if the admin typed a new one
async function ensureCategoryExists(name) {
  if (!name) return;
  const exists = categoriesCache.some(c => c.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    const { error } = await supabase.from("categories").insert({ name });
    if (error) throw error;
  }
}

// ---------------- DYNAMIC CUSTOM OPTIONS ----------------
function addOptionRow(name = "", value = "") {
  const wrap = document.getElementById("optionsWrap");
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <div>
      <input type="text" class="opt-name" placeholder="Field name (e.g. Plot Size)" value="${escapeAttr(name)}">
      <div class="helper opt-helper">Type a label for this detail</div>
    </div>
    <input type="text" class="opt-value" placeholder="Value" value="${escapeAttr(value)}">
    <button type="button" class="removeOpt">✕</button>
  `;
  const nameInput = row.querySelector(".opt-name");
  const helper = row.querySelector(".opt-helper");
  nameInput.addEventListener("input", () => {
    helper.textContent = nameInput.value ? `Enter the value for "${nameInput.value}"` : "Type a label for this detail";
  });
  row.querySelector(".removeOpt").addEventListener("click", () => row.remove());
  wrap.appendChild(row);
}
document.getElementById("addOptionBtn").addEventListener("click", () => addOptionRow());

function collectOptions() {
  return Array.from(document.querySelectorAll("#optionsWrap .option-row")).map(row => ({
    name: row.querySelector(".opt-name").value.trim(),
    value: row.querySelector(".opt-value").value.trim(),
    helperText: `Value for ${row.querySelector(".opt-name").value.trim()}`
  })).filter(o => o.name);
}

// ---------------- MEDIA UPLOAD ----------------
let pendingMedia = { photos: [], videos: [] }; // arrays of {url}

function renderMediaPreview() {
  const wrap = document.getElementById("mediaPreview");
  wrap.innerHTML = "";
  [...pendingMedia.photos.map(m => ({...m, kind:"photo"})), ...pendingMedia.videos.map(m => ({...m, kind:"video"}))]
    .forEach((m) => {
      const div = document.createElement("div");
      div.className = "media-thumb";
      div.innerHTML = m.kind === "photo"
        ? `<img src="${m.url}">`
        : `<video src="${m.url}"></video>`;
      const rm = document.createElement("button");
      rm.className = "rm"; rm.textContent = "✕";
      rm.onclick = () => {
        const arr = m.kind === "photo" ? pendingMedia.photos : pendingMedia.videos;
        const i = arr.indexOf(m);
        if (i > -1) arr.splice(i, 1);
        renderMediaPreview();
      };
      div.appendChild(rm);
      wrap.appendChild(div);
    });
}

document.getElementById("mediaUpload").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const isVideo = file.type.startsWith("video");
    try {
      const url = await uploadToSupabase(file, "listings", file.name);
      (isVideo ? pendingMedia.videos : pendingMedia.photos).push({ url });
    } catch (err) {
      showToast("Upload failed: " + err.message);
    }
  }
  renderMediaPreview();
  e.target.value = "";
});

document.getElementById("addMediaLink").addEventListener("click", () => {
  const val = document.getElementById("mediaLinkInput").value.trim();
  if (!val) return;
  const isVideo = /\.(mp4|mov|webm)$/i.test(val) || val.includes("youtube") || val.includes("vimeo");
  (isVideo ? pendingMedia.videos : pendingMedia.photos).push({ url: val });
  document.getElementById("mediaLinkInput").value = "";
  renderMediaPreview();
});

// ---------------- VOICE NOTE ----------------
let mediaRecorder, audioChunks = [], voiceBlobUrl = null, voiceUploadedUrl = null;
document.getElementById("recBtn").addEventListener("click", async () => {
  const btn = document.getElementById("recBtn");
  const dot = document.getElementById("recDot");
  const label = document.getElementById("recLabel");

  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      voiceBlobUrl = URL.createObjectURL(blob);
      const preview = document.getElementById("voicePreview");
      preview.src = voiceBlobUrl; preview.style.display = "block";

      try {
        voiceUploadedUrl = await uploadToSupabase(blob, "voice-notes", "note.webm");
        showToast("Voice note saved");
        document.getElementById("removeVoiceBtn").style.display = "inline-block";
      } catch (err) {
        showToast("Voice upload failed: " + err.message);
      }
    };
    mediaRecorder.start();
    btn.classList.add("recording"); dot.style.display = "inline-block"; label.textContent = "Stop recording";
  } else {
    mediaRecorder.stop();
    btn.classList.remove("recording"); dot.style.display = "none"; label.textContent = "Record voice note";
  }
});

document.getElementById("removeVoiceBtn").addEventListener("click", () => {
  voiceUploadedUrl = null;
  voiceBlobUrl = null;
  const preview = document.getElementById("voicePreview");
  preview.src = ""; preview.style.display = "none";
  document.getElementById("removeVoiceBtn").style.display = "none";
  showToast("Voice note removed");
});

// ---------------- PUBLISH / EDIT LISTING ----------------
let editingId = null;

document.getElementById("publishBtn").addEventListener("click", async () => {
  const title = document.getElementById("listingTitle").value.trim();
  const category = document.getElementById("listingCategory").value.trim();
  const price = document.getElementById("listingPrice").value;
  const customFields = collectOptions();

  if (!title) { showToast("Please enter a listing title"); return; }

  const payload = {
    title, category, price: Number(price) || 0,
    media: { photos: pendingMedia.photos.map(m => m.url), videos: pendingMedia.videos.map(m => m.url) },
    voice_note_url: voiceUploadedUrl || "",
    custom_fields: customFields,
    status: "active",
    updated_at: new Date().toISOString()
  };

  try {
    if (category) await ensureCategoryExists(category);

    if (editingId) {
      const { error } = await supabase.from("listings").update(payload).eq("id", editingId);
      if (error) throw error;
      showToast("Listing updated");
    } else {
      payload.created_at = new Date().toISOString();
      const { error } = await supabase.from("listings").insert(payload);
      if (error) throw error;
      showToast("Listing published");
    }
    resetForm();
  } catch (err) {
    showToast("Could not save listing: " + err.message);
    console.error(err);
  }
});

function resetForm() {
  editingId = null;
  document.getElementById("editingIdNote").style.display = "none";
  document.getElementById("formHeading").textContent = "Add Listing";
  document.getElementById("listingTitle").value = "";
  document.getElementById("listingPrice").value = "";
  document.getElementById("optionsWrap").innerHTML = "";
  pendingMedia = { photos: [], videos: [] };
  renderMediaPreview();
  voiceUploadedUrl = null;
  document.getElementById("voicePreview").style.display = "none";
}

// ---------------- LISTINGS LIST (edit/delete) ----------------
function loadListings() {
  fetchListings();
  supabase.channel("admin-listings")
    .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, fetchListings)
    .subscribe();
}

async function fetchListings() {
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (error) { showToast("Could not load listings: " + error.message); return; }
  renderListingsList(data || []);
}

function renderListingsList(items) {
  const list = document.getElementById("listingsList");
  list.innerHTML = items.map(l => `
    <div class="admin-list-item">
      <div>
        <div>${escapeHtml(l.title || "Untitled")}</div>
        <div class="meta">${escapeHtml(l.category || "")} · Rs. ${l.price ? Number(l.price).toLocaleString() : "0"}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn" data-id="${l.id}" data-action="edit">Edit</button>
        <button class="btn" data-id="${l.id}" data-action="delete">Delete</button>
      </div>
    </div>`).join("") || `<p class="helper">No listings yet — add your first one from "Add Listing".</p>`;

  list.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener("click", () => editListing(items.find(i => i.id === btn.dataset.id)));
  });
  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Delete this listing?")) {
        const { error } = await supabase.from("listings").delete().eq("id", btn.dataset.id);
        if (error) showToast("Could not delete: " + error.message);
        else showToast("Listing deleted");
      }
    });
  });
}

function editListing(listing) {
  editingId = listing.id;
  document.querySelectorAll(".side-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelector('[data-panel="panelAdd"]').classList.add("active");
  document.getElementById("panelAdd").classList.add("active");

  document.getElementById("formHeading").textContent = "Edit Listing";
  document.getElementById("editingIdNote").style.display = "inline";
  document.getElementById("editingIdNote").textContent = "Editing: " + (listing.title || "");
  document.getElementById("listingTitle").value = listing.title || "";
  document.getElementById("listingPrice").value = listing.price || "";
  document.getElementById("listingCategory").value = listing.category || "";

  document.getElementById("optionsWrap").innerHTML = "";
  (listing.custom_fields || []).forEach(f => addOptionRow(f.name, f.value));

  pendingMedia = {
    photos: (listing.media?.photos || []).map(url => ({ url })),
    videos: (listing.media?.videos || []).map(url => ({ url }))
  };
  renderMediaPreview();
  voiceUploadedUrl = listing.voice_note_url || null;
  if (voiceUploadedUrl) {
    document.getElementById("voicePreview").src = voiceUploadedUrl;
    document.getElementById("voicePreview").style.display = "block";
    document.getElementById("removeVoiceBtn").style.display = "inline-block";
  } else {
    document.getElementById("removeVoiceBtn").style.display = "none";
  }
}

// ---------------- NOTIFICATIONS ----------------
function loadNotifications() {
  fetchNotifications();
  supabase.channel("admin-notifications")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, fetchNotifications)
    .subscribe();
}

async function fetchNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error) return;
  const items = data || [];
  const unread = items.filter(n => !n.read).length;
  document.getElementById("notifDot").style.display = unread > 0 ? "inline-block" : "none";

  const list = document.getElementById("notifList");
  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read ? "" : "unread"}" data-id="${n.id}">
      ${escapeHtml(n.message || "")}
    </div>`).join("") || `<p class="helper">No notifications yet.</p>`;

  list.querySelectorAll(".notif-item").forEach(el => {
    el.addEventListener("click", async () => {
      await supabase.from("notifications").update({ read: true }).eq("id", el.dataset.id);
    });
  });
}

// ---------------- SITE SETTINGS ----------------
async function loadSiteSettingsForm() {
  const { data } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
  if (!data) return;
  document.getElementById("siteNameInput").value = data.site_name || "";
  document.getElementById("bannerTitleInput").value = data.banner_title || "";
  document.getElementById("bannerSubtitleInput").value = data.banner_subtitle || "";
  document.getElementById("contactPhoneInput").value = data.contact_phone || "";
  document.getElementById("contactEmailInput").value = data.contact_email || "";
  document.getElementById("facebookInput").value = data.social_links?.facebook || "";
  document.getElementById("instagramInput").value = data.social_links?.instagram || "";
  document.getElementById("tiktokInput").value = data.social_links?.tiktok || "";
  document.getElementById("whatsappInput").value = data.social_links?.whatsapp || "";
}

document.getElementById("saveSiteBtn").addEventListener("click", async () => {
  try {
    const payload = {
      id: "main",
      site_name: document.getElementById("siteNameInput").value.trim(),
      banner_title: document.getElementById("bannerTitleInput").value.trim(),
      banner_subtitle: document.getElementById("bannerSubtitleInput").value.trim(),
      contact_phone: document.getElementById("contactPhoneInput").value.trim(),
      contact_email: document.getElementById("contactEmailInput").value.trim(),
      social_links: {
        facebook: document.getElementById("facebookInput").value.trim(),
        instagram: document.getElementById("instagramInput").value.trim(),
        tiktok: document.getElementById("tiktokInput").value.trim(),
        whatsapp: document.getElementById("whatsappInput").value.trim()
      }
    };
    const { error } = await supabase.from("site_settings").upsert(payload);
    if (error) throw error;
    showToast("Site settings saved");
  } catch (err) {
    showToast("Could not save site settings: " + err.message);
    console.error(err);
  }
});

// ---------------- ADMIN PROFILE ----------------
async function loadProfileForm() {
  const { data } = await supabase.from("admin_profile").select("*").eq("id", "main").maybeSingle();
  if (!data) return;
  document.getElementById("profileNameInput").value = data.name || "";
  document.getElementById("profileBioInput").value = data.bio || "";
  document.getElementById("profilePhoneInput").value = data.phone || "";
}

document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  let photoUrl = null;
  const file = document.getElementById("profilePhotoInput").files[0];
  if (file) {
    try {
      photoUrl = await uploadToSupabase(file, "profile", file.name);
    } catch (err) {
      showToast("Photo upload failed: " + err.message);
    }
  }
  const payload = {
    id: "main",
    name: document.getElementById("profileNameInput").value.trim(),
    bio: document.getElementById("profileBioInput").value.trim(),
    phone: document.getElementById("profilePhoneInput").value.trim()
  };
  if (photoUrl) payload.photo_url = photoUrl;
  try {
    const { error } = await supabase.from("admin_profile").upsert(payload);
    if (error) throw error;
    showToast("Profile saved");
  } catch (err) {
    showToast("Could not save profile: " + err.message);
    console.error(err);
  }
});

// ---------------- helpers ----------------
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function escapeAttr(str) { return escapeHtml(str); }
