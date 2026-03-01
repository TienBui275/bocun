# Database Design – Cun Bo Project

## Tổng Quan

Database được thiết kế cho **hệ thống học tập tương tác** dành cho học sinh tiểu học đến lớp 5:
- **Cấp lớp (Grades)**: Pre-K, Kindergarten, Stage 1–5
- **Môn học (Subjects)**: Toán, Khoa Học, Tiếng Anh
- **Đơn vị học (Units)**: Mỗi môn học theo từng lớp có nhiều Units (Unit 1: Number, Unit 2: Addition…)
- **Bài học (Lessons)**: Mỗi Unit có nhiều Lessons (1.1 Counting, 1.2 Negative Numbers, 1.3 Place Value)
- **Bài tập (Exercises)**: Mỗi Lesson có nhiều bài tập (câu hỏi + đáp án + gợi ý + hướng dẫn)
- **Tiến độ (Progress)**: Theo dõi kết quả học sinh làm bài theo từng Lesson và Unit

> **Migration**: File duy nhất phản ánh schema hiện tại là `supabase/migrations/001_current_schema.sql`.

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
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR      NOT NULL,         -- 'Pre-K', 'Kindergarten', 'Stage 1'…'Stage 5'
  slug        VARCHAR      UNIQUE NOT NULL,  -- 'pre-k', 'mam-non', 'lop-1'…
  level_order INTEGER      NOT NULL,         -- 0, 1, 2, 3, 4, 5, 6
  description TEXT,
  color       VARCHAR(20),                   -- '#00b4aa', '#f59e0b'…
  badge_label VARCHAR(3),                    -- 'P', 'K', '1', '2'…
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
)
```

**Dữ liệu hiện tại (7 grades):**
| level_order | badge | name | slug | color |
|---|---|---|---|---|
| 0 | P | Pre-K | pre-k | #00b4aa |
| 1 | K | Kindergarten | mam-non | #f59e0b |
| 2 | 1 | Stage 1 | lop-1 | #10b981 |
| 3 | 2 | Stage 2 | lop-2 | #ef4444 |
| 4 | 3 | Stage 3 | lop-3 | #3b82f6 |
| 5 | 4 | Stage 4 | lop-4 | #8b5cf6 |
| 6 | 5 | Stage 5 | lop-5 | #ec4899 |

---

### 3. `subjects` (môn học)
```sql
subjects (
  id        SERIAL     PRIMARY KEY,
  name      VARCHAR    NOT NULL,        -- 'Toán', 'Khoa Học', 'Tiếng Anh'
  slug      VARCHAR    UNIQUE NOT NULL, -- 'toan', 'khoa-hoc', 'tieng-anh'
  icon      VARCHAR(10),                -- '🔢', '🔬', '🔤'
  color     VARCHAR(20),
  is_active BOOLEAN    DEFAULT true
)
```

---

### 4. `grade_subjects` (môn học theo từng lớp - thống kê)
```sql
grade_subjects (
  id             SERIAL   PRIMARY KEY,
  grade_id       INTEGER  NOT NULL REFERENCES grades(id)   ON DELETE CASCADE,
  subject_id     INTEGER  NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_count     INTEGER  DEFAULT 0,   -- số units
  lesson_count   INTEGER  DEFAULT 0,   -- số lessons
  exercise_count INTEGER  DEFAULT 0,   -- tổng số bài tập
  is_active      BOOLEAN  DEFAULT true,
  UNIQUE(grade_id, subject_id)
)
```

---

### 5. `units` (đơn vị học - Unit)
```sql
units (
  id            SERIAL       PRIMARY KEY,
  grade_id      INTEGER      NOT NULL REFERENCES grades(id)   ON DELETE CASCADE,
  subject_id    INTEGER      NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title         VARCHAR      NOT NULL,   -- 'Unit 1: Number', 'Unit 2: Addition'
  slug          VARCHAR      NOT NULL,   -- 'unit-1-number'
  unit_number   INTEGER      NOT NULL,   -- 1, 2, 3…
  description   TEXT,
  thumbnail_url VARCHAR,
  order_index   INTEGER      NOT NULL DEFAULT 1,
  lesson_count  INTEGER      DEFAULT 0,
  is_active     BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
)
```

**Ví dụ (Stage 4 – Toán):**
| unit_number | title | slug |
|---|---|---|
| 1 | Unit 1: Numbers and the number system | unit-1-numbers-and-the-number-system |
| 2 | Unit 2: Time and timetables | unit-2-time-and-timetables |
| 3 | Unit 3: Addition and subtraction of whole numbers | unit-3-addition-and-subtraction |

---

### 6. `lessons` (bài học trong mỗi Unit)
```sql
lessons (
  id             SERIAL       PRIMARY KEY,
  unit_id        INTEGER      NOT NULL REFERENCES units(id) ON DELETE CASCADE,
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
)
```

**Ví dụ (Unit 1 – Stage 4 Toán):**
| lesson_number | title | slug |
|---|---|---|
| 1.1 | Counting and sequences | counting-and-sequences |
| 1.2 | More on negative numbers | more-on-negative-numbers |
| 1.3 | Understanding place value | understanding-place-value |

---

### 7. `exercises` (bài tập)
```sql
exercises (
  id             SERIAL       PRIMARY KEY,
  lesson_id      INTEGER      REFERENCES lessons(id) ON DELETE CASCADE,
  -- topic_id: LEGACY column (nullable) – không dùng cho exercises mới
  topic_id       INTEGER      REFERENCES topics(id)  ON DELETE SET NULL,
  question       TEXT         NOT NULL,
  question_type  VARCHAR      NOT NULL DEFAULT 'multiple_choice',
                              -- 'multiple_choice' | 'fill_blank' | 'true_false'
  -- correct_answer: CHỈ dùng cho fill_blank.
  --   Phân tách nhiều đáp án bằng '|' (VD: 'seven|7').
  --   NULL cho multiple_choice và true_false.
  correct_answer TEXT,
  explanation    TEXT,        -- hiển thị khi học sinh trả lời sai
  hint           TEXT,        -- gợi ý hiển thị trong khi làm bài
  image_url      VARCHAR,
  audio_url      VARCHAR,
  order_index    INTEGER      NOT NULL DEFAULT 1,
  difficulty     INTEGER      DEFAULT 1,  -- 1=dễ | 2=trung bình | 3=khó
  points         INTEGER      DEFAULT 10,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
)
```

**Ví dụ dữ liệu:**
```json
// multiple_choice: correct_answer = null, đáp án lưu trong exercise_options
{
  "lesson_id": 7,
  "question": "Abdul makes a sequence starting at 397, subtracting 3 each time. Will he reach 0?",
  "question_type": "multiple_choice",
  "correct_answer": null,
  "hint": "Is 397 exactly divisible by 3? Use division to check.",
  "explanation": "397 is not a multiple of 3 (397 = 132×3 + 1), so he will reach 1, not 0."
}

