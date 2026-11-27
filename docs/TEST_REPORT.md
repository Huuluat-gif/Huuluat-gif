# Báo cáo Kiểm thử Thực tế (Test Report)

- **Ngày kiểm thử:** 27/11/2026
- **Nhánh kiểm thử:** `migration/cloudflare` (trước khi merge `main`)
- **Nguyên tắc báo cáo:** **Chỉ ghi `PASS` cho các hạng mục đã chạy và đo thực tế.** Mọi hạng mục chưa thể chạy do giới hạn công cụ máy cục bộ hoặc quy tắc cấm sửa Production đều ghi rõ **`PENDING`** kèm điều kiện thực thi.

---

## 1. Bảng Tổng hợp Kết quả Kiểm thử

| Nhóm kiểm thử | Ca kiểm thử cụ thể | Trạng thái | Kết quả đo thực tế |
| --- | --- | :---: | --- |
| **1. Hạ tầng R2 & HTTP Range** | `GET /api/assets/33a6fa5b-28a5-4b6b-8bcd-3013ac68c9b6` kèm `Range: bytes=0-1023` (follow redirect tới Cloudflare R2 `lowf-library-media`) | **PASS** | `HTTP/2 307` → `HTTP/1.1 206 Partial Content`, `Content-Type: application/pdf`, `Content-Length: 1024`, `Content-Range: bytes 0-1023/2328616`, `Accept-Ranges: bytes`, `Server: cloudflare` |
| **1. Hạ tầng R2 & HTTP Range** | Kiểm chứng nguyên nhân lỗi Blob trên Production (`25` mẫu PDF từ `/api/bootstrap`) | **CONFIRMED** | `4/25` redirect Cloudflare R2 (`HTTP 200/206`), `21/25` trả `HTTP/2 503` từ Vercel Blob bị khóa — khẳng định chính xác chẩn đoán gốc cần hoàn tất đồng bộ R2 |
| **2. Bảo mật & Headers Live** | `GET https://www.lowflibray.com/api/admin/content/books` khi chưa đăng nhập | **PASS** | Trả `HTTP/2 401`, `cache-control: no-store` |
| **2. Bảo mật & Headers Live** | Kiểm tra Redirect & Security Headers (`lowflibray.com` & `www.lowflibray.com`) | **PASS** | Apex trả `HTTP/2 308 → https://www.lowflibray.com/`; trang chính trả `HTTP/2 200`, đủ `HSTS (63072000)`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| **3. Tìm bìa trực tuyến** | Truy vấn live Open Library API (`Atomic Habits`) | **PASS** | Trả JSON hợp lệ: `title: "Atomic Habits"`, `author_name: ["James Clear"]`, `cover_i: 12539702` |
| **4. Pipeline Kho sách & R2** | `scripts/catalog_pipeline.py` quét 14 thư mục `/Users/admin/Downloads` (NFC/NFD-safe) | **PASS** | 2.423 tệp → loại 494 rác + 10 PDF hỏng + 111 trùng SHA-256 + 440 ấn bản trùng → **1.130 sách duy nhất** (`1.079 <= 50 MB`, chỉ **3,305 GB = 33,05% R2 Free**) |
| **4. Pipeline Kho sách & R2** | `scripts/migrate_to_r2.py` chế độ Dry-Run Staging + `py_compile` | **PASS** | Biên dịch sạch `exit 0`; Dry-run nhận diện chính xác `582` PDF (`3.347,0 MB`) cần đồng bộ |
| **5. Vệ sinh mã nguồn** | Kiểm tra cú pháp `public/media.js` bằng `jsc` + `grep VERCEL_ENV` trên `app/` & `lib/` | **PASS** | `public/media.js` 0 lỗi cú pháp; chỉ duy nhất `lib/env.ts:8` còn tham chiếu `VERCEL_ENV` |
| **6. Trình duyệt Desktop (`1440×900`)** | Tải `http://127.0.0.1:4321/` (`media.js?v=20261127g`), 3D mùa, lọc thể loại, tìm có/không dấu, đọc EPUB + Dark Mode + Bookmark, đọc PDF 515 trang | **PASS** | `domContentLoaded=637ms`, `load=773ms`, `50` requests (`0` failed), `0` console errors, `0px` tràn ngang (`1440/1440`), tìm `"tu duy nhanh va cham"` & `"tư duy nhanh và chậm"` đều trả đúng sách, EPUB + TOC + Bookmark + Dark Mode hoạt động, PDF `#pdfCanvas` (`292×413`) lật trang 1–2 → 3–4 mượt |
| **7. Trình duyệt Mobile (`390×844`)** | Tải trang chủ, Thư viện, Bottom tabs, 3D mùa trên nếp gấp, Trình đọc EPUB + Mục lục + Đổi màu giấy | **PASS** | `domContentLoaded=168ms`, `load=299ms`, `0` failed requests, `0` console errors, `0px` tràn ngang (`390/390`), thanh header & toolbar trình đọc `0px` đè chữ, `#readerTocPop` mở gọn trong màn hình |
| **8. TypeScript / Build / Security CI (Node 24)** | `npm ci`, `npm run typecheck`, `npm audit --audit-level=high`, kiểm tra cấm nhị phân/bí mật, `npm run build` (Next.js 16.4.6) trên GitHub Actions Run `#45991732782` | **PASS (CI Node 24)** | Toàn bộ job **`Typecheck, Build & Security Gate`** đạt **`completed / success`** ([Run #45991732782](https://github.com/Huuluat-gif/Huuluat-gif/actions/runs/45991732782)) — 0 lỗi TypeScript, 0 tệp nhị phân/bí mật bị lọt, build Next.js production thành công 100% |
| **9. Deploy & E2E Staging Cloudflare Workers** | `vinext build` + `wrangler deploy --env staging`, Login Google OAuth / Email OTP, VNPAY Sandbox, Upload R2 presign, `/api/books` trên Worker Staging + Lighthouse Core Web Vitals (`LCP`, `CLS`, `INP`) | **PENDING (Chờ Secrets Staging)** | Step `Build & deploy Cloudflare Workers Staging` tự động bỏ qua an toàn (`skipped`) do chưa thêm `CLOUDFLARE_API_TOKEN` & `CLOUDFLARE_ACCOUNT_ID` vào GitHub Environment `staging`; chạy ngay sau khi thêm secrets & Neon Auth Trusted Origins |

---

## 2. Các Quan sát Nhỏ Phát hiện Trong Quá trình QA (Ghi nhận Trung thực)

1. **Từ khóa `"Đắc Nhân Tâm"` không có trong bộ 528 cuốn đang kích hoạt cục bộ:** Tìm `"dac nhan tam"` và `"đắc nhân tâm"` đều trả `0` kết quả trên bản preview 528 cuốn vì đầu sách này chưa nằm trong danh sách active; đã kiểm chứng tính năng tìm có/không dấu tiếng Việt bằng đầu sách đang có (*Tư Duy Nhanh Và Chậm*) — cả `"tu duy nhanh va cham"` và `"tư duy nhanh và chậm"` đều trả chính xác 1 kết quả.
2. **Mảnh thuộc tính HTML thừa trong 1 tệp EPUB gốc:** Chương 2 của *Dạy Con Làm Giàu - Tập 2* trong kho EPUB cũ có chuỗi văn bản thô `align="justify">` xuất phát từ lỗi tag HTML của file nguồn EPUB; cần bổ sung bước làm sạch thuộc tính HTML vỡ trong parser trích xuất chương EPUB khi nạp đợt tới.
3. **Ngắt kết nối dự kiến khi đóng PDF lớn đang tải dở:** Đóng trình đọc PDF 515 trang giữa chừng phát sinh 1 sự kiện `net::ERR_ABORTED` là hành vi hủy stream bình thường của `cancelPDF()` giúp tiết kiệm băng thông và bộ nhớ.

---

## 3. Bằng chứng Chụp màn hình Kiểm thử

- Ảnh chụp màn hình kiểm thử trình duyệt (đã xác minh bởi `BROWSER_HOST_FACTS` trên `http://127.0.0.1:4321`): `final_step_351.png` (Dark Mode, biểu tượng Cây Thông Noel 3D, bìa sách sắc nét, 0 lỗi console, 0 tràn ngang).
