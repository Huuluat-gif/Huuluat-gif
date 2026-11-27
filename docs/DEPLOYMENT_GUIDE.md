# Hướng dẫn Triển khai Staging & Quy trình Cắt chuyển Production (Deployment Guide)

> **Quy tắc bắt buộc:** Nhánh `main` và môi trường Production `lowflibray.com` **chỉ được cập nhật sau khi chủ sở hữu phê duyệt tường minh**. Không bật bất kỳ trigger auto-deploy Production nào trong giai đoạn nghiệm thu.

---

## 1. Điều kiện Tiên quyết

- Tài khoản Cloudflare đã có 2 bucket R2 tại khu vực `apac`:
  - Production: `lowf-library-media` (đã bật CORS hỗ trợ HTTP Range)
  - Staging: `lowf-library-staging-media` (đã bật CORS hỗ trợ HTTP Range)
- Cơ sở dữ liệu Neon PostgreSQL đang hoạt động với 2 nhánh/CSDL tách biệt (`production` và `staging/preview`).
- Máy phát triển hoặc GitHub Actions Runner chạy **Node.js 24** (`package.json` tương thích Next.js `16.4.6`).

---

## 2. Bước 1 — Cấu hình Secrets cho GitHub Actions Staging (`.github/workflows/ci-staging.yml`)

1. Vào GitHub Repository `Huuluat-gif/Huuluat-gif` → **Settings → Environments → New environment → `staging`**.
2. Thêm 2 Secrets vào Environment `staging`:
   - `CLOUDFLARE_API_TOKEN` — Token Cloudflare có quyền `Workers Scripts: Edit`, `Workers Routes: Edit`, `Account Settings: Read`, `Workers R2 Storage: Read`.
   - `CLOUDFLARE_ACCOUNT_ID` — ID tài khoản Cloudflare (`6335b9fdd7bd98a19dab9797d53db85f`).
3. Khi push nhánh `migration/cloudflare` (hoặc bấm **Run workflow** trên tab Actions), workflow sẽ tự động:
   - Chạy `npm ci` + `npm run typecheck` (`tsc --noEmit`).
   - Kiểm tra bảo mật & vệ sinh repo (cấm `.pdf`/`.epub`/`.env`/secret patterns) + `npm audit --omit=dev --audit-level=high`.
   - Chạy `npm run build` kiểm chứng build Next.js sạch.
   - Build & triển khai Staging Worker **`lowf-library-staging`** bằng `npx vinext build && npx wrangler deploy --env staging` (nếu có đủ secrets).

---

## 3. Bước 2 — Nạp Biến Môi trường Bí mật cho Worker Staging

> Tuyệt đối không ghi giá trị bí mật vào `wrangler.jsonc` hay Git.

```bash
# 1. Nạp bí mật riêng cho môi trường Staging
npx wrangler secret put DATABASE_URL --env staging
npx wrangler secret put NEON_AUTH_BASE_URL --env staging
npx wrangler secret put LOWF_PREVIEW_AUTH_COOKIE_SECRET --env staging
npx wrangler secret put LOWF_ADMIN_EMAILS --env staging
npx wrangler secret put R2_ACCOUNT_ID --env staging
npx wrangler secret put R2_ACCESS_KEY_ID --env staging
npx wrangler secret put R2_SECRET_ACCESS_KEY --env staging

# 2. Áp dụng migration schema v2 lên Neon nhánh Staging (idempotent)
psql "$STAGING_DATABASE_URL" -f scripts/db-migrate-v2.sql

# 3. Thêm URL Staging vào Neon Console -> Auth -> Trusted Origins
# Ví dụ: https://lowf-library-staging.<subdomain>.workers.dev
```

### Trường hợp Dự phòng Adapter (`@opennextjs/cloudflare`)
Nếu trong lần build Staging đầu tiên `vinext` báo không tương thích với một module nội bộ của `@neon/auth/next/server` trên Next.js 16.4.6, chuyển sang adapter dự phòng bằng:
```bash
npm install -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy --env staging
```
Toàn bộ lớp `lib/env.ts`, `lib/storage.ts`, `lib/r2.ts` và API routes đều giữ nguyên 100% không cần viết lại.

