/* Curated original Vietnamese editions & public-domain English classics.
   Seeded idempotently with ON CONFLICT (kind, id) DO NOTHING so owner edits
   and archive states in Lowf Studio are always preserved. */

export type CuratedChapter = { title: string; paragraphs: string[] };
export type CuratedBook = {
  id: string;
  title: string;
  author: string;
  category: 'kinhte' | 'vanhocvn' | 'vanhocqt' | 'dacbiet';
  format: 'Ebook Free' | 'Ebook' | 'Sách giấy' | 'Combo';
  price: number;
  saleEnabled: boolean;
  description: string;
  cover: string;
  access: 'free' | 'member';
  status: 'published';
  language: 'vi' | 'en';
  sourceUrl?: string;
  licenseLabel?: string;
  note?: string;
  chapters: CuratedChapter[];
};

const escSvg = (value: string) =>
  String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] || c));

const motifs: Record<string, (fg: string, accent: string) => string> = {
  arch: (fg, accent) =>
    `<circle cx="150" cy="236" r="56" fill="${accent}" opacity=".88"/><path d="M68 340V256a82 82 0 0 1 164 0v84" fill="none" stroke="${fg}" stroke-width="2.5" opacity=".75"/><path d="M96 340V262a54 54 0 0 1 108 0v78" fill="${fg}" opacity=".14"/><path d="M46 340h208" stroke="${fg}" stroke-width="2" opacity=".55"/>`,
  horizon: (fg, accent) =>
    `<circle cx="196" cy="202" r="32" fill="${accent}"/><path d="M24 292Q96 244 162 278T276 266V346H24Z" fill="${fg}" opacity=".2"/><path d="M24 316Q108 276 178 304T276 296V346H24Z" fill="${fg}" opacity=".38"/><path d="M60 228h64m-48 14h42" stroke="${fg}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`,
  botanical: (fg, accent) =>
    `<path d="M150 342V204" stroke="${fg}" stroke-width="2.5" stroke-linecap="round"/><g fill="${accent}"><ellipse cx="122" cy="252" rx="14" ry="28" transform="rotate(-34 122 252)"/><ellipse cx="178" cy="240" rx="14" ry="28" transform="rotate(34 178 240)"/><ellipse cx="120" cy="296" rx="13" ry="26" transform="rotate(-28 120 296)"/><ellipse cx="180" cy="286" rx="13" ry="26" transform="rotate(28 180 286)"/></g><circle cx="150" cy="194" r="14" fill="${fg}" opacity=".8"/>`,
  compass: (fg, accent) =>
    `<circle cx="150" cy="258" r="72" fill="none" stroke="${fg}" stroke-width="1.6" opacity=".45"/><circle cx="150" cy="258" r="52" fill="none" stroke="${accent}" stroke-width="1.4"/><path d="m150 192 16 50 50 16-50 16-16 50-16-50-50-16 50-16z" fill="${accent}" opacity=".9"/><circle cx="150" cy="258" r="7" fill="${fg}"/>`,
  lantern: (fg, accent) =>
    `<line x1="150" y1="176" x2="150" y2="210" stroke="${fg}" stroke-width="2.2"/><rect x="112" y="210" width="76" height="98" rx="22" fill="${accent}" opacity=".9"/><rect x="126" y="226" width="48" height="66" rx="12" fill="#FFFDF7" opacity=".78"/><path d="M98 210h104M104 308h92" stroke="${fg}" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="260" r="12" fill="${fg}" opacity=".28"/>`,
  steps: (fg, accent) =>
    `<rect x="58" y="294" width="38" height="46" rx="4" fill="${fg}" opacity=".25"/><rect x="108" y="264" width="38" height="76" rx="4" fill="${fg}" opacity=".45"/><rect x="158" y="230" width="38" height="110" rx="4" fill="${fg}" opacity=".68"/><rect x="208" y="194" width="38" height="146" rx="4" fill="${accent}"/><path d="M68 268 224 176" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`,
  teacup: (fg, accent) =>
    `<ellipse cx="146" cy="326" rx="68" ry="11" fill="${fg}" opacity=".2"/><path d="M96 258h100v26a46 46 0 0 1-46 46h-8a46 46 0 0 1-46-46z" fill="${accent}"/><path d="M196 268h14a16 16 0 0 1 0 32h-14" fill="none" stroke="${accent}" stroke-width="7"/><path d="M128 240q-8-18 4-34m20 34q-8-18 4-34m20 34q-8-18 4-34" fill="none" stroke="${fg}" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`,
  stars: (fg, accent) =>
    `<circle cx="150" cy="258" r="64" fill="${fg}" opacity=".12"/><path d="M166 206a48 48 0 1 0 26 78 40 40 0 1 1-26-78z" fill="${accent}"/><circle cx="112" cy="216" r="3" fill="${accent}"/><circle cx="204" cy="224" r="2.5" fill="${fg}" opacity=".6"/><circle cx="192" cy="194" r="3.5" fill="${accent}"/>`,
};

