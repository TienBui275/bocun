# Hướng dẫn cài đặt Google OAuth cho Cun Bo Project

## ✅ Các file đã được tạo tự động:

1. **Authentication Routes:**
   - [app/auth/callback/route.js](app/auth/callback/route.js) - Xử lý OAuth callback
   - [app/my-account/page.js](app/my-account/page.js) - Trang tài khoản người dùng

2. **Components:**
   - [components/Auth/UserProfile.js](components/Auth/UserProfile.js) - User dropdown menu
   - [components/My-Account/MyAccountClient.js](components/My-Account/MyAccountClient.js) - My Account UI

3. **Middleware:**
   - [middleware.js](middleware.js) - Route protection & session management

4. **Hooks (đã cập nhật):**
   - [hooks/useAuth.js](hooks/useAuth.js) - Auth logic với Google OAuth support

---

## 📋 CÁC BƯỚC CẤU HÌNH GOOGLE OAUTH:

### Bước 1: Tạo Google OAuth Credentials

1. Truy cập **Google Cloud Console**: https://console.cloud.google.com/

2. Tạo project mới (nếu chưa có):
   - Click vào dropdown project ở góc trên bên trái
   - Click **"New Project"**
   - Điền tên project: `Cun Bo App`
   - Click **"Create"**

3. Enable Google+ API:
   - Vào **APIs & Services** → **Library**
   - Tìm kiếm **"Google+ API"**
   - Click vào và nhấn **"Enable"**

4. Tạo OAuth Consent Screen:
   - Vào **APIs & Services** → **OAuth consent screen**
   - Chọn **"External"** → Click **"Create"**
   - Điền thông tin:
     - App name: `Cun Bo`
     - User support email: (email của bạn)
     - Developer contact: (email của bạn)
   - Click **"Save and Continue"**
   - Bỏ qua phần Scopes → Click **"Save and Continue"**
   - Thêm Test users (email của bạn để test) → Click **"Save and Continue"**
   - Click **"Back to Dashboard"**

5. Tạo OAuth 2.0 Client ID:
   - Vào **APIs & Services** → **Credentials**
   - Click **"Create Credentials"** → Chọn **"OAuth client ID"**
   - Application type: **"Web application"**
   - Name: `Cun Bo Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://your-production-domain.com (nếu có)
     ```
   - **Authorized redirect URIs:** ⚠️ **QUAN TRỌNG!**
     ```
     https://your-project-id.supabase.co/auth/v1/callback
     ```
     
     **Cách lấy đúng URL:**
     - Vào Supabase Dashboard → Settings → API
     - Copy **"Project URL"**: `https://xxxxx.supabase.co`
     - Thêm `/auth/v1/callback` vào cuối
     - Ví dụ: `https://oehylgyeplocedqcuyza.supabase.co/auth/v1/callback`

   - Click **"Create"**

6. Copy Credentials:
   - Sau khi tạo xong, bạn sẽ thấy popup với:
     - **Client ID**: `xxx.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-xxx`
   - **Copy cả 2 giá trị này** (sẽ dùng ở bước tiếp theo)

---

### Bước 2: Cấu hình Google OAuth trong Supabase

1. Truy cập **Supabase Dashboard**: https://supabase.com/dashboard

2. Chọn project `cunbo-project`

3. Vào **Authentication** → **Providers** (menu bên trái)

4. Tìm **Google** trong danh sách providers

5. Click vào **Google** để mở cấu hình

6. Bật enable toggle: **"Enable Google provider"**

7. Điền thông tin:
   - **Client ID (for OAuth)**: Paste Client ID từ Google Console
   - **Client Secret (for OAuth)**: Paste Client Secret từ Google Console

8. Copy **Callback URL** (để verify):
   - Bạn sẽ thấy: `https://your-project.supabase.co/auth/v1/callback`
   - **Đảm bảo URL này đã được thêm vào Google Console** (Bước 1.5)

9. Click **"Save"**

✅ Google OAuth đã được cấu hình!

---

### Bước 3: Test Google Login

1. Khởi động dev server:
   ```bash
   cd cunbo_project
   npm run dev
   ```

2. Mở trình duyệt: `http://localhost:3000/login`

3. Click nút **"Đăng nhập với Google"** (🔵 Google button)

4. Chọn tài khoản Google của bạn

5. Cho phép app truy cập thông tin

6. Bạn sẽ được redirect về homepage và thấy:
   - Avatar/tên của bạn ở góc trên phải
   - Click vào để xem menu dropdown
   - Click **"Tài khoản"** để vào trang My Account

---

### Bước 4: Verify trong Database

1. Vào Supabase Dashboard → **Table Editor**

2. Mở bảng **"users"** (public schema)

3. Bạn sẽ thấy 1 row mới với:
   - `id`: UUID của user
   - `email`: Email Google của bạn
   - `full_name`: Tên từ Google profile
   - `avatar_url`: Avatar URL từ Google
   - `role`: `student` (mặc định)
   - `created_at`: Timestamp vừa tạo

