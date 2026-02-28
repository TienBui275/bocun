# Database Design - Cun Bo Project

## Tổng Quan

Database được thiết kế cho **hệ thống học tập tương tác** dành cho học sinh tiểu học:
- **Cấp lớp (Grades)**: Pre-K, Mầm Non, Lớp 1–5
- **Môn học (Subjects)**: Toán, Khoa Học, Tiếng Anh
- **Đơn vị học (Units)**: Mỗi môn học theo từng lớp có nhiều Units (Unit 1: Number, Unit 2: Addition...)
- **Bài học (Lessons)**: Mỗi Unit có nhiều Lessons (1.1 Counting, 1.2 Negative Numbers, 1.3 Place Value)
- **Bài tập (Exercises)**: Mỗi Lesson có nhiều bài tập (câu hỏi + đáp án + hướng dẫn)
- **Tiến độ (Progress)**: Theo dõi kết quả học sinh làm bài

---

## Schema Tables

### 1. `users`
```sql
users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  avatar_url VARCHAR,
  role VARCHAR DEFAULT 'student',  -- 'student', 'teacher', 'admin'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

### 2. `grades` (cấp lớp)
```sql
grades (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,        -- 'Pre-K', 'Mầm Non', 'Lớp 1'...'Lớp 5'
  slug VARCHAR UNIQUE NOT NULL, -- 'pre-k', 'mam-non', 'lop-1'...
  level_order INTEGER,          -- 0, 1, 2, 3, 4, 5, 6
  description TEXT,             -- mô tả nội dung học
  color VARCHAR,                -- '#00b4aa', '#f59e0b'...
  badge_label VARCHAR(3),       -- 'P', 'K', '1', '2'...
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Dữ liệu mẫu:**
| level_order | badge | name | color |
|---|---|---|---|
| 0 | P | Pre-K | #00b4aa |
| 1 | K | Mầm Non | #f59e0b |
| 2 | 1 | Lớp 1 | #10b981 |
| 3 | 2 | Lớp 2 | #ef4444 |
| 4 | 3 | Lớp 3 | #3b82f6 |
| 5 | 4 | Lớp 4 | #8b5cf6 |
| 6 | 5 | Lớp 5 | #ec4899 |

---

### 3. `subjects` (môn học)
```sql
subjects (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,        -- 'Toán', 'Khoa Học', 'Tiếng Anh'
  slug VARCHAR UNIQUE NOT NULL, -- 'toan', 'khoa-hoc', 'tieng-anh'
  icon VARCHAR,                 -- '🔢', '🔬', '🔤'
  color VARCHAR,                -- màu chủ đề môn học
  is_active BOOLEAN DEFAULT true
)
```

---

### 4. `grade_subjects` (môn học theo từng lớp - thống kê)
```sql
grade_subjects (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  unit_count INTEGER DEFAULT 0,      -- số units
  lesson_count INTEGER DEFAULT 0,    -- số lessons
  exercise_count INTEGER DEFAULT 0,  -- tổng số bài tập
  is_active BOOLEAN DEFAULT true,
  UNIQUE(grade_id, subject_id)
)
```

---

### 5. `units` (đơn vị học - Unit)
```sql
units (
  id SERIAL PRIMARY KEY,
  grade_id INTEGER REFERENCES grades(id) ON DELETE CASCADE,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,       -- 'Unit 1: Number', 'Unit 2: Addition'
  slug VARCHAR NOT NULL,        -- 'unit-1-number', 'unit-2-addition'
  unit_number INTEGER NOT NULL, -- 1, 2, 3, 4...
  description TEXT,
  thumbnail_url VARCHAR,        -- hình đại diện unit
  order_index INTEGER,          -- thứ tự trong môn học
  lesson_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
)
```

**Ví dụ dữ liệu:**
| unit_number | title | slug |
|---|---|---|
| 1 | Unit 1: Number | unit-1-number |
| 2 | Unit 2: Addition | unit-2-addition |
| 3 | Unit 3: Subtraction | unit-3-subtraction |

---

### 6. `lessons` (bài học trong mỗi Unit)
```sql
lessons (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,         -- '1.1 Counting', '1.2 Negative Numbers'
  slug VARCHAR NOT NULL,          -- 'counting', 'negative-numbers'
  lesson_number VARCHAR(10),      -- '1.1', '1.2', '1.3'
  description TEXT,
  thumbnail_url VARCHAR,
  order_index INTEGER,            -- thứ tự trong unit
  exercise_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(unit_id, slug)
)
```

**Ví dụ dữ liệu cho Unit 1:**
| lesson_number | title | slug |
|---|---|---|
| 1.1 | Counting | counting |
| 1.2 | Negative Numbers | negative-numbers |
| 1.3 | Place Value | place-value |

---

### 7. `exercises` (bài tập)
```sql
exercises (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,          -- câu hỏi (text hoặc HTML)
  question_type VARCHAR NOT NULL,  -- 'multiple_choice', 'fill_blank', 'true_false'
  correct_answer TEXT,             -- chỉ dùng cho fill_blank: đáp án đúng
                                   -- nhiều đáp án chấp nhận phân tách bằng '|' (VD: 'seven|7')
                                   -- NULL nếu là multiple_choice hoặc true_false
  explanation TEXT,                -- hướng dẫn giải (hiện khi làm sai)
  hint TEXT,                       -- gợi ý (optional)
  image_url VARCHAR,               -- hình ảnh minh họa (optional)
  audio_url VARCHAR,               -- audio cho tiếng Anh (optional)
  order_index INTEGER NOT NULL,    -- thứ tự trong lesson (1, 2 ... 10)
  difficulty INTEGER DEFAULT 1,    -- 1=dễ, 2=trung bình, 3=khó
  points INTEGER DEFAULT 10,       -- điểm tích lũy
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Ví dụ dữ liệu:**
```json
// multiple_choice: correct_answer = null, đáp án lưu trong exercise_options
{
  "question": "1 + 1 = ?",
  "question_type": "multiple_choice",
  "correct_answer": null,
  "explanation": "Đếm ngón tay: 1 ngón + 1 ngón = 2 ngón tay",
  "hint": "Hãy thử đếm ngón tay!"
}

// fill_blank: correct_answer chứa đáp án trực tiếp
{
  "question": "3 + 4 = ___",
  "question_type": "fill_blank",
  "correct_answer": "7",
  "explanation": "3 cộng 4 bằng 7",
  "hint": "Đếm tiếp từ 3 thêm 4 bước"
}

// fill_blank với nhiều đáp án chấp nhận (phân tách bằng |)
{
  "question": "The capital of Vietnam is ___",
  "question_type": "fill_blank",
  "correct_answer": "Hà Nội|Ha Noi|Hanoi",
  "explanation": "Hà Nội là thủ đô của Việt Nam",
  "hint": null
}
```

---

### 8. `exercise_options` (đáp án cho multiple_choice)
```sql
exercise_options (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  option_label VARCHAR(2) NOT NULL, -- 'A', 'B', 'C', 'D'
  option_text TEXT NOT NULL,        -- nội dung đáp án
  option_image_url VARCHAR,         -- hình ảnh đáp án (optional)
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL
)
```

**Ví dụ:**
| label | text | is_correct |
|---|---|---|
| A | 1 | false |
| B | 2 | true ✓ |
| C | 3 | false |
| D | 4 | false |

---

### 9. `student_progress` (kết quả từng câu làm)
```sql
student_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,       -- đúng hay sai
  answer_given TEXT,                 -- đáp án học sinh đã chọn/nhập
  attempt_count INTEGER DEFAULT 1,   -- số lần thử câu này
  time_spent_seconds INTEGER,        -- thời gian làm câu (optional)
  completed_at TIMESTAMP DEFAULT NOW()
)
```

---

### 10. `lesson_completions` (hoàn thành bài học)
```sql
lesson_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  total_exercises INTEGER NOT NULL,      -- tổng số câu đã làm
  correct_count INTEGER NOT NULL,        -- số câu đúng
  score_percentage DECIMAL(5,2),         -- phần trăm đúng
  star_rating INTEGER,                   -- 1, 2 hoặc 3 sao
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)             -- mỗi lesson chỉ lưu 1 lần (lần tốt nhất)
)
```

---

### 11. `unit_completions` (hoàn thành unit)
```sql
unit_completions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
  total_lessons INTEGER NOT NULL,        -- tổng số lessons trong unit
  completed_lessons INTEGER NOT NULL,    -- số lessons đã hoàn thành
  total_exercises INTEGER NOT NULL,      -- tổng số bài tập đã làm
  correct_count INTEGER NOT NULL,        -- số câu đúng
  score_percentage DECIMAL(5,2),         -- phần trăm đúng
  star_rating INTEGER,                   -- 1, 2 hoặc 3 sao
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, unit_id)               -- mỗi unit chỉ lưu 1 lần (lần tốt nhất)
)
```

**Quy tắc tính sao:**
- ⭐ 1 sao: < 60% đúng
- ⭐⭐ 2 sao: 60-89% đúng  
- ⭐⭐⭐ 3 sao: ≥ 90% đúng

---

## Mối Quan Hệ

```
grades ─────────────────────────────────────┐
   │                                         │
   └──── grade_subjects ──── subjects        │
              │                              │
              └──── units ───────────────────┘
                        │
                        └──── lessons
                                  │
                                  └──── exercises ──── exercise_options
                                            │
                                  student_progress ──── users
                                  lesson_completions ─── users
                                  unit_completions ───── users