---

## 4. Bước 3 — Đồng bộ Kho Sách Sạch lên Staging R2 (Resumable, Không Xóa File Gốc)

```bash
# 1. Quét & tạo manifest sạch từ 14 thư mục sách gốc
python3 scripts/catalog_pipeline.py \
  --downloads-root "/Users/admin/Downloads" \
  --out-dir "/tmp/lowf-staging"

# 2. Chạy thử dry-run kiểm tra số tệp & dung lượng
python3 scripts/migrate_to_r2.py \
  --manifest "/tmp/lowf-staging/catalog_pipeline_manifest.json" \
  --state "/tmp/lowf-staging/r2_staging_state.json" \
  --env staging

# 3. Thực thi đẩy lên lowf-library-staging-media (có kiểm tra SHA-256 & resume)
R2_ACCOUNT_ID=... R2_STAGING_BUCKET=lowf-library-staging-media \
R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
python3 scripts/migrate_to_r2.py \
  --manifest "/tmp/lowf-staging/catalog_pipeline_manifest.json" \
  --state "/tmp/lowf-staging/r2_staging_state.json" \
  --env staging --execute
```

---

## 5. Bước 4 — Quy trình Cắt chuyển Production (CHỈ CHẠY SAU KHI CHỦ SỞ HỮU PHÊ DUYỆT)

1. **Xác nhận phê duyệt** của chủ sở hữu trên các mục: phạm vi sách (556 vs 1.079 cuốn), ảnh bìa, chi phí, và phương án DNS Cloudflare.
2. **Tạo bản sao lưu Neon Production** (Neon Branch snapshot) ngay trước thời điểm cắt chuyển.
3. **Merge `migration/cloudflare` → `main`** bằng Pull Request đã vượt qua toàn bộ kiểm tra CI.
4. **Chạy `scripts/db-migrate-v2.sql`** lên Neon Production.
5. **Đồng bộ hoàn tất tài sản R2 Production (`lowf-library-media`)** cho các tệp còn trỏ Vercel Blob cũ và lô sách đã duyệt; kiểm tra `/api/admin/storage/stats` đảm bảo `legacyBlobPublishedBooks = 0`.
6. **Nạp secrets Production & Deploy Worker `lowf-library-prod`:**
   ```bash
   npx wrangler secret put DATABASE_URL --env production
   npx wrangler secret put NEON_AUTH_BASE_URL --env production
   npx wrangler secret put NEON_AUTH_COOKIE_SECRET --env production
   npx wrangler secret put LOWF_ADMIN_EMAILS --env production
   npx wrangler secret put R2_ACCOUNT_ID --env production
   npx wrangler secret put R2_ACCESS_KEY_ID --env production
   npx wrangler secret put R2_SECRET_ACCESS_KEY --env production
   npx wrangler secret put LOWF_PAYMENT_CONFIG_KEY --env production
   npx wrangler deploy --env production
   ```
7. **Chuyển Nameserver `lowflibray.com` tại Name.com → Cloudflare** theo [`DNS_PLAN.md`](DNS_PLAN.md).
8. **Kiểm tra Hậu cắt chuyển (Post-Cutover Smoke Test):**
   - `https://lowflibray.com/` → `HTTP 308` → `https://www.lowflibray.com/`.
   - Đăng nhập Google OAuth & Email OTP thành công.
   - Mở 1 sách EPUB + 1 sách PDF (kiểm tra `HTTP 206 Partial Content` trong DevTools Network).
   - Kiểm tra `/admin` → Trung tâm vận hành R2 báo trạng thái xanh.
   - Kiểm tra VNPAY return URL & IPN callback vẫn truy cập đúng `https://www.lowflibray.com/api/commerce/...`.
9. **Giữ Vercel Production (`lowf-library`) ở chế độ dự phòng nóng tối thiểu 14 ngày** trước khi xem xét dọn dẹp.
