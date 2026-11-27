# Báo cáo Kiểm toán Toàn diện Dự án Lowf Library (Phase 1 Audit)

- **Ngày kiểm toán:** 27/11/2026
- **Repository:** `Huuluat-gif/Huuluat-gif`
- **Commit mốc kiểm toán (`main`):** `c3a3897` (đã gắn tag sao lưu `backup/pre-cloudflare-migration-20261127`)
- **Nhánh làm việc:** `migration/cloudflare`
- **Tên miền Production hiện tại:** `lowflibray.com` → `HTTP 308` → `https://www.lowflibray.com/`

---

## 1. Chẩn đoán Nguyên nhân Gốc sự cố Dung lượng trên Vercel

> **Kết luận ngắn gọn:** Sự cố không phải do Next.js hay Neon PostgreSQL mà xuất phát **100% từ hạn mức cứng 1.0 GB lưu trữ + 2.000 Advanced Operations/tháng của Vercel Blob gói Hobby** (dùng chung cho cả `lowf-media` và `lowf-preview-media`).

1. Khi kho ảnh bìa và PDF tăng vượt `1.1 GB`, Vercel đã **tự động khóa cứng toàn bộ thao tác đọc/ghi của Vercel Blob (`HTTP 503 Service Unavailable`)** cho đến kỳ kế tiếp (`28/11/2026`), kể cả sau khi xóa bớt thư mục `lowf/<id>/pdf/` xuống còn `107 MB`.
2. Quá trình đồng bộ bước đầu sang Cloudflare R2 trước đó đã tải thành công **353 tệp (`323.83 MB`: 244 ảnh bìa + 109 PDF)** vào bucket `lowf-library-media` và lưu đủ 4 biến `R2_*` vào Vercel Production/Preview, nhưng tiến trình bị gián đoạn giữa chừng do lỗi `HTTP 429` phía subagent điều khiển trình duyệt.
3. Hệ quả thực tế trên Production tại thời điểm kiểm toán:
   - Tổng số sách đang hiển thị (`GET /api/bootstrap`): **529 cuốn** (`330` EPUB + `199` PDF), `516` cuốn có `coverAssetId` và `13` cuốn dùng bìa SVG dự phòng.
   - Khoảng **244 bìa + 109 PDF** đã phục vụ từ **Cloudflare R2** (`HTTP 200`), trong khi khoảng **272 bìa + 90 PDF** còn lại vẫn trỏ tới `lowf_assets` nằm trên Vercel Blob đang bị khóa `503`.
   - **Giải pháp triệt để:** Hoàn tất di chuyển 100% tệp sang Cloudflare R2 (hạn mức miễn phí 10 GB gấp 10× Vercel Blob và `$0` băng thông egress) và chuẩn bị chuyển compute + DNS sang Cloudflare sau khi chủ sở hữu nghiệm thu.

---

## 2. Kiểm toán Mã nguồn & Phụ thuộc riêng của Vercel

Toàn bộ các file trong `app/` và `lib/` đã được rà soát để tìm các điểm khóa chặt vào Vercel hoặc giả định hệ thống tệp cục bộ (không hoạt động trên Cloudflare Workers):

| Vị trí cũ (`main`) | Vấn đề phát hiện | Hành động khắc phục trên `migration/cloudflare` |
| --- | --- | --- |
| `lib/api.ts`, `lib/db.ts`, `lib/auth/server.ts`, `lib/blob-config.ts`, `lib/commerce/config.ts`, `lib/commerce/orders.ts`, `app/admin/page.tsx`, `app/api/admin/auth/route.ts`, `app/api/reader/translate/route.ts` | Đọc trực tiếp `process.env.VERCEL_ENV`, `process.env.VERCEL`, hoặc header `x-forwarded-for` đặc thù của Vercel | Đã gom về một module thống nhất [`lib/env.ts`](../lib/env.ts) hỗ trợ `LOWF_ENV` / `CF_ENV` / `VERCEL_ENV`, `CF-Connecting-IP` và `X-Vercel-Forwarded-For`. Kết quả `grep` chỉ còn duy nhất `lib/env.ts` tham chiếu `VERCEL_ENV`. |
| `app/api/bootstrap/route.ts` | Dùng `readFileSync` đọc `public/catalog.json` hoặc đường dẫn FS cục bộ khi fallback | Đã bảo vệ bằng `try/catch` an toàn với runtime edge không có FS cục bộ. |
| `app/huong-dan.html/route.ts` | Dùng `readFile(process.cwd(), 'lib/admin/owner-guide.html')` trực tiếp — sẽ lỗi `500` trên Cloudflare Workers | Đã bổ sung fallback HTML tích hợp sẵn khi không có filesystem cục bộ. |
| `app/api/admin/source/route.ts` | Nén mã nguồn từ `process.cwd()` | Đã kiểm tra khả dụng FS và trả thông báo rõ ràng hướng dẫn tải từ GitHub release khi chạy trên Workers edge. |
| `public/media.js` dòng 655 | Cấu hình PDF.js `disableStream: true` khiến trình duyệt phải tải toàn bộ PDF nhiều chục MB trước khi hiển thị trang 1 | Đã bật `disableStream: false`, `disableRange: false`, `rangeChunkSize: 262144` kết hợp hỗ trợ `HTTP 206 Partial Content` tại `app/api/assets/[id]/route.ts`. |
| `app/api/bootstrap/route.ts` | Trả toàn bộ danh sách sách trong 1 payload JSON — không tối ưu khi kho tăng lên 1.000–5.000+ cuốn | Đã bổ sung endpoint phân trang + tìm kiếm tiếng Việt không dấu `GET /api/books` (`limit`, `cursor`, `q`, `category`, `language`, `format`, `sort`) mà vẫn giữ nguyên `GET /api/bootstrap` để tương thích ngược 100%. |
| `app/admin/studio.tsx` | Thiếu giám sát dung lượng R2 / chi phí / thiếu bìa / trùng lặp; nhập PDF hàng loạt mặc định `published` ngay không qua duyệt; chưa có nút tìm bìa sách online | Đã bổ sung `OperationsHealthPanel` (`/api/admin/storage/stats`), workflow 7 trạng thái, `OnlineCoverFinder` (`/api/admin/covers/search` + Hoàn tác bìa cũ), và mặc định `needs_review` khi nhập hàng loạt. |

