-- Phase 3: add theme_score and writing_duration to chapters
ALTER TABLE chapters ADD COLUMN theme_score INTEGER;
ALTER TABLE chapters ADD COLUMN theme_score_reason TEXT;
ALTER TABLE chapters ADD COLUMN writing_duration_sec INTEGER;
