# 🔄 Migration Guide: Topics → Units + Lessons

## Tổng quan

Cấu trúc database đã được cập nhật từ **3 cấp** sang **4 cấp** để đáp ứng yêu cầu tổ chức nội dung chi tiết hơn:

### Cấu trúc CŨ:
```
Grades → Subjects → Topics → Exercises
   ↓         ↓         ↓           ↓
Lớp 1   →  Toán   → Đếm số   →  10 bài
```

### Cấu trúc MỚI:
```
Grades → Subjects → Units → Lessons → Exercises
   ↓         ↓        ↓        ↓           ↓
Lớp 1   →  Toán  → Unit 1  → 1.1 Count →  10 bài
                   Number    → 1.2 Negative
                             → 1.3 Place Value
```

---

## 📋 Các bước Migration

### Bước 1: Backup dữ liệu hiện tại (Quan trọng!)

Trong Supabase Dashboard:
1. Vào **Database** → **Backups**
2. Click **Create backup** để tạo backup thủ công
3. Hoặc export data từng table quan trọng:
   - `topics`
   - `exercises`
   - `student_progress`
   - `topic_completions`

### Bước 2: Chạy Migration SQL

1. Vào **Supabase Dashboard** → **SQL Editor**
2. Mở file [migrations/002_refactor_to_units_lessons.sql](migrations/002_refactor_to_units_lessons.sql)
3. Copy toàn bộ nội dung và paste vào SQL Editor
4. Click **Run**

**Migration này sẽ:**
- ✅ Tạo bảng mới: `units`, `lessons`
- ✅ Tạo bảng mới: `lesson_completions`, `unit_completions`
- ✅ Di chuyển dữ liệu từ `topics` → `units` (tự động)
- ✅ Thêm cột `lesson_id`, `unit_id` vào `exercises` và `student_progress`
- ✅ Cập nhật indexes và RLS policies
- ⚠️ **KHÔNG xóa** bảng `topics` và `topic_completions` (giữ lại để backward compatible)

### Bước 3: Verify Tables

Kiểm tra trong **Table Editor**:

✅ **Tables mới đã được tạo:**
- `units`
- `lessons`
- `lesson_completions`
- `unit_completions`

✅ **Tables cũ vẫn còn:**
- `topics` (giữ lại)
- `topic_completions` (giữ lại)

✅ **Tables được cập nhật:**
- `exercises` (có thêm cột `lesson_id`)
- `student_progress` (có thêm cột `lesson_id`, `unit_id`)
- `grade_subjects` (đổi `topic_count` → `unit_count`, thêm `lesson_count`)

### Bước 4: Import dữ liệu bằng script tổng quát

```bash
cd cunbo_project
node scripts/import-lesson-csv.js --file data/Math_Stage_4_Unit_1_Lesson_1.2.csv
```

Kết quả:
```
✅ Hoàn tất import CSV!

📊 Tổng kết:
  - X inserted / Y updated exercises
  - Lesson exercise_count được cập nhật
```

### Bước 5: Test API Endpoints

#### Test Units API:
```bash
curl "http://localhost:3000/api/units?grade=pre-k&subject=toan"
```

Response:
```json
{
  "success": true,
  "grade": { "name": "Pre-K", "slug": "pre-k" },
  "subject": { "name": "Toán", "slug": "toan" },
  "units": [
    {
      "id": 1,
      "title": "Unit 1: Number",
      "unit_number": 1,
      "lesson_count": 2
    }
  ]
}
```

#### Test Lessons API:
```bash
curl "http://localhost:3000/api/lessons?unit_id=1"
```

Response:
```json
{
  "success": true,
  "unit": { "title": "Unit 1: Number" },
  "lessons": [
    {
      "id": 1,
      "title": "1.1 Counting",
      "lesson_number": "1.1",
      "exercise_count": 3
    },
    {
      "id": 2,
      "title": "1.2 Negative Numbers",
      "lesson_number": "1.2",
      "exercise_count": 2
    }
  ]
}
```

#### Test Exercises API (với lesson_id mới):
```bash
curl "http://localhost:3000/api/exercises?lesson_id=1"
```

Response:
```json
{
  "success": true,
  "lesson": { 
    "title": "1.1 Counting",
    "units": {
      "title": "Unit 1: Number",
      "grades": { "name": "Pre-K" },
      "subjects": { "name": "Toán" }
    }
  },
  "exercises": [
    {
      "id": 1,
      "question": "🍎 Đếm số quả táo. Có bao nhiêu quả?",
      "exercise_options": [...]
    }
  ]
}
```

#### Backward Compatible - vẫn dùng topic_id được:
```bash
curl "http://localhost:3000/api/exercises?topic_id=1"
```

