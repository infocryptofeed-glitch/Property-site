// Supabase now handles EVERYTHING: Auth (admin login) + Database (listings, categories,
// offers, notifications, site settings, profile) + Storage (photos/videos/voice notes).
// Firebase is no longer used anywhere in this project.
export const supabaseConfig = {
  url: "https://nkcbbzkwrvojzupqkuzb.supabase.co",
  anonKey: "sb_publishable_ADX8EEph46gQzayJPATkEw_P1c6Uq3L",
  bucket: "property-media" // must match the bucket name in Supabase Storage (set to Public)
};
