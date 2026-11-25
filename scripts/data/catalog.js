/* Original demonstration catalog and cover artwork. No commercial book text is reproduced. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
  const artwork = {
    slow: `<circle cx="150" cy="223" r="67" fill="#EAA06F"/><path d="M56 333V251a94 94 0 0 1 188 0v82" fill="#31594B"/><path d="M82 333V255a68 68 0 0 1 136 0v78" fill="#F8EBDC"/><path d="M109 333V258a41 41 0 0 1 82 0v75" fill="#DABC96"/><path d="M136 333v-72a14 14 0 0 1 28 0v72" fill="#294C42"/><path d="M28 333h244" stroke="#294C42" stroke-width="2"/>`,
    peace: `<circle cx="204" cy="186" r="35" fill="#F1D7AB"/><path d="M0 285Q75 208 149 267T300 254V420H0Z" fill="#406772"/><path d="M0 320Q70 253 158 295T300 287V420H0Z" fill="#608590"/><path d="M0 364Q90 296 180 339T300 327V420H0Z" fill="#A6BFC1"/><path d="M138 280c6 21 1 40-18 56m18-56c-14 12-25 18-40 16m40-16c14 8 25 14 41 8" fill="none" stroke="#EEE8D8" stroke-width="2"/>`,
    life: `<rect x="46" y="190" width="208" height="153" rx="104" fill="#DCA65A"/><path d="M71 246q42-15 79 8v87q-37-24-79-10zm158 0q-42-15-79 8v87q37-24 79-10z" fill="#F4E5CF" stroke="#714532" stroke-width="2"/><path d="M86 265q28-7 49 5m-49 12q28-7 49 5m-49 12q28-7 49 5m30-34q21-12 49-5m-49 22q21-12 49-5m-49 22q21-12 49-5" fill="none" stroke="#BCA686" stroke-width="2"/><path d="M151 207c-5-27 11-42 30-43-1 24-12 36-30 43z" fill="#4C6652"/>`,
    garden: `<path d="M31 370q63-77 103-188m166 94q-78 5-154 77M99 420q28-89 90-165" fill="none" stroke="#BBD0A0" stroke-width="3"/><g fill="#8BAA76"><ellipse cx="74" cy="304" rx="14" ry="32" transform="rotate(-47 74 304)"/><ellipse cx="119" cy="245" rx="13" ry="29" transform="rotate(31 119 245)"/><ellipse cx="170" cy="314" rx="16" ry="31" transform="rotate(55 170 314)"/><ellipse cx="218" cy="295" rx="13" ry="30" transform="rotate(-35 218 295)"/></g><g fill="#F0C7AF"><circle cx="128" cy="180" r="20"/><circle cx="147" cy="194" r="20"/><circle cx="140" cy="216" r="20"/><circle cx="116" cy="216" r="20"/><circle cx="107" cy="194" r="20"/></g><circle cx="128" cy="199" r="13" fill="#E2AE5C"/><g fill="#DB9F77"><circle cx="239" cy="254" r="15"/><circle cx="254" cy="266" r="15"/><circle cx="249" cy="284" r="15"/><circle cx="229" cy="284" r="15"/><circle cx="224" cy="266" r="15"/></g><circle cx="239" cy="270" r="9" fill="#EEDDB8"/>`,
    money: `<path d="M38 340h224" stroke="#345448" stroke-width="2"/><rect x="55" y="290" width="45" height="50" rx="3" fill="#C6CC9A"/><rect x="128" y="252" width="45" height="88" rx="3" fill="#77966D"/><rect x="201" y="205" width="45" height="135" rx="3" fill="#335B48"/><path d="M74 268l74-43 74-51m-29 5 31-8-3 30" fill="none" stroke="#C28149" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="77" cy="235" r="24" fill="#E6C78F"/><text x="77" y="242" text-anchor="middle" font-size="25" font-family="Georgia,serif" fill="#7C5D37">₫</text>`,
    clear: `<path d="M0 222Q70 195 150 228T300 222v198H0Z" fill="#E8CCAB"/><circle cx="216" cy="178" r="31" fill="#EDB366"/><path d="M57 347q20-50 5-110m0 0 42-39m-42 39-25-34" fill="none" stroke="#586450" stroke-width="3"/><ellipse cx="81" cy="220" rx="15" ry="28" transform="rotate(43 81 220)" fill="#8D9A6D"/><ellipse cx="45" cy="218" rx="12" ry="24" transform="rotate(-34 45 218)" fill="#657958"/><path d="M150 295h93l-12 53h-69z" fill="#B97957"/><path d="M164 295v-15a32 32 0 0 1 64 0v15" fill="none" stroke="#B97957" stroke-width="6"/><path d="M183 256q-12-23 4-45m13 43q-9-19 2-34" fill="none" stroke="#FBF2E5" stroke-width="3" stroke-linecap="round"/>`,
    atlas: `<circle cx="150" cy="255" r="93" fill="none" stroke="#D3BB83" stroke-width="1"/><circle cx="150" cy="255" r="70" fill="none" stroke="#D3BB83" stroke-width="1"/><path d="M150 145v220M40 255h220M72 177l156 156M72 333l156-156" stroke="#D3BB83" stroke-width="1"/><path d="m150 170 19 66 66 19-66 19-19 66-19-66-66-19 66-19z" fill="#D3BB83"/><path d="m150 170 0 85-19-19zM150 255l85 0-66 19zM150 255v85l-19-66zM150 255H65l66-19z" fill="#8A9E88"/><circle cx="150" cy="255" r="8" fill="#233E3D"/>`,
    combo: `<rect x="55" y="205" width="127" height="151" rx="5" transform="rotate(-12 55 205)" fill="#E7C68E"/><path d="M59 208v141" stroke="#B89863" stroke-width="3" transform="rotate(-12 55 205)"/><rect x="134" y="180" width="111" height="164" rx="6" transform="rotate(10 134 180)" fill="#315A4A"/><rect x="146" y="193" width="87" height="128" rx="2" transform="rotate(10 134 180)" fill="#FCF4E4"/><path d="m160 226 46 8m-51 19 46 8m-51 19 46 8" stroke="#B4BCA1" stroke-width="4"/><circle cx="215" cy="328" r="30" fill="#D87853"/><path d="M201 329l10 10 19-24" fill="none" stroke="#FFF8E9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
  };
  function cover(id, lines, author, bg, fg, imprint='LOWF ORIGINALS') {
    const titles = lines.map((line,i)=>`<text x="150" y="${85+i*34}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="600" font-size="${line.length>17?25:30}" fill="${fg}">${escape(line)}</text>`).join('');
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="${bg}"/><path d="M6 0v420" stroke="${fg}" stroke-opacity=".14" stroke-width="4"/><text x="150" y="32" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" letter-spacing="3" fill="${fg}" opacity=".7">${imprint}</text>${titles}<text x="150" y="${83+lines.length*34}" text-anchor="middle" font-size="10" font-family="Arial,sans-serif" letter-spacing="2" fill="${fg}" opacity=".8">${escape(author.toUpperCase())}</text>${artwork[id]}<text x="150" y="394" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" fill="${id === 'peace' ? '#284D60' : fg}" opacity=".8">MỘT CUỐN SÁCH • MỘT THẾ GIỚI</text></svg>`);
  }
  const chapter = (title, ...paragraphs) => ({title, paragraphs});
  const note = 'Sách, tác giả, giá và nội dung trong bản này là dữ liệu minh họa do Lowf tạo riêng cho bản demo.';
  window.BOOKS = [
    {id:'slow', title:'Nghệ thuật sống chậm', author:'An Nhiên', category:'vanhocvn', format:'Ebook Free', price:0, oldPrice:69000, rating:4.9, readers:1248, tag:'Được yêu thích', cover:cover('slow',['Nghệ thuật','sống chậm'],'An Nhiên','#F3E8D7','#2C493D'), description:'Một khoảng dừng dịu dàng giữa nhịp sống vội. Tìm lại niềm vui từ những điều nhỏ bé mỗi ngày.',note, chapters:[
      chapter('01 — Một buổi sáng không vội',
        'Sáng hôm ấy, tôi thức dậy trước chuông báo thức. Trong khoảng yên tĩnh hiếm hoi, tiếng nước sôi trong bếp nghe rõ như một lời chào. Tôi quyết định chưa mở điện thoại.',
        'Chiếc cốc cũ vẫn nằm ở góc bàn, bên cạnh chậu cây đã mọc thêm một chiếc lá. Mọi thứ dường như chẳng thay đổi, chỉ có tôi bắt đầu nhìn kỹ hơn. Hóa ra một ngày có thể bắt đầu bằng sự chú ý.',
        'Sống chậm không có nghĩa là bỏ lại những điều cần làm. Đôi khi, đó chỉ là cho mình đủ thời gian để nhận ra mình đang ở đâu, đang cảm thấy gì, và thật sự muốn mang theo điều gì vào ngày mới.'),
      chapter('02 — Khoảng trống trên chiếc bàn',
        'Tôi dọn chiếc bàn vào một chiều cuối tuần. Vé xe cũ, những mẩu giấy ghi chú, một cuốn sổ chưa viết hết: vật nào cũng có một lý do để ở lại. Nhưng không phải lý do nào cũng còn thuộc về hiện tại.',
        'Khi mặt bàn trống dần, căn phòng cũng như rộng hơn. Tôi đặt lại cuốn sách đang đọc và một bình hoa nhỏ. Khoảng trống không lấy đi sự sống của căn phòng; nó cho những thứ còn lại cơ hội được nhìn thấy.',
        'Có lẽ lịch hẹn của chúng ta cũng cần một lần dọn như vậy. Một buổi tối không có kế hoạch đôi khi là lời mời để nấu ăn, đi bộ hoặc ngồi xuống cùng người mình thương.'),
      chapter('03 — Đi bằng nhịp của mình',
        'Trên đường ra chợ, tôi gặp một người hàng xóm đang tưới cây. Bác hỏi về mùa mưa, rồi kể chuyện giàn hoa vừa ra nụ. Cuộc trò chuyện không dẫn đến một kết quả nào, nhưng khiến con đường trở nên thân thuộc.',
        'Chúng ta thường đo một ngày bằng số việc hoàn thành. Thử thêm một thước đo khác: hôm nay mình đã có mặt trọn vẹn trong bao nhiêu khoảnh khắc? Câu trả lời không cần dài, cũng không cần giống bất kỳ ai.',
        'Ngày mai có thể vẫn bận. Tôi sẽ vẫn trả lời thư và đi qua những ngã tư đông người. Nhưng trong túi áo, tôi muốn giữ một khoảng lặng nhỏ, để khi cần, có thể trở về với nhịp thở của chính mình.') ]},
    {id:'peace', title:'Đi tìm bình yên', author:'Minh Lam', category:'vanhocvn', format:'Sách giấy', price:89000, oldPrice:119000, rating:4.8, readers:986, tag:'Bán chạy', cover:cover('peace',['Đi tìm','bình yên'],'Minh Lam','#284D60','#F2E9D9'), description:'Những câu chuyện bên bờ biển, dành cho người đang học cách lắng nghe bản thân.',note, chapters:[
      chapter('01 — Thành phố sau cơn mưa',
        'Cơn mưa vừa ngừng khi Linh rời cửa hiệu. Mặt đường giữ lại ánh đèn thành những vệt dài, còn mùi đất ẩm len qua khe cửa. Lần đầu trong nhiều tuần, cô không vội gọi xe.',
        'Cô đi dọc con phố quen, nhận ra tiệm bánh đã thay rèm cửa và gốc bằng lăng đang rụng lá. Thành phố vẫn ồn, nhưng giữa những âm thanh ấy có một khoảng yên vừa đủ cho một người đi bộ.',
        'Bình yên không xuất hiện như một lời giải. Nó giống một chỗ ngồi bên hiên, nơi ta được phép đặt xuống chiếc túi nặng mà chưa cần biết ngày mai sẽ mang gì.'),
      chapter('02 — Bức thư chưa gửi',
        'Trong ngăn kéo, Linh tìm thấy một bức thư viết từ năm trước. Có những dòng cô đã gạch đi nhiều lần. Cô từng nghĩ chỉ cần tìm đúng từ, mọi điều khó nói sẽ trở nên dễ dàng.',
        'Hôm nay đọc lại, cô thấy mình của ngày ấy đã cố gắng thật nhiều. Cô không sửa thêm. Thay vào đó, cô viết xuống một dòng mới: cảm ơn vì đã đi tới đây, dù có lúc không biết đường.',
        'Có những cuộc đối thoại cần một người khác. Cũng có những cuộc đối thoại chỉ cần ta ngồi yên, bớt nghiêm khắc với bản thân, và để điều chưa hoàn hảo được tồn tại.'),
      chapter('03 — Ngôi nhà bên trong',
        'Cuối chuyến đi, Linh mang về một viên đá nhỏ từ bờ biển. Nó không đặc biệt, ngoài việc vừa vặn trong lòng bàn tay. Cô đặt nó cạnh cửa sổ, nơi nắng ghé qua mỗi sáng.',
        'Khi một ngày trở nên quá dài, cô chạm vào mặt đá mát. Cử chỉ nhỏ nhắc cô về tiếng sóng, về bữa cơm đơn giản, về một chiều không ai đòi hỏi cô phải trở thành người khác.',
        'Cô hiểu mình không thể giữ mọi ngày luôn nhẹ nhàng. Nhưng cô có thể xây một ngôi nhà bên trong bằng những thói quen tử tế, rồi học cách trở về đó, từng lần một.') ]},
    {id:'life', title:'Một đời đáng đọc', author:'Hà Phương', category:'vanhocvn', format:'Combo', price:129000, oldPrice:169000, rating:4.9, readers:872, tag:'Lowf chọn', cover:cover('life',['Một đời','đáng đọc'],'Hà Phương','#A7533B','#FFF0D8'), description:'Đi qua những mùa đời bằng trang sách, sự tò mò và những cuộc gặp không hẹn trước.',note, chapters:[
      chapter('01 — Cuốn sách có ghi tên',
        'Tôi mua cuốn sách ở một quầy nhỏ gần ga tàu. Ở trang đầu có tên một người lạ, viết bằng mực xanh đã nhạt. Bên dưới, người ấy ghi một ngày tháng từ rất lâu trước khi tôi đến đây.',
        'Suốt hành trình, tôi đọc chậm và tự hỏi cuốn sách đã đi qua những căn phòng nào. Những nếp gấp ở góc trang khiến vật vô tri trở thành một người bạn từng có đời sống riêng.',
        'Đọc sách đôi khi là bước vào một cuộc trò chuyện đã bắt đầu từ trước. Ta không biết hết những người tham dự, nhưng có thể góp vào đó một câu hỏi chân thành.'),
      chapter('02 — Những lề trang rộng',
        'Ngày còn nhỏ, tôi nghĩ sách phải được giữ thật sạch. Sau này, tôi bắt đầu ghi vào lề những điều mình chưa hiểu. Có câu hỏi ngắn đến mức chỉ là một dấu chấm hỏi.',
        'Vài năm sau đọc lại, tôi nhận ra không chỉ câu trả lời thay đổi. Cách đặt câu hỏi của tôi cũng khác. Trang giấy giữ cả hai phiên bản ấy mà không phán xét phiên bản nào.',
        'Một đời đáng đọc không nhất thiết phải có những biến cố lớn. Nó có thể được viết bằng sự tò mò bền bỉ, bằng việc dám nhìn lại một điều tưởng rằng mình đã hiểu.'),
      chapter('03 — Trả sách cho ngày mai',
        'Khi kệ sách đầy, tôi chọn vài cuốn để tặng. Trong mỗi cuốn, tôi viết một lời nhắn nhỏ: mong bạn tìm thấy ở đây một điều hữu ích, dù điều đó khác hẳn điều tôi từng tìm thấy.',
        'Việc trao đi khiến tôi hiểu sự gắn bó không luôn cần sở hữu. Có những câu chuyện ở lại trong mình ngay cả khi bìa sách đã ở trên bàn của một người khác.',
        'Ngày mai, tôi sẽ tiếp tục đọc. Không phải để hoàn thành một con số, mà để còn biết ngạc nhiên trước thế giới và có thêm ngôn ngữ cho những điều chưa gọi được thành tên.') ]},
    {id:'garden', title:'Khu vườn mùa hạ', author:'Ngọc Hạ', category:'vanhocvn', format:'Sách giấy', price:79000, oldPrice:99000, rating:4.7, readers:645, tag:'Mới', cover:cover('garden',['Khu vườn','mùa hạ'],'Ngọc Hạ','#365848','#F5E7CE'), description:'Một khu vườn, ba thế hệ và mùa hè đầy nắng mở ra những cuộc trò chuyện đã bị bỏ quên.',note, chapters:[
      chapter('01 — Cánh cổng màu xanh',
        'Cánh cổng nhà bà vẫn kêu một tiếng dài mỗi khi mở. Hạ đẩy nhẹ, bước qua lối gạch có rêu ở mép. Mùi lá chanh và đất ẩm đón cô trước cả tiếng bà từ trong bếp.',
        'Khu vườn nhỏ hơn trong trí nhớ. Cây ổi thấp đi, hoặc cô đã lớn hơn. Chỉ có chiếc ghế dưới giàn hoa là vẫn ở đó, giữ nguyên một vệt nắng nghiêng trên tay vịn.',
        'Bà bảo mùa này cây chưa ra nhiều quả. Hạ ngồi xuống và nghe bà kể, nhận ra mình đã xa nhà đủ lâu để những chuyện bình thường trở thành điều cần được kể lại.'),
      chapter('02 — Học cách chờ một mầm cây',
        'Bà đưa Hạ một nắm hạt và chỉ khoảng đất sát tường. Hạ muốn biết chính xác bao nhiêu ngày thì có thể thu hoạch. Bà cười, nói rằng trước hết cứ xem mầm cây có chịu lên hay không.',
        'Mỗi sáng, cô ra vườn nhìn lớp đất chưa thay đổi. Đến ngày thứ năm, một chấm xanh nhỏ xuất hiện. Nó không biết đến lịch trình của cô, nhưng vẫn đến vào đúng lúc của mình.',
        'Có những điều không thể thúc nhanh chỉ bằng mong muốn. Chờ đợi, khi đi cùng sự chăm sóc, cũng là một cách làm việc. Hạ ghi câu ấy vào cuốn sổ đặt bên cửa bếp.'),
      chapter('03 — Mùa hạ mang theo',
        'Ngày Hạ về lại thành phố, bà gói cho cô mấy nhánh rau thơm. Bà dặn giữ gốc, cắm vào một cốc nước rồi đợi. Một khu vườn có thể bắt đầu từ thứ nhỏ đến vậy.',
        'Trong căn phòng tầng cao, Hạ đặt cốc nước cạnh cửa sổ. Ngoài kia, xe chạy qua từng dòng. Trên bàn, chiếc lá non im lặng mở ra, mang theo mùi bữa cơm của những ngày ở nhà.',
        'Cô gọi cho bà vào buổi tối, kể rằng rễ đã mọc. Cuộc gọi kéo dài hơn dự định. Có lẽ điều khu vườn gieo được không chỉ là một mùa rau, mà còn là một thói quen hỏi thăm.') ]},
    {id:'money', title:'Tài chính tuổi đôi mươi', author:'Gia Minh', category:'kinhte', format:'Sách giấy', price:109000, oldPrice:139000, rating:4.8, readers:1542, tag:'Bán chạy', cover:cover('money',['Tài chính','tuổi đôi mươi'],'Gia Minh','#F0EEDC','#294E3E'), description:'Góc nhìn nhập môn về ghi chép chi tiêu, đặt mục tiêu và xây dựng thói quen quản lý tiền.',note, chapters:[
      chapter('01 — Biết tiền đang đi đâu',
        'Bài tập đầu tiên của Nam không phải là chọn một khoản đầu tư. Cậu mở cuốn sổ và ghi lại những khoản chi trong tuần. Một số khoản nhỏ đến mức trước đây cậu chưa từng nhớ đến.',
        'Cuốn sổ không dùng để trách mình. Nó giúp cậu nhìn thấy lựa chọn: khoản nào cần thiết, khoản nào đem lại niềm vui lâu dài, và khoản nào chỉ xuất hiện vì cậu đang mệt.',
        'Khi bắt đầu, một cách ghi đơn giản và duy trì được thường hữu ích hơn một bảng tính cầu kỳ bị bỏ dở. Hãy chọn hình thức phù hợp với mình, rồi xem lại sau một khoảng thời gian nhất định.'),
      chapter('02 — Mục tiêu có tên riêng',
        'Nam từng viết mục tiêu là tiết kiệm nhiều hơn. Cụm từ ấy quá rộng để giúp cậu quyết định khi đứng trước một món đồ mới. Cậu đổi nó thành một chuyến về thăm gia đình vào cuối năm.',
        'Có tên, có thời điểm và một số tiền dự kiến, mục tiêu trở nên cụ thể hơn. Cậu chia thành những phần nhỏ, đồng thời chừa chỗ cho các khoản phát sinh thay vì giả định tháng nào cũng giống nhau.',
        'Một kế hoạch hữu ích cần được xem lại khi hoàn cảnh thay đổi. Thu nhập, trách nhiệm và ưu tiên của mỗi người khác nhau; những con số minh họa không thay thế được việc cân nhắc tình huống của chính mình.'),
      chapter('03 — Thói quen trước công cụ',
        'Một ứng dụng mới giúp Nam nhìn biểu đồ đẹp hơn, nhưng không tự ghi lại mọi quyết định. Cậu chọn một tối mỗi tuần để xem lại số dư, khoản cần thanh toán và điều đã làm được.',
        'Thói quen ấy không khiến mọi lo lắng biến mất. Nó khiến những câu hỏi trở nên rõ hơn, từ đó cậu có thể tìm thông tin phù hợp thay vì làm theo một lời hứa chung chung.',
        'Nội dung này chỉ là bài đọc minh họa về quản lý cá nhân, không phải tư vấn đầu tư. Với những quyết định tài chính quan trọng, hãy kiểm tra điều kiện thực tế và tìm sự hỗ trợ chuyên môn khi cần.') ]},
    {id:'clear', title:'Những ngày trong veo', author:'Thu An', category:'vanhocvn', format:'Ebook Free', price:0, oldPrice:59000, rating:4.8, readers:721, tag:'Miễn phí', cover:cover('clear',['Những ngày','trong veo'],'Thu An','#F3E8D8','#765841'), description:'Những lát cắt đời thường ấm áp, như một tách trà bên ô cửa ngập nắng.',note, chapters:[
      chapter('01 — Tiệm trà ở cuối ngõ',
        'Tiệm chỉ có bốn chiếc bàn và một cửa sổ nhìn ra giàn hoa. Chủ tiệm không hỏi tôi có vội không; cô chỉ đặt xuống một bình nước ấm và để tôi chọn chỗ ngồi.',
        'Tôi mang theo công việc, nhưng cuối cùng lại nhìn những giọt nước đọng bên thành cốc. Ngoài ngõ, một con mèo nằm im dưới bóng xe đạp. Buổi chiều không có gì đặc biệt, và chính điều ấy khiến tôi dễ chịu.',
        'Trước khi về, tôi ghi địa chỉ tiệm vào sổ. Không phải vì sợ quên đường, mà vì muốn giữ lại bằng chứng rằng giữa một tuần bận rộn, mình từng có một giờ thuộc về mình.'),
      chapter('02 — Món quà không gói giấy',
        'Mẹ gửi lên một hộp thức ăn, kèm lời nhắn hâm nóng trước khi ăn. Tôi đọc câu ấy hai lần. Trong vài chữ quen thuộc có cả một buổi sáng mẹ đi chợ, nấu nướng và chờ người giao hàng.',
        'Tối ấy, tôi bày bữa ăn lên đĩa thay vì ăn ngay trong hộp. Căn bếp nhỏ sáng hơn dưới ngọn đèn vàng. Tôi gọi về, nghe mẹ hỏi một câu mà mình đã thuộc lòng: hôm nay có mệt không?',
        'Có những món quà không làm ta ngạc nhiên. Chúng chỉ lặng lẽ nhắc rằng mình được nhớ đến. Khi lớn lên, tôi thấy những món quà ấy ngày càng đáng quý.'),
      chapter('03 — Một ngày để nhớ',
        'Tôi từng chỉ chụp ảnh khi đi xa. Sau này, album có thêm cửa sổ buổi sáng, bữa cơm nấu hơi mặn và đôi giày để cạnh cửa. Những thứ nhỏ bé ấy kể khá chính xác về cuộc sống của tôi.',
        'Một ngày để nhớ không cần phải hoàn hảo. Nó có thể có một cuộc gọi nhỡ, cơn mưa bất chợt và một việc chưa xong. Chỉ cần đâu đó có khoảnh khắc ta muốn giữ lại.',
        'Trước khi ngủ, tôi viết ba dòng về hôm nay. Đôi khi chỉ có một dòng. Việc tìm một điều để viết đã khiến tôi nhìn ngày mai bằng đôi mắt chú ý hơn.') ]},
    {id:'atlas', title:'Bản đồ của những giấc mơ', author:'Khánh Du', category:'vanhocvn', format:'Sách giấy', price:95000, oldPrice:125000, rating:4.6, readers:418, tag:'Khám phá', cover:cover('atlas',['Bản đồ của','những giấc mơ'],'Khánh Du','#243F3E','#F2E5C5'), description:'Một hành trình hư cấu về lựa chọn, những ngã rẽ và lòng can đảm bắt đầu lại.',note, chapters:[
      chapter('01 — Con đường chưa có tên',
        'Tấm bản đồ trong cửa hiệu không ghi tên thành phố. Nó chỉ có những đường cong, một dấu chấm đỏ và lời nhắc ở góc giấy: hãy bắt đầu từ nơi bạn đang đứng.',
        'Du mua nó vì tò mò. Khi bước ra đường, cậu nhận ra mình đã đi cùng một lối về nhà suốt nhiều năm. Hôm ấy, cậu rẽ vào con ngõ bên trái, nơi có tiếng đàn vọng qua một cánh cửa mở.',
        'Chuyến đi đầu tiên không đưa cậu ra khỏi thành phố. Nó chỉ đưa cậu ra khỏi thói quen nghĩ rằng mọi con đường quen thuộc đều đã được khám phá hết.'),
      chapter('02 — Người giữ đèn',
        'Người thợ sửa đèn hỏi Du muốn tìm điều gì. Cậu kể về một công việc khác, một chuyến đi xa và những dự định đã hoãn. Ông nghe, rồi đưa cho cậu chiếc đèn pin cần thay pin.',
        'Ông nói mình chỉ có thể làm sáng một đoạn đường ngắn. Muốn thấy đoạn tiếp theo, người cầm đèn phải bước tới. Du cười, nhưng trên đường về vẫn nhớ mãi câu nói ấy.',
        'Tối hôm đó, cậu viết ra một việc nhỏ có thể làm ngay trong tuần. Ước mơ vẫn còn xa, nhưng lần đầu nó có một cuộc hẹn cụ thể trên lịch.'),
      chapter('03 — Vẽ tiếp hành trình',
        'Một tháng sau, tấm bản đồ đã có thêm những nét bút của Du. Có nơi cậu gạch đi, có nơi khoanh tròn, có một đoạn chỉ ghi rằng mình đã đổi ý. Nó trở nên lộn xộn hơn và cũng hữu ích hơn.',
        'Cậu hiểu bản đồ không phải lời hứa rằng mình sẽ đến đúng nơi từng hình dung. Nó là cách ghi lại những gì đã học được trên đường, để lần lựa chọn tiếp theo có thêm căn cứ.',
        'Buổi sáng, Du gấp bản đồ bỏ vào túi. Cậu chưa biết hết chuyến đi sẽ dài bao lâu. Nhưng cậu đã biết bước tiếp theo, và hôm nay, chừng ấy là đủ.') ]},
    {id:'combo', title:'Khởi đầu cùng Lowf', author:'Lowf tuyển chọn', category:'dacbiet', format:'Combo', price:49000, oldPrice:149000, rating:4.9, readers:326, tag:'Ưu đãi đặc biệt', cover:cover('combo',['Khởi đầu','cùng Lowf'],'Lowf tuyển chọn','#EBDABB','#315140','BỘ SƯU TẬP ĐẶC BIỆT'), description:'Combo minh họa: sách tài chính nhập môn và thẻ đọc ebook. Trải nghiệm mua hàng với giá demo 49.000đ.',note, chapters:[
      chapter('01 — Chọn một khởi đầu nhỏ',
        'Một thói quen đọc có thể bắt đầu từ mười phút và một cuốn sách vừa sức. Không cần chuẩn bị một góc hoàn hảo; chiếc ghế quen, ánh sáng đủ và một khoảng thời gian yên ổn đã là điểm khởi đầu tốt.',
        'Hãy chọn cuốn sách khiến bạn muốn mở trang tiếp theo. Đó có thể là một truyện ngắn, một tập tản văn hoặc nội dung giúp bạn trả lời câu hỏi đang quan tâm. Sự tò mò là lý do bền hơn việc chạy theo danh sách.',
        'Bộ sưu tập trong bản demo này dùng nội dung minh họa tự viết. Bạn có thể thử trình đọc, lưu tiến độ và khám phá nhạc nền trước khi xây dựng thư viện thật của riêng mình.'),
      chapter('02 — Đọc và ghi lại',
        'Sau mỗi buổi đọc, thử ghi một điều khiến bạn dừng lại. Không cần tóm tắt cả chương. Một câu hỏi, một ý tưởng hay một liên hệ với trải nghiệm cá nhân đều có thể là điểm bắt đầu.',
        'Khi đọc lại ghi chú, bạn có thể thấy mình quan tâm đến những chủ đề khác nhau qua từng thời điểm. Cuốn sổ trở thành một bản đồ nhỏ của sự chú ý, có ích cho việc chọn cuốn tiếp theo.',
        'Nếu đọc cùng bạn bè, hãy chia sẻ điều bạn hiểu và điều còn băn khoăn. Một cuộc thảo luận tốt không đòi hỏi mọi người có cùng kết luận, chỉ cần sẵn lòng nghe cách người khác đi đến suy nghĩ của họ.'),
      chapter('03 — Mang việc đọc vào cuộc sống',
        'Một ý tưởng chỉ cần thay đổi một hành động nhỏ để bước ra khỏi trang sách. Sau một chương về chú ý, bạn có thể thử đặt điện thoại xa bàn ăn. Sau một câu chuyện về gia đình, bạn có thể gọi về nhà.',
        'Không phải cuốn sách nào cũng cần tạo ra một kết quả đo được. Có lúc, việc đọc chỉ đem lại niềm vui hoặc một khoảng nghỉ. Những giá trị ấy cũng đủ để bạn dành thời gian cho nó.',
        'Mời bạn tiếp tục khám phá Lowf theo nhịp của mình. Đánh dấu cuốn muốn đọc, mở lại một chương yêu thích và để mỗi lần trở về thư viện là một lựa chọn dễ chịu.') ]}
  ];
  window.LEADERBOARD = [
    {name:'Hữu Luật',initials:'HL',hours:120,level:14,color:'#E9D8BE'},
    {name:'Minh Anh',initials:'MA',hours:95,level:10,color:'#D8E2D1'},
    {name:'Khánh Linh',initials:'KL',hours:82,level:9,color:'#E4D8E8'},
    {name:'Hoàng Nam',initials:'HN',hours:76,level:8,color:'#D3E1E5'},
    {name:'Thu Hà',initials:'TH',hours:68,level:8,color:'#ECD9CF'}
  ];
  window.COMMUNITY_SEEDS = [
    {id:'seed-1',name:'Minh Anh',initials:'MA',text:'Mọi người đang đọc cuốn gì tuần này? Mình vừa bắt đầu “Nghệ thuật sống chậm” 🌿',time:'09:12',color:'#D8E2D1'},
    {id:'seed-2',name:'Hữu Luật',initials:'HL',text:'Một chương sách và tiếng mưa nhẹ. Góc đọc yêu thích của mình đây!',time:'09:18',color:'#E9D8BE'},
    {id:'seed-3',name:'Khánh Linh',initials:'KL',text:'Mình thích lưu lại một ý nhỏ sau mỗi buổi đọc. Cuối tuần xem lại rất vui.',time:'09:24',color:'#E4D8E8'}
  ];
})();