function coverSvg(
  motif: keyof typeof motifs,
  lines: string[],
  author: string,
  bg: string,
  fg: string,
  accent: string,
  imprint = 'LOWF CURATED'
): string {
  const titles = lines
    .map(
      (line, i) =>
        `<text x="150" y="${80 + i * 31}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="600" font-size="${line.length > 18 ? 22 : 26}" fill="${fg}">${escSvg(line)}</text>`
    )
    .join('');
  const authorY = 82 + lines.length * 31;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="${bg}"/><rect x="16" y="16" width="268" height="388" rx="6" fill="none" stroke="${fg}" stroke-opacity=".14"/><path d="M8 0v420" stroke="${fg}" stroke-opacity=".14" stroke-width="4"/><text x="150" y="36" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" letter-spacing="2.8" fill="${fg}" opacity=".68">${escSvg(imprint)}</text>${titles}<text x="150" y="${authorY}" text-anchor="middle" font-size="9.5" font-family="Arial,sans-serif" letter-spacing="2" fill="${fg}" opacity=".78">${escSvg(author.toUpperCase())}</text>${motifs[motif](fg, accent)}<text x="150" y="390" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.5" letter-spacing="2.2" fill="${fg}" opacity=".68">LOWF • BOOK &amp; BEYOND</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const ch = (title: string, ...paragraphs: string[]): CuratedChapter => ({ title, paragraphs });
const viNote = 'Ấn phẩm biên soạn dành riêng cho không gian đọc Lowf. Đọc miễn phí toàn văn; thông tin giá dùng để minh họa cửa hàng khi bật thanh toán.';
const pdLicense = 'Public Domain (US) · Biên tập sạch cho trình đọc Lowf';

export const CURATED_BOOKS: CuratedBook[] = [
  {
    id: 'atomic-work',
    title: 'Tư duy tối giản trong công việc',
    author: 'Minh Khôi',
    category: 'kinhte',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('steps', ['Tư duy tối giản', 'trong công việc'], 'Minh Khôi', '#EFECE1', '#233D32', '#C47D52', 'LOWF BUSINESS'),
    description: 'Làm ít việc hơn nhưng sâu sắc hơn: cách giữ sự tập trung, quản trị năng lượng và thoát khỏi cảm giác bận rộn giả tạo.',
    note: viNote,
    chapters: [
      ch('01 — Bận rộn không đồng nghĩa với tiến bộ',
        'Buổi chiều thứ Sáu, danh sách việc cần làm của Quân có hai mươi tư gạch đầu dòng đã được đánh dấu hoàn thành. Thế nhưng khi gấp máy tính lại, cậu không nhớ nổi một việc nào thật sự đưa dự án của mình tiến thêm một bước dài.',
        'Chúng ta thường tìm sự an tâm trong chuyển động liên tục. Trả lời ngay một tin nhắn, tham dự thêm một cuộc họp ngắn, chỉnh lại màu sắc của một trang trình bày: những việc ấy dễ bắt đầu và cho cảm giác hoàn thành tức thì. Nhưng chính chúng lại âm thầm lấy đi khung giờ sáng suốt nhất trong ngày.',
        'Tối giản trong công việc bắt đầu từ một câu hỏi thẳng thắn mỗi sáng: nếu hôm nay chỉ được phép hoàn thành trọn vẹn một việc duy nhất, việc nào sẽ làm những việc còn lại trở nên nhẹ hơn hoặc không còn cần thiết nữa?'),
      ch('02 — Bảo vệ khung giờ sâu',
        'Sự chú ý của con người giống như mặt hồ buổi sớm. Mỗi thông báo bật lên là một viên sỏi nhỏ; viên sỏi không lớn, nhưng những vòng sóng lan ra khiến mặt nước chẳng bao giờ kịp phẳng lặng trở lại.',
        'Thay vì cố gắng kỷ luật suốt tám tiếng, hãy thiết kế một khung giờ sâu chỉ kéo dài sáu mươi đến chín mươi phút vào đầu ngày. Đóng các tab chưa dùng tới, đặt điện thoại sang phòng bên cạnh và chỉ mở đúng tài liệu đang viết.',
        'Một giờ làm việc không bị ngắt quãng thường tạo ra giá trị rõ ràng hơn cả một buổi chiều vừa làm vừa ngó chừng hộp thư.'),
      ch('03 — Nghệ thuật nói lời từ chối tử tế',
        'Mỗi lời đồng ý vội vàng với một yêu cầu chưa cấp thiết đều là lời từ chối ngầm dành cho mục tiêu quan trọng bạn đã hứa với chính mình.',
        'Từ chối tử tế không làm hỏng mối quan hệ khi bạn nói rõ giới hạn và đề xuất phương án phù hợp: hẹn sang một thời điểm cụ thể, chia sẻ tài liệu hướng dẫn sẵn có, hoặc giới thiệu người phù hợp hơn.',
        'Sự rõ ràng luôn tử tế hơn một lời nhận lời miễn cưỡng rồi trễ hẹn.'),
      ch('04 — Nhịp nghỉ là một phần của hiệu suất',
        'Không có cây đàn nào giữ được âm thanh chuẩn nếu dây đàn bị kéo căng suốt ngày đêm. Trí óc sáng tạo cũng cần những khoảng dừng thật sự tách khỏi màn hình.',
        'Một cuộc tản bộ mười lăm phút dưới hàng cây, một tách trà ấm không kèm tin tức, hay buổi tối khép lại công việc đúng giờ không phải phần thưởng sau khi đã kiệt sức — đó là nhiên liệu để ngày mai bạn tiếp tục đi đường dài với sự minh mẫn.')
    ]
  },
  {
    id: 'calm-wealth',
    title: 'Điềm tĩnh trước tiền bạc',
    author: 'Trần Bảo Nam',
    category: 'kinhte',
    format: 'Sách giấy',
    price: 119000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('arch', ['Điềm tĩnh', 'trước tiền bạc'], 'Trần Bảo Nam', '#243C33', '#F4EBDD', '#D99B66', 'LOWF BUSINESS'),
    description: 'Hiểu tâm lý chi tiêu, xây dựng quỹ an tâm và nhìn tài chính cá nhân như công cụ bảo vệ sự tự do bình dị.',
    note: viNote,
    chapters: [
      ch('01 — Thước đo của sự đủ đầy',
        'Nhiều quyết định tốn kém nhất không xuất phát từ nhu cầu sử dụng, mà từ mong muốn được nhìn nhận. Khi thước đo nằm ở ánh mắt người ngoài, con số bao nhiêu cũng trở nên thiếu.',
        'Điềm tĩnh trước tiền bạc bắt đầu khi ta phân biệt được hai khái niệm: giàu có trên bề mặt là những thứ người khác nhìn thấy đã tiêu đi; còn sự vững vàng tài chính là phần dự trữ âm thầm chưa tiêu tới, giúp ta ngủ ngon và có quyền chọn lựa.',
        'Biết điều gì thật sự mang lại niềm vui bền lâu cho mình là khoản tiết kiệm lớn nhất của tuổi trưởng thành.'),
      ch('02 — Quỹ an tâm cho những ngày trái gió',
        'Một kế hoạch tài chính tốt không giả định mọi tháng đều nắng đẹp. Xe có thể hỏng, công việc có thể chuyển mình, người thân có lúc cần ta ở cạnh nhiều hơn.',
        'Khoản dự phòng từ ba đến sáu tháng chi phí sinh hoạt cơ bản không nằm đó để sinh lời cao nhất; nhiệm vụ của nó là giữ cho bạn sự bình tĩnh để không phải đưa ra quyết định vội vàng trong lúc khó khăn.',
        'Sự an tâm không mua được bằng một món đồ đắt tiền, nhưng có thể gom góp từng chút một qua mỗi kỳ lương.'),
      ch('03 — Khoảng dừng hai mươi tư giờ',
        'Các nền tảng mua sắm được tối ưu để rút ngắn khoảng cách giữa cảm xúc nhất thời và nút thanh toán xuống còn vài giây. Cách tự bảo vệ đơn giản nhất là trả lại thời gian cho quyết định ấy.',
        'Với những món đồ không thiết yếu, hãy đặt chúng vào danh sách chờ hai mươi tư giờ hoặc bảy ngày. Phần lớn sự háoức ban đầu sẽ lắng xuống, chỉ những thứ thật sự hữu ích mới còn ở lại trong suy nghĩ của bạn.',
        'Chi tiêu có chủ đích không phải hà khắc với bản thân, mà là dành nguồn lực cho những trải nghiệm bạn thực tâm trân trọng.'),
      ch('04 — Mua lại thời gian của chính mình',
        'Giá trị đẹp đẽ nhất mà tiền bạc có thể mang lại là quyền làm chủ nhịp sống: được chọn công việc có ý nghĩa, có buổi tối ăn cơm cùng gia đình, và có khoảng lặng đọc trọn một chương sách mà không thấp thỏm lo âu.',
        'Hãy xem mỗi khoản tích lũy hôm nay như những ngày tự do bạn đang gửi tặng phiên bản tương lai của chính mình.')
    ]
  },
  {
    id: 'creative-craft',
    title: 'Làm nghề bằng sự tử tế',
    author: 'Lê Hoàng Anh',
    category: 'kinhte',
    format: 'Ebook',
    price: 79000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('compass', ['Làm nghề bằng', 'sự tử tế'], 'Lê Hoàng Anh', '#F5EFE2', '#2E473B', '#B87449', 'LOWF WORK & CRAFT'),
    description: 'Rèn giũa tay nghề, giữ chữ tín trong những chi tiết nhỏ và xây dựng sự nghiệp bền vững không ồn ào.',
    note: viNote,
    chapters: [
      ch('01 — Chữ ký vô hình trên từng sản phẩm',
        'Người thợ mộc lành nghề vẫn bào nhẵn mặt gỗ phía sau tủ, nơi kê sát vào tường và chẳng khách hàng nào cúi xuống kiểm tra. Ông bảo khách không thấy, nhưng chính ông biết nó ở đó.',
        'Trong bất kỳ công việc nào — viết một bức thư, đóng gói một cuốn sách, sửa một dòng mã hay tư vấn cho khách — cách ta đối xử với phần khuất mắt chính là thước đo thật của lòng tự trọng nghề nghiệp.',
        'Tay nghề vững được xây từ hàng nghìn lần không cho phép mình làm qua loa ở những chi tiết nhỏ.'),
      ch('02 — Chậm mà chắc giữa thời đại vội',
        'Đường tắt thường hấp dẫn ở chặng đầu nhưng lại tốn rất nhiều thời gian để sửa chữa về sau. Một lời hứa quá đà có thể mang về một đơn hàng hôm nay, nhưng lấy đi mười lần quay lại trong tương lai.',
        'Khi bạn chọn nói đúng sự thật về khả năng của sản phẩm, giao đúng hẹn đã cam kết và nhận trách nhiệm thẳng thắn khi có sai sót, bạn đang xây một tài sản hiếm: sự tin cậy không cần quảng cáo.'),
      ch('03 — Học hỏi như người mới mỗi ngày',
        'Kinh nghiệm là vốn quý, nhưng nếu không đi kèm sự khiêm tốn, nó dễ biến thành bức tường ngăn ta lắng nghe cái mới.',
        'Giữ thói quen ghi chép lại bài học sau mỗi dự án, lắng nghe phản hồi khó nghe mà không vội tự vệ, và đọc sâu ngoài lĩnh vực quen thuộc sẽ giúp nghề nghiệp của bạn luôn tươi mới qua nhiều năm tháng.')
    ]
  },
  {
    id: 'compound-days',
    title: 'Lãi kép của một ngày nhỏ',
    author: 'Phương Vũ',
    category: 'kinhte',
    format: 'Combo',
    price: 139000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('botanical', ['Lãi kép của', 'một ngày nhỏ'], 'Phương Vũ', '#DDE6D5', '#254232', '#6C9267', 'LOWF GROWTH'),
    description: 'Sức mạnh cộng dồn từ hai mươi trang sách, mười phút viết tay và những lựa chọn nhỏ kiên trì mỗi ngày.',
    note: viNote,
    chapters: [
      ch('01 — Một phần trăm không nhìn thấy ngay',
        'Nếu hôm nay bạn đọc mười lăm trang sách hoặc học năm từ mới, buổi tối nhìn vào gương sẽ chẳng thấy điều gì khác biệt. Tương tự, bỏ qua một ngày cũng không gây ra hậu quả tức thì. Chính độ trễ ấy khiến thói quen tốt dễ bị bỏ dở.',
        'Nhưng thời gian là người nhân hệ số thầm lặng. Mười lăm trang mỗi ngày là hơn năm nghìn trang mỗi năm — tương đương hai mươi cuốn sách dày mở rộng thế giới quan của bạn.',
        'Đừng đánh giá thấp một ngày nhỏ chỉ vì kết quả của nó chưa kịp nở hoa ngay trong tuần đầu tiên.'),
      ch('02 — Thiết kế môi trường thay vì ép ý chí',
        'Ý chí là nguồn năng lượng hữu hạn, đặc biệt vào cuối một ngày làm việc dài. Người duy trì được thói quen đọc sách lâu năm không hẳn có ý chí phi thường; họ chỉ đặt sẵn cuốn sách trên gối hoặc cạnh tách cà phê sáng.',
        'Muốn duy trì điều gì, hãy giảm bớt một bước cản trở. Muốn bớt lệ thuộc vào điều gì, hãy thêm vào một bước chờ đợi.'),
      ch('03 — Trở lại nhẹ nhàng sau một ngày gián đoạn',
        'Ai cũng có những tuần lễ ốm mệt, bận việc gia đình hoặc chệch nhịp. Điều làm gãy đổ hành trình không phải một ngày nghỉ, mà là cảm giác tự trách khiến ta bỏ luôn cả tháng tiếp theo.',
        'Quy tắc giản dị nhất là: nếu lỡ nhịp hôm qua, hôm nay chỉ cần mở lại đúng một trang. Giữ cho sợi dây thói quen không đứt quan trọng hơn bất kỳ con số kỷ lục nào.')
    ]
  },
  {
    id: 'hanoi-autumn',
    title: 'Mùa thu qua khung cửa nhỏ',
    author: 'Thảo Nguyên',
    category: 'vanhocvn',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('teacup', ['Mùa thu qua', 'khung cửa nhỏ'], 'Thảo Nguyên', '#F6ECDC', '#4A3728', '#C98A55', 'TẢN VĂN VIỆT NAM'),
    description: 'Tập tản văn dịu ngọt về nắng hanh vàng, hương trà sen và những buổi chiều tĩnh lặng giữa lòng phố cũ.',
    note: viNote,
    chapters: [
      ch('01 — Gió heo may đầu ngõ',
        'Sáng tháng Mười, người ta nhận ra mùa thu không phải nhờ tờ lịch treo tường, mà nhờ làn gió se lạnh đầu tiên lùa qua cổ áo khi vừa mở cửa. Nắng vẫn vàng nhưng đã thôi gắt, trải mỏng trên mái ngói nâu như một lớp mật ong trong vắt.',
        'Bà cụ đầu ngõ dọn gánh cốm xanh gói trong lá sen thơm dịu. Tiếng rao kéo dài rồi tan vào tiếng lá sấu xào xạc dưới chân người đi bộ. Giữa thành phố quen vội vã, mùa thu như một lời nhắc khẽ: hãy đi chậm lại kẻo lỡ mất vài tuần đẹp nhất trong năm.',
        'Tôi pha một ấm trà mạn, mở rộng cánh cửa sổ gỗ và đặt cuốn sách đang đọc dở lên bậu cửa. Chỉ bấy nhiêu thôi mà lòng nhẹ tênh như vừa đi xa trở về.'),
      ch('02 — Hiệu sách cũ trên gác hai',
        'Cầu thang gỗ dẫn lên hiệu sách cũ hẹp vừa một người đi, mỗi bậc khẽ cọt kẹt như lời chào quen thuộc. Bên trong, mùi giấy ngả màu quyện với mùi gỗ thông tạo thành thứ hương thơm khiến những ai yêu chữ đều bất giác hạ giọng thì thầm.',
        'Ông chủ tiệm ngồi bên chiếc đèn bàn chao xanh, kiên nhẫn dán lại gáy một cuốn từ điển cũ. Ở đây không có bảng xếp hạng bán chạy, chỉ có những cuốn sách kiên nhẫn đợi đúng người cần đọc tìm tới.',
        'Tôi chọn được một tập thơ in từ hai mươi năm trước, trang đầu còn ép một chiếc lá thuộc bài khô mảnh như cánh chuồn. Mang cuốn sách về nhà, tôi có cảm giác mình vừa tiếp nhận một kỷ niệm đẹp từ người đi trước.'),
      ch('03 — Buổi chiều không vội',
        'Hoàng hôn mùa thu xuống rất nhanh nhưng để lại dư âm thật êm. Ánh đèn vàng từ các ô cửa tập thể lần lượt bật sáng, thơm mùi cơm mới và canh rau cải nấu gừng.',
        'Có những hạnh phúc chẳng cần gọi tên lớn lao: một căn phòng gọn gàng, một người thương hỏi han cuối ngày, và vài trang viết hiền lành khép lại buổi tối bình yên.')
    ]
  },
  {
    id: 'letters-to-youth',
    title: 'Những lá thư gửi tuổi hai mươi',
    author: 'Đặng Minh Triết',
    category: 'vanhocvn',
    format: 'Sách giấy',
    price: 98000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('horizon', ['Những lá thư', 'gửi tuổi hai mươi'], 'Đặng Minh Triết', '#2B4652', '#F5EDE0', '#E3B27A', 'TẢN VĂN & TRƯỞNG THÀNH'),
    description: 'Những lời thủ thỉ ấm áp dành cho người trẻ đang đứng giữa ngã ba đường, hoang mang nhưng đầy khát vọng.',
    note: viNote,
    chapters: [
      ch('01 — Gửi ngày bạn thấy mình đi chậm hơn bạn bè',
        'Tuổi hai mươi có những buổi tối lướt qua màn hình sáng rực và thấy dường như ai cũng đã biết rõ mình muốn gì, trừ bản thân mình. Người vừa nhận học bổng, người thăng chức, người bắt đầu hành trình riêng rực rỡ.',
        'Nhưng mỗi cuộc đời có một múi giờ riêng. Có loài hoa nở vào đầu xuân, có loài cây phải đợi qua hết mùa mưa mới bén rễ sâu xuống lòng đất. Bạn không hề trễ hẹn với cuộc đời chỉ vì chương mở đầu của bạn cần nhiều thời gian chuẩn bị hơn.',
        'Hãy so sánh mình với chính bạn của sáu tháng trước: biết lắng nghe hơn một chút, kiên nhẫn hơn một chút, thế đã là đang lớn lên thật vững vàng.'),
      ch('02 — Về những lần thử và sai',
        'Không tấm bản đồ nào vẽ sẵn mọi khúc quanh trước khi bạn đặt chân lên đường. Một công việc chưa hợp, một dự án dang dở hay một lời từ chối không phải dấu chấm hết — chúng là dữ liệu quý giá giúp bạn gạch bớt những ngã rẽ không thuộc về mình.',
        'Điều đáng tiếc nhất ở tuổi trẻ không phải là làm sai rồi sửa, mà là đứng yên quá lâu ngoài lề vì sợ bước đầu tiên chưa đủ hoàn hảo.'),
      ch('03 — Giữ một góc trong trẻo giữa đời rộng',
        'Đi qua những va vấp, mong bạn trưởng thành theo cách vững chãi chứ đừng chai sạn. Vẫn biết cảm động trước một buổi chiều đẹp, vẫn nói lời cảm ơn chân thành với người giúp đỡ mình, và vẫn giữ thói quen đọc sách để tâm hồn luôn có chỗ dựa êm ái.')
    ]
  },
  {
    id: 'tea-and-pages',
    title: 'Một ấm trà, vài trang viết',
    author: 'Lâm Yên',
    category: 'vanhocvn',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('botanical', ['Một ấm trà,', 'vài trang viết'], 'Lâm Yên', '#EAF0E3', '#2B4736', '#7F9E6E', 'LOWF ORIGINALS'),
    description: 'Ghi chép dịu êm về niềm vui đọc sách chậm, viết nhật ký tay và chăm sóc khu vườn tâm trí.',
    note: viNote,
    chapters: [
      ch('01 — Nghi thức mở một cuốn sách',
        'Trước khi đọc, tôi thường dành một phút dọn gọn góc bàn, rót chén nước ấm và hít một hơi sâu. Cử chỉ nhỏ ấy như tấm rèm khẽ khép lại những lo toan ngoài phố để nhường chỗ cho thế giới của chữ nghĩa.',
        'Khi ta đến với trang sách bằng tâm thế thong thả, từng câu văn mới kịp ngân lên trọn vẹn ý vị của nó.'),
      ch('02 — Trò chuyện cùng lề giấy',
        'Một cuốn sách được yêu thương không nhất thiết phải phẳng phiu như mới. Những dòng gạch chân nhẹ, một câu ghi chú bên lề ngày mưa hay từ vựng mới được lưu lại chính là dấu chân của tâm hồn bạn qua từng chặng tuổi.',
        'Đọc lại ghi chú cũ sau vài năm giống như gặp lại một người bạn thân từng thức cùng mình qua nhiều đêm trăn trở.'),
      ch('03 — Đọc để hiểu người và thương mình',
        'Văn chương cho ta sống thử nhiều cuộc đời trong một kiếp người hữu hạn. Khi hiểu vì sao một nhân vật yếu lòng, vì sao một con người lựa chọn khác ta, lòng bao dung tự khắc rộng mở hơn — cả với thế giới lẫn với những vụng về của chính mình.')
    ]
  },
  {
    id: 'rainy-porch',
    title: 'Hiên nhà có tiếng mưa rơi',
    author: 'Hoài Thương',
    category: 'vanhocvn',
    format: 'Ebook',
    price: 65000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('lantern', ['Hiên nhà có', 'tiếng mưa rơi'], 'Hoài Thương', '#304842', '#F3ECE0', '#D9A66C', 'TRUYỆN NGẮN VIỆT NAM'),
    description: 'Những câu chuyện ngắn ấm như ngọn đèn vàng nơi hiên nhà mùa mưa, gợi thương nhớ quê hương và gia đình.',
    note: viNote,
    chapters: [
      ch('01 — Mái hiên lát gạch tàu',
        'Chiều phương Nam mưa đến nhanh như một lời hẹn cũ. Mới thoáng mây xám đầu rặng dừa, mưa đã trắng xóa khoảng sân gạch tàu đỏ au. Nội kéo chiếc ghế mây ra sát hiên, bên cạnh là rổ khoai lang luộc còn bốc khói.',
        'Hai bà cháu ngồi im nghe tiếng nước chảy từ máng xối xuống lu sành lanh canh đều đặn. Không cần tivi hay điện thoại, tiếng mưa chiều hôm ấy đã là bản nhạc êm đềm nhất suốt tuổi thơ tôi.'),
      ch('02 — Chuyến xe cuối tuần về quê',
        'Lớn lên đi làm xa, mỗi lần nghe tiếng mưa gõ lên cửa kính văn phòng tầng mười hai, lòng tôi lại chùng xuống nhớ mùi khói bếp quê nhà. Chiều thứ Sáu, tôi xếp gọn túi xách cùng một cuốn sách mới mua cho cha, bước lên chuyến xe khách cuối ngày.',
        'Đèn hiên nhà vẫn bật sáng đợi sẵn nơi đầu ngõ, ấm áp và kiên nhẫn hệt như tình thương chưa bao giờ đòi hỏi điều kiện của cha mẹ.'),
      ch('03 — Giữ ấm cho nhau qua mùa lạnh',
        'Thành phố rộng lớn đôi khi làm người ta quên mất mình luôn có một chốn để quay về. Một cuộc gọi mười phút hỏi thăm bữa tối, một cuốn sách gửi về biếu người thân cũng đủ nối gần lại biết bao khoảng cách địa lý.')
    ]
  },
  {
    id: 'northern-wind',
    title: 'Quán sách nhỏ ở Bắc Âu',
    author: 'Mai Linh',
    category: 'vanhocqt',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('stars', ['Quán sách nhỏ', 'ở Bắc Âu'], 'Mai Linh', '#1F303D', '#F2ECE1', '#DFAD6E', 'CHUYỆN KỂ PHƯƠNG XA'),
    description: 'Câu chuyện hư cấu ấm áp về một hiệu sách gỗ bên vịnh biển tuyết trắng, nơi mỗi vị khách tìm thấy một cuốn sách chữa lành.',
    note: viNote,
    chapters: [
      ch('01 — Ngọn đèn vàng bên bến cảng sương mù',
        'Ở thị trấn nhỏ nằm nép bên vịnh hẹp phương Bắc, mùa đông kéo dài tới mức mặt trời chỉ ghé qua vài tiếng ngắn ngủi mỗi trưa. Thế nhưng tiệm sách gỗ sơn màu xanh thông của bà Freja lúc nào cũng sáng ánh đèn vàng và thơm mùi quế nướng.',
        'Mỗi buổi chiều, chuông đồng trên cửa khẽ ngân vang đón những người hàng xóm rũ tuyết khỏi áo khoác, tìm một góc ghế bành bọc dạ bên lò sưởi để đọc nốt chương truyện hôm qua.'),
      ch('02 — Tủ sách kê đơn cho tâm hồn',
        'Bà Freja không xếp sách theo thứ tự bảng chữ cái thông thường. Trên những kệ gỗ sồi là các tấm thẻ viết tay nắn nót: "Dành cho ngày bạn nhớ một người ở xa", "Dành cho buổi tối chưa muốn ngủ", và "Dành cho lúc cần dũng khí bắt đầu lại".',
        'Bà tin rằng một cuốn sách đến đúng thời điểm có thể sưởi ấm lòng người chẳng kém gì ngọn lửa hồng trong đêm tuyết rơi.'),
      ch('03 — Câu lạc bộ đọc sách tối thứ Năm',
        'Tối thứ Năm hằng tuần, tám chiếc ghế quanh bàn gỗ dài chẳng bao giờ trống chỗ. Người đánh cá già, cô giáo tiểu học, chàng họa sĩ trẻ ngồi cạnh nhau, mỗi người đọc to một đoạn văn tâm đắc nhất trong tuần.',
        'Ngoài kia gió biển vẫn thổi qua mái nhà tuyết phủ, nhưng bên trong căn phòng nhỏ, con người xích lại gần nhau nhờ những câu chuyện vượt qua biên giới và mùa đông.')
    ]
  },
  {
    id: 'deep-reading',
    title: 'Nghệ thuật đọc sâu & ghi chép',
    author: 'Lowf Biên Tập',
    category: 'dacbiet',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('compass', ['Nghệ thuật đọc sâu', '& ghi chép'], 'Lowf Biên Tập', '#2A4738', '#F6F0E2', '#C99B63', 'CẨM NANG ĐỘC GIẢ LOWF'),
    description: 'Phương pháp đọc chủ động, đánh dấu tinh gọn và biến mỗi cuốn sách thành tri thức sống động áp dụng được ngay.',
    note: viNote,
    chapters: [
      ch('01 — Bốn tầng của việc đọc một cuốn sách',
        'Đọc lướt cho ta thông tin, nhưng đọc sâu mới tạo ra sự chuyển hóa. Khi mở một cuốn sách mới, hãy dành năm phút xem mục lục và lời mở đầu để nắm câu hỏi lớn mà tác giả muốn giải quyết.',
        'Trong lúc đọc, đừng cố nhớ hết mọi chữ. Hãy tìm những luận điểm cốt lõi, những ví dụ làm bạn dừng lại suy ngẫm và đặt câu hỏi ngược lại với tác giả.'),
      ch('02 — Highlight tinh gọn và ghi chú bằng lời của mình',
        'Nếu tô sáng cả một trang giấy thì chẳng khác nào chưa tô dòng nào. Hãy chỉ đánh dấu câu văn cô đọng nhất, rồi mở mục Ghi chú bên lề viết lại ý đó bằng chính giọng văn của bạn trong hai đến ba câu ngắn.',
        'Khoảnh khắc bạn tự diễn đạt lại ý tưởng trên trang sách chính là lúc kiến thức của tác giả chuyển thành hiểu biết thật sự của riêng bạn.'),
      ch('03 — Nghe sách kết hợp đọc mắt và sổ từ vựng',
        'Với sách ngoại văn hoặc những chương tản văn giàu nhạc điệu, bật giọng đọc truyền cảm vừa phải trong khi mắt dõi theo từng đoạn được tô sáng giúp não bộ ghi nhớ cấu trúc câu và ngữ điệu tự nhiên gấp nhiều lần.',
        'Mỗi buổi đọc chỉ cần lưu lại ba đến năm từ vựng đắt giá kèm phiên âm IPA, cuối tuần mở Sổ từ vựng ôn lại năm phút là vốn ngôn ngữ đã dày lên bền bỉ.')
    ]
  },
  {
    id: 'night-journal',
    title: 'Sổ tay đêm yên tĩnh',
    author: 'An Nhiên',
    category: 'dacbiet',
    format: 'Combo',
    price: 145000,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'vi',
    cover: coverSvg('stars', ['Sổ tay', 'đêm yên tĩnh'], 'An Nhiên', '#1B2C26', '#ECE6D8', '#A6BF9B', 'BỘ SƯU TẬP ĐỌC ĐÊM'),
    description: 'Những trang đọc chậm dành cho ba mươi phút trước giờ ngủ: thả lỏng suy nghĩ, biết ơn ngày đã qua và đón giấc ngủ lành.',
    note: viNote,
    chapters: [
      ch('01 — Khép lại ngày dài bằng sự dịu dàng',
        'Đêm xuống là lúc những suy nghĩ chưa giải quyết xong hay phóng đại lên trong bóng tối. Thay vì mang cả danh sách lo âu lên giường, hãy viết chúng ra giấy để tâm trí yên tâm rằng ngày mai đã có nơi giữ hộ.',
        'Bật một tiếng mưa rơi thật khẽ hoặc giọng đọc êm dịu, đọc vài trang văn chậm rãi để nhịp tim và hơi thở tự nhiên lắng dịu.'),
      ch('02 — Ba điều nhỏ đáng biết ơn hôm nay',
        'Không cần đợi một tin vui lớn mới thấy ngày hôm nay có ý nghĩa. Một bữa trưa ngon miệng, một lời hỏi thăm đúng lúc hay việc hoàn thành trọn vẹn một buổi chiều tập trung đều xứng đáng được ghi nhận.',
        'Khi kết thúc ngày bằng lòng biết ơn, giấc ngủ đến nhẹ nhàng hơn và buổi sáng hôm sau cũng bắt đầu bằng ánh nhìn thiện cảm với cuộc sống.'),
      ch('03 — Lời chúc bình an trước giấc ngủ',
        'Hôm nay bạn đã cố gắng hết phần của hôm nay rồi. Những gì chưa trọn vẹn, ngày mai nắng lên ta sẽ thong thả làm tiếp. Chúc bạn một đêm yên lành bên những giấc mơ hiền.')
    ]
  },
  {
    id: 'en-as-a-man-thinketh',
    title: 'As a Man Thinketh',
    author: 'James Allen',
    category: 'kinhte',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'en',
    sourceUrl: 'https://www.gutenberg.org/ebooks/4507',
    licenseLabel: pdLicense,
    cover: coverSvg('arch', ['As a Man', 'Thinketh'], 'James Allen', '#EDE6D6', '#25392F', '#9E7748', 'LOWF ENGLISH CLASSICS'),
    description: 'Tác phẩm kinh điển tiếng Anh (1903) ngắn gọn, súc tích về sức mạnh của tư duy, tính cách, mục đích sống và sự tĩnh tại nội tâm.',
    chapters: [
      ch('01 — Thought and Character',
        'The aphorism, "As a man thinketh in his heart so is he," not only embraces the whole of a man\'s being, but is so comprehensive as to reach out to every condition and circumstance of his life. A man is literally what he thinks, his character being the complete sum of all his thoughts.',
        'As the plant springs from, and could not be without, the seed, so every act of a man springs from the hidden seeds of thought, and could not have appeared without them. This applies equally to those acts called "spontaneous" and "unpremeditated" as to those which are deliberately executed.',
        'Act is the blossom of thought, and joy and suffering are its fruits; thus does a man garner in the sweet and bitter fruitage of his own husbandry. A noble and Godlike character is not a thing of favor or chance, but is the natural result of continued effort in right thinking.'),
      ch('02 — Effect of Thought on Circumstances',
        'A man\'s mind may be likened to a garden, which may be intelligently cultivated or allowed to run wild; but whether cultivated or neglected, it must, and will, bring forth. If no useful seeds are put into it, then an abundance of useless weed-seeds will fall therein, and will continue to produce their kind.',
        'Just as a gardener cultivates his plot, keeping it free from weeds, and growing the flowers and fruits which he requires, so may a man tend the garden of his mind, weeding out all the wrong, useless, and impure thoughts, and cultivating toward perfection the flowers and fruits of right, useful, and pure thoughts.',
        'Circumstance does not make the man; it reveals him to himself. Men do not attract that which they want, but that which they are.'),
      ch('03 — Thought and Purpose',
        'Until thought is linked with purpose there is no intelligent accomplishment. With the majority the bark of thought is allowed to drift upon the ocean of life. Aimlessness is a vice, and such drifting must not continue for him who would steer clear of catastrophe and destruction.',
        'They who have no central purpose in their life fall an easy prey to petty worries, fears, troubles, and self-pityings. Conceive a legitimate purpose in your heart, and set out to accomplish it, making it the centralizing point of your thoughts.',
        'Doubts and fears should be rigorously excluded; they are disintegrating elements which break up the straight line of effort, rendering it crooked, ineffectual, useless.'),
      ch('04 — Serenity',
        'Calmness of mind is one of the beautiful jewels of wisdom. It is the result of long and patient effort in self-control. Its presence is an indication of ripened experience, and of a more than ordinary knowledge of the laws and operations of thought.',
        'A man becomes calm in the measure that he understands himself as a thought-evolved being, for such knowledge necessitates the understanding of others as the result of thought, and as he develops a right understanding, he ceases to fret and fume and worry, and remains poised, steadfast, serene.',
        'The calm man, having learned how to govern himself, knows how to adapt himself to others; and they, in turn, reverence his spiritual strength, and feel that they can learn of him and rely upon him. The more tranquil a man becomes, the greater is his success, his influence, his power for good.')
    ]
  },
  {
    id: 'en-prophet-gibran',
    title: 'The Prophet',
    author: 'Kahlil Gibran',
    category: 'vanhocqt',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'en',
    sourceUrl: 'https://www.gutenberg.org/ebooks/58585',
    licenseLabel: pdLicense,
    cover: coverSvg('horizon', ['The', 'Prophet'], 'Kahlil Gibran', '#233845', '#F6EEE0', '#DBA468', 'LOWF ENGLISH CLASSICS'),
    description: 'Kiệt tác thơ văn xuôi năm 1923 của Kahlil Gibran về Tình yêu, Lao động, Niềm vui & Nỗi buồn, Thời gian và Sự tự tri — ngôn từ tuyệt đẹp để luyện đọc & nghe.',
    chapters: [
      ch('01 — The Coming of the Ship & On Love',
        'Almustafa, the chosen and the beloved, who was a dawn unto his own day, had waited twelve years in the city of Orphalese for his ship that was to return and bear him back to the isle of his birth.',
        'Then said Almitra, Speak to us of Love. And he raised his head and looked upon the people, and there fell a stillness upon them. And with a great voice he said: When love beckons to you, follow him, though his ways are hard and steep. And when his wings enfold you yield to him, though the sword hidden among his pinions may wound you.',
        'Love gives naught but itself and takes naught but from itself. Love possesses not nor would it be possessed; for love is sufficient unto love.'),
      ch('02 — On Work',
        'Then a ploughman said, Speak to us of Work. And he answered, saying: You work that you may keep pace with the earth and the soul of the earth. For to be idle is to become a stranger unto the seasons, and to step out of life\'s procession, that marches in majesty and proud submission towards the infinite.',
        'Always you have been told that work is a curse and labour a misfortune. But I say to you that when you work you fulfil a part of earth\'s furthest dream, assigned to you when that dream was born, and in keeping yourself with labour you are in truth loving life.',
        'Work is love made visible. And if you cannot work with love but only with distaste, it is better that you should leave your work and sit at the gate of the temple and take alms of those who work with joy.'),
      ch('03 — On Joy and Sorrow',
        'Then a woman said, Speak to us of Joy and Sorrow. And he answered: Your joy is your sorrow unmasked. And the selfsame well from which your laughter rises was oftentimes filled with your tears.',
        'The deeper that sorrow carves into your being, the more joy you can contain. Is not the cup that holds your wine the very cup that was burned in the potter\'s oven? And is not the lute that soothes your spirit, the very wood that was hollowed with knives?',
        'When you are joyous, look deep into your heart and you shall find it is only that which has given you sorrow that is giving you joy. Verily you are suspended like scales between your sorrow and your joy.'),
      ch('04 — On Reason, Passion & Self-Knowledge',
        'Your reason and your passion are the rudder and the sails of your seafaring soul. If either your sails or your rudder be broken, you can but toss and drift, or else be held at a standstill in mid-seas. For reason, ruling alone, is a force confining; and passion, unattended, is a flame that burns to its own destruction.',
        'And a man said, Speak to us of Self-Knowledge. And he answered, saying: Your hearts know in silence the secrets of the days and the nights. But your ears thirst for the sound of your heart\'s knowledge.',
        'Say not, "I have found the truth," but rather, "I have found a truth." Say not, "I have found the path of the soul." Say rather, "I have met the soul walking upon my path." For the soul walks upon all paths.')
    ]
  },
  {
    id: 'en-walden-solitude',
    title: 'Walden: Living Deliberately',
    author: 'Henry David Thoreau',
    category: 'vanhocqt',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'en',
    sourceUrl: 'https://www.gutenberg.org/ebooks/205',
    licenseLabel: pdLicense,
    cover: coverSvg('botanical', ['Walden:', 'Living Deliberately'], 'H. D. Thoreau', '#263F32', '#F1ECE0', '#8AB07D', 'LOWF ENGLISH CLASSICS'),
    description: 'Tuyển chọn những chương tinh túy nhất từ kiệt tác Walden (1854): sống có chủ đích bên hồ nước tĩnh lặng, nghệ thuật đọc sách và lắng nghe thiên nhiên.',
    chapters: [
      ch('01 — Where I Lived, and What I Lived For',
        'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.',
        'Our life is frittered away by detail. Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand; instead of a million count half a dozen, and keep your accounts on your thumb-nail.',
        'Every morning was a cheerful invitation to make my life of equal simplicity, and I may say innocence, with Nature herself. Morning is when I am awake and there is a dawn in me.'),
      ch('02 — Reading',
        'With a little more deliberation in the choice of their pursuits, all men would perhaps become essentially students and observers, for certainly their nature and destiny are interesting to all alike. In accumulating property for ourselves or our posterity, in founding a family or a state, we are mortal; but in dealing with truth we are immortal.',
        'Books are the treasured wealth of the world and the fit inheritance of generations and nations. Books, the oldest and the best, stand naturally and rightfully on the shelves of every cottage. They have no cause of their own to plead, but while they enlighten and sustain the reader his common sense will not refuse them.',
        'To read well, that is, to read true books in a true spirit, is a noble exercise, and one that will task the reader more than any exercise which the customs of the day esteem.'),
      ch('03 — Solitude & Conclusion',
        'This is a delicious evening, when the whole body is one sense, and imbibes delight through every pore. I go and come with a strange liberty in Nature, a part of herself. I have never felt lonesome, or in the least oppressed by a sense of solitude.',
        'I find it wholesome to be alone the greater part of the time. To be in company, even with the best, is soon wearisome and dissipating. I love to be alone. I never found the companion that was so companionable as solitude.',
        'I learned this, at least, by my experiment: that if one advances confidently in the direction of his dreams, and endeavors to live the life which he has imagined, he will meet with a success unexpected in common hours.')
    ]
  },
  {
    id: 'en-happy-prince',
    title: 'The Happy Prince and Other Tales',
    author: 'Oscar Wilde',
    category: 'vanhocqt',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'en',
    sourceUrl: 'https://www.gutenberg.org/ebooks/902',
    licenseLabel: pdLicense,
    cover: coverSvg('stars', ['The Happy', 'Prince'], 'Oscar Wilde', '#2E3452', '#F7EFE1', '#E2B66D', 'LOWF ENGLISH CLASSICS'),
    description: 'Tuyển tập truyện cổ tích giàu chất thơ của Oscar Wilde (1888): Hoàng tử Hạnh phúc và Khu vườn của Người khổng lồ ích kỷ — từ vựng trong sáng, giàu cảm xúc.',
    chapters: [
      ch('01 — The Happy Prince (Part I)',
        'High above the city, on a tall column, stood the statue of the Happy Prince. He was gilded all over with thin leaves of fine gold, for eyes he had two bright sapphires, and a large red ruby glowed on his sword-hilt.',
        'One night there flew over the city a little Swallow. His friends had gone away to Egypt six weeks before, but he had stayed behind. Seeing the statue on the tall column, he alighted just between the feet of the Happy Prince.',
        'Just as he was putting his head under his wing a large drop of water fell on him. He looked up, and saw that the eyes of the Happy Prince were filled with tears, and tears were running down his golden cheeks. His face was so beautiful in the moonlight that the little Swallow was filled with pity.'),
      ch('02 — The Happy Prince (Part II)',
        '"When I was alive and had a human heart," answered the statue, "I did not know what tears were, for I lived in the Palace of Sans-Souci, where sorrow is not allowed to enter. My courtiers called me the Happy Prince, and happy indeed I was, if pleasure be happiness. And now that I am dead they have set me up here so high that I can see all the ugliness and all the misery of my city, and though my heart is made of lead yet I cannot choose but weep."',
        'Night after night, the little Swallow carried the ruby from the Prince\'s sword, the sapphires from his eyes, and leaf after leaf of fine gold to the poor and the hungry, until the Happy Prince looked quite dull and grey, and the children\'s faces grew rosier in the streets.',
        '"Bring me the two most precious things in the city," said God to one of His Angels; and the Angel brought Him the leaden heart and the dead bird. "You have rightly chosen," said God, "for in my garden of Paradise this little bird shall sing for evermore, and in my city of gold the Happy Prince shall praise me."'),
      ch('03 — The Selfish Giant',
        'Every afternoon, as they were coming from school, the children used to go and play in the Giant\'s garden. It was a large lovely garden, with soft green grass and twelve peach-trees that in the spring-time broke out into delicate blossoms of pink and pearl.',
        'When the Giant built a high wall around the garden, the Spring forgot that place; only the Snow and the Frost lived there all the year round. Until one morning a linnet sang outside his window, and through a little hole in the wall the children had crept in, and the trees were glad to have the children back again.',
        'The Giant\'s heart melted as he looked out. "How selfish I have been!" he said; "now I know why the Spring would not come here." He took a great axe and knocked down the wall, and the garden became the children\'s playground for ever.')
    ]
  },
  {
    id: 'en-meditations-calm',
    title: 'Meditations: Inner Citadel',
    author: 'Marcus Aurelius',
    category: 'dacbiet',
    format: 'Ebook Free',
    price: 0,
    saleEnabled: false,
    access: 'free',
    status: 'published',
    language: 'en',
    sourceUrl: 'https://www.gutenberg.org/ebooks/2680',
    licenseLabel: pdLicense,
    cover: coverSvg('compass', ['Meditations:', 'Inner Citadel'], 'Marcus Aurelius', '#2D2B28', '#F2E9DA', '#C89E67', 'LOWF STOIC CLASSICS'),
    description: 'Những trang suy tưởng kinh điển của Marcus Aurelius (bản dịch tiếng Anh Public Domain của George Long) về sự tự chủ, tập trung vào hiện tại và bình an nội tại.',
    chapters: [
      ch('01 — Morning Resolve & Quiet Mind',
        'Men seek retreats for themselves, houses in the country, sea-shores, and mountains; and thou too art wont to desire such things very much. But it is in thy power whenever thou shalt choose to retire into thyself.',
        'For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul, particularly when he has within him such thoughts that by looking into them he is immediately in perfect tranquility; and I affirm that tranquility is nothing else than the good ordering of the mind.',
        'Constantly then give to thyself this retreat, and renew thyself; and let thy principles be brief and fundamental, which, as soon as thou shalt recur to them, will be sufficient to wash away all trouble.'),
      ch('02 — Focus on the Present Hour',
        'Do not disturb thyself by thinking of the whole of thy life. Let not thy thoughts at once embrace all the various troubles which thou mayest expect to befall thee; but on every occasion ask thyself, What is there in this which is intolerable and past bearing?',
        'Every hour firm thy mind, like a Roman and a human being, to do what is before thee with precise and genuine seriousness, tenderly, freely, with justice; and to give thyself relief from all other distracting imaginations.',
        'Thou wilt give thyself this relief if thou doest every act of thy life as if it were the last, laying aside all carelessness and passionate aversion from the commands of reason.'),
      ch('03 — Equanimity & Kindness',
        'Look within. Within is the fountain of good, and it will ever bubble up, if thou wilt ever dig. The happiness of your life depends upon the quality of your thoughts: therefore, guard accordingly, and take care that you entertain no notions unsuitable to virtue and reasonable nature.',
        'Adapt thyself to the things with which thy lot has been cast: and the men among whom thou hast received thy portion, love them, but do it truly. Waste no more time arguing about what a good person should be. Be one.')
    ]
  }
];

import type { getSQL } from './db';

let seededPromise: Promise<void> | null = null;

type SQLRunner = ReturnType<typeof getSQL>;

/**
 * Ensures the curated catalog exists in `lowf_content` on live Vercel environments
 * without overwriting owner modifications or re-publishing archived items.
 * Skipped during isolated unit tests where `process.env.VERCEL !== '1'`.
 */
export async function ensureCuratedCatalog(sql: SQLRunner): Promise<void> {
  if (process.env.VERCEL !== '1') return;
  if (!seededPromise) {
    seededPromise = (async () => {
      try {
        const records = CURATED_BOOKS.map(book => ({
          kind: 'books',
          id: book.id,
          data: book,
          status: book.status,
        }));
        await sql`INSERT INTO lowf_content(kind,id,data,status)
          SELECT r.kind,r.id,r.data,r.status
          FROM jsonb_to_recordset(${JSON.stringify(records)}::jsonb) AS r(kind text,id text,data jsonb,status text)
          ON CONFLICT(kind,id) DO NOTHING`;
        await sql`UPDATE lowf_content
          SET data=jsonb_set(data,'{category}','"vanhocvn"')
          WHERE kind='books' AND id IN ('peace','clear','atlas')
            AND data->>'category'='vanhocqt'
            AND data->>'author' IN ('Minh Lam','Thu An','Khánh Du')`;
      } catch {
        seededPromise = null;
      }
    })();
  }
  await seededPromise;
}