// fill_blank: correct_answer chứa đáp án trực tiếp
{
  "lesson_id": 8,
  "question": "The temperature in England is 11°C. Iceland is 15° colder. Temperature = ___",
  "question_type": "fill_blank",
  "correct_answer": "-4",
  "hint": "Use a number line and count down 15 steps from 11.",
  "explanation": "Start at 11 on the number line and jump back 15 places: 11 − 15 = −4."
}

// fill_blank với nhiều đáp án chấp nhận (phân tách bằng |)
{
  "question": "Write the next number: 3, 2, 1, 0, ___",
  "question_type": "fill_blank",
  "correct_answer": "-1",
  "hint": "What comes after 0 when counting backwards?"
}
```

---

### 8. `exercise_options` (đáp án cho multiple_choice / true_false)
```sql
exercise_options (
  id               SERIAL     PRIMARY KEY,
  exercise_id      INTEGER    NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  option_label     VARCHAR(2) NOT NULL,   -- 'A', 'B', 'C', 'D'
  option_text      TEXT       NOT NULL,
  option_image_url VARCHAR,
  is_correct       BOOLEAN    DEFAULT false,
  order_index      INTEGER    NOT NULL DEFAULT 1
)
```

**Ví dụ (exercise 35 – Yes/No):**
| label | text | is_correct |
|---|---|---|
| A | Yes, Abdul is correct | false |
| B | No, Abdul is not correct | true ✓ |

---

### 9. `student_progress` (kết quả từng câu làm)
```sql
student_progress (
  id                  SERIAL       PRIMARY KEY,
  user_id             UUID         NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  exercise_id         INTEGER      NOT NULL REFERENCES exercises(id)  ON DELETE CASCADE,
  lesson_id           INTEGER      REFERENCES lessons(id)             ON DELETE CASCADE,
  unit_id             INTEGER      REFERENCES units(id)               ON DELETE CASCADE,
  -- topic_id: LEGACY column (nullable)
  topic_id            INTEGER      REFERENCES topics(id)              ON DELETE SET NULL,
  is_correct          BOOLEAN      NOT NULL,
  answer_given        TEXT,
  attempt_count       INTEGER      DEFAULT 1,
  time_spent_seconds  INTEGER,
  completed_at        TIMESTAMPTZ  DEFAULT NOW()
)
```

---

### 10. `lesson_completions` (hoàn thành bài học)
```sql
lesson_completions (
  id               SERIAL       PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  lesson_id        INTEGER      NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  unit_id          INTEGER      NOT NULL REFERENCES units(id)    ON DELETE CASCADE,
  total_exercises  INTEGER      NOT NULL,
  correct_count    INTEGER      NOT NULL,
  score_percentage DECIMAL(5,2),
  star_rating      INTEGER,   -- 1, 2 hoặc 3 sao
  completed_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)   -- lưu lần tốt nhất
)
```

---

### 11. `unit_completions` (hoàn thành unit)
```sql
unit_completions (
  id                SERIAL       PRIMARY KEY,
  user_id           UUID         NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  unit_id           INTEGER      NOT NULL REFERENCES units(id)  ON DELETE CASCADE,
  total_lessons     INTEGER      NOT NULL,
  completed_lessons INTEGER      NOT NULL,
  total_exercises   INTEGER      NOT NULL,
  correct_count     INTEGER      NOT NULL,
  score_percentage  DECIMAL(5,2),
  star_rating       INTEGER,   -- 1, 2 hoặc 3 sao
  completed_at      TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(user_id, unit_id)     -- lưu lần tốt nhất
)
```

**Quy tắc tính sao:**
- ⭐ 1 sao: < 60% đúng
- ⭐⭐ 2 sao: 60–89% đúng
- ⭐⭐⭐ 3 sao: ≥ 90% đúng

---

### 12. `topics` *(LEGACY – không dùng nữa)*
> Bảng này đã được thay thế bởi `units` + `lessons`. Vẫn còn trong DB để backward compatibility. **Không thêm dữ liệu mới vào đây.**

```sql
topics (
  id             SERIAL       PRIMARY KEY,
  grade_id       INTEGER      NOT NULL REFERENCES grades(id)   ON DELETE CASCADE,
  subject_id     INTEGER      NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title          VARCHAR      NOT NULL,
  slug           VARCHAR      NOT NULL,
  description    TEXT,
  thumbnail_url  VARCHAR,
  order_index    INTEGER      NOT NULL DEFAULT 1,
  exercise_count INTEGER      DEFAULT 0,
  is_active      BOOLEAN      DEFAULT true,
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(grade_id, subject_id, slug)
)
```

---

### 13. `topic_completions` *(LEGACY – không dùng nữa)*
> Đã được thay thế bởi `lesson_completions` + `unit_completions`. **Không thêm dữ liệu mới vào đây.**

---

## Mối Quan Hệ

```
grades ──────────────────────────────────────────────┐
   │                                                  │
   └──── grade_subjects ──── subjects                 │
                │                                     │
                └──── units ──────────────────────────┘
                           │
                           └──── lessons
                                     │
                                     └──── exercises ──── exercise_options
                                                │
                                     student_progress ──── users
                                     lesson_completions ─── users
                                     unit_completions ────── users

