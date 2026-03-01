-- ================================================================
-- Cun Bo Project – Current Schema (Consolidated)
-- Date: 2026-03-01
-- Description: Single migration file that reflects the CURRENT
--              state of the database after all previous migrations.
--              Safe to run on a fresh Supabase project.
-- ================================================================

-- ================================================================
-- 1. USERS (extends auth.users)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR      NOT NULL,
  full_name   VARCHAR,
  avatar_url  VARCHAR,
  role        VARCHAR      DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ================================================================
-- 2. GRADES (grade level)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.grades (
  id           SERIAL       PRIMARY KEY,
  name         VARCHAR      NOT NULL,          -- 'Pre-K', 'Kindergarten', 'Stage 1'…'Stage 5'
  slug         VARCHAR      UNIQUE NOT NULL,   -- 'pre-k', 'mam-non', 'lop-1'…
  level_order  INTEGER      NOT NULL,          -- 0, 1, 2, 3, 4, 5, 6
  description  TEXT,
  color        VARCHAR(20),
  badge_label  VARCHAR(3),
  is_active    BOOLEAN      DEFAULT true,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ================================================================
-- 3. SUBJECTS (subject)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id        SERIAL    PRIMARY KEY,
  name      VARCHAR   NOT NULL,       -- 'Math', 'Science', 'English'
  slug      VARCHAR   UNIQUE NOT NULL,
  icon      VARCHAR(10),
  color     VARCHAR(20),
  is_active BOOLEAN   DEFAULT true
);

-- ================================================================
-- 4. GRADE_SUBJECTS (subjects per grade – aggregate statistics)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.grade_subjects (
  id             SERIAL   PRIMARY KEY,
  grade_id       INTEGER  NOT NULL REFERENCES public.grades(id)   ON DELETE CASCADE,
  subject_id     INTEGER  NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  unit_count     INTEGER  DEFAULT 0,   -- number of units
  lesson_count   INTEGER  DEFAULT 0,   -- number of lessons
  exercise_count INTEGER  DEFAULT 0,   -- total number of exercises
  is_active      BOOLEAN  DEFAULT true,
  UNIQUE(grade_id, subject_id)
);

-- ================================================================
-- 5. UNITS (learning unit)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.units (
  id            SERIAL       PRIMARY KEY,
  grade_id      INTEGER      NOT NULL REFERENCES public.grades(id)   ON DELETE CASCADE,
  subject_id    INTEGER      NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title         VARCHAR      NOT NULL,   -- 'Unit 1: Number', 'Unit 2: Addition'
  slug          VARCHAR      NOT NULL,   -- 'unit-1-number'
  unit_number   INTEGER      NOT NULL,   -- 1, 2, 3 …
  description   TEXT,
  thumbnail_url VARCHAR,
  order_index   INTEGER      NOT NULL DEFAULT 1,
  lesson_count  INTEGER      DEFAULT 0,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
);

-- ================================================================
-- 6. LESSONS (lesson within each unit)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id             SERIAL       PRIMARY KEY,
  unit_id        INTEGER      NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title          VARCHAR      NOT NULL,   -- '1.1 Counting', '1.2 Negative Numbers'
  slug           VARCHAR      NOT NULL,   -- 'counting', 'negative-numbers'
  lesson_number  VARCHAR(10),             -- '1.1', '1.2', '1.3'
  description    TEXT,
  thumbnail_url  VARCHAR,
  order_index    INTEGER      NOT NULL DEFAULT 1,
  exercise_count INTEGER      DEFAULT 0,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(unit_id, slug)
);

-- ================================================================
-- 7. EXERCISES (exercise)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id             SERIAL       PRIMARY KEY,
  lesson_id      INTEGER      REFERENCES public.lessons(id) ON DELETE CASCADE,
  -- topic_id is a LEGACY column kept for backward compatibility (nullable)
  topic_id       INTEGER      REFERENCES public.topics(id)  ON DELETE SET NULL,
  question       TEXT         NOT NULL,
  question_type  VARCHAR      NOT NULL DEFAULT 'multiple_choice'
                              CHECK (question_type IN ('multiple_choice', 'fill_blank', 'true_false')),
  -- correct_answer: used for fill_blank only.
  --   Multiple accepted answers separated by '|' (e.g. 'seven|7').
  --   NULL for multiple_choice and true_false (correct answer stored in exercise_options).
  correct_answer TEXT,
  explanation    TEXT,        -- shown when student answers incorrectly
  hint           TEXT,        -- optional hint shown before/during the question
  image_url      VARCHAR,
  audio_url      VARCHAR,
  order_index    INTEGER      NOT NULL DEFAULT 1,
  difficulty     INTEGER      DEFAULT 1 CHECK (difficulty IN (1, 2, 3)),
  points         INTEGER      DEFAULT 10,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ================================================================