```

---

## Luồng Làm Bài

```
1. Học sinh chọn: Lớp (grade) → Môn (subject) → Unit → Lesson
2. Hệ thống load danh sách exercises theo lesson, sắp xếp order_index
3. Học sinh làm từng câu (exercise 1 → 2 → ... → 10):
   a. Hiển thị câu hỏi + đáp án (A, B, C, D)
   b. Học sinh chọn đáp án
   c. Nếu ĐÚNG → ✅ thông báo đúng → câu tiếp theo
   d. Nếu SAI → ❌ hiện explanation (hướng dẫn giải) → câu tiếp theo
   e. Lưu student_progress (is_correct, answer_given)
4. Khi làm xong tất cả exercises của lesson:
   a. Tính score, cấp sao, lưu lesson_completions
   b. Cập nhật unit_completions (nếu hoàn thành hết lessons trong unit)
5. Hiển thị kết quả tổng kết (lesson / unit)
```

---

## RLS Policies

```sql
-- Users: chỉ xem/sửa data của mình
CREATE POLICY "Users view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Grades, Subjects, Units, Lessons, Exercises: public read
CREATE POLICY "Public read grades" ON grades
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read subjects" ON subjects
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read units" ON units
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read lessons" ON lessons
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read exercises" ON exercises
  FOR SELECT USING (is_active = true);
