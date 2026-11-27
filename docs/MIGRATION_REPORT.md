# Báo cáo Hiện trạng Chuyển đổi Hạ tầng (Migration Report)

- **Ngày lập báo cáo:** 27/11/2026
- **Nhánh Git thực hiện:** `migration/cloudflare` (tách từ `main` @ `c3a3897`)
- **Tag sao lưu an toàn:** `backup/pre-cloudflare-migration-20261127`
- **Trạng thái Production (`lowflibray.com`):** **Giữ nguyên 100% — chưa cắt chuyển DNS, chưa merge `main`, chưa xóa Vercel/Blob/DB cũ.**

---

## 1. Hạng mục Đã Hoàn thành Thực tế

| Hạng mục | Chi tiết triển khai thực tế | Bằng chứng / Tệp liên quan |
| --- | --- | --- |
| **Sao lưu & Cô lập Git** | Tạo annotated tag `backup/pre-cloudflare-migration-20261127` tại `c3a3897` và làm việc độc lập trên nhánh `migration/cloudflare` | `git tag -l`, `git branch` |
| **Cloudflare R2 Production & Staging** | Bucket `lowf-library-media` (`apac`, 353 tệp / 323,83 MB đang sống) + tạo mới bucket `lowf-library-staging-media` (`apac`); đã bật CORS hỗ trợ `Range`, `Content-Range`, `Accept-Ranges`, `ETag` cho cả hai bucket | Cloudflare Account `6335b9fdd7bd98a19dab9797d53db85f` |
| **Lớp lưu trữ trừu tượng & R2 v2** | Viết [`lib/storage.ts`](../lib/storage.ts) và nâng cấp [`lib/r2.ts`](../lib/r2.ts) hỗ trợ retry exponential backoff, HTTP Range streaming, SHA-256, và nhận diện khóa chuẩn `books/`, `covers/`, `assets/`, `r2/`; cập nhật [`lib/assets.ts`](../lib/assets.ts) & [`app/api/assets/[id]/route.ts`](../app/api/assets/%5Bid%5D/route.ts) trả **`HTTP 206 Partial Content`** | `lib/storage.ts`, `lib/r2.ts`, `lib/assets.ts`, `app/api/assets/[id]/route.ts` |
| **Loại bỏ phụ thuộc riêng Vercel & Edge FS** | Gom toàn bộ kiểm tra môi trường & IP máy khách (`CF-Connecting-IP` / `X-Vercel-Forwarded-For`) về [`lib/env.ts`](../lib/env.ts); bọc `try/catch` / fallback HTML cho `app/huong-dan.html/route.ts`, `app/api/bootstrap/route.ts`, `app/api/admin/source/route.ts`. Kiểm tra `grep` xác nhận **0** vị trí ngoài `lib/env.ts` gọi `VERCEL_ENV` | `lib/env.ts` + 12 tệp API/lib đã cập nhật |
| **Cấu hình Cloudflare Workers & CI Staging** | Viết [`wrangler.jsonc`](../wrangler.jsonc) (`compatibility_date: 2026-11-27`, `nodejs_compat`, `placement: smart`, `observability` logs+traces, binding `LOWF_MEDIA` tách biệt Staging/Prod) và [`.github/workflows/ci-staging.yml`](../.github/workflows/ci-staging.yml) (chỉ deploy Staging, cấm auto-deploy Production) | `wrangler.jsonc`, `.github/workflows/ci-staging.yml` |
| **Schema Neon PostgreSQL v2** | Viết migration idempotent [`scripts/db-migrate-v2.sql`](../scripts/db-migrate-v2.sql) (mở rộng 7 trạng thái biên tập, `pg_trgm`, `unaccent`, `lowf_assets.sha256` & `storage_backend`, bảng `lowf_admin_audit_log`) | `scripts/db-migrate-v2.sql` |
| **Tìm kiếm phân trang & Trình đọc PDF Range** | Tạo [`app/api/books/route.ts`](../app/api/books/route.ts) (tìm kiếm tiếng Việt không dấu phân trang); bật Range streaming (`disableStream: false`, `disableRange: false`, chunk 256 KB) trong [`public/media.js`](../public/media.js) | `app/api/books/route.ts`, `public/media.js`, `public/lowf.html` |
| **Trung tâm Quản trị & Tìm bìa trực tuyến** | Tạo [`app/api/admin/storage/stats/route.ts`](../app/api/admin/storage/stats/route.ts), [`app/api/admin/covers/search/route.ts`](../app/api/admin/covers/search/route.ts) (chống SSRF bằng allowlist) và nâng cấp [`app/admin/studio.tsx`](../app/admin/studio.tsx) (`OperationsHealthPanel`, `OnlineCoverFinder` + Hoàn tác bìa cũ, 7 trạng thái, mặc định `needs_review` khi nhập hàng loạt) | `app/admin/studio.tsx`, `app/api/admin/covers/search/route.ts`, `app/api/admin/storage/stats/route.ts` |
| **Pipeline Lọc Sách & Di chuyển R2 Resumable** | Viết và chạy thật [`scripts/catalog_pipeline.py`](../scripts/catalog_pipeline.py) trên toàn bộ 14 thư mục sách gốc (2.423 tệp → 1.130 sách sạch duy nhất); viết và chạy dry-run [`scripts/migrate_to_r2.py`](../scripts/migrate_to_r2.py) | `scripts/catalog_pipeline.py`, `scripts/migrate_to_r2.py` |

| **Kiểm chứng CI Node 24 thực tế (`typecheck` + `build` + `security`)** | Đã chạy thực tế trên GitHub Actions Run `#45991732782`: `npm ci`, `npm run typecheck`, `npm audit`, kiểm tra vệ sinh repo & `npm run build` đều đạt **`completed / success`** | [GitHub Actions #45991732782](https://github.com/Huuluat-gif/Huuluat-gif/actions/runs/45991732782) |

---

## 2. Hạng mục Chờ Điều kiện / Chờ Phê duyệt (Báo cáo Trung thực)

| Hạng mục | Lý do chưa chạy ngay | Điều kiện để hoàn tất |
| --- | --- | --- |
| **Deploy Cloudflare Workers Staging (`lowf-library-staging`)** | Step `vinext build && wrangler deploy --env staging` trên Run `#45991732782` tự động `skipped` an toàn vì chưa nạp `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID` trong GitHub Environment `staging` | Thêm 2 secrets vào GitHub Environment `staging` + nạp Worker secrets (`DATABASE_URL`, `NEON_AUTH_*`, `R2_*`) theo [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) |
| **Áp dụng `scripts/db-migrate-v2.sql` lên Neon Production** | Quy tắc bắt buộc không sửa Production trước khi chủ sở hữu phê duyệt | Chạy sau khi chủ sở hữu xác nhận duyệt |
| **Đồng bộ nốt ~272 bìa + ~90 PDF (và lô 1.079 sách mới) lên `lowf-library-media`** | Chờ chủ sở hữu chọn phạm vi sách (556 vs 1.079 cuốn) và phê duyệt | Chạy 1 lệnh `scripts/migrate_to_r2.py --env production --execute` + đồng bộ metadata |
| **Đổi DNS `lowflibray.com` sang Cloudflare DNS** | Quy tắc bắt buộc không tự đổi DNS Production | Thực hiện cùng chủ sở hữu tại Name.com theo [`DNS_PLAN.md`](DNS_PLAN.md) sau phê duyệt |
