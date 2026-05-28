-- Run this in your Supabase SQL Editor

-- Table 1: Every link click
create table if not exists link_clicks (
  id           bigserial primary key,
  video_id     text not null,
  destination  text not null check (destination in ('call','webinar','quiz','guide')),
  clicked_at   timestamptz not null default now(),
  user_agent   text,
  referer      text
);

-- Index for fast lookups by video
create index if not exists link_clicks_video_id_idx on link_clicks(video_id);

-- Table 2: Revenue per video (manually entered in admin)
create table if not exists video_revenue (
  video_id   text primary key,
  revenue    numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Disable Row Level Security (server-side only access via service key)
alter table link_clicks disable row level security;
alter table video_revenue disable row level security;