CREATE POLICY "Public read options" ON exercise_options
  FOR SELECT TO anon, authenticated USING (true);

-- Progress: học sinh chễ thấy/ghi data của mình
CREATE POLICY "Users manage own progress" ON student_progress
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own lesson completions" ON lesson_completions
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own unit completions" ON unit_completions
  FOR ALL USING (user_id = auth.uid());
```

---

## Indexes

```sql
CREATE INDEX idx_units_grade_subject ON units(grade_id, subject_id);
CREATE INDEX idx_units_order ON units(grade_id, subject_id, order_index);
CREATE INDEX idx_lessons_unit ON lessons(unit_id, order_index);
CREATE INDEX idx_exercises_lesson ON exercises(lesson_id, order_index);
CREATE INDEX idx_progress_user ON student_progress(user_id);
CREATE INDEX idx_progress_lesson ON student_progress(lesson_id);
CREATE INDEX idx_progress_unit ON student_progress(unit_id);
CREATE INDEX idx_lesson_completions_user ON lesson_completions(user_id);
CREATE INDEX idx_lesson_completions_lesson ON lesson_completions(lesson_id);
CREATE INDEX idx_unit_completions_user ON unit_completions(user_id);
CREATE INDEX idx_unit_completions_unit ON unit_completions(unit_id);
```
