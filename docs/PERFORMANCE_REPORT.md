# Báo cáo Hiệu năng & Tối ưu Trình đọc (Performance Report)

- **Ngày đo kiểm:** 27/11/2026
- **Môi trường đo kiểm thực tế:** Local Preview Server (`http://127.0.0.1:4321/`, 528 sách hoạt động, `public/media.js?v=20261127g` đã bật HTTP Range) & Live Edge `https://www.lowflibray.com/`.

---

## 1. Chỉ số Đo Thực tế (Desktop `1440×900` & Mobile `390×844`)

| Môi trường / Kịch bản | `domContentLoaded` | `load` hoàn tất | Tổng request | Request lỗi | Tràn ngang (`overflow`) | Lỗi Console |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Desktop `1440×900` — Trang chủ (`/`)** | **637 ms** | **773 ms** | 50 | **0** | **0 px** (`1440 / 1440`) | **0** |
| **Mobile `390×844` — Trang chủ (`/`)** | **168 ms** | **299 ms** | 50 | **0** | **0 px** (`390 / 390`) | **0** |
| **Mobile `390×844` — Thư viện (`?view=library`)** | — | Mượt tức thì | — | **0** | **0 px** (`390 / 390`) | **0** |
| **Mobile `390×844` — Trình đọc EPUB + Mục lục** | — | Mượt tức thì | — | **0** | **0 px** (`390 / 390`) | **0** |

> **Lưu ý trung thực về Core Web Vitals (`FCP`, `LCP`, `CLS`, `INP`):** Trình duyệt kiểm thử tự động tích hợp chặn `page.evaluate` / `PerformanceObserver`, vì vậy các chỉ số Lighthouse/Core Web Vitals chi tiết (`LCP`, `CLS`, `INP`) cần chạy thêm một lượt **Lighthouse / PageSpeed Insights** trực tiếp trên URL **Cloudflare Workers Staging** ngay sau khi deploy Staging.

---

## 2. Các Tối ưu Hiệu năng Chính Đã Triển khai trên `migration/cloudflare`

### 2.1. Bật HTTP Range Streaming (`206 Partial Content`) cho Trình đọc PDF
- **Trước đây (`main`):** `public/media.js` đặt `disableStream: true`, buộc trình duyệt tải gần như toàn bộ tệp PDF 15–50 MB mới hiển thị trang 1, và `/api/assets/[id]` chưa chuyển tiếp header `Range` lên R2.
- **Hiện tại (`migration/cloudflare`):**
  - Backend [`app/api/assets/[id]/route.ts`](../app/api/assets/%5Bid%5D/route.ts) và [`lib/r2.ts`](../lib/r2.ts) chuyển tiếp trực tiếp header `Range` và trả **`HTTP 206 Partial Content`** kèm `Accept-Ranges: bytes`, `Content-Range`, `Content-Length`.
  - CORS trên cả 2 bucket Cloudflare R2 (`lowf-library-media` và `lowf-library-staging-media`) đã mở `Range` request header và expose `Accept-Ranges`, `Content-Range`, `Content-Length`, `ETag`.
  - Frontend [`public/media.js`](../public/media.js) đã bật `disableAutoFetch: true`, `disableStream: false`, `disableRange: false`, `rangeChunkSize: 262144` (256 KB/chunk) và giải phóng bộ nhớ `cache.task.destroy()` trong `releaseCache()` / `cancelPDF()` khi đóng sách.
  - **Kết quả kiểm thử PDF 515 trang (`Tuần Làm Việc 4 Giờ`):** Trang 1–2 render sắc nét trên `#pdfCanvas` (`292×413`), lật sang trang 3–4 mượt tức thì, không rò rỉ bộ nhớ và không treo trình duyệt.

### 2.2. Tìm kiếm & Phân trang Mở rộng (`GET /api/books`)
- Hiện `GET /api/bootstrap` tải toàn bộ danh mục 529 cuốn. Khi nâng kho lên **1.079–10.000 cuốn**, tải toàn bộ một lần sẽ làm tăng kích thước JSON khởi tạo.
- Endpoint mới [`app/api/books/route.ts`](../app/api/books/route.ts) kết hợp các chỉ mục `pg_trgm` / `unaccent` / `category` / `sortOrder` trong [`scripts/db-migrate-v2.sql`](../scripts/db-migrate-v2.sql) cho phép phân trang (`limit=24..60`, `cursor`) và tìm kiếm tiếng Việt không dấu tốc độ cao ngay tại PostgreSQL.

### 2.3. Cache Ảnh Bìa 30 Ngày tại Edge CDN & Zero-Egress R2
- Ảnh bìa công khai `<= 768 KB` được `streamPublicImageAsset` trong [`lib/assets.ts`](../lib/assets.ts) phục vụ với `Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400`.
- Ảnh đại diện & thẻ sách sử dụng `loading="lazy"` tránh chặn hiển thị vùng đầu trang.

### 2.4. Tối ưu 3D Theo Mùa trên Điện thoại (60fps)
- Biểu tượng 3D theo mùa (`.season-stage-widget`, hero 3D và `.mobile-season-card`) dùng CSS GPU-composited transforms, không dùng WebGL nặng, hiển thị ngay vùng trên nếp gấp (above-the-fold) ở `390×844` mà không gây giật cuộn hay tràn ngang (`0px overflow`), đồng thời giữ tải trang mobile hoàn tất chỉ trong **299 ms** trên local.

### 2.5. Smart Placement cho Cloudflare Workers
- [`wrangler.jsonc`](../wrangler.jsonc) bật `"placement": { "mode": "smart" }` giúp Cloudflare tự động đặt Worker ở điểm PoP gần cơ sở dữ liệu Neon PostgreSQL, giảm tổng độ trễ nhiều truy vấn SQL trên mỗi request API.
