# Kiểm kê Tính năng Lowf Library (Feature Inventory)

Tài liệu này liệt kê toàn bộ tính năng đang vận hành trên Lowf Library để đảm bảo **không có tính năng nào bị mất hoặc thoái lui** trong quá trình chuyển đổi hạ tầng sang Cloudflare, đồng thời đánh dấu rõ các tính năng được nâng cấp trên nhánh `migration/cloudflare`.

| Nhóm tính năng | Tính năng chi tiết | Trạng thái trên `main` | Trạng thái trên `migration/cloudflare` | Ghi chú kỹ thuật |
| --- | --- | --- | --- | --- |
| **1. Thư viện & Khám phá** | Trang chủ Khám phá, Hero theo mùa, Sách nổi bật, Đọc tiếp, Tiến độ đọc | Hoạt động | **Bảo toàn 100%** | Giữ nguyên thương hiệu Lowf & bố cục |
| **1. Thư viện & Khám phá** | Lọc 15 thể loại sách, sắp xếp, tìm kiếm tiếng Việt có/không dấu | Client-side từ `/api/bootstrap` | **Nâng cấp:** thêm API phân trang `GET /api/books` (giữ tương thích `/api/bootstrap`) | Sẵn sàng mở rộng 1.000–50.000 cuốn sách |
| **1. Thư viện & Khám phá** | Kệ sách cá nhân (`pdf` view), upload PDF/EPUB/TXT/MD cục bộ vào IndexedDB | Hoạt động | **Bảo toàn 100%** | Lưu riêng trên trình duyệt độc giả |
| **2. Trình đọc Ebook & PDF** | Đọc EPUB đa chương (1 trang, 2 trang spread, cuộn dọc), 8 màu giấy, cỡ chữ, Zen mode | Hoạt động | **Bảo toàn 100%** | Giữ nguyên đồng bộ tiến độ & bookmark |
| **2. Trình đọc Ebook & PDF** | Đọc PDF qua PDF.js + tự lọc nền scan + tự sửa lỗi XRef PDF hỏng nhẹ | Hoạt động (nhưng `disableStream: true` tải cả file) | **Nâng cấp:** bật HTTP Range streaming (`206 Partial Content`, chunk 256 KB) | Mở trang 1 nhanh hơn đáng kể cho PDF lớn trên R2 |
| **2. Trình đọc Ebook & PDF** | Mobile Reader bottom-sheet cho Mục lục (`#readerTocPop`), Kiểu trang (`#readerStylePop`), Đồng hồ (`#readerTimerPop`) | Hoạt động | **Bảo toàn & kiểm thử lại trên `390×844`** | Không tràn màn hình điện thoại |
| **3. Công cụ Học & Ghi chú** | Highlight nhiều màu, ghi chú cá nhân, bút vẽ trên PDF, đồng bộ bảng `lowf_reader_annotations` | Hoạt động | **Bảo toàn 100%** | Dữ liệu giữ nguyên trên Neon PostgreSQL |
| **3. Công cụ Học & Ghi chú** | Dịch đoạn ngắn (`/api/reader/translate`), từ điển phiên âm IPA, Sổ từ vựng (`lowf_reader_vocab`) | Hoạt động | **Nâng cấp:** dùng IP tin cậy `CF-Connecting-IP` qua `lib/env.ts` | Rate limit chính xác trên Cloudflare Workers |
| **3. Công cụ Học & Ghi chú** | Đọc thành tiếng (TTS) đa giọng & tốc độ (`public/reader-speech.js`) | Hoạt động | **Bảo toàn 100%** | Hoạt động trực tiếp trên Web Speech API |
| **4. Không gian & Thẩm mỹ 3D** | 12 chủ đề mùa, cánh hoa/tuyết/sao băng rơi, 24 họa tiết nền 3D Uiverse, 20 ảnh nền nghệ thuật | Hoạt động | **Bảo toàn 100%** | Cấu hình lưu trong `lowf_design_versions` |
| **4. Không gian & Thẩm mỹ 3D** | Biểu tượng 3D theo mùa (`#seasonLandmark3d` / `.hero-season-card` / `.mobile-season-card`) tối ưu 60fps trên điện thoại | Hoạt động | **Bảo toàn & kiểm thử lại Desktop + Mobile** | Hiển thị ngay trong vùng đầu trang điện thoại |
| **4. Không gian & Thẩm mỹ 3D** | Chế độ Sáng / Tối (`sky-toggle`) đồng bộ toàn trang & trình đọc | Hoạt động | **Bảo toàn 100%** | Kiểm tra tương phản Dark Mode |
| **5. Âm nhạc & Video** | Nhạc nền Lofi tập trung (`studio`), trình phát nổi cuối màn hình, 8 bản nhạc có ghi công giấy phép | Hoạt động | **Bảo toàn 100%** | Lưu trữ audio sẵn sàng chuyển R2 |
| **5. Âm nhạc & Video** | Góc Video (tải file lên hoặc nhúng `youtube-nocookie.com`) | Hoạt động | **Bảo toàn 100%** | Giới hạn upload video tới 250 MB qua R2 presign |
| **6. Tài khoản, Ví Xu & Cộng đồng** | Neon Auth: Google OAuth 1 chạm, Mã Email 6 số (OTP), Email + Mật khẩu | Hoạt động | **Bảo toàn 100%** | Cần thêm origin staging/Cloudflare vào Neon Auth Trusted Origins trước khi test login trên staging |
| **6. Tài khoản, Ví Xu & Cộng đồng** | Hồ sơ cá nhân, ảnh đại diện, chuỗi ngày đọc, ví Xu, Góc bài viết & Cộng đồng (`lowf_posts`, `lowf_post_likes`) | Hoạt động | **Bảo toàn 100%** | Không xóa hay reset bất kỳ dữ liệu người dùng nào |
| **7. Thương mại & Thanh toán** | Gói thành viên (`plans`), giỏ hàng, VNPAY Sandbox & Production (`HMAC-SHA512`, IPN, idempotency key), quản lý đơn hàng | Hoạt động | **Nâng cấp:** tách check môi trường bằng `isProductionEnv()` + `getTrustedClientIp()` | Không tự mở thanh toán thật trên Staging |
| **8. Lowf Studio (Quản trị `/admin`)** | Quản lý sách, nhạc, video, gói thành viên, giao diện live, lịch sử phiên bản, đơn hàng, auth | Hoạt động | **Nâng cấp toàn diện:** thêm Trung tâm giám sát R2 & sức khỏe kho sách (`/api/admin/storage/stats`), Workflow 7 trạng thái, Tìm & nhập bìa online chống SSRF + Hoàn tác bìa cũ, mặc định `needs_review` khi nhập hàng loạt | Bảo vệ chặt `requireAdmin()` + `emailVerified` |
