# 🚀 Quick Start - Cun Bo Project

## Checklist Setup (theo thứ tự)

### 1️⃣ Database Setup (15-20 phút)

📖 **Chi tiết:** [SETUP_DATABASE.md](SETUP_DATABASE.md)

- [ ] Tạo Supabase project
- [ ] Lấy API credentials (URL, anon key, service_role key)
- [ ] Cập nhật `.env.local`
- [ ] Chạy SQL migration trong Supabase SQL Editor
- [ ] Verify 9 tables đã được tạo
- [ ] Chạy seed script: `node scripts/seed-data.js`
- [ ] Test: `http://localhost:3000/test-db`

---

### 2️⃣ Google OAuth Setup (10-15 phút)

📖 **Chi tiết:** [GOOGLE_AUTH_SETUP.md](GOOGLE_AUTH_SETUP.md)

**Google Cloud Console:**
- [ ] Tạo project mới
- [ ] Enable Google+ API
- [ ] Tạo OAuth Consent Screen
- [ ] Tạo OAuth Client ID
- [ ] Thêm redirect URI: `https://xxx.supabase.co/auth/v1/callback`
- [ ] Copy Client ID & Client Secret

**Supabase Dashboard:**
- [ ] Authentication → Providers → Google
- [ ] Enable Google provider
- [ ] Paste Client ID & Secret
- [ ] Save

**Test:**
- [ ] Vào `/login` → Click "Đăng nhập với Google"
- [ ] Verify user profile tạo trong database
- [ ] Test logout
- [ ] Test protected route `/my-account`

---

### 3️⃣ Tích hợp vào UI (5 phút)

**Thêm UserProfile vào Header:**

Mở [components/Header/Header.js](components/Header/Header.js):

```javascript
import UserProfile from '@/components/Auth/UserProfile'

// Trong JSX, thay nút Login cũ bằng:
<UserProfile />
```

- [ ] Import UserProfile component
- [ ] Thay thế nút login cũ
- [ ] Test: Thấy avatar khi login, nút "Đăng Nhập" khi logout

---

## 🧪 Test toàn bộ hệ thống

### Authentication Flow:
1. [ ] Logout (nếu đang login)
2. [ ] Vào `/login`
3. [ ] Click "Đăng nhập với Google"
4. [ ] Chọn tài khoản Google
5. [ ] Redirect về homepage
6. [ ] Thấy avatar + tên ở header
7. [ ] Click avatar → Menu dropdown hiện ra
8. [ ] Click "👤 Tài khoản" → Vào `/my-account`
9. [ ] Xem thông tin profile
10. [ ] Click "🚪 Đăng xuất" → Logout

### Protected Routes:
1. [ ] Logout trước
2. [ ] Truy cập `/my-account` → Redirect về `/login`
3. [ ] Login → Redirect lại về `/my-account`

### Database & API:
1. [ ] `/test-db` hiển thị 7 grades, 3 subjects, topics
2. [ ] API topics: `curl "http://localhost:3000/api/topics?grade=pre-k&subject=toan"`
3. [ ] API exercises: `curl "http://localhost:3000/api/exercises?topic_id=1"`

---

## 📁 Files quan trọng

**Đã tạo tự động cho bạn:**

```
cunbo_project/
├── app/
│   ├── auth/callback/route.js       ✅ OAuth callback handler
│   ├── api/
│   │   ├── topics/route.js          ✅ Topics API
│   │   ├── exercises/route.js       ✅ Exercises API
│   │   └── progress/route.js        ✅ Progress API
│   ├── my-account/page.js           ✅ User account page
│   └── test-db/page.js              ✅ Database test
│
├── components/
│   ├── Auth/
│   │   ├── Login.js                 ✅ Login form (có sẵn)
│   │   ├── UserProfile.js           ✅ User dropdown menu (mới)
│   │   └── UserProfile.scss         ✅ Styling
│   └── My-Account/
│       ├── MyAccountClient.js       ✅ Account UI (mới)
│       └── MyAccount.scss           ✅ Styling
│
├── lib/supabase/
│   ├── client.js                    ✅ Browser client
│   └── server.js                    ✅ Server client
│
├── hooks/
│   └── useAuth.js                   ✅ Auth logic (đã update)
│
├── middleware.js                     ✅ Route protection (mới)
│
└── scripts/
    └── seed-data.js                 ✅ Sample data seeder
```

**Bạn cần cấu hình:**
- `.env.local` - Environment variables
- `components/Header/Header.js` - Thêm UserProfile component

---

## 🎯 Sau khi hoàn thành

Bạn sẽ có:

✅ Database hoàn chỉnh với sample data  
✅ Google OAuth login  
✅ Email/Password login  
✅ User profile management  
✅ Protected routes  
✅ API endpoints  
✅ Session management  
✅ Auto-create user profiles  

**Tổng thời gian:** ~30-40 phút

---

## ❓ Gặp vấn đề?

### Database issues:
→ Xem [SETUP_DATABASE.md - Troubleshooting](SETUP_DATABASE.md#-troubleshooting)

### Google OAuth issues:
→ Xem [GOOGLE_AUTH_SETUP.md - Troubleshooting](GOOGLE_AUTH_SETUP.md#-troubleshooting)

### Lỗi khác:
1. Kiểm tra `.env.local` có đầy đủ credentials
2. Restart dev server: `npm run dev`
3. Check browser console cho errors
4. Check terminal console cho server errors

---

## 📞 Commands hữu ích

```bash
# Development
npm run dev              # Khởi động dev server
node scripts/seed-data.js # Tạo sample data

# Testing
curl "http://localhost:3000/api/topics?grade=pre-k&subject=toan"
curl "http://localhost:3000/api/exercises?topic_id=1"

# Production
npm run build            # Build for production
npm start               # Start production server
```

---

**Bắt đầu từ Bước 1 → Database Setup!**

📖 [SETUP_DATABASE.md](SETUP_DATABASE.md)
