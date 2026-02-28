# Scripts - Cun Bo Project

## 🆕 Seed Units & Lessons Script (Khuyến nghị - Cấu trúc mới)

Script này tạo dữ liệu mẫu theo cấu trúc mới: **Units → Lessons → Exercises**

### Cách sử dụng:

1. **Đảm bảo đã run migration `002_refactor_to_units_lessons.sql` trong Supabase SQL Editor**

2. **Đảm bảo đã cấu hình .env.local:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Chạy seed script:**
   ```bash
   node scripts/seed-units-lessons.js
   ```

### Dữ liệu được tạo:

✅ **Unit 1: Number** (Pre-K - Toán)
- **Lesson 1.1: Counting** - 3 bài tập đếm số
- **Lesson 1.2: Negative Numbers** - 2 bài tập số âm

✅ **Unit 2: Addition** (Lớp 1 - Toán)
- **Lesson 2.1: Basic Addition** - 2 bài tập phép cộng

### Kết quả mong đợi:

```
🌱 Bắt đầu seed Units & Lessons cho Cun Bo Project...

✅ Tìm thấy 7 grades và 3 subjects

📚 Tạo Unit 1: Number (Pre-K - Toán)...
✅ Đã tạo unit: Unit 1: Number
  📖 Tạo Lesson 1.1: Counting...
  ✅ Đã tạo lesson: 1.1 Counting
    ✓ Tạo bài tập: 🍎 Đếm số quả táo. Có bao nhiêu quả?
    ✓ Đã tạo 3 đáp án
    ...

✅ Hoàn tất seed Units & Lessons!

📊 Tổng kết:
   - 2 Units
   - 3 Lessons
   - 7 Exercises
```

---

## 📝 Seed Data Script (Cấu trúc cũ - Topics)

Script này dùng để tạo dữ liệu mẫu cho database (topics, exercises, exercise_options).

### Cách sử dụng:

1. **Đảm bảo đã cấu hình .env.local:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Cài đặt dependencies (nếu chưa có):**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

3. **Chạy seed script:**
   ```bash
   node scripts/seed-data.js
   ```

### Dữ liệu được tạo:

✅ **Topic 1: "Đếm số 1-5"** (Pre-K - Toán)
- 3 bài tập multiple choice
- Mỗi bài có 2-3 đáp án

✅ **Topic 2: "Số 1 đến 10"** (Lớp 1 - Toán)
- 2 bài tập phép cộng/trừ
- Mỗi bài có 3 đáp án

✅ **Topic 3: "Nhận biết màu sắc"** (Pre-K - Khoa Học)
- Chỉ tạo topic (chưa có exercises)

### Kết quả mong đợi:

```
🌱 Bắt đầu seed data cho Cun Bo Project...

✅ Tìm thấy 7 grades và 3 subjects

📚 Tạo topic: "Đếm số 1-5" (Pre-K - Toán)...
✅ Đã tạo topic: Đếm số 1-5
  ✓ Tạo bài tập: 🍎 Đếm số quả táo. Có bao nhiêu quả?
    ✓ Đã tạo 3 đáp án
  ✓ Tạo bài tập: 1 + 1 = ?
    ✓ Đã tạo 3 đáp án
  ✓ Tạo bài tập: Số nào lớn hơn: 3 hay 5?
    ✓ Đã tạo 2 đáp án

✅ Hoàn tất seed data!
```

### Lưu ý:

- Script sử dụng `upsert` nên chạy nhiều lần sẽ không tạo duplicate data
- Nếu topic đã tồn tại, script sẽ bỏ qua và báo warning
- Đảm bảo migration đã chạy thành công trước khi seed data
