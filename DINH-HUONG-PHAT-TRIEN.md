# Định Hướng Phát Triển Nền Tảng Lowf — Sách, Bài Viết & Thương Mại Điện Tử

Tài liệu này tổng hợp lộ trình kiến trúc rõ ràng, dễ hiểu để nâng cấp **Lowf (`www.lowflibray.com`)** thành một nền tảng **Đọc sách · Đọc bài viết chuyên sâu · Bán sách trực tuyến** quy mô lớn và chuyên nghiệp.

---

## 1. Hệ thống Đăng nhập & Phân quyền Logic (4 Tầng Rõ Ràng)

Để người dùng mới không bị bối rối mà vẫn bảo mật tuyệt đối dữ liệu mua hàng, hệ thống tài khoản nên vận hành theo **4 cấp độ quyền hạn tuần tự**:

```
Khách ghé thăm (Guest)
  └─▶ Độc giả Miễn phí (Reader — Đã đăng ký & xác minh Email/Google)
        └─▶ Hội viên / Người mua sách (Member & Buyer — Sở hữu Ebook / Gói đọc)
              └─▶ Quản trị & Biên tập (Editor / Owner Admin — Quản lý kho sách, bài viết, đơn hàng)
```

### Quy tắc Luồng Đăng nhập Chuẩn (Zero-Friction Auth)
1. **Không bắt đăng nhập sớm:** Khách vào web được đọc ngay sách miễn phí, nghe thử 6 giọng đọc, bật nhạc mưa/piano và bỏ sách vào giỏ hàng.
2. **Chỉ yêu cầu đăng nhập đúng thời điểm cần lưu trữ:** Khi bấm *Lưu sách*, *Viết ghi chú*, *Lưu sổ từ vựng*, *Bình luận cộng đồng*, hoặc *Thanh toán đơn hàng* → mở khung đăng nhập, xong tự động quay về đúng thao tác đang làm dở (không bắt tìm lại từ đầu).
3. **Bổ sung Đăng nhập 1 chạm bằng Google (Google OAuth):**
   - Trong Neon Auth (cấu hình trên Neon Console), bật **Google Provider**.
   - Người đọc bấm **"Tiếp tục với Google"** là tự động xác minh email luôn — giảm 80% tỷ lệ bỏ cuộc ở bước nhập mã OTP 6 số.
4. **Tách vai trò Biên tập viên (Editor) và Chủ sở hữu (Owner):**
   - Hiện tại chỉ email `LOWF_OWNER_EMAIL` mới vào được `/admin`.
   - Khi mở rộng quy mô, thêm cột `role` trong bảng `lowf_profiles` (`reader` | `editor` | `admin`):
     - `editor`: được viết bài review, đăng sách nháp, cập nhật trạng thái đóng gói đơn hàng.
     - `admin` (bạn): duyệt xuất bản, chỉnh giao diện, cấu hình cổng thanh toán & xem doanh thu.

---

## 2. Kiến trúc Góc Bài Viết & Điểm Sách Lớn (SEO & Thu hút độc giả tự nhiên)

Hiện tại mục **Góc bài viết** đang đọc nguồn phụ từ WordPress và hiển thị bên trong 1 trang đơn (`/?view=reviews`), nên Google khó lập chỉ mục (index) từng bài viết. Để xây dựng chuyên trang bài viết lớn:

1. **Tạo đường dẫn riêng chuẩn SEO trên Next.js:**
   - `/bai-viet` — Trang tạp chí đọc sách phân chuyên mục (*Điểm sách mới*, *Tóm tắt tinh gọn*, *Góc tác giả*, *Phương pháp đọc*).
   - `/bai-viet/[slug]` — Mỗi bài viết có URL riêng, thẻ tiêu đề & ảnh đại diện OpenGraph (khi chia sẻ lên Facebook/Zalo hiện ảnh bìa đẹp).
   - `/sach/[slug]` — Mỗi cuốn sách có trang giới thiệu riêng để người tìm tên sách trên Google vào thẳng trang mua/đọc của Lowf.