-- 8. EXERCISE_OPTIONS (answer options for multiple_choice / true_false)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.exercise_options (
  id               SERIAL    PRIMARY KEY,
  exercise_id      INTEGER   NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  option_label     VARCHAR(2) NOT NULL,   -- 'A', 'B', 'C', 'D'
  option_text      TEXT       NOT NULL,
  option_image_url VARCHAR,
  is_correct       BOOLEAN    DEFAULT false,
  order_index      INTEGER    NOT NULL DEFAULT 1
);

-- ================================================================
-- 9. STUDENT_PROGRESS (per-question answer result)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.student_progress (
  id                   SERIAL       PRIMARY KEY,
  user_id              UUID         NOT NULL REFERENCES public.users(id)      ON DELETE CASCADE,
  exercise_id          INTEGER      NOT NULL REFERENCES public.exercises(id)  ON DELETE CASCADE,
  lesson_id            INTEGER      REFERENCES public.lessons(id)             ON DELETE CASCADE,
  unit_id              INTEGER      REFERENCES public.units(id)               ON DELETE CASCADE,
  -- topic_id is LEGACY (nullable)
  topic_id             INTEGER      REFERENCES public.topics(id)              ON DELETE SET NULL,
  is_correct           BOOLEAN      NOT NULL,
  answer_given         TEXT,
  attempt_count        INTEGER      DEFAULT 1,
  time_spent_seconds   INTEGER,
  completed_at         TIMESTAMPTZ  DEFAULT NOW()
);

-- ================================================================
-- 10. LESSON_COMPLETIONS (lesson completion)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id               SERIAL       PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  lesson_id        INTEGER      NOT NULL REFERENCES public.lessons(id)  ON DELETE CASCADE,
  unit_id          INTEGER      NOT NULL REFERENCES public.units(id)    ON DELETE CASCADE,
  total_exercises  INTEGER      NOT NULL,
  correct_count    INTEGER      NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating      INTEGER      CHECK (star_rating IN (1, 2, 3)),
  completed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ================================================================
