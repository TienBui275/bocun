-- ==============================================
-- Cun Bo Project - Database Migration
-- Run this in Supabase SQL Editor
-- ==============================================

-- 1. USERS (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  role VARCHAR DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GRADES
CREATE TABLE IF NOT EXISTS public.grades (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  level_order INTEGER NOT NULL,
  description TEXT,
  color VARCHAR(20),
  badge_label VARCHAR(3),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT true
);

-- 4. GRADE_SUBJECTS (stats per grade+subject combo)
CREATE TABLE IF NOT EXISTS public.grade_subjects (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  topic_count INTEGER DEFAULT 0,
  exercise_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(grade_id, subject_id)
);

-- 5. TOPICS
CREATE TABLE IF NOT EXISTS public.topics (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  order_index INTEGER NOT NULL DEFAULT 1,
  exercise_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
);

-- 6. EXERCISES
CREATE TABLE IF NOT EXISTS public.exercises (
  id SERIAL PRIMARY KEY,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  question_type VARCHAR NOT NULL DEFAULT 'multiple_choice' 
    CHECK (question_type IN ('multiple_choice', 'fill_blank', 'true_false')),
  explanation TEXT,
  hint TEXT,
  image_url VARCHAR,
  audio_url VARCHAR,
  order_index INTEGER NOT NULL DEFAULT 1,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty IN (1, 2, 3)),
  points INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. EXERCISE_OPTIONS
CREATE TABLE IF NOT EXISTS public.exercise_options (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  option_label VARCHAR(2) NOT NULL,
  option_text TEXT NOT NULL,
  option_image_url VARCHAR,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 1
);

-- 8. STUDENT_PROGRESS
CREATE TABLE IF NOT EXISTS public.student_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  answer_given TEXT,
  attempt_count INTEGER DEFAULT 1,
  time_spent_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TOPIC_COMPLETIONS
CREATE TABLE IF NOT EXISTS public.topic_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id INTEGER NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  total_exercises INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating INTEGER CHECK (star_rating IN (1, 2, 3)),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- ==============================================
-- INDEXES
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_topics_grade_subject ON public.topics(grade_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_order ON public.topics(grade_id, subject_id, order_index);
CREATE INDEX IF NOT EXISTS idx_exercises_topic ON public.exercises(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_topic ON public.student_progress(topic_id);
CREATE INDEX IF NOT EXISTS idx_completions_user ON public.topic_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_topic ON public.topic_completions(topic_id);

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_completions ENABLE ROW LEVEL SECURITY;

-- Users RLS
CREATE POLICY "Users view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Public read tables
CREATE POLICY "Public read active grades" ON public.grades
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active subjects" ON public.subjects
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read grade_subjects" ON public.grade_subjects
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active topics" ON public.topics
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read active exercises" ON public.exercises
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read exercise_options" ON public.exercise_options
  FOR SELECT USING (true);

-- Progress tables: auth users only, own data
CREATE POLICY "Auth users read own progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth users insert own progress" ON public.student_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users read own completions" ON public.topic_completions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Auth users insert own completions" ON public.topic_completions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users update own completions" ON public.topic_completions
  FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ==============================================
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- SEED DATA - Grades
-- ==============================================
INSERT INTO public.grades (name, slug, level_order, description, color, badge_label) VALUES
  ('Pre-K', 'pre-k', 0, 'Nhận biết màu sắc, hình dạng, đếm số, chữ cái đầu tiên và các từ đơn giản.', '#00b4aa', 'P'),
  ('Mầm Non', 'mam-non', 1, 'So sánh số lượng, tên hình khối, chữ cái và âm thanh, cây cối và động vật.', '#f59e0b', 'K'),
  ('Lớp 1', 'lop-1', 2, 'Cộng trừ đơn giản, hàng chục và hàng đơn vị, từ vựng cơ bản, ánh sáng và âm thanh.', '#10b981', '1'),
  ('Lớp 2', 'lop-2', 3, 'Mô hình giá trị vị trí, nhân chia cơ bản, thực vật và động vật, nhân vật lịch sử.', '#ef4444', '2'),
  ('Lớp 3', 'lop-3', 4, 'Nhân chia nâng cao, đồ thị, thời tiết và khí hậu, địa lý cơ bản.', '#3b82f6', '3'),
  ('Lớp 4', 'lop-4', 5, 'Phân số và số thập phân, từ đồng nghĩa và trái nghĩa, hóa thạch và địa tầng đá.', '#8b5cf6', '4'),
  ('Lớp 5', 'lop-5', 6, 'Tỉ lệ và phần trăm, văn học nâng cao, hệ thống cơ thể người, địa lý thế giới.', '#ec4899', '5')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- SEED DATA - Subjects
-- ==============================================
INSERT INTO public.subjects (name, slug, icon, color) VALUES
  ('Toán', 'toan', '🔢', '#3b82f6'),
  ('Khoa Học', 'khoa-hoc', '🔬', '#10b981'),
  ('Tiếng Anh', 'tieng-anh', '🔤', '#f59e0b')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- SAMPLE TOPIC + EXERCISES (Toán Lớp 1 - Số 1-10)
-- ==============================================
-- (Chạy sau khi grades và subjects đã được insert)
-- INSERT INTO public.topics (grade_id, subject_id, title, slug, description, order_index)
-- SELECT g.id, s.id, 'Số 1 đến 10', 'so-1-den-10', 'Học đếm và nhận biết các số từ 1 đến 10', 1
-- FROM public.grades g, public.subjects s
-- WHERE g.slug = 'lop-1' AND s.slug = 'toan';
