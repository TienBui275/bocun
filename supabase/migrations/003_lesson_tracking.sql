-- ================================================================
-- Migration 003: Lesson Progress Tracking
-- Date: 2026-03-09
-- Replaces: student_progress (per-question raw data)
--           lesson_completions (only stored best score, no done_count/hint)
-- Adds:     exercise_results   – per-exercise status (latest attempt)
--           lesson_progress    – pre-aggregated per-lesson stats
--           daily_study_log    – time tracking per day
--           submit_exercise_answer() – atomic function to write all tables
-- ================================================================

-- ================================================================
-- TABLE 1: exercise_results
-- One row per (user, exercise) – tracks the LATEST attempt state.
-- is_correct reflects the most recent answer, NOT the best answer.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.exercise_results (
  user_id        UUID        NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
  exercise_id    INTEGER     NOT NULL REFERENCES public.exercises(id)  ON DELETE CASCADE,
  lesson_id      INTEGER     NOT NULL REFERENCES public.lessons(id)    ON DELETE CASCADE,

  -- Latest attempt state (always overwritten with newest answer)
  is_correct     BOOLEAN     NOT NULL,

  -- hint_used is cumulative: once TRUE stays TRUE across retries
  hint_used      BOOLEAN     NOT NULL DEFAULT false,

  -- How many times the student has tried this exercise
  attempt_count  INTEGER     NOT NULL DEFAULT 1,

  answered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, exercise_id)
);

-- ================================================================
-- TABLE 2: lesson_progress
-- One row per (user, lesson) – pre-aggregated for fast dashboard loads.
-- Always kept in sync by submit_exercise_answer() below.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  user_id          UUID     NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  lesson_id        INTEGER  NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  unit_id          INTEGER  NOT NULL REFERENCES public.units(id)    ON DELETE CASCADE,

  -- done_count   = exercises attempted (correct + wrong, based on latest state)
  -- correct_count reflects latest is_correct, so it can go down if student
  -- re-answers a previously correct exercise incorrectly.
  done_count       INTEGER  NOT NULL DEFAULT 0,
  correct_count    INTEGER  NOT NULL DEFAULT 0,

  -- Number of distinct exercises where hint was ever used (cumulative, never decreases)
  hint_used_count  INTEGER  NOT NULL DEFAULT 0,

  -- Computed when lesson fully completed (done_count = lessons.exercise_count)
  -- NULL = not yet finished
  star_rating      INTEGER  CHECK (star_rating IN (1, 2, 3)),

  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, lesson_id)
);

-- Derived values (compute on the fly in app):
--   wrong_count    = done_count - correct_count
--   not_done_count = lessons.exercise_count - done_count
--   score_pct      = correct_count * 100.0 / lessons.exercise_count

