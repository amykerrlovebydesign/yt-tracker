-- Run this in your Supabase dashboard → SQL Editor
-- Adds a 'views' column so you can enter YouTube view counts per video

ALTER TABLE video_revenue ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
