# Phương án Quản lý Tên miền & Chuyển đổi DNS (`lowflibray.com`)

> **Trả lời trực tiếp câu hỏi của chủ sở hữu (*"có cần đổi tên miền qua Cloudflare không quản lý cho dễ"*):**
> - **KHÔNG cần đổi tên miền khác** và **KHÔNG bắt buộc phải chuyển nhà đăng ký (Registrar Transfer)** khỏi Name.com!
> - **NÊN chuyển quản lý DNS (Nameserver) sang Cloudflare Free** để quản lý tập trung DNS + SSL + CDN + DDoS + Cloudflare Workers + Cloudflare R2 trên **1 bảng điều khiển duy nhất**, hoàn toàn miễn phí (`$0/tháng`), không mất phí gia hạn lại tên miền, và có thể quay ngược (rollback) về Vercel DNS trong dưới 5 phút nếu cần.
> - **Hiện trạng:** Chưa tạo zone hay thay đổi bất kỳ bản ghi DNS nào trên Production. Chỉ thực hiện khi chủ sở hữu phê duyệt.

---

## 1. Hiện trạng DNS & WHOIS Đo Thực tế (27/11/2026)

| Thông số | Giá trị đo thực tế |
| --- | --- |
| Tên miền chính | `lowflibray.com` (redirect `HTTP 308` → `https://www.lowflibray.com/`) |
| Tên miền phụ | `www.lowflibray.com` (đang phục vụ website chính) |
| Nhà đăng ký (Registrar) | **Name.com, Inc.** · Ngày hết hạn: `2027-11-17` · Trạng thái: `clientTransferProhibited` |
| Nameserver hiện tại | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Bản ghi `A` (`lowflibray.com`) | `64.29.17.1`, `64.29.17.65` |
| Bản ghi `www.lowflibray.com` | `216.198.79.65`, `64.29.17.1` |
| Bản ghi `MX` / `TXT` / `SPF` / `DKIM` / `DMARC` | **Không có** (không có email doanh nghiệp gắn với tên miền này → **0 rủi ro mất email** khi chuyển NS) |
| DNSSEC | **Chưa bật** (`unsigned`) → không có rủi ro kẹt DS record khi đổi NS |

---

## 2. So sánh 2 Lựa chọn cho Tên miền `lowflibray.com`

| Tiêu chí | Phương án A: Chỉ chuyển Nameserver sang Cloudflare DNS (Khuyến nghị) | Phương án B: Chuyển cả Registrar từ Name.com sang Cloudflare Registrar |
| --- | --- | --- |
| Chi phí phát sinh ngay | **`$0`** | Phải trả trước 1 năm gia hạn tên miền (~`$10,44`) |
| Rủi ro gián đoạn & thời gian | **0 downtime** (5–30 phút sau khi đổi 2 dòng NS tại Name.com) | Mất 5–7 ngày chờ mở khóa `clientTransferProhibited` + mã EPP |
| Quản lý DNS, SSL, CDN, Workers, R2 chung 1 nơi | **Có (100% đầy đủ)** | Có |
| Rollback về Vercel DNS nếu cần | **Cực nhanh (< 5 phút)** bằng cách đổi lại `ns1/ns2.vercel-dns.com` | Phức tạp hơn |

**Khuyến nghị:** Thực hiện **Phương án A** ngay khi chốt Production Cutover. Nếu sau này gần ngày hết hạn (`11/2027`) muốn tiết kiệm phí gia hạn giá gốc (at-cost), chủ sở hữu có thể cân nhắc Phương án B sau.

---

## 3. Kế hoạch Bản ghi DNS trên Cloudflare Zone `lowflibray.com` (SAU PHÊ DUYỆT)

### Bước 1 — Tạo Zone Free & Sao chép Đủ Bản ghi Trước Khi Đổi Nameserver
Khi thêm `lowflibray.com` vào tài khoản Cloudflare (`Huuluat05@gmail.com`):
1. **Giai đoạn chuyển tiếp không downtime (trỏ tạm về Vercel trước khi bật Workers):**
   - `A` `@` → `64.29.17.1` & `64.29.17.65` (TTL Auto, DNS Only lúc xác minh SSL, sau đó bật Proxied).
   - `CNAME` `www` → `cname.vercel-dns.com` (hoặc IP hiện tại).
2. **Giai đoạn cắt chuyển sang Cloudflare Workers Production (`lowf-library-prod`):**
   - Gắn **Workers Custom Domain** trực tiếp trong Cloudflare Dashboard / `wrangler.jsonc` cho:
     - `www.lowflibray.com` → Worker `lowf-library-prod`
     - `lowflibray.com` → Cloudflare Redirect Rule (`308 Permanent Redirect` giữ nguyên path & query → `https://www.lowflibray.com/$1`, bảo toàn 100% SEO và VNPAY return URLs!)
   - Tùy chọn gắn Custom Domain cho tài sản công khai nếu cần sau này: `media.lowflibray.com` → R2 public assets (vẫn giữ tệp sách riêng tư đi qua `/api/assets/[id]` để kiểm tra phân quyền server!).

### Bước 2 — Cấu hình Bảo mật & Hiệu năng SSL/TLS trên Cloudflare
- **SSL/TLS Encryption Mode:** `Full (Strict)` (bắt buộc, không dùng Flexible để tránh vòng lặp redirect và đảm bảo mã hóa đầu cuối).
- **Always Use HTTPS:** Bật (`ON`).
- **Automatic HTTPS Rewrites:** Bật (`ON`).
- **Minimum TLS Version:** `TLS 1.2` + bật `TLS 1.3`.
- **HSTS:** Bật khớp cấu hình hiện tại (`max-age=63072000`, `includeSubDomains`).
- **Cache Rules:**
  - Bypass cache cho `/api/admin/*`, `/api/auth/*`, `/api/me`, `/api/commerce/*`, `/api/reader/*`, `/admin*`.
  - Tôn trọng header `Cache-Control` từ origin cho `/api/assets/*` (ảnh bìa công khai cache 30 ngày; tệp riêng tư luôn `private, no-store` + `Vary: Cookie`).

### Bước 3 — Cập nhật Nameserver tại Name.com (Chủ sở hữu thao tác hoặc duyệt)
1. Đăng nhập **Name.com** → chọn `lowflibray.com` → **Nameservers**.
2. Thay `ns1.vercel-dns.com` và `ns2.vercel-dns.com` bằng đúng 2 nameserver Cloudflare cấp (ví dụ `*.ns.cloudflare.com`).
3. Chờ Cloudflare báo **Active** (thường 5–30 phút). Trong suốt thời gian này, cả Vercel DNS lẫn Cloudflare DNS đều trỏ đúng đích nên **không gián đoạn truy cập của độc giả**.

### Bước 4 — Kiểm tra Sau Khi Đổi DNS
```bash
dig +short NS lowflibray.com
dig +short A www.lowflibray.com
curl -sSI https://lowflibray.com/        # Phải trả 308 -> https://www.lowflibray.com/
curl -sSI https://www.lowflibray.com/    # Phải trả 200 với header server: cloudflare
```
