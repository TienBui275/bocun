# Hướng dẫn Setup Database - Cun Bo Project

## ✅ Các file đã được tạo tự động:

1. **Supabase Clients:**
   - [lib/supabase/client.js](lib/supabase/client.js) - Browser client
   - [lib/supabase/server.js](lib/supabase/server.js) - Server client

2. **API Routes:**
   - [app/api/topics/route.js](app/api/topics/route.js) - Lấy danh sách topics theo grade + subject
   - [app/api/exercises/route.js](app/api/exercises/route.js) - Lấy exercises theo topic_id
   - [app/api/progress/route.js](app/api/progress/route.js) - Lưu & lấy kết quả làm bài

3. **Test & Scripts:**
   - [app/test-db/page.js](app/test-db/page.js) - Trang test database connection
   - [scripts/seed-data.js](scripts/seed-data.js) - Script tạo dữ liệu mẫu

---

## 📋 CÁC BƯỚC BẠN CẦN LÀM:

### Bước 1: Tạo Supabase Project

1. Truy cập https://supabase.com/dashboard
2. Click **"New Project"**
3. Điền thông tin:
   - Project Name: `cunbo-project`
   - Database Password: (tạo password mạnh và lưu lại)
   - Region: **Southeast Asia (Singapore)**
4. Click **"Create new project"** và đợi ~2 phút

---

### Bước 2: Lấy API Credentials

1. Trong Supabase Dashboard, vào **Settings** → **API**
2. Copy các thông tin sau:

   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Scroll xuống phần **"Service Role"**, copy:
   ```
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

⚠️ **Lưu ý:** Service role key rất quan trọng, không share public!

---

### Bước 3: Cấu hình Environment Variables

1. Mở file `.env.local` (đã có trong project)
2. Thay thế các giá trị:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

3. Lưu file

---

### Bước 4: Chạy Database Migration

1. Quay lại Supabase Dashboard
2. Vào **SQL Editor** (menu bên trái)
3. Click **"New query"**
4. Mở file [supabase/migrations/001_cunbo_schema.sql](supabase/migrations/001_cunbo_schema.sql)
5. **Copy toàn bộ nội dung** (từ dòng 1 đến cuối)
6. **Paste** vào SQL Editor trong Supabase
7. Click nút **"Run"** (hoặc nhấn `Ctrl+Enter`)

✅ Bạn sẽ thấy message: "Success. No rows returned"

---

### Bước 5: Verify Tables đã được tạo

1. Trong Supabase Dashboard, vào **Table Editor**
2. Kiểm tra các bảng sau đã được tạo:

   ✅ users  
   ✅ grades (7 rows)  
   ✅ subjects (3 rows)  
   ✅ grade_subjects  
   ✅ topics  
   ✅ exercises  
   ✅ exercise_options  
   ✅ student_progress  
   ✅ topic_completions

3. Click vào bảng **grades** → bạn sẽ thấy 7 dòng data (Pre-K → Lớp 5)
4. Click vào bảng **subjects** → bạn sẽ thấy 3 dòng (Toán, Khoa Học, Tiếng Anh)

---

### Bước 6: Chạy Seed Data (tạo dữ liệu mẫu)

Trong terminal, chạy lệnh:

```bash
cd cunbo_project
node scripts/seed-data.js
```

Kết quả mong đợi:
```
🌱 Bắt đầu seed data cho Cun Bo Project...
✅ Tìm thấy 7 grades và 3 subjects
📚 Tạo topic: "Đếm số 1-5" (Pre-K - Toán)...
✅ Đã tạo topic: Đếm số 1-5
  ✓ Tạo bài tập: 🍎 Đếm số quả táo. Có bao nhiêu quả?
  ...
✅ Hoàn tất seed data!
```

---

### Bước 7: Test Database Connection

1. Khởi động dev server (nếu chưa chạy):
   ```bash
   npm run dev
   ```

2. Mở trình duyệt, truy cập:
   ```
   http://localhost:3000/test-db
   ```

3. Bạn sẽ thấy:
   - ✅ Database Connection Test
   - Danh sách 7 grades với màu sắc
   - Danh sách 3 subjects
   - Danh sách topics đã tạo

Nếu thấy trang này → **🎉 Setup thành công!**

---

## 🧪 Test API Endpoints

### 1. Lấy topics theo grade + subject

```bash
curl "http://localhost:3000/api/topics?grade=pre-k&subject=toan"
```

Response:
```json
{
  "success": true,
  "grade": { "id": 1, "name": "Pre-K", "slug": "pre-k", ... },
  "subject": { "id": 1, "name": "Toán", "slug": "toan", ... },
  "topics": [
    { "id": 1, "title": "Đếm số 1-5", ... }
  ],
  "count": 1
}
```

### 2. Lấy exercises theo topic_id

```bash
curl "http://localhost:3000/api/exercises?topic_id=1"
```

Response:
```json
{
  "success": true,
  "topic": { "id": 1, "title": "Đếm số 1-5", ... },
  "exercises": [
    {
      "id": 1,
      "question": "🍎 Đếm số quả táo. Có bao nhiêu quả?",
      "exercise_options": [
        { "option_label": "A", "option_text": "2", "is_correct": false },
        { "option_label": "B", "option_text": "3", "is_correct": true },
        { "option_label": "C", "option_text": "4", "is_correct": false }
      ]
    }
  ]
}
```

---

## 🚀 Next Steps

Bây giờ bạn đã có:

✅ Database setup hoàn chỉnh với 9 tables  
✅ Sample data (grades, subjects, topics, exercises)  
✅ API routes để lấy dữ liệu  
✅ Authentication setup (Supabase Auth)

**Bước tiếp theo:**

### ⭐ Cài đặt Google OAuth (Quan trọng!)

👉 **Xem hướng dẫn chi tiết:** [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md)

**Tóm tắt:**
1. Tạo Google OAuth Client ID trong Google Cloud Console
2. Cấu hình Google Provider trong Supabase Dashboard
3. Test đăng nhập với Google

---

**Sau khi hoàn thành Google OAuth, bạn có thể:**

1. Implement trang chọn lớp (Grade selection page)
2. Tạo trang môn học (Subject page)
3. Tạo giao diện làm bài (Exercise page với quiz UI)
4. Tạo dashboard để xem progress
5. Tích hợp UserProfile component vào Header

---

## ❓ Troubleshooting

### Lỗi: "relation does not exist"
→ Migration chưa chạy. Quay lại **Bước 4** và chạy SQL migration.

### Lỗi: "No API key found"
→ File `.env.local` chưa được cấu hình đúng. Kiểm tra lại **Bước 3**.

### Seed script báo lỗi "Invalid API key"
→ Kiểm tra `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local`.

### Page /test-db báo lỗi "Unauthorized"
→ RLS policies chưa được setup. Chạy lại migration SQL.

---

## 📚 Tài liệu tham khảo

- [Supabase Documentation](https://supabase.com/docs)
- [DATABASE_DESIGN.md](supabase/DATABASE_DESIGN.md) - Schema design chi tiết
- [Next.js App Router](https://nextjs.org/docs/app)
