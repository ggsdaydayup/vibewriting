-- ============================================================
-- vibewriting — Supabase PostgreSQL Schema
-- 在 Supabase Dashboard > SQL Editor 中执行此文件
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  genre       TEXT,
  cover_url   TEXT,
  persona_id  UUID,
  core_theme  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── chapters ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapters (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  "order"              INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft',
  content              TEXT,
  summary              TEXT,
  vibe_prompt          TEXT,
  word_count           INTEGER NOT NULL DEFAULT 0,
  end_snapshot         JSONB,
  theme_score          INTEGER,
  theme_score_reason   TEXT,
  writing_duration_sec INTEGER,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── personas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personas (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                TEXT NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT,
  style_tags             JSONB NOT NULL DEFAULT '[]',
  tone_words             JSONB NOT NULL DEFAULT '[]',
  hard_rules             JSONB NOT NULL DEFAULT '[]',
  banned_words           JSONB NOT NULL DEFAULT '[]',
  sample_texts           JSONB NOT NULL DEFAULT '[]',
  extracted_patterns     JSONB,
  system_prompt_fragment TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── characters ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.characters (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'supporting',
  description    TEXT,
  current_state  TEXT,
  start_state    TEXT,
  end_state      TEXT,
  behavior_rules JSONB NOT NULL DEFAULT '[]',
  arc_milestones JSONB NOT NULL DEFAULT '[]',
  relationships  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── foreshadowings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.foreshadowings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description         TEXT NOT NULL,
  planted_chapter     INTEGER NOT NULL,
  planned_collection  INTEGER,
  collected_chapter   INTEGER,
  status              TEXT NOT NULL DEFAULT 'planted',
  related_characters  JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── world_notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.world_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category   TEXT NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      TEXT NOT NULL UNIQUE,
  ai_provider  TEXT NOT NULL DEFAULT 'openai',
  ai_model     TEXT NOT NULL DEFAULT 'gpt-4o',
  ai_api_key   TEXT,
  ai_base_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user     ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project  ON public.chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order    ON public.chapters(project_id, "order");
CREATE INDEX IF NOT EXISTS idx_personas_user     ON public.personas(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_proj   ON public.characters(project_id);
CREATE INDEX IF NOT EXISTS idx_foreshadowings_proj ON public.foreshadowings(project_id);
CREATE INDEX IF NOT EXISTS idx_world_notes_proj  ON public.world_notes(project_id);

-- ── updated_at auto-update trigger ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects','chapters','personas','characters',
    'foreshadowings','world_notes','user_settings'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON public.%s
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreshadowings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings   ENABLE ROW LEVEL SECURITY;

-- projects: 只能访问自己的
CREATE POLICY "projects_owner" ON public.projects
  USING (user_id = auth.uid()::TEXT);

-- chapters: 通过 project 归属验证
CREATE POLICY "chapters_owner" ON public.chapters
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()::TEXT
  ));

-- personas: 只能访问自己的
CREATE POLICY "personas_owner" ON public.personas
  USING (user_id = auth.uid()::TEXT);

-- characters: 通过 project 归属验证
CREATE POLICY "characters_owner" ON public.characters
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()::TEXT
  ));

-- foreshadowings: 通过 project 归属验证
CREATE POLICY "foreshadowings_owner" ON public.foreshadowings
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()::TEXT
  ));

-- world_notes: 通过 project 归属验证
CREATE POLICY "world_notes_owner" ON public.world_notes
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()::TEXT
  ));

-- user_settings: 只能访问自己的
CREATE POLICY "settings_owner" ON public.user_settings
  USING (user_id = auth.uid()::TEXT);

-- ============================================================
-- API 后端使用 service_role key 绕过 RLS（不需要额外配置）
-- 前端使用 anon key + JWT，RLS 自动生效
-- ============================================================
