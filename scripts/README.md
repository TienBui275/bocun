# Scripts - Cun Bo Project

## ✅ Bộ script tổng quát (giữ lại)

### 1) `import-lesson-csv.js` (khuyến nghị)
Import/cập nhật exercises từ CSV vào đúng Stage + Subject + Unit + Lesson.

```bash
node scripts/import-lesson-csv.js --file data/Math_Stage_4_Unit_1_Lesson_1.2.csv
```

Hỗ trợ:
- Auto-detect từ tên file: `<Subject>_Stage_<N>_Unit_<N>_Lesson_<N.N>.csv`
- `--dry-run` để validate không ghi DB
- Tự sync ảnh lên Supabase Storage và đổi `image_url` sang public URL (mặc định)
- Dùng `--skip-image-sync` nếu muốn bỏ qua bước ảnh

Ví dụ đầy đủ:

```bash
node scripts/import-lesson-csv.js \
  --file data/custom.csv \
  --subject math \
  --stage 4 \
  --unit 1 \
  --lesson 1.2
```

### 2) `upload-exercise-images.js`
Upload ảnh từ thư mục local lên Supabase Storage và convert các `image_url` dạng `images/...`.

```bash
node scripts/upload-exercise-images.js
```

### 3) `seed-grade-subjects.js`
Recompute/upsert `grade_subjects` dựa trên dữ liệu thực tế trong `units`, `lessons`, `exercises`.

```bash
node scripts/seed-grade-subjects.js
```

### 4) `run-migration.js`
Chạy file SQL migration trực tiếp.

```bash
node scripts/run-migration.js supabase/migrations/005_update_grades_to_english.sql
```

## 🧹 Ghi chú dọn dẹp

Các script one-off/legacy đã được loại bỏ để tránh trùng chức năng và giảm rủi ro vận hành sai:
- script seed dữ liệu mẫu cũ
- script import hard-code theo 1 lesson cụ thể
- script update dữ liệu dùng một lần
