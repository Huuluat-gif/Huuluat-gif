# Báo cáo Nhập, Lọc Rác & Khử Trùng Lặp Kho Sách (Book Import Report)

- **Công cụ kiểm toán:** [`scripts/catalog_pipeline.py`](../scripts/catalog_pipeline.py) (chạy thực tế ngày 27/11/2026)
- **Phạm vi quét:** Toàn bộ **14 thư mục sách hợp lệ** trong `/Users/admin/Downloads` (không quét video, khóa học, ứng dụng `.dmg` hay tệp cá nhân)
- **Chính sách xuất bản an toàn:** Toàn bộ sách nhập mới đều mang trạng thái mặc định `needs_review` / `draft` và `copyrightStatus = needs_review` — **tuyệt đối không tự động xuất bản lên Production khi chưa có phê duyệt của chủ sở hữu.**

---

## 1. Tổng hợp Kết quả Lọc Rác & Khử Trùng Lặp (Số liệu đo thực tế)

| Chỉ số | Số lượng | Dung lượng | Tác động |
| --- | ---: | ---: | --- |
| Tổng tệp quét được (14 thư mục) | **2.423 tệp** | **11.483,61 MB** (11,21 GB) | Dữ liệu thô ban đầu |
| Ảnh bìa rời `.webp` đi kèm sách | **238 ảnh** | — | Đưa vào kho bìa ưu tiên Tầng 1 |
| **Tệp rác không phải sách đã loại bỏ** | **494 tệp** | **3,49 MB** | `251` `.txt`, `241` `.json`, `2` `.docx` — loại bỏ 100% |
| **Tệp lỗi / giả PDF (4.096 B thiếu `%PDF-`) đã loại bỏ** | **10 tệp** | **0,04 MB** | Chặn 10 tệp AppleDouble hỏng ở `Tiếng anh bản sao /` |
| **Bản trùng tuyệt đối (cùng SHA-256) đã loại bỏ** | **111 tệp** | **960,90 MB** | Tiết kiệm gần 1 GB dung lượng lưu trữ |
| **Ấn bản trùng tiêu đề đã hợp nhất** | **440 tệp** | **889,18 MB** | Ưu tiên giữ bản EPUB chữ sắc nét, lưu vết bản PDF dự phòng trong `alternateEditions` |
| **Tổng đầu sách duy nhất sạch (Canonical)** | **1.130 cuốn** | — | **0 tệp rác, 0 tệp lỗi, 0 bản trùng SHA-256** |
| — Trong đó: **Sẵn sàng nạp R2 ngay (`<= 50 MB`)** | **1.079 cuốn** | **3.383,88 MB** (3,305 GB gồm cả bìa) | **497 EPUB + 582 PDF** — chỉ chiếm **33,05% gói R2 Free 10 GB** |
| — Trong đó: **PDF scan nặng `> 50 MB` cần nén đợt 2** | **51 cuốn** | **5.589,42 MB** (5,46 GB) | Gắn cờ `oversize_needs_compression` để nén Ghostscript xuống ~10–15 MB/cuốn |

---

## 2. Phân bổ Thể loại & Ngôn ngữ của 1.079 Đầu Sách Sẵn sàng

So với bản cũ bị lệch quá nhiều sang Kinh tế & Phát triển bản thân, kho 1.079 sách sạch đã được chuẩn hóa phân bổ đa dạng trên **13 thể loại**:

| Mã thể loại | Tên thể loại hiển thị | Số cuốn (`<= 50 MB`) | Tỷ trọng |
| --- | --- | ---: | ---: |
| `vanhocqt` | Văn học nước ngoài | 681 | 63,1% |
| `kynang` | Phát triển bản thân & Kỹ năng | 101 | 9,4% |
| `khoahoc` | Khoa học & Công nghệ (`Big Ideas Simply Explained`, v.v.) | 68 | 6,3% |
| `dacbiet` | Tuyển chọn Lowf | 65 | 6,0% |
| `kinhte` | Kinh tế & Đầu tư | 43 | 4,0% |
| `marketing` | Bán hàng & Marketing | 36 | 3,3% |
| `phapluat` | Pháp luật & Chính trị (`LUAT`) | 32 | 3,0% |
| `lichsu` | Lịch sử & Văn minh (trọn bộ Will & Ariel Durant, v.v.) | 23 | 2,1% |
| `tieuthuyet` | Tiểu thuyết & Kỳ ảo (Harry Potter, Peter Pan, v.v.) | 14 | 1,3% |
| `ngoaingu` | Ngoại ngữ & Tiếng Anh | 8 | 0,7% |
| `truyentranh` | Truyện tranh & Manga | 3 | 0,3% |
| `tamly` | Tâm lý & Tư duy | 3 | 0,3% |
| `tamlinh` | Tôn giáo & Tâm linh | 2 | 0,2% |
| **Tổng cộng** | **13 thể loại cân đối** | **1.079** | **100%** |

- **Ngôn ngữ:** `511` cuốn Tiếng Việt (`vi`, 47,4%) · `568` cuốn Tiếng Anh / Ngoại văn (`en`, 52,6%).
- **Hiện trạng trên Production đang chạy (`main`):** Đang có **529 cuốn** đã xuất bản (`330` EPUB + `199` PDF). Nếu chủ sở hữu phê duyệt nhập toàn bộ kho sạch, thư viện sẽ tăng gấp đôi từ **529 → 1.079 cuốn** (hoặc **1.130 cuốn** sau nén 51 PDF nặng) mà vẫn nằm gọn trong **Cloudflare R2 Free 10 GB (`$0/tháng`)**.

---

## 3. Rà soát Bản quyền & Tính hợp pháp nội dung

- Toàn bộ **1.079 đầu sách** nhập từ kho cục bộ hiện được gắn nhãn mặc định `copyrightStatus: "needs_review"` (cần chủ sở hữu kiểm duyệt trước khi xuất bản công khai).
- Trong **Lowf Studio (`/admin` → Sách & Ebook → tab Thông tin)**, chủ sở hữu có thể gán một trong 4 trạng thái bản quyền cho từng cuốn:
  - `public_domain` — Tác phẩm thuộc phạm vi công cộng.
  - `licensed` — Có giấy phép phân phối hợp lệ.
  - `owner_authorized` — Tài liệu thuộc quyền phân phối của chủ sở hữu.
  - `needs_review` — Tạm giữ ở hàng chờ rà soát, không mở bán thương mại (`saleEnabled: false`).
- **Khuyến nghị quan trọng:** Chỉ bật `status = published` trên môi trường công khai đối với những đầu sách thuộc phạm vi công cộng, giấy phép mở hoặc đã được phép chia sẻ hợp pháp; các cuốn tài liệu sưu tầm cá nhân nên đặt `access = member` / lưu riêng hoặc giữ `needs_review`.
