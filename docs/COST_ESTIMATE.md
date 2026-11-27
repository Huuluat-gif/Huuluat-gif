# Bảng Dự toán Chi phí Vận hành (Cost Estimate)

> Nguyên tắc không phát sinh chi phí bất ngờ: Mọi con số tính theo biểu phí công khai chính thức của **Cloudflare (Workers, R2, DNS)** và **Neon PostgreSQL**. **Không có dịch vụ trả phí nào được tự ý đăng ký.**

---

## 1. Biểu phí Gốc Tham chiếu (Cloudflare & Neon)

| Dịch vụ | Gói Miễn phí (Free Tier) | Đơn giá Vượt mức (Paid / Usage) |
| --- | --- | --- |
| **Cloudflare DNS + SSL + DDoS + CDN** | **Miễn phí trọn đời (`$0/tháng`)** — không giới hạn băng thông | Pro `$20/tháng` (chỉ cần nếu muốn WAF nâng cao / Polish ảnh) |
| **Cloudflare R2 Storage** | **10 GB/tháng miễn phí** · 1 triệu Class A ops (ghi) · 10 triệu Class B ops (đọc) · **$0 egress (băng thông đọc miễn phí mãi mãi)** | `$0,015 / GB / tháng` lưu trữ · `$4,50 / triệu` Class A · `$0,36 / triệu` Class B · **`$0` egress** |
| **Cloudflare Workers** | **100.000 requests/ngày miễn phí** (~3 triệu req/tháng) | Workers Paid **`$5/tháng`** bao gồm 10 triệu requests + 30 triệu CPU-ms |
| **Neon PostgreSQL** | Free Tier **0,5 GB lưu trữ** + 190 compute hours/tháng | Launch plan từ ~`$19/tháng` (hoặc trả theo sử dụng khi dữ liệu chương EPUB vượt 0,5 GB) |

---

## 2. Dự toán Chi phí Hàng tháng theo Quy mô Thư viện Lowf

| Kịch bản Quy mô | Dung lượng R2 dự kiến | Cloudflare DNS & CDN | Cloudflare R2 (Storage + Egress) | Cloudflare Workers | Neon PostgreSQL | **Tổng dự kiến / tháng** |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **Mức 1 — Tinh tuyển hiện tại (556 cuốn)** | ~0,52 GB | `$0,00` | `$0,00` (5,2% Free) | `$0,00` (Free) | `$0,00` (Free*) | **`$0,00 / tháng`** |
| **Mức 2 — Toàn bộ kho sạch `<= 50 MB` (1.079 cuốn · Khuyến nghị)** | **3,31 GB** | `$0,00` | **`$0,00`** (33,1% Free · `$0` egress) | `$0,00` (Free < 100k req/ngày) | `$0,00` – `$19,00` (tùy dung lượng văn bản 497 EPUB trong Neon) | **`$0,00` – `$19,00 / tháng`** |
| **Mức 3 — Toàn bộ 1.130 cuốn (gồm 51 PDF nặng đã nén)** | **~3,91 GB** | `$0,00` | **`$0,00`** (39,1% Free) | `$0,00` – `$5,00` | `$0,00` – `$19,00` | **`$0,00` – `$24,00 / tháng`** |
| **Mức 4 — Mở rộng 3.000 cuốn (~15 GB R2, 50k lượt đọc/tháng)** | ~15,0 GB | `$0,00` | **`$0,08`** (5 GB vượt × `$0,015`) | `$5,00` (Workers Paid) | `$19,00` (Neon Launch) | **`~$24,08 / tháng`** |
| **Mức 5 — Quy mô lớn 10.000 cuốn (~50 GB R2, 300k lượt đọc/tháng)** | ~50,0 GB | `$0,00` | **`$0,60`** (40 GB vượt × `$0,015`) | `$5,00` (Workers Paid) | `$19,00` – `$39,00` | **`~$24,60` – `$44,60 / tháng`** |

> \*Lưu ý về Neon PostgreSQL: Nếu nạp đủ 497 cuốn EPUB dạng JSONB vào Neon, dung lượng văn bản ước tính khoảng 180–320 MB (cộng chỉ mục `pg_trgm`). Cần kiểm tra dung lượng thực tế nhánh Neon Staging sau khi nạp để đảm bảo nằm gọn trong hạn mức 0,5 GB của Neon Free (hoặc chuyển nội dung chương EPUB lớn sang lưu dưới dạng JSON nén trên R2 để giữ Neon Free `$0/tháng` dài hạn!).

---

## 3. So sánh Nhanh: Vì sao Cloudflare R2 Tối ưu hơn Vercel Blob?

| Tiêu chí | Vercel Blob (Hobby) | Cloudflare R2 |
| --- | --- | --- |
| Dung lượng miễn phí | **1 GB** (bị khóa toàn bộ `HTTP 503` khi vượt) | **10 GB** (gấp **10 lần**) |
| Phí lưu trữ vượt mức | `$0,023 / GB` (chỉ có trên gói Pro `$20/tháng`) | **`$0,015 / GB`** (không cần mua gói cơ bản) |
| Phí băng thông truyền tải (Egress) | Giới hạn 10 GB/tháng Hobby, `$0,05/GB` vượt mức | **`$0,00` mãi mãi (Zero Egress)** |
| Phù hợp tải PDF 10–50 MB & HTTP Range | Dễ chạm hạn mức Fast Data Transfer | **Lý tưởng tuyệt đối** cho thư viện PDF/Ebook |