---

## 3. Kiểm toán Cơ sở dữ liệu (Neon PostgreSQL)

- **14 bảng đang hoạt động:** `lowf_content`, `lowf_assets`, `lowf_design_versions`, `lowf_profiles`, `lowf_user_state`, `lowf_posts`, `lowf_post_likes`, `lowf_rate_limits`, `lowf_payment_configs`, `lowf_orders`, `lowf_entitlements`, `lowf_payment_events`, `lowf_reader_annotations`, `lowf_reader_vocab`.
- **Điểm cần nâng cấp đã viết trong [`scripts/db-migrate-v2.sql`](../scripts/db-migrate-v2.sql):**
  1. Bật extension `pg_trgm` & `unaccent` cho tìm kiếm tiếng Việt không dấu tốc độ cao.
  2. Bổ sung các chỉ mục JSONB (`sortOrder`, `category`, `isbn`, `checksumSha256`, trigram title/author).
  3. Mở rộng ràng buộc trạng thái `lowf_content` đủ 7 trạng thái quản trị.
  4. Thêm `sha256` & `storage_backend` vào `lowf_assets` và bảng nhật ký `lowf_admin_audit_log`.
- **Trạng thái thực thi migration SQL:** Chưa chạy lên Neon Production (chỉ áp dụng Staging và chỉ chạy Production sau phê duyệt của chủ sở hữu).

---

## 4. Kiểm toán Tên miền & DNS Hiện tại (`lowflibray.com`)

| Tham số | Giá trị đo thực tế (`whois` & `dig`) |
| --- | --- |
| **Registrar hiện tại** | **Name.com, Inc.** (hết hạn `2027-11-17`, trạng thái `clientTransferProhibited`) |
| **Nameserver hiện tại** | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| **Bản ghi A (`lowflibray.com`)** | `64.29.17.1`, `64.29.17.65` (trả `HTTP 308` → `https://www.lowflibray.com/`) |
| **Bản ghi `www.lowflibray.com`** | `216.198.79.65`, `64.29.17.1` |
| **MX / SPF / DKIM / DMARC** | Chưa có bản ghi email tên miền riêng (rủi ro gián đoạn email khi chuyển DNS = **0%**) |
| **DNSSEC** | Chưa bật (`unsigned`) |
| **Cloudflare Zones hiện tại** | `0` zone (chưa tạo zone hay thay đổi bất kỳ bản ghi DNS nào) |

---

## 5. Ràng buộc Môi trường Máy Cục bộ (Báo cáo Trung thực)

- Máy macOS cục bộ hiện có `python3` (3.9), `git`, `curl` (SecureTransport TLS 1.3), `dig`, `whois`, `sips`, `jsc` (JavaScriptCore), nhưng **chưa cài đặt `node`, `npm`, `npx`, `wrangler`, `cf`, `gs`, `qpdf`**.
- Do đó, mọi bước kiểm tra Python, quét SHA-256 14 thư mục sách, kiểm tra cú pháp JS, kiểm tra live HTTP headers/API và kiểm thử trình duyệt Desktop/Mobile cục bộ đều đã chạy thật; còn các bước `npm run typecheck`, `npm run build`, `vinext build` và `wrangler deploy --env staging` được cấu hình chạy tự động trên **GitHub Actions Node 24** (`.github/workflows/ci-staging.yml`) ngay khi nhánh `migration/cloudflare` được push và bổ sung secrets `staging`.
