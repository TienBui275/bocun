-- ==============================================
-- Migration: Refactor Topics → Units + Lessons
-- Date: 2026-02-28
-- Description: Thêm cấp độ phân cấp Units và Lessons
-- ==============================================

-- ==============================================
-- STEP 1: Tạo bảng UNITS (thay thế TOPICS)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.units (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,            -- 'Unit 1: Number', 'Unit 2: Addition'
  slug VARCHAR NOT NULL,             -- 'unit-1-number', 'unit-2-addition'
  unit_number INTEGER NOT NULL,      -- 1, 2, 3, 4...
  description TEXT,
  thumbnail_url VARCHAR,
  order_index INTEGER NOT NULL DEFAULT 1,
  lesson_count INTEGER DEFAULT 0,    -- Số lượng lessons trong unit
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
);

-- ==============================================
-- STEP 2: Tạo bảng LESSONS (nội dung nhỏ trong mỗi unit)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,              -- '1.1 Counting', '1.2 Negative Numbers'
  slug VARCHAR NOT NULL,               -- 'counting', 'negative-numbers'
  lesson_number VARCHAR(10),           -- '1.1', '1.2', '1.3'
  description TEXT,
  thumbnail_url VARCHAR,
  order_index INTEGER NOT NULL DEFAULT 1,
  exercise_count INTEGER DEFAULT 0,    -- Số lượng exercises trong lesson
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(unit_id, slug)
);

-- ==============================================
-- STEP 3: Di chuyển dữ liệu từ TOPICS → UNITS
-- ==============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'topics') THEN
    -- Chuyển tất cả topics hiện tại thành units
    INSERT INTO public.units (grade_id, subject_id, title, slug, unit_number, description, thumbnail_url, order_index, is_active, created_at)
    SELECT 
      grade_id, 
      subject_id, 
      title, 
      slug, 
      order_index as unit_number,  -- Sử dụng order_index làm unit_number tạm thời
      description, 
      thumbnail_url, 
      order_index, 
      is_active, 
      created_at
    FROM public.topics
    ON CONFLICT (grade_id, subject_id, slug) DO NOTHING;
    
    RAISE NOTICE 'Đã di chuyển dữ liệu từ topics → units';
  END IF;
END $$;

-- ==============================================
-- STEP 4: Cập nhật bảng EXERCISES
-- ==============================================
-- Thêm cột lesson_id, giữ lại topic_id tạm thời để migrate data
ALTER TABLE public.exercises 
  ADD COLUMN IF NOT EXISTS lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Tạo index cho lesson_id
CREATE INDEX IF NOT EXISTS idx_exercises_lesson ON public.exercises(lesson_id, order_index);

-- Note: topic_id sẽ được xóa sau khi migrate data xong
-- Tạm thời giữ lại để backward compatible

-- ==============================================
-- STEP 5: Cập nhật bảng STUDENT_PROGRESS
-- ==============================================
-- Thêm lesson_id và unit_id
ALTER TABLE public.student_progress 
  ADD COLUMN IF NOT EXISTS lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES public.units(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_progress_lesson ON public.student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_unit ON public.student_progress(unit_id);

-- Note: topic_id sẽ được xóa sau khi migrate data

-- ==============================================
-- STEP 6: Tạo bảng LESSON_COMPLETIONS (thay thế TOPIC_COMPLETIONS)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.lesson_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  total_exercises INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating INTEGER CHECK (star_rating IN (1, 2, 3)),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON public.lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_lesson ON public.lesson_completions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_unit ON public.lesson_completions(unit_id);

-- ==============================================
-- STEP 7: Tạo bảng UNIT_COMPLETIONS (thống kê cả unit)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.unit_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  total_lessons INTEGER NOT NULL,
  completed_lessons INTEGER NOT NULL,
  total_exercises INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating INTEGER CHECK (star_rating IN (1, 2, 3)),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_completions_user ON public.unit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_completions_unit ON public.unit_completions(unit_id);

-- ==============================================
-- STEP 8: Cập nhật GRADE_SUBJECTS
-- ==============================================
-- Đổi tên cột topic_count → unit_count
ALTER TABLE public.grade_subjects 
  RENAME COLUMN topic_count TO unit_count;

-- Thêm cột lesson_count
ALTER TABLE public.grade_subjects 
  ADD COLUMN IF NOT EXISTS lesson_count INTEGER DEFAULT 0;

-- ==============================================
-- STEP 9: INDEXES cho Units và Lessons
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_units_grade_subject ON public.units(grade_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_units_order ON public.units(grade_id, subject_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON public.lessons(unit_id, order_index);

-- ==============================================
-- STEP 10: RLS POLICIES
-- ==============================================

-- Units: public read
DROP POLICY IF EXISTS "Public read active units" ON public.units;
CREATE POLICY "Public read active units" ON public.units
  FOR SELECT USING (is_active = true);

-- Lessons: public read
DROP POLICY IF EXISTS "Public read active lessons" ON public.lessons;
CREATE POLICY "Public read active lessons" ON public.lessons
  FOR SELECT USING (is_active = true);

-- Lesson Completions: users only, own data
DROP POLICY IF EXISTS "Auth users read own lesson completions" ON public.lesson_completions;
CREATE POLICY "Auth users read own lesson completions" ON public.lesson_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users insert own lesson completions" ON public.lesson_completions;
CREATE POLICY "Auth users insert own lesson completions" ON public.lesson_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users update own lesson completions" ON public.lesson_completions;
CREATE POLICY "Auth users update own lesson completions" ON public.lesson_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- Unit Completions: users only, own data
DROP POLICY IF EXISTS "Auth users read own unit completions" ON public.unit_completions;
CREATE POLICY "Auth users read own unit completions" ON public.unit_completions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users insert own unit completions" ON public.unit_completions;
CREATE POLICY "Auth users insert own unit completions" ON public.unit_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth users update own unit completions" ON public.unit_completions;
CREATE POLICY "Auth users update own unit completions" ON public.unit_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================
-- STEP 11: Enable RLS on new tables
-- ==============================================
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_completions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- NOTES:
-- ==============================================
-- ⚠️  KHÔNG XÓA ngay bảng `topics` và `topic_completions`
-- ⚠️  Giữ lại để backward compatible với code cũ
-- ⚠️  Sau khi migrate và test xong, có thể xóa trong migration tiếp theo
-- 
-- Để xóa hoàn toàn (chỉ khi đã migrate hết):
-- DROP TABLE IF EXISTS public.topic_completions CASCADE;
-- DROP TABLE IF EXISTS public.topics CASCADE;
-- ALTER TABLE public.exercises DROP COLUMN IF EXISTS topic_id;
-- ALTER TABLE public.student_progress DROP COLUMN IF EXISTS topic_id;
