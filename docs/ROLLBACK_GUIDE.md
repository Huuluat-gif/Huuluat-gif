# Hướng dẫn Khôi phục Khẩn cấp (Rollback Guide)

Mọi tầng của Lowf Library (Git, DNS, Compute, Storage, Database) đều có lộ trình quay ngược an toàn, không mất dữ liệu người dùng.

---

## 1. Rollback Mức 1 — Khôi phục Mã nguồn Git về Trạng thái Trước Di chuyển (< 1 phút)

Điểm mốc bất biến đã được gắn tag trước khi viết bất kỳ dòng mã chuyển đổi nào:
- **Backup Tag:** `backup/pre-cloudflare-migration-20261127` (trỏ chính xác tới commit `c3a3897` trên `main`).

```bash
# Kiểm tra điểm mốc sao lưu
git show --stat backup/pre-cloudflare-migration-20261127

# Nếu đã merge vào main và cần quay lại trạng thái cũ không mất lịch sử
git checkout main
git revert --no-commit backup/pre-cloudflare-migration-20261127..HEAD
git commit -m "revert: rollback to pre-cloudflare-migration checkpoint"
git push origin main
```

---

## 2. Rollback Mức 2 — Khôi phục Lưu lượng Production về Vercel (< 5 phút, Không Downtime)

Vì Vercel `lowf-library` (`prj_7UWwFtFQY8RmXAzDCiS7oqReu8I0`) **được giữ nguyên tối thiểu 14–30 ngày** sau khi cắt chuyển:

### Cách A — Giữ DNS trên Cloudflare nhưng trỏ lại Vercel (Nhanh nhất: ~30 giây)
1. Mở Cloudflare Dashboard → chọn zone `lowflibray.com` → **Workers Routes / Custom Domains**: gỡ route `www.lowflibray.com` khỏi Worker `lowf-library-prod`.
2. Trong mục **DNS → Records**:
   - Đảm bảo `A` `@` trỏ về `64.29.17.1` & `64.29.17.65` (DNS Only).
   - Đảm bảo `CNAME` `www` trỏ về `cname.vercel-dns.com` (DNS Only).
3. Trong vòng 30–60 giây, toàn bộ lưu lượng quay trở về Vercel Production `lowf-library` đang hoạt động song song với **cùng cơ sở dữ liệu Neon PostgreSQL và cùng bucket R2 `lowf-library-media`**.

### Cách B — Đổi Nameserver tại Name.com trở về Vercel DNS (~5–30 phút)
1. Đăng nhập **Name.com** → chọn `lowflibray.com` → **Nameservers**.
2. Đổi lại về:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
3. Lưu thay đổi. DNS trả về nguyên trạng 100% trước khi chuyển Cloudflare.

---

## 3. Rollback Mức 3 — Lưu trữ Tệp (Cloudflare R2 & Vercel Blob)

- Lớp đọc tài nguyên [`lib/storage.ts`](../lib/storage.ts) và [`lib/assets.ts`](../lib/assets.ts) hỗ trợ đọc song song cả khóa `r2/...` / `books/...` lẫn khóa di sản `lowf/...` trên Vercel Blob.
- Công cụ [`scripts/migrate_to_r2.py`](../scripts/migrate_to_r2.py) hoạt động theo cơ chế **chỉ sao chép (non-destructive)** — không bao giờ xóa tệp trên đĩa cục bộ hay trên Vercel Blob.
- Nếu muốn tạm ngừng ghi tệp mới vào R2: gỡ 4 biến `R2_*` trên môi trường tương ứng → `activeStorageBackend()` tự động rơi về `vercel-blob` mà không cần sửa mã nguồn.

---

## 4. Rollback Mức 4 — Cơ sở dữ liệu Neon PostgreSQL

- Toàn bộ câu lệnh trong [`scripts/db-migrate-v2.sql`](../scripts/db-migrate-v2.sql) chỉ mang tính **bổ sung tương thích ngược** (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, mở rộng `CHECK` constraint) — **không xóa cột, không xóa bảng, không làm hỏng phiên bản code cũ trên `main`**.
- Nếu có sự cố dữ liệu nghiêm trọng sau cắt chuyển, sử dụng **Neon Point-in-Time Restore (PITR)** hoặc khôi phục từ nhánh snapshot tạo trước bước cắt chuyển trong Neon Console (< 2 phút).

---

## 5. Checklist Xác minh Sau Rollback

- [ ] `curl -sSI https://www.lowflibray.com/` trả `HTTP 200`.
- [ ] `curl -sSI https://lowflibray.com/` trả `HTTP 308` → `https://www.lowflibray.com/`.
- [ ] `GET /api/bootstrap` trả đủ 529+ đầu sách & 8 bản nhạc.
- [ ] Đăng nhập tài khoản chủ sở hữu vào `/admin` hoạt động bình thường.
- [ ] Đơn hàng & lịch sử đọc người dùng trong Neon PostgreSQL còn nguyên vẹn.
