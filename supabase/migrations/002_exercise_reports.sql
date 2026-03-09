-- ================================================================
-- Migration 002: Exercise Reports
-- Date: 2026-03-09
-- Description: Adds exercise_reports table so users can flag/report
--              exercises that have errors, typos, or unclear content.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.exercise_reports (
  id            SERIAL       PRIMARY KEY,
  exercise_id   INTEGER      NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  user_id       UUID         REFERENCES public.users(id) ON DELETE SET NULL,  -- nullable (anonymous allowed)
  reason        VARCHAR      NOT NULL DEFAULT 'other'
                             CHECK (reason IN ('wrong_answer', 'typo', 'unclear', 'broken_image', 'other')),
  content       TEXT         NOT NULL,
  status        VARCHAR      NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Index for quick lookup by exercise
CREATE INDEX IF NOT EXISTS idx_exercise_reports_exercise_id
  ON public.exercise_reports(exercise_id);

-- Index for quick lookup by user
CREATE INDEX IF NOT EXISTS idx_exercise_reports_user_id
  ON public.exercise_reports(user_id);

-- RLS: authenticated users can insert their own reports
ALTER TABLE public.exercise_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert reports"
  ON public.exercise_reports
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all reports"
  ON public.exercise_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own reports"
  ON public.exercise_reports
  FOR SELECT
  USING (user_id = auth.uid());