-- ================================================================
-- TABLE 3: daily_study_log
-- One row per (user, date) – accumulates time and exercise counts.
-- Updated each time submit_exercise_answer() is called.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.daily_study_log (
  user_id          UUID     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  study_date       DATE     NOT NULL DEFAULT CURRENT_DATE,

  -- Total seconds spent studying on this date (accumulated across all answers)
  time_spent_secs  INTEGER  NOT NULL DEFAULT 0,

  -- Total answers submitted on this date
  exercises_done   INTEGER  NOT NULL DEFAULT 0,

  PRIMARY KEY (user_id, study_date)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- exercise_results: lookup by lesson (for "which exercises in lesson X are wrong?")
CREATE INDEX IF NOT EXISTS idx_er_user_lesson
  ON public.exercise_results(user_id, lesson_id);

-- exercise_results: filter wrong answers quickly
CREATE INDEX IF NOT EXISTS idx_er_user_lesson_correct
  ON public.exercise_results(user_id, lesson_id, is_correct);

-- lesson_progress: load all lessons for a user (dashboard)
CREATE INDEX IF NOT EXISTS idx_lp_user
  ON public.lesson_progress(user_id);

-- lesson_progress: lookup single lesson
CREATE INDEX IF NOT EXISTS idx_lp_user_lesson
  ON public.lesson_progress(user_id, lesson_id);

-- daily_study_log: range queries (e.g. last 7 days)
CREATE INDEX IF NOT EXISTS idx_dsl_user_date
  ON public.daily_study_log(user_id, study_date);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.exercise_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study_log   ENABLE ROW LEVEL SECURITY;

-- exercise_results
CREATE POLICY "Users read own exercise results"
  ON public.exercise_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own exercise results"
  ON public.exercise_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own exercise results"
  ON public.exercise_results FOR UPDATE USING (auth.uid() = user_id);

-- lesson_progress
CREATE POLICY "Users read own lesson progress"
  ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own lesson progress"
  ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own lesson progress"
  ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- daily_study_log
CREATE POLICY "Users read own daily log"
  ON public.daily_study_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own daily log"
  ON public.daily_study_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own daily log"
  ON public.daily_study_log FOR UPDATE USING (auth.uid() = user_id);

-- ================================================================
-- CORE FUNCTION: submit_exercise_answer()
--
-- Call this once per answer submission. It atomically:
--   1. UPSERTs exercise_results   (latest is_correct)
--   2. Updates lesson_progress    (adjusts deltas based on old vs new state)
--   3. Accumulates daily_study_log (time + exercise count for today)
--
-- Parameters:
--   p_user_id      – authenticated user UUID
--   p_exercise_id  – exercise being answered
--   p_lesson_id    – lesson this exercise belongs to
--   p_unit_id      – unit this lesson belongs to
--   p_is_correct   – did the student answer correctly THIS time?
--   p_hint_used    – did the student use the hint THIS time?
--   p_time_secs    – seconds spent on this exercise (for daily log)
-- ================================================================
CREATE OR REPLACE FUNCTION public.submit_exercise_answer(
  p_user_id      UUID,
  p_exercise_id  INTEGER,
  p_lesson_id    INTEGER,
  p_unit_id      INTEGER,
  p_is_correct   BOOLEAN,
  p_hint_used    BOOLEAN,
  p_time_secs    INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_is_correct  BOOLEAN;
  v_old_hint_used   BOOLEAN;
  v_is_new_attempt  BOOLEAN;
  v_done_delta      INTEGER := 0;
  v_correct_delta   INTEGER := 0;
  v_hint_delta      INTEGER := 0;
  v_total_ex        INTEGER;
  v_new_correct     INTEGER;
  v_new_star        INTEGER;
BEGIN

  -- ── Step 1: Read existing state for this exercise ──────────────
  SELECT is_correct, hint_used
    INTO v_old_is_correct, v_old_hint_used
    FROM public.exercise_results
   WHERE user_id = p_user_id AND exercise_id = p_exercise_id;

  v_is_new_attempt := NOT FOUND;

  -- ── Step 2: UPSERT exercise_results ────────────────────────────
  -- is_correct always reflects the LATEST answer.
  -- hint_used is cumulative (never resets to false even on retry).
  INSERT INTO public.exercise_results
    (user_id, exercise_id, lesson_id, is_correct, hint_used, attempt_count, answered_at)
  VALUES
    (p_user_id, p_exercise_id, p_lesson_id, p_is_correct, p_hint_used, 1, NOW())
  ON CONFLICT (user_id, exercise_id) DO UPDATE SET
    is_correct    = EXCLUDED.is_correct,
    hint_used     = exercise_results.hint_used OR EXCLUDED.hint_used,
    attempt_count = exercise_results.attempt_count + 1,
    answered_at   = NOW();

  -- ── Step 3: Calculate deltas for lesson_progress ───────────────
  IF v_is_new_attempt THEN
    -- First time attempting this exercise
    v_done_delta    := 1;
    v_correct_delta := CASE WHEN p_is_correct THEN 1 ELSE 0 END;
    v_hint_delta    := CASE WHEN p_hint_used  THEN 1 ELSE 0 END;
  ELSE
    -- Retrying a previously attempted exercise
    v_done_delta    := 0;  -- already counted in done_count
    v_correct_delta := CASE
      WHEN p_is_correct AND NOT v_old_is_correct THEN  1  -- wrong → correct
      WHEN NOT p_is_correct AND v_old_is_correct THEN -1  -- correct → wrong
      ELSE 0                                               -- no change
    END;
    -- hint_used_count only grows (once used, always counted)
    v_hint_delta := CASE
      WHEN p_hint_used AND NOT v_old_hint_used THEN 1
      ELSE 0
    END;
  END IF;

  -- ── Step 4: UPSERT lesson_progress ─────────────────────────────
  INSERT INTO public.lesson_progress
    (user_id, lesson_id, unit_id, done_count, correct_count, hint_used_count, last_activity_at)
  VALUES
    (p_user_id, p_lesson_id, p_unit_id,
     v_done_delta,
     GREATEST(0, v_correct_delta),
     GREATEST(0, v_hint_delta),
     NOW())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    done_count       = lesson_progress.done_count    + v_done_delta,
    correct_count    = GREATEST(0, lesson_progress.correct_count    + v_correct_delta),
    hint_used_count  = GREATEST(0, lesson_progress.hint_used_count  + v_hint_delta),
    last_activity_at = NOW();

  -- ── Step 5: Recompute star_rating if lesson is now complete ────
  -- Get total exercises in this lesson and new correct_count
  SELECT l.exercise_count,
         lp.correct_count
    INTO v_total_ex, v_new_correct
    FROM public.lessons l
    JOIN public.lesson_progress lp
      ON lp.lesson_id = l.id
   WHERE l.id = p_lesson_id
     AND lp.user_id = p_user_id;

  IF v_total_ex IS NOT NULL AND v_new_correct IS NOT NULL THEN
    -- Only set star_rating when student has attempted every exercise
    DECLARE
      v_done INTEGER;
    BEGIN
      SELECT done_count INTO v_done
        FROM public.lesson_progress
       WHERE user_id = p_user_id AND lesson_id = p_lesson_id;

      IF v_done >= v_total_ex THEN
        v_new_star := CASE
          WHEN v_new_correct * 100.0 / v_total_ex >= 90 THEN 3
          WHEN v_new_correct * 100.0 / v_total_ex >= 60 THEN 2
          ELSE 1
        END;
        UPDATE public.lesson_progress
           SET star_rating = v_new_star
         WHERE user_id = p_user_id AND lesson_id = p_lesson_id;
      END IF;
    END;
  END IF;

  -- ── Step 6: Accumulate daily_study_log ─────────────────────────
  INSERT INTO public.daily_study_log
    (user_id, study_date, time_spent_secs, exercises_done)
  VALUES
    (p_user_id, CURRENT_DATE, p_time_secs, 1)
  ON CONFLICT (user_id, study_date) DO UPDATE SET
    time_spent_secs = daily_study_log.time_spent_secs + p_time_secs,
    exercises_done  = daily_study_log.exercises_done  + 1;

END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.submit_exercise_answer TO authenticated;

-- ================================================================
-- USEFUL VIEWS (optional – makes frontend queries simpler)
-- ================================================================

-- View: lesson stats enriched with not_done_count and wrong_count
CREATE OR REPLACE VIEW public.v_lesson_progress AS
SELECT
  lp.user_id,
  lp.lesson_id,
  lp.unit_id,
  lp.done_count,
  lp.correct_count,
  lp.done_count - lp.correct_count                       AS wrong_count,
  GREATEST(0, l.exercise_count - lp.done_count)          AS not_done_count,
  lp.hint_used_count,
  lp.star_rating,
  ROUND(lp.correct_count * 100.0 / NULLIF(l.exercise_count, 0), 1) AS score_pct,
  lp.last_activity_at
FROM public.lesson_progress lp
JOIN public.lessons l ON l.id = lp.lesson_id;

-- View: weekly study time (last 7 days) per user
CREATE OR REPLACE VIEW public.v_weekly_study AS
SELECT
  user_id,
  study_date,
  time_spent_secs,
  exercises_done,
  ROUND(time_spent_secs / 60.0, 1) AS time_spent_mins
FROM public.daily_study_log
WHERE study_date >= CURRENT_DATE - INTERVAL '6 days'
ORDER BY study_date;
