# Lowf Library — Nền tảng Thư viện số, Trình đọc & Không gian Tập trung

> **Trạng thái nhánh hiện tại (`migration/cloudflare`):** Sẵn sàng nghiệm thu hạ tầng Cloudflare Workers + Cloudflare R2 + Neon PostgreSQL. **Môi trường Production (`lowflibray.com` trên nhánh `main`) chưa bị thay đổi.**

Lowf Library là nền tảng thư viện số cá nhân hóa bằng tiếng Việt kết hợp trình đọc EPUB/PDF chuyên sâu, công cụ học ngôn ngữ (dịch nhanh, từ điển phiên âm IPA, sổ từ vựng, đọc thành tiếng 6 giọng TTS), không gian âm nhạc lofi tập trung, ví Xu thưởng đọc sách, cộng đồng, thương mại điện tử VNPAY và giao diện trang trí 12 chủ đề mùa với biểu tượng 3D.

---

## 1. Kiến trúc hệ thống (Target Architecture trên Cloudflare)

| Thành phần | Hiện tại (`main`) | Mục tiêu đã chuẩn bị (`migration/cloudflare`) |
| --- | --- | --- |
| **Web Runtime / Compute** | Vercel Serverless (Next.js 16.4.6 App Router) | **Cloudflare Workers** (`wrangler.jsonc`, `nodejs_compat`, `placement: smart`, `vinext` / OpenNext fallback) |
| **Object Storage (PDF, ảnh bìa, audio, video)** | Vercel Blob Hobby (giới hạn 1 GB, bị khóa HTTP 503 khi quá hạn mức) + một phần R2 | **Cloudflare R2** (`lowf-library-media` prod, `lowf-library-staging-media` staging — **10 GB Free, $0 egress**) |
| **Cơ sở dữ liệu & Xác thực** | Neon PostgreSQL + Neon Auth (Google OAuth, Email OTP 6 số, Email + Password) | **Giữ nguyên Neon PostgreSQL + Neon Auth** (không di chuyển không cần thiết, bổ sung schema v2 `pg_trgm` + `unaccent` + audit log) |
| **CDN & DNS** | Vercel DNS (`ns1/ns2.vercel-dns.com`), registrar Name.com | **Cloudflare DNS + CDN + SSL + DDoS** (chỉ đổi nameserver tại Name.com sau khi chủ sở hữu phê duyệt — không cần chuyển registrar) |
| **CI/CD** | Auto-deploy Vercel | **GitHub Actions** (`.github/workflows/ci-staging.yml`): kiểm tra TypeScript, bảo mật, cấm nhị phân/bí mật, build & deploy Staging tự động; **tuyệt đối không auto-deploy Production** |

---

## 2. Cấu trúc thư mục chính

- `app/` — Next.js App Router pages & API route handlers:
  - `app/api/books/route.ts` — API tìm kiếm phân trang không dấu tiếng Việt, lọc thể loại/ngôn ngữ/định dạng.
  - `app/api/assets/[id]/route.ts` — Stream tài nguyên an toàn có phân quyền server-side, hỗ trợ **HTTP Range (`206 Partial Content`)** cho PDF.js & media, cache 30 ngày cho ảnh bìa công khai, `private, no-store` cho tệp riêng tư.
  - `app/api/admin/covers/search/route.ts` — Tìm kiếm & nhập ảnh bìa trực tuyến (Open Library / Google Books) có lớp chống SSRF bằng danh sách tên miền cho phép.
  - `app/api/admin/storage/stats/route.ts` — Trung tâm giám sát lưu trữ Cloudflare R2, chi phí dự kiến, trạng thái duyệt 7 bước, thiếu bìa, trùng lặp và hàng chờ bản quyền.
  - `app/admin/studio.tsx` — Lowf Studio (quản trị sách, Cover Studio, 12 mùa & 3D, VNPAY, đơn hàng, đồng bộ R2).
- `lib/` — Lớp hạ tầng dùng chung:
  - `lib/env.ts` — Chuẩn hóa biến môi trường & IP máy khách (`CF-Connecting-IP` / `X-Vercel-Forwarded-For`) cho cả Cloudflare Workers và Vercel.
  - `lib/storage.ts` & `lib/r2.ts` — Lớp trừu tượng hóa kho tệp không phụ thuộc nhà cung cấp, ký AWS Signature V4 zero-dependency, retry backoff, HTTP Range streaming & SHA-256.
  - `lib/validation.ts` — Zod strict schemas cho 7 trạng thái biên tập sách (`draft`, `processing`, `needs_review`, `ready`, `published`, `archived`, `failed`) và siêu dữ liệu đầy đủ (`isbn`, `publisher`, `publishedYear`, `copyrightStatus`, `checksumSha256`).