2. **Trình soạn thảo Bài viết ngay trong Lowf Studio (`/admin?tab=articles`):**
   - Lưu bài viết trực tiếp vào cơ sở dữ liệu Neon Postgres (bảng `lowf_articles`), chèn ảnh minh họa qua Vercel Blob.
3. **Cầu nối "Đọc bài viết → Đọc thử / Mua sách":**
   - Cuối hoặc giữa mỗi bài điểm sách, gắn **Thẻ Sách Liên Quan** với 2 nút `[Đọc thử chương 1]` và `[Mua sách giấy / Ebook]` giúp tăng tỷ lệ chuyển đổi tự nhiên mà không mang cảm giác quảng cáo.

---

## 3. Kiến trúc Cửa Hàng Sách Chuyên Nghiệp (E-Commerce)

Khi mở rộng bán hàng thực tế, nên chia rõ 3 dòng sản phẩm với quy trình vận hành riêng:

| Loại sản phẩm | Giao nhận | Quyền lợi sau thanh toán |
| :--- | :--- | :--- |
| **Sách giấy** | Giao hàng vật lý (cần địa chỉ, SĐT, phí ship, mã vận đơn) | Tặng kèm quyền đọc trước Chương 1–2 trên web trong lúc chờ giao sách |
| **Ebook / Audiobook** | Không phí ship, không cần địa chỉ | Mở khóa tức thì 100% chương đọc + 6 giọng đọc ngay sau khi cổng thanh toán báo thành công |
| **Combo (Sách giấy + Thẻ Hội viên/Ebook)** | Vừa mở khóa Ebook ngay, vừa tạo đơn giao sách giấy | Dòng sản phẩm biên lợi nhuận tốt nhất và được độc giả yêu thích nhất |

### Nâng cấp Thanh toán Thuận tiện cho Người Việt
- **Phương án 1 (Đang có sẵn khung): VNPAY** — hỗ trợ quét QR ngân hàng, thẻ ATM nội địa & thẻ quốc tế.
- **Phương án 2 (Rất hợp cho cá nhân / hộ kinh doanh mới): VietQR tự động qua SePay hoặc PayOS** — khách mở app ngân hàng quét mã QR chuyển khoản thẳng về tài khoản ngân hàng của bạn, webhook báo về website trong 2–5 giây để tự động xác nhận đơn mà không cần duyệt tay.
- **Phương án 3: COD (Thanh toán khi nhận hàng)** chỉ áp dụng riêng cho *Sách giấy* kèm bước xác nhận SĐT.

---

## 4. Lộ trình Sửa Giao diện Linh hoạt Dành cho Chủ Web

Hiện tại toàn bộ giao diện người đọc nằm trong bộ file tĩnh `public/lowf.html`, `public/lowf.css`, `public/lowf.js`. Cách này rất nhẹ nhưng khi bạn muốn **đổi bố cục lớn** sẽ khó tự chỉnh. Lộ trình 2 bước khuyên dùng:

1. **Ngắn hạn (Dùng ngay hiện tại):**
   - Vào `https://www.lowflibray.com/admin?tab=design` để đổi màu chủ đạo, câu chào Banner, ảnh Hero, phông chữ (Serif / Sans) và thứ tự các khối trang chủ → bấm **Xem bản nháp** rồi **Xuất bản**.
   - Khi muốn thay đổi sâu hơn (thêm khu vực mới, sửa thẻ sách, đổi bố cục), chỉ cần mở dự án này và mô tả bằng tiếng Việt — khi lưu và đẩy lên GitHub (`main`), Vercel sẽ tự động cập nhật lên `www.lowflibray.com` sau khoảng 30 giây.
2. **Trung hạn (Khi làm lại giao diện lớn):**
   - Tách `public/lowf.js` sang các **Component React / Next.js App Router** độc lập (`components/Navbar.tsx`, `components/BookCard.tsx`, `components/ReaderModal.tsx`, `components/CheckoutDrawer.tsx`).
   - Khi đó bạn muốn sửa riêng "Thẻ sách" hay "Trang thanh toán" sẽ cực kỳ trực quan, an toàn và không bao giờ lo ảnh hưởng sang phần Nhạc nền hay Trình đọc sách.