---

## 🔧 File Changes Summary

### Files Mới:
- ✅ `supabase/migrations/002_refactor_to_units_lessons.sql`
- ✅ `app/api/units/route.js`
- ✅ `app/api/lessons/route.js`
- ✅ `scripts/import-lesson-csv.js`
- ✅ `MIGRATION_GUIDE.md` (file này)

### Files Cập nhật:
- ✅ `supabase/DATABASE_DESIGN.md` - updated schema documentation
- ✅ `app/api/exercises/route.js` - hỗ trợ cả `lesson_id` và `topic_id`
- ✅ `app/api/progress/route.js` - hỗ trợ `lesson_id`, `unit_id` và `topic_id`
- ✅ `scripts/README.md` - thêm hướng dẫn seed mới

### Files Không thay đổi:
- Database migration cũ: `001_cunbo_schema.sql` (giữ nguyên)
- API route cũ: `api/topics/route.js` (giữ nguyên)

---

## ⚠️ Breaking Changes

### Nếu đã có UI code sử dụng Topics:

**CŨ:**
```javascript
// Lấy topics
const res = await fetch('/api/topics?grade=lop-1&subject=toan')

// Lấy exercises theo topic
const res2 = await fetch('/api/exercises?topic_id=1')
```

**MỚI (Khuyến nghị):**
```javascript
// Lấy units
const res = await fetch('/api/units?grade=lop-1&subject=toan')

// Lấy lessons theo unit
const res2 = await fetch('/api/lessons?unit_id=1')

// Lấy exercises theo lesson
const res3 = await fetch('/api/exercises?lesson_id=1')
```

**Backward Compatible (vẫn hoạt động):**
```javascript
// API cũ vẫn dùng được
const res = await fetch('/api/topics?grade=lop-1&subject=toan')
const res2 = await fetch('/api/exercises?topic_id=1')
```

---

## 📊 Data Migration Strategy

### Option 1: Giữ cả 2 cấu trúc (Khuyến nghị - An toàn)

- ✅ Giữ nguyên tables cũ (`topics`, `topic_completions`)
- ✅ Tạo mới tables (`units`, `lessons`, `lesson_completions`, `unit_completions`)
- ✅ Migration tự động copy data từ `topics` → `units`
- ✅ Từ từ migrate UI code sang dùng cấu trúc mới
- ✅ Sau khi migrate xong UI, mới xóa tables cũ

### Option 2: Xóa cấu trúc cũ (Sau khi test kỹ)

Chỉ làm khi đã:
- ✅ Migrate hết UI code sang dùng Units/Lessons
- ✅ Test kỹ toàn bộ chức năng
- ✅ Migrate hết data từ `topics` → `units` và `lessons`

Sau đó chạy SQL:
```sql
-- ⚠️ CẢNH BÁO: Chỉ chạy khi đã migrate xong!
DROP TABLE IF EXISTS public.topic_completions CASCADE;
DROP TABLE IF EXISTS public.topics CASCADE;
ALTER TABLE public.exercises DROP COLUMN IF EXISTS topic_id;
ALTER TABLE public.student_progress DROP COLUMN IF EXISTS topic_id;
```

---

## 🎯 Next Steps

1. ✅ **Đã hoàn thành:**
   - Database migration
   - API endpoints mới
   - Seed script mới
   - Documentation

2. 🔜 **Cần implement:**
   - UI cho Units selection (trang chọn Unit)
   - UI cho Lessons selection (trang chọn Lesson trong Unit)
   - UI cho Exercise quiz (cập nhật để dùng lesson_id)
   - Dashboard hiển thị tiến độ theo Units/Lessons

3. 📝 **Optional:**
   - Migrate dữ liệu thực từ `topics` sang `units` + `lessons` (nếu có data production)
   - Update test cases
   - Update documentation cho component UI

---

## ❓ Troubleshooting

### Lỗi: "relation units does not exist"
→ Chưa chạy migration. Quay lại **Bước 2**.

### Lỗi khi seed: "null value in column lesson_id"
→ Bảng `exercises` chưa có cột `lesson_id`. Chạy lại migration.

### API trả về empty units
→ Chưa import data. Chạy `node scripts/import-lesson-csv.js --file <csv>`

### Muốn rollback về cấu trúc cũ?
→ Restore từ backup đã tạo ở **Bước 1**.

---

## 📚 Tham khảo

- [DATABASE_DESIGN.md](supabase/DATABASE_DESIGN.md) - Schema documentation mới
- [002_refactor_to_units_lessons.sql](supabase/migrations/002_refactor_to_units_lessons.sql) - Migration SQL
- [scripts/README.md](scripts/README.md) - Scripts documentation
