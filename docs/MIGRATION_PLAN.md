# Kế hoạch Chuyển đổi & Tái cấu trúc Lowf Library (Migration Plan)

Kế hoạch thiết kế theo nguyên tắc **Zero Data Loss · Zero Production Downtime · Approval-Gated Cutover**.

---

## 1. Các mốc an toàn & nguyên tắc không thương lượng

1. **Điểm sao lưu bất biến:** Tag Git `backup/pre-cloudflare-migration-20261127` tại commit `c3a3897` trên nhánh `main`.
2. **Cô lập hoàn toàn mã nguồn mới:** Mọi thay đổi mã nguồn và tài liệu nằm trên nhánh `migration/cloudflare`. **Không merge vào `main`** khi chưa có lệnh duyệt cuối cùng.
3. **Không xóa tài nguyên cũ:** Giữ nguyên dự án Vercel `lowf-library`, Vercel Blob `lowf-media`, và Neon PostgreSQL Production ít nhất **14–30 ngày sau khi Production trên Cloudflare chạy ổn định**.
4. **Không tự động xuất bản sách mới:** Mọi sách nhập bổ sung đều đi qua trạng thái `needs_review` / `draft` để chủ sở hữu kiểm tra tiêu đề, ảnh bìa và bản quyền trước khi bật `published`.

---

## 2. Lộ trình 6 Giai đoạn Chuyển đổi

### Giai đoạn A — Chuẩn bị Hạ tầng & Mã nguồn (ĐÃ HOÀN TẤT trên `migration/cloudflare`)
- Tạo bucket R2 Staging `lowf-library-staging-media` (`apac`) và cấu hình CORS hỗ trợ `Range`, `Content-Range`, `Accept-Ranges`, `ETag` cho cả Production (`lowf-library-media`) và Staging.
- Tách tầng môi trường (`lib/env.ts`) và tầng lưu trữ (`lib/storage.ts` + `lib/r2.ts` có retry backoff & HTTP Range streaming).
- Bổ sung cấu hình `wrangler.jsonc`, schema migration `scripts/db-migrate-v2.sql`, API tìm kiếm phân trang `/api/books`, API tìm bìa chống SSRF `/api/admin/covers/search`, Trung tâm giám sát `/api/admin/storage/stats`, và CI/CD Staging `.github/workflows/ci-staging.yml`.

### Giai đoạn B — Triển khai & Kiểm thử Staging Độc lập (SAU KHI PUSH `migration/cloudflare` & THÊM SECRETS)
1. Thêm các bí mật vào GitHub Repository Environment `staging`: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
2. Cấu hình secrets cho Cloudflare Worker `lowf-library-staging` qua `wrangler secret put --env staging`: `DATABASE_URL` (nhánh Neon Staging/Preview), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `LOWF_ADMIN_EMAILS`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_STAGING_BUCKET=lowf-library-staging-media`.
3. Chạy `scripts/db-migrate-v2.sql` trên Neon nhánh Staging.
4. Chạy `scripts/migrate_to_r2.py --env staging --execute` đẩy lô sách sạch vào `lowf-library-staging-media` và kiểm thử toàn bộ luồng trên `https://lowf-library-staging.<subdomain>.workers.dev`.
5. Thêm origin Staging vào Neon Auth Trusted Origins để kiểm thử đăng nhập Google OAuth & Email OTP.

### Giai đoạn C — Nghiệm thu của Chủ sở hữu (FINAL APPROVAL GATE — ĐIỂM DỪNG HIỆN TẠI)
- Chủ sở hữu rà soát Staging, danh sách sách sạch (1.079 cuốn sẵn sàng + 51 PDF > 50 MB), ảnh bìa, báo cáo kiểm thử, phương án DNS và chi phí dự kiến (`$0/tháng` trong Free Tier).
- Chủ sở hữu quyết định rõ 3 lựa chọn:
  1. Có đồng ý nạp toàn bộ **1.079 cuốn sách sạch `<= 50 MB`** (chỉ 3,31 GB / 10 GB Free) hay giữ bộ tinh tuyển 556 cuốn?
  2. Có đồng ý chuyển quản lý DNS `lowflibray.com` từ Name.com → Cloudflare DNS (không cần chuyển registrar)?
  3. Xác nhận cho phép merge `migration/cloudflare` → `main` và chạy Production Cutover.

### Giai đoạn D — Hoàn tất Đồng bộ Tài nguyên R2 Production (SAU PHÊ DUYỆT)
1. Chạy `scripts/db-migrate-v2.sql` trên Neon Production (chỉ tạo index `CONCURRENTLY` / thêm cột an toàn, không khóa bảng).
2. Đồng bộ nốt ~272 ảnh bìa & ~90 PDF còn trỏ Vercel Blob (cùng lô sách mới được chủ duyệt) vào `lowf-library-media` bằng `scripts/migrate_to_r2.py --env production --execute` có đối chiếu SHA-256.
3. Kiểm tra `/api/admin/storage/stats` xác nhận `legacyBlobPublishedBooks === 0` và `missingPdfAssets === 0`.

### Giai đoạn E — Chuyển đổi Compute & DNS Production (SAU PHÊ DUYỆT)
1. Tạo Cloudflare Zone Free cho `lowflibray.com`, nhập đủ toàn bộ bản ghi DNS hiện có (`A`, `CNAME`, redirect apex → `www`), kiểm tra SSL Full (Strict).
2. Triển khai Cloudflare Worker Production `lowf-library-prod` và gắn Custom Domain `www.lowflibray.com` + `lowflibray.com`.
3. Chủ sở hữu cập nhật 2 nameserver tại Name.com sang cặp nameserver Cloudflare cấp (thời gian chuyển đổi mượt ~5–30 phút, 0 downtime).
4. Kiểm thử sau cắt chuyển: Google OAuth, OTP, đọc EPUB/PDF Range 206, VNPAY callback, `/admin`.

### Giai đoạn F — Giám sát Hậu chuyển đổi (14–30 Ngày)
- Theo dõi log/traces trên Cloudflare Workers Observability (đã bật sẵn trong `wrangler.jsonc`) và chỉ số `4xx/5xx`.
- Giữ Vercel `lowf-library` ở trạng thái dự phòng nóng tối thiểu 14 ngày để có thể rollback DNS trong < 5 phút nếu cần.
