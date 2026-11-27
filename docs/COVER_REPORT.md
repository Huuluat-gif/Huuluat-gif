# Báo cáo Hệ thống Ảnh Bìa 5 Tầng & Cover Studio (Cover Report)

Đáp ứng trực tiếp yêu cầu của chủ sở hữu: *"tôi muốn có bìa thiết kế bìa, tìm kiếm bìa sách trên mạng bổ sung cho đầy đủ, không có bìa thì sử dụng bìa cũ cũng được tối ưu nhất."*

---

## 1. Quy trình Ưu tiên Ảnh Bìa 5 Tầng (5-Tier Cover Pipeline)

Mọi đầu sách trong Lowf Library đều được xử lý ảnh bìa theo thứ tự ưu tiên chặt chẽ — **tuyệt đối không gắn nhầm bìa của sách khác và không bao giờ làm mất bìa cũ nếu không tìm thấy bìa tốt hơn:**

| Tầng | Nguồn ảnh bìa | Quy tắc xử lý & Bảo đảm chất lượng |
| --- | --- | --- |
| **Tầng 1** | Ảnh bìa đi kèm thư mục sách (`.webp`, `.jpg`, `.png`) | Khớp theo cùng thư mục hoặc tên chuẩn hóa; tối ưu chuẩn khung `2:3` (card ~400–600px, `<= 80 KB`) |
| **Tầng 2** | Ảnh bìa nhúng bên trong tệp `.epub` (OPF `cover` / `images/`) | Trích xuất trực tiếp từ bản EPUB gốc — giữ đúng ấn bản thật 100% |
| **Tầng 3** | Kết xuất trang đầu tiên của tệp `.pdf` | Render trang bìa thật của sách PDF thành JPEG/WebP nén nhẹ trên R2 |
| **Tầng 4** | **Tìm kiếm bìa trực tuyến có kiểm soát** (Open Library Covers API & Google Books API) | Chỉ sử dụng qua proxy máy chủ chống SSRF (`GET/POST /api/admin/covers/search`), yêu cầu trùng tên/tác giả rõ ràng, lưu thẳng bản sao vào **Cloudflare R2** (không hotlink ảnh từ web ngoài dễ vỡ link) |
| **Tầng 5** | **Giữ bìa cũ / Bìa thiết kế Lowf Editorial SVG** | Nếu không tìm thấy bìa khớp chính xác, hệ thống **tự động giữ nguyên bìa cũ** hoặc tạo bìa thiết kế chuẩn Lowf Editorial (tỷ lệ `2:3`, độ tương phản cao, đồng bộ sáng/tối) |

---

## 2. Thống kê Phủ Bìa Thực tế

### A. Trên toàn bộ 1.079 Đầu Sách Sạch (`catalog_pipeline.py` — 27/11/2026)

| Tầng nguồn bìa | Số lượng sách | Tỷ lệ |
| --- | ---: | ---: |
| **Tầng 1 — Ảnh bìa rời trong thư mục (`.webp`)** | **95 cuốn** | **8,8%** |
| **Tầng 2 — Ảnh bìa nhúng gốc trong EPUB** | **426 cuốn** | **39,5%** |
| **Tầng 3 — Trang bìa đầu tiên của PDF** | **558 cuốn** | **51,7%** |
| Thiếu bìa hoàn toàn (trống / broken) | **0 cuốn** | **0,0%** |
| **Tổng cộng có nguồn bìa thật sẵn sàng** | **1.079 / 1.079 cuốn** | **100,0%** |

### B. Trên 529 Đầu Sách đang hiển thị Production (`main` snapshot)
- **516 cuốn (97,5%)** đang có `coverAssetId` (ảnh bìa thật): trong đó **244 bìa** đã nằm trên Cloudflare R2 (`8,17 MB`, phục vụ `HTTP 200` + cache CDN 30 ngày) và **~272 bìa** đang chờ hoàn tất đồng bộ từ nguồn sạch sang R2 để thay thế link Vercel Blob bị khóa `503`.
- **13 cuốn (2,5%)** đang dùng bìa thiết kế SVG dự phòng (`data:image/svg+xml`). Với công cụ **Tìm bìa online** vừa bổ sung trong Lowf Studio, chủ sở hữu có thể bổ sung bìa ảnh thật từ Open Library / Google Books cho cả 13 cuốn này chỉ bằng 1 chạm — hoặc giữ nguyên bìa SVG cũ nếu chưa có bản khớp!

---

## 3. Tính năng Mới trong Cover Studio (`/admin` → Sách & Ebook → Bước 2: File & ảnh bìa)

1. **Tải bìa thủ công lên Cloudflare R2:** Hỗ trợ JPG, PNG, WebP tối đa 5 MB (`UploadField`).
2. **Tìm bìa sách trực tuyến (`OnlineCoverFinder`):**
   - Nhập (hoặc tự điền sẵn) **Tên sách**, **Tác giả**, **ISBN** → bấm **Tìm bìa online**.
   - Máy chủ gọi song song **Open Library Search API** và **Google Books Volumes API** (đã kiểm chứng thực tế bằng `curl` ngày 27/11/2026 — trả kết quả chính xác `cover_i: 12539702` cho *Atomic Habits*).
   - Hiển thị lưới ứng viên kèm tên nguồn & năm xuất bản; bấm **Dùng bìa này** → máy chủ kiểm tra allowlist host, kiểm tra MIME (`image/jpeg|png|webp|avif`) và dung lượng (`1.2 KB – 3 MB`), lưu trực tiếp vào **Cloudflare R2** và ghi nguồn vào trường `coverSource`.
3. **Nút Hoàn tác / Giữ bìa cũ (1 chạm):** Nếu xem lại thấy không ưng ý, bấm **↩️ Hoàn tác · Giữ bìa cũ** để trả về chính xác `coverAssetId` / `cover` trước đó mà không mất dữ liệu.
4. **Tối ưu phân phối CDN:** Tất cả ảnh bìa công khai `<= 768 KB` được `GET /api/assets/[id]` stream kèm `Cache-Control: public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400` và `X-Content-Type-Options: nosniff`.