✅ User profile đã được tự động tạo nhờ trigger `handle_new_user()`!

---

## 🧪 Test các tính năng:

### 1. Login với Google ✅
- Vào `/login` → Click "Đăng nhập với Google"
- Chọn tài khoản → Redirect về homepage
- Thấy avatar + tên user ở header

### 2. My Account Page ✅
- Click vào avatar → Click "👤 Tài khoản"
- Xem thông tin cá nhân
- Thấy "✅ Đã liên kết với Google Account"

### 3. Logout ✅
- Click vào avatar → Click "🚪 Đăng xuất"
- Redirect về homepage
- Thấy nút "Đăng Nhập" thay vì avatar

### 4. Protected Routes ✅
- Logout trước
- Truy cập `http://localhost:3000/my-account`
- Sẽ tự động redirect về `/login`
- Sau khi login → redirect lại về `/my-account`

### 5. Email/Password Login ✅
- Vẫn hoạt động bình thường
- User có thể dùng cả Google OAuth và Email/Password

---

## 🎨 Tích hợp UserProfile component vào Header

Mở file [components/Header/Header.js](components/Header/Header.js) và thêm UserProfile:

```javascript
import UserProfile from '@/components/Auth/UserProfile'

// Trong component Header, thay nút Login cũ bằng:
<UserProfile />
```

Ví dụ:
```javascript
<div className="header-right">
  {/* Navigation items */}
  <UserProfile />  {/* Thêm component này */}
</div>
```

---

## 🔐 Bảo mật

### Environment Variables cần thiết:

File `.env.local` đã được cập nhật tự động:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
```

⚠️ **Lưu ý:**
- **KHÔNG** commit `.env.local` vào Git
- File `.env.local.example` dùng để share template
- Production: Dùng environment variables trong hosting platform

---

## 🚀 Deploy to Production

### Khi deploy lên Vercel/Netlify:

1. **Thêm environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Update Google OAuth Redirect URI:**
   - Vào Google Cloud Console
   - Thêm production URL vào **Authorized redirect URIs**:
     ```
     https://your-domain.vercel.app
     ```
   - Redirect URI vẫn là Supabase endpoint (không đổi):
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```

3. **Update CORS trong Supabase:**
   - Vào Supabase Dashboard → Settings → API
   - **Additional Redirect URLs**: Thêm production domain
     ```
     https://your-domain.vercel.app/**
     ```

---

## ❓ Troubleshooting

### Lỗi: "redirect_uri_mismatch"
**Nguyên nhân:** Redirect URI trong Google Console không khớp.

**Cách sửa:**
1. Vào Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client
3. Kiểm tra **Authorized redirect URIs** có chính xác URL Supabase:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
4. Save và thử lại sau 5 phút

---

### Lỗi: "Access blocked: This app's request is invalid"
**Nguyên nhân:** OAuth Consent Screen chưa publish hoặc chưa thêm test user.

**Cách sửa:**
1. Vào Google Cloud Console → OAuth consent screen
2. Thêm email của bạn vào **Test users**
3. Hoặc publish app (nếu sẵn sàng)

---

### User profile không tự động tạo trong bảng `users`
**Nguyên nhân:** Trigger `handle_new_user()` chưa chạy.

**Cách sửa:**
1. Vào Supabase Dashboard → SQL Editor
2. Chạy lại migration [001_cunbo_schema.sql](supabase/migrations/001_cunbo_schema.sql)
3. Hoặc chạy query thủ công:
   ```sql
   SELECT * FROM auth.users;  -- Kiểm tra user có trong auth.users
   SELECT * FROM public.users; -- Kiểm tra có trong public.users
   ```

---

### Google login redirect về localhost thay vì production
**Cách sửa:**
- Cập nhật `redirectTo` trong [hooks/useAuth.js](hooks/useAuth.js):
  ```javascript
  redirectTo: process.env.NEXT_PUBLIC_APP_URL + '/auth/callback'
  ```
- Thêm vào `.env.local`:
  ```env
  NEXT_PUBLIC_APP_URL=https://your-domain.com
  ```

---

## 📚 Tài liệu tham khảo

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## ✅ Checklist hoàn thành

- [ ] Google Cloud Console: Tạo OAuth Client ID
- [ ] Google Cloud Console: Thêm Authorized redirect URI
- [ ] Supabase Dashboard: Enable Google provider
- [ ] Supabase Dashboard: Điền Client ID & Secret
- [ ] Test: Login với Google thành công
- [ ] Test: User profile tự động tạo trong database
- [ ] Test: Logout hoạt động
- [ ] Test: Protected routes redirect về login
- [ ] Tích hợp UserProfile vào Header
- [ ] Deploy lên production (nếu cần)

---

**🎉 Chúc mừng! Bạn đã cài đặt Google OAuth thành công cho Cun Bo Project!**