- `public/` — Ứng dụng giao diện đọc sách (`lowf.html`, `lowf.css`, `lowf.js`, `media.js`, `reader-tools.js`, `reader-speech.js`).
- `scripts/` — Công cụ vận hành & dữ liệu:
  - `scripts/catalog_pipeline.py` — Lọc rác không phải sách, khử trùng lặp SHA-256 + tiêu đề chuẩn hóa, phân tầng ảnh bìa 5 cấp & tạo báo cáo kiểm toán JSON.
  - `scripts/migrate_to_r2.py` — Công cụ tải tệp lên Cloudflare R2 có kiểm tra SHA-256, tiếp tục sau khi gián đoạn (resumable), không xóa dữ liệu nguồn.
  - `scripts/db-migrate-v2.sql` — Migration idempotent cho Neon PostgreSQL (trigram index, 7 trạng thái sách, bảng `lowf_admin_audit_log`).

---

## 3. Khởi chạy cục bộ & Kiểm thử

> Yêu cầu máy phát triển có **Node.js >= 20** (khuyến nghị Node 24) và **Python 3.9+**.

```bash
# Cài dependencies
npm ci

# Chạy kiểm tra TypeScript & build Next.js
npm run typecheck
npm run build

# Chạy kiểm toán kho sách cục bộ (không làm thay đổi file gốc)
python3 scripts/catalog_pipeline.py \
  --downloads-root "/Users/admin/Downloads" \
  --out-dir "/tmp/lowf-audit"

# Chạy thử dry-run di chuyển tệp lên Cloudflare R2 Staging
python3 scripts/migrate_to_r2.py \
  --manifest "/tmp/lowf-audit/catalog_pipeline_manifest.json" \
  --state "/tmp/lowf-audit/r2_state.json" \
  --env staging
```

---

## 4. Bộ tài liệu kỹ thuật đầy đủ (`docs/`)

1. [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Kiến trúc tổng thể Cloudflare Workers + R2 + Neon PostgreSQL + Range streaming.
2. [PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md) — Báo cáo kiểm toán toàn diện mã nguồn, DB, storage, bảo mật & DNS.
3. [FEATURE_INVENTORY.md](docs/FEATURE_INVENTORY.md) — Kiểm kê toàn bộ tính năng hiện hữu cần bảo toàn và nâng cấp.
4. [STORAGE_INVENTORY.md](docs/STORAGE_INVENTORY.md) — Kiểm kê chi tiết Vercel Blob, Cloudflare R2 và kho sách gốc 14 thư mục.
5. [MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) — Kế hoạch chuyển đổi từng bước không mất dữ liệu & không downtime.
6. [MIGRATION_REPORT.md](docs/MIGRATION_REPORT.md) — Báo cáo hiện trạng chuyển đổi thực tế trên nhánh `migration/cloudflare`.
7. [BOOK_IMPORT_REPORT.md](docs/BOOK_IMPORT_REPORT.md) — Báo cáo lọc rác, khử trùng lặp & phân loại 1.130 đầu sách sạch.
8. [COVER_REPORT.md](docs/COVER_REPORT.md) — Báo cáo chuẩn hóa ảnh bìa 5 tầng & tích hợp tìm kiếm bìa trực tuyến.
9. [SECURITY_REPORT.md](docs/SECURITY_REPORT.md) — Báo cáo đánh giá bảo mật (Auth, RBAC, SSRF, Range headers, Secrets, VNPAY).
10. [TEST_REPORT.md](docs/TEST_REPORT.md) — Báo cáo kiểm thử thực tế (ghi rõ mục ĐẠT và mục CHỜ CI Node 24).
11. [PERFORMANCE_REPORT.md](docs/PERFORMANCE_REPORT.md) — Báo cáo hiệu năng Desktop/Mobile, Range streaming & tối ưu 3D.
12. [COST_ESTIMATE.md](docs/COST_ESTIMATE.md) — Bảng dự toán chi phí theo các mức quy mô (500 → 10.000 cuốn sách).
13. [DNS_PLAN.md](docs/DNS_PLAN.md) — Phương án chuyển quản lý DNS `lowflibray.com` sang Cloudflare không cần chuyển registrar.
14. [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Hướng dẫn triển khai Staging và quy trình cắt chuyển Production sau phê duyệt.
15. [ROLLBACK_GUIDE.md](docs/ROLLBACK_GUIDE.md) — Hướng dẫn khôi phục khẩn cấp (Git tag, Cloudflare DNS, Vercel fallback, Neon PITR).
