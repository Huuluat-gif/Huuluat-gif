# Báo cáo Kiểm toán & Gia cố Bảo mật (Security Report)

- **Ngày đánh giá:** 27/11/2026
- **Phạm vi:** Xác thực & phân quyền (Auth/RBAC), lưu trữ R2/Blob, chống SSRF, bảo mật header HTTP, thanh toán VNPAY, kiểm soát bí mật & vệ sinh Git.

---

## 1. Bảng Kiểm tra Bảo mật Thực tế

| Hạng mục bảo mật | Cơ chế áp dụng trên `migration/cloudflare` | Trạng thái |
| --- | --- | --- |
| **Phân quyền Quản trị (`/admin` & `/api/admin/*`)** | Mọi API quản trị gọi `requireAdmin()` (xác thực phiên Neon Auth + bắt buộc `emailVerified === true` + email khớp `LOWF_ADMIN_EMAILS`). Kiểm tra thực tế `GET https://www.lowflibray.com/api/admin/content/books` khi chưa đăng nhập từ chối truy cập ngay lập tức | **ĐẠT (đã kiểm tra thực tế)** |
| **Chống CSRF / Cross-Origin Write** | Mọi mutation (`POST`, `PATCH`, `DELETE`) gọi `assertSameOrigin(request)` đối chiếu `Origin`/`Referer` với host đang chạy | **ĐẠT (đã rà soát mã nguồn)** |
| **Phân quyền Tài nguyên Sách & Media (`/api/assets/[id]`)** | Kiểm tra `authorizeAssetRead(id)` trên server: chỉ trả `public` cache cho ảnh bìa công khai & tài nguyên `access = free`; tài nguyên thành viên/trả phí kiểm tra `isAdmin` / `hasMembership` / `hasPurchasedBook`, trả `Cache-Control: private, no-store` & `Vary: Cookie` (chống rò rỉ cache CDN cho tệp trả phí) | **ĐẠT (đã gia cố thêm header `Vary: Cookie` cho Range 206)** |
| **Chống SSRF khi Tìm & Nhập Ảnh Bìa Online (`/api/admin/covers/search`)** | Danh sách trắng tên miền tuyệt đối (`covers.openlibrary.org`, `books.google.com`, `books.googleusercontent.com`, `lh3.googleusercontent.com`), bắt buộc `https:`, cấm port/user/pass, theo dõi tối đa 1 redirect cũng phải nằm trong allowlist, kiểm tra Content-Type ảnh & kích thước (`1.2 KB – 3 MB`), rate limit riêng `cover-search` / `cover-import` | **ĐẠT (đã triển khai & rà soát)** |
| **Chống Path Traversal khi Upload R2** | `assertAssetPath()` trong [`lib/assets.ts`](../lib/assets.ts) chặn `..`, chặn dấu `/` đầu đường dẫn, kiểm tra mẫu UUID hoặc mẫu chuẩn `books/(pdf|epub)/...` & đuôi mở rộng hợp lệ | **ĐẠT** |
| **IP Tin cậy & Rate Limiting trên Cloudflare** | [`lib/env.ts`](../lib/env.ts) ưu tiên đọc `CF-Connecting-IP` (header do Cloudflare Edge chèn và ghi đè không thể giả mạo từ client) hoặc `X-Vercel-Forwarded-For` khi chạy trên Vercel; không tin cậy `x-forwarded-for` thô ở môi trường Cloudflare | **ĐẠT** |
| **Bảo mật Thanh toán VNPAY** | Chữ ký `HMAC-SHA512`, `idempotency_key` UUID chống trùng đơn, mã hóa secret cấu hình thanh toán, chặn `mode === 'production'` trên môi trường Staging/Preview (`!isProductionEnv()`) | **ĐẠT** |
| **Bảo mật HTTP Headers** | Kiểm tra thực tế trên `https://www.lowflibray.com/`: có đủ `Strict-Transport-Security: max-age=63072000`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` | **ĐẠT (đã đo live)** |
| **Không lộ Secret & Không commit Nhị phân vào Git** | Không có API key, `R2_SECRET_ACCESS_KEY`, `DATABASE_URL` hay `.env` trong mã nguồn/tài liệu; CI workflow `.github/workflows/ci-staging.yml` có bước tự động chặn commit chứa `.pdf`, `.epub`, `.env` hoặc mẫu chuỗi bí mật AWS / Vercel Blob / chuỗi kết nối PostgreSQL | **ĐẠT (tự động kiểm tra trên CI)** |

---

## 2. Rủi ro Tồn đọng Cần Xử lý Trước Khi Mở Production

1. **Content-Security-Policy (CSP):** Hiện ứng dụng chưa đặt header `Content-Security-Policy` đầy đủ do `public/lowf.html` còn script inline khởi tạo theme và tải `pdfjs-dist` từ jsDelivr. Khuyến nghị bổ sung CSP chế độ `Report-Only` trước trên Staging rồi chuyển sang `Enforce` sau khi xác minh không chặn Google Fonts / PDF.js / YouTube embed / Cloudflare R2 presigned URLs.
2. **R2 API Token Rotation:** Token `lowf-library-r2-media` đã được tạo theo phạm vi tối thiểu (chỉ quyền Object Read & Write cho bucket R2, không có quyền Account Admin). Tuy nhiên nên định kỳ xoay vòng khóa mỗi 90–180 ngày và tách riêng token chỉ đọc/ghi cho `lowf-library-staging-media`.
3. **Neon Auth Trusted Origins:** Trước khi kiểm thử đăng nhập trên Staging Workers, cần thêm chính xác domain `https://lowf-library-staging.<subdomain>.workers.dev` vào danh sách **Trusted Origins** trong Neon Console (tuyệt đối không dùng wildcard `*`).
4. **Cảnh báo `npm audit`:** Máy Mac cục bộ không có `npm`, do đó bước `npm audit --omit=dev --audit-level=high` đã được cấu hình chạy tự động trong `.github/workflows/ci-staging.yml` khi push nhánh `migration/cloudflare`.
