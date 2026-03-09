# Scripts - Cun Bo Project

## ✅ General-purpose scripts (kept)

### 0) `process-lesson-folder.js` ⭐ (image folder → Excel → Supabase)

All-in-one script: đọc file Excel trong folder chứa ảnh bài tập → crop/copy ảnh
→ import exercises lên Supabase → upload ảnh lên Supabase Storage.

**Luồng sử dụng:**
1. Thêm `ANTHROPIC_API_KEY=sk-ant-...` vào file `.env.local`
2. Tạo folder với đúng naming convention (xem bên dưới), đặt ảnh vào đó
3. Chạy script — Claude Vision tự phân tích ảnh, tạo Excel, rồi import luôn:

```bash
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3
```

**Tên folder** phải theo pattern: `<Subject>_Stage_<N>_Unit_<N>_Lesson_<N.N>`
Ví dụ: `Math_Stage_4_Unit_1_Lesson_1.3`

**Tên file Excel** = tên folder + `.xlsx`, đặt ngay trong folder đó.
Ví dụ: `data/Math_Stage_4_Unit_1_Lesson_1.3/Math_Stage_4_Unit_1_Lesson_1.3.xlsx`

**Cột Excel:**

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| `order_index` | ✅ | Số thứ tự bài tập |
| `question` | ✅ | Nội dung câu hỏi |
| `question_type` | ✅ | `fill_blank` / `multiple_choice` / `true_false` |
| `difficulty` | | 1, 2 hoặc 3 (mặc định: 1) |
| `points` | | Điểm (mặc định: 10) |
| `is_active` | | TRUE/FALSE (mặc định: TRUE) |
| `source_image` | | Tên file ảnh gốc trong folder (vd: `2.png`) |
| `crop_x` `crop_y` `crop_w` `crop_h` | | Toạ độ crop từ ảnh gốc (px). Bỏ trống = copy cả ảnh |
| `image_url` | | Đường dẫn lưu ảnh (vd: `images/math_s4_u1_l1.3_q1.png`) |
| `correct_answer` | | Đáp án (dùng cho fill_blank) |
| `explanation` | | Giải thích đáp án |
| `hint` | | Gợi ý |
| `option_a/b/c/d` | | Đáp án lựa chọn (multiple_choice) |
| `correct_option` | | Đáp án đúng: A / B / C / D (multiple_choice) |

**Flags:**

```bash
# Dùng Excel có sẵn (bỏ qua bước AI)
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --skip-ai-extract

# Buộc chạy lại AI kể cả khi đã có Excel
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --force-ai-extract

# Tạo file Excel mẫu để tham khảo cột (không cần API key)
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --create-template

# Dry-run: xem trước không ghi DB
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --dry-run

# Chỉ tạo Excel + crop ảnh, bỏ qua import DB
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --skip-import

# Bỏ qua upload ảnh lên Storage
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --skip-image-sync

# Override model Claude (mặc định: claude-haiku-4-5, rẻ nhất có Vision)
node scripts/process-lesson-folder.js --folder data/Math_Stage_4_Unit_1_Lesson_1.3 --model claude-opus-4-5

# Override metadata (nếu tên folder không theo pattern)
node scripts/process-lesson-folder.js --folder data/custom-folder --stage 4 --subject math --unit 1 --lesson 1.3
```

**ENV cần có trong `.env.local`:**
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Packages cần thiết** (đã được cài sẵn):
- `xlsx` — đọc/ghi file Excel
- `sharp` — crop ảnh



### 1) `import-lesson-csv.js` (recommended)
Import/update exercises from CSV into the correct Stage + Subject + Unit + Lesson.

```bash
node scripts/import-lesson-csv.js --file data/Math_Stage_4_Unit_1_Lesson_1.2.csv
```

Supports:
- Auto-detect from filename: `<Subject>_Stage_<N>_Unit_<N>_Lesson_<N.N>.csv`
- `--dry-run` to validate without writing to DB
- Auto sync images to Supabase Storage and update `image_url` to public URL (default)
- Use `--skip-image-sync` to skip the image step

Full example:

```bash
node scripts/import-lesson-csv.js \
  --file data/custom.csv \
  --subject math \
  --stage 4 \
  --unit 1 \
  --lesson 1.2
```

### 2) `upload-exercise-images.js`
Upload images from a local directory to Supabase Storage and convert `image_url` entries of the form `images/...`.

```bash
node scripts/upload-exercise-images.js
```

### 3) `seed-grade-subjects.js`
Recompute/upsert `grade_subjects` based on actual data in `units`, `lessons`, `exercises`.

```bash
node scripts/seed-grade-subjects.js
```

### 4) `run-migration.js`
Run a SQL migration file directly.

```bash
node scripts/run-migration.js supabase/migrations/005_update_grades_to_english.sql
```

## 🧹 Cleanup notes

The following one-off/legacy scripts have been removed to avoid duplicate functionality and reduce the risk of incorrect operations:
- old sample data seed script
- hard-coded import script for a single lesson
- one-time data update script
