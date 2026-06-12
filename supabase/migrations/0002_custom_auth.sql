-- ============================================================
-- vibewriting — 自定义用户认证表（替代 Supabase Auth）
-- 适用于自托管 PostgreSQL（阿里云 RDS / 腾讯云 TDSQL-PG 等）
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- updated_at 自动更新触发器（复用已有函数）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