(topics, topic_completions: LEGACY – không còn sử dụng)
```

---

## Luồng Làm Bài

```
1. Học sinh chọn: Grade → Subject → Unit → Lesson
2. Hệ thống load exercises theo lesson_id, sắp xếp theo order_index
3. Học sinh làm từng câu:
   a. Hiển thị question + options (A/B/C/D) hoặc ô điền
   b. (Tuỳ chọn) Hiển thị hint
   c. Học sinh chọn/nhập đáp án
   d. Nếu ĐÚNG  → ✅ qua câu tiếp theo
   e. Nếu SAI   → ❌ hiện explanation → qua câu tiếp theo
   f. Lưu student_progress (is_correct, answer_given, lesson_id, unit_id)
4. Khi hoàn thành tất cả exercises của lesson:
   a. Tính score_percentage, cấp star_rating
   b. Lưu lesson_completions
   c. Cập nhật unit_completions nếu hoàn thành hết lessons trong unit
5. Hiển thị kết quả: điểm, sao, khuyến khích học tiếp
```

---

## RLS Policies (tóm tắt)

| Bảng | Ai có thể đọc | Ai có thể ghi |
|---|---|---|
| `grades`, `subjects`, `grade_subjects`, `units`, `lessons`, `exercises`, `exercise_options` | Tất cả (public) | Admin (via service role) |
| `users` | Chính chủ | Chính chủ |
| `student_progress` | Chính chủ | Chính chủ |
| `lesson_completions` | Chính chủ | Chính chủ |
| `unit_completions` | Chính chủ | Chính chủ |

---

## Indexes

```sql
-- Units / Lessons
CREATE INDEX idx_units_grade_subject ON units(grade_id, subject_id);
CREATE INDEX idx_units_order         ON units(grade_id, subject_id, order_index);
CREATE INDEX idx_lessons_unit        ON lessons(unit_id, order_index);

-- Exercises / Options
CREATE INDEX idx_exercises_lesson    ON exercises(lesson_id, order_index);
CREATE INDEX idx_options_exercise    ON exercise_options(exercise_id);

-- Student data
CREATE INDEX idx_progress_user       ON student_progress(user_id);
CREATE INDEX idx_progress_lesson     ON student_progress(lesson_id);
CREATE INDEX idx_progress_unit       ON student_progress(unit_id);
CREATE INDEX idx_lc_user             ON lesson_completions(user_id);
CREATE INDEX idx_lc_lesson           ON lesson_completions(lesson_id);
CREATE INDEX idx_uc_user             ON unit_completions(user_id);
CREATE INDEX idx_uc_unit             ON unit_completions(unit_id);
```

---

## Dữ Liệu Hiện Tại (2026-03-01)

| Bảng | Số records |
|---|---|
| grades | 7 |
| subjects | 3 |
| grade_subjects | 4 |
| units | 10 |
| lessons | 14 |
| exercises | 31 |

Nội dung chính hiện có: **Stage 4 – Toán** (Unit 1: Numbers and the number system, Lessons 1.1 và 1.2).
