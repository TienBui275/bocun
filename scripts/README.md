# Scripts - Cun Bo Project

## ✅ General-purpose scripts (kept)

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
