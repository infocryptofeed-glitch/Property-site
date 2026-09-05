-- ============================================================
-- PROPERTY SITE — SUPABASE DATABASE SETUP
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. TABLES
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  price numeric default 0,
  media jsonb default '{"photos":[],"videos":[]}',
  voice_note_url text,
  custom_fields jsonb default '[]',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  name text,
  phone text,
  amount numeric,
  comment text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text,
  listing_id uuid,
  message text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists site_settings (
  id text primary key default 'main',
  site_name text,
  banner_title text,
  banner_subtitle text,
  contact_phone text,
  contact_email text,
  social_links jsonb default '{}'
);

create table if not exists admin_profile (
  id text primary key default 'main',
  name text,
  bio text,
  phone text,
  photo_url text
);

-- 2. ENABLE ROW LEVEL SECURITY
alter table categories enable row level security;
alter table listings enable row level security;
alter table offers enable row level security;
alter table notifications enable row level security;
alter table site_settings enable row level security;
alter table admin_profile enable row level security;

-- 3. POLICIES
-- Categories: everyone can read; only logged-in admin can add/remove
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_insert" on categories for insert with check (auth.role() = 'authenticated');
create policy "categories_admin_delete" on categories for delete using (auth.role() = 'authenticated');

-- Listings: everyone can read; only logged-in admin can add/edit/delete
create policy "listings_public_read" on listings for select using (true);
create policy "listings_admin_insert" on listings for insert with check (auth.role() = 'authenticated');
create policy "listings_admin_update" on listings for update using (auth.role() = 'authenticated');
create policy "listings_admin_delete" on listings for delete using (auth.role() = 'authenticated');

-- Offers: visitors on the public site can submit AND read offers (same as before)
create policy "offers_public_read" on offers for select using (true);
create policy "offers_public_insert" on offers for insert with check (true);

-- Notifications: visitors trigger an insert when they submit an offer;
-- only the logged-in admin can read/mark them as read
create policy "notifications_public_insert" on notifications for insert with check (true);
create policy "notifications_admin_read" on notifications for select using (auth.role() = 'authenticated');
create policy "notifications_admin_update" on notifications for update using (auth.role() = 'authenticated');

-- Site settings: everyone can read (needed for public homepage); only admin can save
create policy "site_settings_public_read" on site_settings for select using (true);
create policy "site_settings_admin_insert" on site_settings for insert with check (auth.role() = 'authenticated');
create policy "site_settings_admin_update" on site_settings for update using (auth.role() = 'authenticated');

-- Admin profile: everyone can read (needed for public trust badge); only admin can save
create policy "admin_profile_public_read" on admin_profile for select using (true);
create policy "admin_profile_admin_insert" on admin_profile for insert with check (auth.role() = 'authenticated');
create policy "admin_profile_admin_update" on admin_profile for update using (auth.role() = 'authenticated');

-- 4. REALTIME (so the public site & admin panel update live, like Firestore did)
alter publication supabase_realtime add table listings;
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table notifications;

-- ============================================================
-- STORAGE POLICIES (for the "property-media" bucket)
-- Only needed if you haven't already set these up.
-- Now restricted to admin-only uploads since login uses Supabase Auth.
-- ============================================================
-- Run these separately if the bucket policies need updating:
-- create policy "media_public_read" on storage.objects for select using (bucket_id = 'property-media');
-- create policy "media_admin_insert" on storage.objects for insert with check (bucket_id = 'property-media' and auth.role() = 'authenticated');