-- 11. UNIT_COMPLETIONS (unit completion)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.unit_completions (
  id                  SERIAL       PRIMARY KEY,
  user_id             UUID         NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  unit_id             INTEGER      NOT NULL REFERENCES public.units(id)  ON DELETE CASCADE,
  total_lessons       INTEGER      NOT NULL,
  completed_lessons   INTEGER      NOT NULL,
  total_exercises     INTEGER      NOT NULL,
  correct_count       INTEGER      NOT NULL,
  score_percentage    DECIMAL(5,2),
  star_rating         INTEGER      CHECK (star_rating IN (1, 2, 3)),
  completed_at        TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

-- ================================================================
-- 12. TOPICS (LEGACY – kept for backward compatibility only)
--     This table has been superseded by units + lessons.
--     Do NOT add new data here.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.topics (
  id             SERIAL       PRIMARY KEY,
  grade_id       INTEGER      NOT NULL REFERENCES public.grades(id)   ON DELETE CASCADE,
  subject_id     INTEGER      NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title          VARCHAR      NOT NULL,
  slug           VARCHAR      NOT NULL,
  description    TEXT,
  thumbnail_url  VARCHAR,
  order_index    INTEGER      NOT NULL DEFAULT 1,
  exercise_count INTEGER      DEFAULT 0,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
);

-- ================================================================
-- 13. TOPIC_COMPLETIONS (LEGACY – kept for backward compatibility)
--     Superseded by lesson_completions + unit_completions.
--     Do NOT add new data here.
-- ================================================================
CREATE TABLE IF NOT EXISTS public.topic_completions (
  id               SERIAL       PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  topic_id         INTEGER      NOT NULL REFERENCES public.topics(id)  ON DELETE CASCADE,
  total_exercises  INTEGER      NOT NULL,
  correct_count    INTEGER      NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating      INTEGER      CHECK (star_rating IN (1, 2, 3)),
  completed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- ================================================================
-- INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_units_grade_subject  ON public.units(grade_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_units_order          ON public.units(grade_id, subject_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_unit         ON public.lessons(unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exercises_lesson     ON public.exercises(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_options_exercise     ON public.exercise_options(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_user        ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson      ON public.student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_unit        ON public.student_progress(unit_id);
CREATE INDEX IF NOT EXISTS idx_lc_user              ON public.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lc_lesson            ON public.lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_uc_user              ON public.unit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_uc_unit              ON public.unit_completions(unit_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_subjects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_completions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_completions  ENABLE ROW LEVEL SECURITY;

-- Users: view/update own profile only
DROP POLICY IF EXISTS "Users view own profile"   ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;
CREATE POLICY "Users view own profile"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Public read: grades, subjects, grade_subjects, units, lessons, exercises, options
DROP POLICY IF EXISTS "Public read grades"         ON public.grades;
DROP POLICY IF EXISTS "Public read subjects"       ON public.subjects;
DROP POLICY IF EXISTS "Public read grade_subjects" ON public.grade_subjects;
DROP POLICY IF EXISTS "Public read units"          ON public.units;
DROP POLICY IF EXISTS "Public read lessons"        ON public.lessons;
DROP POLICY IF EXISTS "Public read exercises"      ON public.exercises;
DROP POLICY IF EXISTS "Public read options"        ON public.exercise_options;

CREATE POLICY "Public read grades"         ON public.grades          FOR SELECT USING (is_active = true);
CREATE POLICY "Public read subjects"       ON public.subjects         FOR SELECT USING (is_active = true);
CREATE POLICY "Public read grade_subjects" ON public.grade_subjects   FOR SELECT USING (is_active = true);
CREATE POLICY "Public read units"          ON public.units            FOR SELECT USING (is_active = true);
CREATE POLICY "Public read lessons"        ON public.lessons          FOR SELECT USING (is_active = true);
CREATE POLICY "Public read exercises"      ON public.exercises        FOR SELECT USING (is_active = true);
CREATE POLICY "Public read options"        ON public.exercise_options FOR SELECT USING (true);

-- Student progress: auth users, own data only
DROP POLICY IF EXISTS "Users read own progress"   ON public.student_progress;
DROP POLICY IF EXISTS "Users insert own progress" ON public.student_progress;
CREATE POLICY "Users read own progress"   ON public.student_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.student_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lesson completions
DROP POLICY IF EXISTS "Users read own lc"   ON public.lesson_completions;
DROP POLICY IF EXISTS "Users insert own lc" ON public.lesson_completions;
DROP POLICY IF EXISTS "Users update own lc" ON public.lesson_completions;
CREATE POLICY "Users read own lc"   ON public.lesson_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lc" ON public.lesson_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lc" ON public.lesson_completions FOR UPDATE USING (auth.uid() = user_id);

-- Unit completions
DROP POLICY IF EXISTS "Users read own uc"   ON public.unit_completions;
DROP POLICY IF EXISTS "Users insert own uc" ON public.unit_completions;
DROP POLICY IF EXISTS "Users update own uc" ON public.unit_completions;
CREATE POLICY "Users read own uc"   ON public.unit_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own uc" ON public.unit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own uc" ON public.unit_completions FOR UPDATE USING (auth.uid() = user_id);

-- ================================================================
-- TRIGGERS
-- ================================================================

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- SEED DATA – Grades
-- ================================================================
INSERT INTO public.grades (name, slug, level_order, description, color, badge_label) VALUES
  ('Pre-K',       'pre-k',   0, 'Recognize colors, shapes, numbers, first letters, and simple words.',                                   '#00b4aa', 'P'),
  ('Kindergarten','mam-non', 1, 'Compare quantities, identify basic shapes, practice letters and sounds, and explore plants and animals.','#f59e0b', 'K'),
  ('Stage 1',     'lop-1',   2, 'Learn basic addition and subtraction, place value (tens and ones), foundational vocabulary, and light and sound.', '#10b981', '1'),
  ('Stage 2',     'lop-2',   3, 'Develop place value patterns, basic multiplication and division, life science topics, and historical figures.',     '#ef4444', '2'),
  ('Stage 3',     'lop-3',   4, 'Practice advanced multiplication and division, reading charts, weather and climate, and basic geography.',           '#3b82f6', '3'),
  ('Stage 4',     'lop-4',   5, 'Study fractions and decimals, synonyms and antonyms, fossils, and rock layers.',                                    '#8b5cf6', '4'),
  ('Stage 5',     'lop-5',   6, 'Learn ratios and percentages, advanced literature, human body systems, and world geography.',                       '#ec4899', '5')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description;

-- ================================================================
-- SEED DATA – Subjects
-- ================================================================
INSERT INTO public.subjects (name, slug, icon, color) VALUES
  ('Math',        'toan',      '🔢', '#3b82f6'),
  ('Science',     'khoa-hoc',  '🔬', '#10b981'),
  ('English',     'tieng-anh', '🔤', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;
