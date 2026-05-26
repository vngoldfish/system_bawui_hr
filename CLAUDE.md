# CLAUDE.md

**This file is the SINGLE SOURCE OF TRUTH** for how you should behave in this repository.

## Project Overview
- **Tên dự án**: bawuiweb
- **Mô tả**: Hệ thống quản lý nhân sự (HR Management System) dành cho công ty Nhật Bản.
- **Ngôn ngữ chính**: Giao diện tiếng Nhật, hỗ trợ đa ngôn ngữ cho nhân viên nước ngoài.
- **Phiên bản**: Next.js **16.2.6** (App Router + React 19)

## Technology Stack
- Next.js 16.2.6 (App Router)
- React 19 + TypeScript (strict)
- Tailwind CSS 4
- Prisma + PostgreSQL
- Zod (validation)
- Geist font

## Multi-Language Support (i18n) – RẤT QUAN TRỌNG
Hệ thống **phải hỗ trợ 4 ngôn ngữ**:
- **ja** (Japanese) – ngôn ngữ mặc định
- **en** (English)
- **vi** (Vietnamese)
- **zh** (Chinese – Simplified)

### Quy tắc khi làm việc với đa ngôn ngữ:
1. Mỗi trang/component phải hỗ trợ translation keys (không hardcode text).
2. Ngôn ngữ của user được lưu trong **user profile** (cột `preferredLanguage` trong bảng users/employees).
3. Default language = **ja** (Japanese).
4. Language detection: theo `preferredLanguage` của user → fallback về `ja`.
5. Khi render UI, luôn dùng hook hoặc function i18n hiện tại của dự án.
6. Khi thêm text mới, phải thêm translation cho **cả 4 ngôn ngữ**.
7. Hỗ trợ nhân viên nước ngoài chọn ngôn ngữ cá nhân (trong trang profile/settings).
8. Cho đến khi có login thật, lấy `preferredLanguage` từ `getCurrentUser()` trong `src/lib/auth-mock.ts` → fallback về `ja`.

## Important Rules (PHẢI TUÂN THỦ TUYỆT ĐỐI)
1. **Timezone**: Luôn dùng `Asia/Tokyo` khi xử lý ngày giờ.
2. **Date Handling**: Prisma `Date` → client phải convert sang ISO string.
3. **API Response**: Luôn dùng helper trong `src/lib/api-utils.ts`.
4. **Client/Server**: Server components fetch data → pass data đã serialize xuống Client components (`*Client.tsx`).
5. **Mock Auth**: Cho đến khi tích hợp login/session thật, mọi kiểm tra user/role/permission phải dùng `src/lib/auth-mock.ts` (`getCurrentUser`, `hasRole`, `hasPermission`, `requirePermission`). Không tự tạo auth helper khác song song.
6. Không thay đổi cấu trúc thư mục trừ khi thực sự cần thiết.
7. Luôn kiểm tra `prisma/schema.prisma` trước khi thêm/sửa field.

## Commands

```bash
npm run dev          # Development
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

# Prisma
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npx prisma studio