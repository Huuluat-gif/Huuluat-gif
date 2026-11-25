/* Curated editorial essays & in-depth book reviews for Lowf Magazine (Góc bài viết).
   Always available alongside optional WordPress feed entries so the editorial hub
   feels alive, insightful, and directly connected to books in the Lowf library. */

export type CuratedArticle = {
  id: string;
  slug: string;
  category: 'Điểm sách' | 'Phương pháp đọc' | 'Góc tư duy' | 'Sống chậm';
  title: string;
  excerpt: string;
  author: string;
  readMinutes: number;
  date: string;
  image: string;
  linkedBookId: string;
  linkedBookTitle: string;
  quote: string;
  paragraphs: string[];
};

const escSvg = (v: string) =>
  String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] || c));

function editorialBanner(kicker: string, bg1: string, bg2: string, accent: string, fg: string, shape: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bg1}"/><stop offset="100%" stop-color="${bg2}"/></linearGradient></defs><rect width="800" height="420" fill="url(#g)"/><rect x="36" y="28" width="728" height="364" rx="14" fill="none" stroke="${fg}" stroke-opacity=".14"/><g transform="translate(-70,0)">${shape}</g><text x="400" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="3.2" fill="${accent}">${escSvg(kicker)}</text><text x="400" y="362" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="15" fill="${fg}" opacity=".72">Lowf Editorial · Điểm sách &amp; Suy ngẫm</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

export const CURATED_ARTICLES: CuratedArticle[] = [
  {
    id: 'art-slow-reading',
    slug: 'nghe-thuat-doc-cham-giua-thoi-dai-luot-nhanh',
    category: 'Điểm sách',
    title: 'Nghệ thuật đọc chậm giữa thời đại lướt nhanh: Khi một trang sách đủ làm dịu cả buổi tối',
    excerpt: 'Vì sao mỗi ngày chỉ cần 15 phút đọc sâu không thông báo lại mang đến cảm giác bình an và sáng suốt hơn hàng giờ lướt tin ngắn?',
    author: 'Ban Biên Tập Lowf',
    readMinutes: 5,
    date: '2026-11-24T09:00:00+07:00',
    image: editorialBanner(
      'ĐIỂM SÁCH · SỐNG CHẬM',
      '#e9eee2',
      '#dce6d2',
      '#2e6648',
      '#1e2d24',
      '<circle cx="620" cy="210" r="130" fill="#2e6648" opacity=".1"/><circle cx="620" cy="210" r="88" fill="#c97f50" opacity=".24"/><rect x="565" y="135" width="110" height="150" rx="8" fill="#fdfcf9" stroke="#2e6648" stroke-opacity=".28" stroke-width="2"/><line x1="590" y1="175" x2="650" y2="175" stroke="#2e6648" stroke-opacity=".45" stroke-width="3"/><line x1="590" y1="198" x2="642" y2="198" stroke="#2e6648" stroke-opacity=".3" stroke-width="3"/><line x1="590" y1="221" x2="634" y2="221" stroke="#2e6648" stroke-opacity=".3" stroke-width="3"/>'
    ),
    linkedBookId: 'slow',
    linkedBookTitle: 'Nghệ thuật sống chậm',
    quote: 'Một cuốn sách không đòi bạn phải đọc hết trong một đêm; nó chỉ mời bạn thật sự có mặt trong trang mình đang mở.',
    paragraphs: [
      'Phần lớn sự mệt mỏi vào cuối ngày không đến từ việc ta làm quá nhiều việc lớn, mà đến từ hàng trăm mảnh thông tin ngắn vụn vặt tranh nhau chiếm sự chú ý. Mỗi lần chuyển qua lại giữa tin nhắn, video ngắn và thông báo công việc, trí óc phải khởi động lại liên tục mà chẳng bao giờ được lắng xuống.',
      'Đọc chậm là một cách trả lại nhịp thở tự nhiên cho tâm trí. Khi mở một cuốn tản văn như "Nghệ thuật sống chậm", điều quý giá nhất không phải là bạn đọc được bao nhiêu trang trong một giờ, mà là khoảnh khắc bạn dừng lại bên một câu văn hiền lành và thấy lòng mình dịu hẳn xuống.',
      'Bạn có thể thử một nghi thức nhỏ ngay tối nay: bấm biểu tượng Con mắt trong trình đọc Lowf để ẩn toàn bộ thanh công cụ, chọn nền giấy ấm và chỉ giữ lại một đoạn tiếng mưa thật khẽ. Mười lăm phút yên tĩnh như thế thường đủ để cả buổi tối trở nên nhẹ nhàng và rõ ràng hơn.'
    ]
  },
  {
    id: 'art-english-ipa',
    slug: '5-buoc-doc-sach-tieng-anh-khong-nan-voi-ipa',
    category: 'Phương pháp đọc',
    title: '5 bước đọc sách tiếng Anh nguyên tác không nản nhờ tra IPA một chạm & nghe giọng kể chuyện',
    excerpt: 'Đừng tra mọi từ mới ngay từ trang đầu. Đây là cách kết hợp đọc hiểu ngữ cảnh, phiên âm IPA và sổ từ vựng cá nhân để đọc trọn tác phẩm kinh điển.',
    author: 'Minh Khôi',
    readMinutes: 6,
    date: '2026-11-22T15:30:00+07:00',
    image: editorialBanner(
      'PHƯƠNG PHÁP ĐỌC · TIẾNG ANH',
      '#1e352b',
      '#14251e',
      '#e4c287',
      '#f4f0e4',
      '<circle cx="630" cy="210" r="120" fill="#e4c287" opacity=".12"/><text x="535" y="232" font-family="Georgia,serif" font-size="76" fill="#e4c287" opacity=".82">/ˈriːd/</text>'
    ),
    linkedBookId: 'en-prophet-gibran',
    linkedBookTitle: 'The Prophet — Kahlil Gibran',
    quote: 'Ngôn ngữ chỉ thật sự sống khi bạn vừa thấy câu chữ trên trang, vừa nghe được nhịp điệu của nó vang lên bên tai.',
    paragraphs: [
      'Nhiều bạn đọc bỏ cuộc ở chương hai khi bắt đầu đọc sách tiếng Anh vì thói quen tra từ điển từng chữ một. Cách đó cắt đứt mạch cảm xúc của câu chuyện và biến giờ đọc thư giãn thành giờ làm bài tập ngữ pháp nặng nề.',
      'Cách hiệu quả hơn rất nhiều là áp dụng quy tắc "3 từ mỗi trang": hãy đọc trọn một đoạn để đoán ý qua ngữ cảnh trước, chỉ bôi chọn những từ khóa lặp lại hoặc làm bạn thật sự tò mò. Trên Lowf, thao tác bôi đen → Dịch & IPA sẽ hiện ngay nghĩa tiếng Việt kèm phiên âm chuẩn Mỹ và nút phát âm.',
      'Sau đó, hãy mở tab Nghe đọc, chọn giọng Hoàng Quân hoặc Thanh Trúc ở tốc độ 0.9× và theo dõi từng đoạn được tô sáng tự động. Chỉ cần lưu 3 đến 5 từ hay nhất mỗi ngày vào Sổ từ vựng, sau một tháng vốn tiếng Anh học thuật và văn chương của bạn sẽ tiến bộ rõ rệt.'
    ]
  },
  {
    id: 'art-marginalia-notes',
    slug: 'cach-ghi-chu-ben-le-de-nho-lau-gap-3-lan',
    category: 'Phương pháp đọc',
    title: 'Ghi chú bên lề thông minh: Vì sao tự viết lại 2 câu bằng lời mình giúp nhớ lâu gấp 3 lần?',
    excerpt: 'Tô sáng cả trang sách rất dễ nhưng cũng rất nhanh quên. Học cách phân màu highlight có chủ đích và biến ghi chú thành kho tri thức cá nhân.',
    author: 'Thu An',
    readMinutes: 4,
    date: '2026-11-20T10:15:00+07:00',
    image: editorialBanner(
      'GHI CHÚ & TRI THỨC',
      '#f4ece0',
      '#eadcc8',
      '#a86239',
      '#2d2219',
      '<rect x="540" y="120" width="160" height="185" rx="12" fill="#fdfcf9" stroke="#a86239" stroke-opacity=".28" stroke-width="2"/><rect x="564" y="160" width="112" height="14" rx="4" fill="#edcc73" opacity=".75"/><rect x="564" y="192" width="94" height="14" rx="4" fill="#97c499" opacity=".68"/><rect x="564" y="224" width="104" height="14" rx="4" fill="#99bce9" opacity=".65"/>'
    ),
    linkedBookId: 'deep-reading',
    linkedBookTitle: 'Nghệ thuật đọc sâu & ghi chép',
    quote: 'Highlight giúp bạn đánh dấu nơi kho báu nằm; còn dòng ghi chú ngắn bằng lời của bạn mới là chiếc chìa khóa mở nó ra.',
    paragraphs: [
      'Khi đọc một cuốn sách hay, cảm giác muốn tô sáng thật nhiều dòng là hoàn toàn tự nhiên. Nhưng nếu một tháng sau bạn mở lại cuốn sách và thấy nửa trang giấy đều rực màu vàng, bộ não sẽ không biết đâu mới là ý cốt lõi cần nhớ.',
      'Hãy thử gán ý nghĩa cố định cho 4 màu highlight trong trình đọc Lowf: Màu Vàng cho luận điểm chính, Màu Xanh lá cho bài học áp dụng ngay được vào công việc, Màu Hồng cho câu văn đẹp muốn trích dẫn, và Màu Xanh dương cho câu hỏi cần suy ngẫm thêm.',
      'Quan trọng nhất: với mỗi đoạn tô sáng, hãy dành 20 giây viết lại đúng 1–2 câu bằng chính ngôn ngữ đời thường của bạn. Khi cần đọc tập trung không bị phân tâm bởi các vệt màu cũ, chỉ cần bấm nút Con mắt trên thanh đầu trang để tạm ẩn hết ghi chú.'
    ]
  },
  {
    id: 'art-calm-money',
    slug: 'diem-tinh-truoc-tien-bac-tuoi-20-30',
    category: 'Điểm sách',
    title: 'Điềm tĩnh trước tiền bạc: Tài chính cá nhân bắt đầu từ sự bình an, không phải từ bảng tính phức tạp',
    excerpt: 'Điểm lại những ý tưởng sáng giá về quỹ an tâm, khoảng dừng 24 giờ trước khi mua sắm và cách dùng tiền để mua lại thời gian sống.',
    author: 'Trần Bảo Nam',
    readMinutes: 5,
    date: '2026-11-18T19:45:00+07:00',
    image: editorialBanner(
      'ĐIỂM SÁCH · KINH TẾ',
      '#213830',
      '#172822',
      '#dfa467',
      '#f4efe4',
      '<rect x="540" y="245" width="34" height="65" rx="6" fill="#86b38f" opacity=".5"/><rect x="590" y="205" width="34" height="105" rx="6" fill="#86b38f" opacity=".75"/><rect x="640" y="155" width="34" height="155" rx="6" fill="#dfa467"/><path d="M542 224 L658 134" stroke="#f4efe4" stroke-width="3" stroke-linecap="round" opacity=".7"/>'
    ),
    linkedBookId: 'calm-wealth',
    linkedBookTitle: 'Điềm tĩnh trước tiền bạc',
    quote: 'Sự vững vàng tài chính không nằm ở những thứ người khác thấy bạn đã mua, mà ở khoản dự trữ giúp bạn ngủ ngon mỗi tối.',
    paragraphs: [
      'Rất nhiều người trẻ trì hoãn việc tìm hiểu tài chính cá nhân vì nghĩ rằng phải giỏi toán, rành chứng khoán hoặc theo dõi bảng tính chi li từng nghìn đồng. Thực tế, 80% kết quả tài chính bền vững lại đến từ tâm lý và vài nguyên tắc sống giản dị.',
      'Cuốn "Điềm tĩnh trước tiền bạc" gợi mở ba cột mốc dễ làm ngay: xây dựng Quỹ an tâm đủ 3–6 tháng sinh hoạt phí, đặt nguyên tắc chờ 24 giờ trước mọi món đồ mua theo cảm xúc, và định nghĩa rõ điều gì thật sự đem lại hạnh phúc dài lâu cho riêng bạn.',
      'Khi không còn bị cuốn vào cuộc đua so sánh bề ngoài, tiền bạc trở về đúng vai trò đẹp nhất của nó: công cụ bảo vệ sức khỏe, gia đình và những khung giờ bình yên dành cho tri thức.'
    ]
  },
  {
    id: 'art-stoic-morning',
    slug: 'doc-marcus-aurelius-moi-sang-giu-tam-vung-vang',
    category: 'Góc tư duy',
    title: 'Đọc Marcus Aurelius 5 phút mỗi sáng: Nghệ thuật giữ tâm vững vàng trước áp lực công việc',
    excerpt: 'Tại sao những dòng nhật ký viết gần hai nghìn năm trước trong cuốn Meditations vẫn là liều thuốc tinh thần hiện đại đến kỳ lạ?',
    author: 'Lê Hoàng Anh',
    readMinutes: 5,
    date: '2026-11-16T08:00:00+07:00',
    image: editorialBanner(
      'GÓC TƯ DUY · KINH ĐIỂN',
      '#2d2a26',
      '#1e1c19',
      '#d5ae78',
      '#f4ecdf',
      '<circle cx="620" cy="210" r="102" fill="none" stroke="#d5ae78" stroke-width="2" opacity=".45"/><circle cx="620" cy="210" r="68" fill="none" stroke="#d5ae78" stroke-width="1.5" opacity=".75"/><path d="M620 128 L636 194 L702 210 L636 226 L620 292 L604 226 L538 210 L604 194 Z" fill="#d5ae78" opacity=".85"/>'
    ),
    linkedBookId: 'en-meditations-calm',
    linkedBookTitle: 'Meditations: Inner Citadel',
    quote: 'Bạn luôn có quyền lui vào khu vườn tĩnh lặng bên trong tâm trí mình bất cứ lúc nào — không cần đi đâu xa.',
    paragraphs: [
      'Điều thú vị của "Meditations" là tác giả của nó — vị hoàng đế La Mã Marcus Aurelius — chưa từng viết cuốn sách này để xuất bản. Đó chỉ là những lời tự nhắc mình vào mỗi buổi sáng và đêm muộn, giữa biết bao biến cố và áp lực điều hành đế chế.',
      'Bởi vậy, từng đoạn viết rất ngắn, thẳng thắn và giàu sức nâng đỡ: tập trung vào đúng giờ hiện tại, phân biệt rạch ròi giữa điều nằm trong tầm kiểm soát của mình (thái độ, sự tử tế, nỗ lực) và điều nằm ngoài tầm kiểm soát (thời tiết, lời phán xét của người khác).',
      'Bạn có thể mở bản tiếng Anh rút gọn "Meditations: Inner Citadel" ngay trong thư viện Lowf, chọn giọng Minh Khôi hoặc Hoàng Quân để nghe 3 phút mỗi sáng trước khi mở hộp thư công việc.'
    ]
  },
  {
    id: 'art-night-ritual',
    slug: 'tieng-mua-piano-va-20-trang-sach-truoc-gio-ngu',
    category: 'Sống chậm',
    title: 'Tiếng mưa, một bản piano dịu và 15 phút đọc đêm: Nghi thức giúp tâm trí hạ cánh êm ái',
    excerpt: 'Thay ánh sáng xanh dồn dập bằng nền giấy ấm, âm thanh ambient nhẹ nhàng và giọng đọc An Nhiên êm dịu trước khi đi ngủ.',
    author: 'An Nhiên',
    readMinutes: 4,
    date: '2026-11-14T21:15:00+07:00',
    image: editorialBanner(
      'SỐNG CHẬM · ĐỌC ĐÊM',
      '#182620',
      '#101a16',
      '#9bc4a4',
      '#e9efe5',
      '<circle cx="624" cy="205" r="84" fill="#9bc4a4" opacity=".14"/><path d="M642 142a62 62 0 1 0 34 100 50 50 0 1 1-34-100z" fill="#e5c88e"/><circle cx="570" cy="156" r="4" fill="#e5c88e"/><circle cx="688" cy="168" r="3" fill="#9bc4a4"/>'
    ),
    linkedBookId: 'night-journal',
    linkedBookTitle: 'Sổ tay đêm yên tĩnh',
    quote: 'Hôm nay bạn đã cố gắng hết phần của hôm nay rồi. Để những lo âu ở ngoài cửa và khép lại ngày dài thật dịu dàng.',
    paragraphs: [
      'Nhiều người gặp khó ngủ không phải vì cơ thể chưa mệt, mà vì bộ não chưa nhận được tín hiệu rằng ngày làm việc đã thật sự kết thúc. Việc lướt mạng xã hội trên giường chỉ tiếp thêm những luồng cảm xúc kích thích khiến giấc ngủ càng đến muộn.',
      'Hãy thử chuyển sang Chế độ Tối rừng thông trên Lowf, bật chế độ "Mưa bên hiên" ở mức âm lượng nhỏ và mở "Sổ tay đêm yên tĩnh". Nếu mắt đã mỏi, bạn chỉ cần chọn giọng đọc "An Nhiên · Đọc đêm" để hệ thống tự hạ nhỏ tiếng mưa xuống 18% và đọc chậm rãi ru tâm trí lắng dịu.',
      'Một thói quen nhỏ lặp lại đều đặn vài tối liên tiếp sẽ trở thành tín hiệu quen thuộc giúp bạn bước vào giấc ngủ sâu và thức dậy nhẹ nhõm hơn vào sáng hôm sau.'
    ]
  }
];
