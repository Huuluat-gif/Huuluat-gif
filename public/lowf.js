/* Lowf public application. Accounts, reading activity and published content come from the server.
   Theme preferences, cart item IDs/quantities and personal PDFs stay on this device. */
(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
const icons=()=>window.lucide?.createIcons();
const money=n=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(n)||0);
const time=n=>`${Math.floor((Number(n)||0)/60)}:${String(Math.floor((Number(n)||0)%60)).padStart(2,'0')}`;
const initials=name=>String(name||'Bạn đọc').split(' ').filter(Boolean).slice(-2).map(s=>s[0]).join('').toUpperCase();
const dateKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const safeURL=v=>{if(typeof v!=='string'||!v.trim())return '';try{const u=new URL(v.trim(),location.origin);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}};
const asset=id=>'/api/assets/'+encodeURIComponent(id);
const state={view:'dashboard',books:[],tracks:[],videos:[],settings:{},environment:null,designPreview:false,plans:[],commerce:{enabled:false},user:null,data:{saved:[],progress:{},secondsByDay:{}},membership:null,stats:{xp:0,level:1,todaySeconds:0,monthSeconds:0},query:'',filter:'all',sort:'featured',libraryLimit:24,reviewCat:'all',communityTab:'feed',replyingTo:'',activeDmPeer:'',friendQuery:'',loaded:false,error:null,pdfs:[],messages:[],readers:[],reviews:[],communityLoaded:false,reviewsLoaded:false,authTab:'login',reader:null,font:19,sessionSeconds:0,trackIndex:-1,ambient:null,volume:.4,pdfBusy:false,pdfError:null,cart:loadCart(),shippingDraft:{},orders:[],ordersPage:1,ordersHasMore:false,ordersLoading:false,ordersError:'',selectedOrder:null,selectedOrderId:'',orderLoading:false,orderError:'',orderPolls:0,afterAuth:'',checkoutBusy:false};
const isOwner=()=>state.user?.isAdmin===true&&state.user?.emailVerified===true;
let renderedOwner=false,bootstrapEpoch=0;
const audio=$('#audio');audio.volume=state.volume;
let heartbeatBusy=false,readingSession=crypto.randomUUID?crypto.randomUUID():Math.random().toString(36),wasActive=false,readerTimer=null,readerStamp=0,saveTimer=null,searchTimer=null,audioEpoch=0,orderPollTimer=null,checkoutRedirect='';
const labels={dashboard:'Khám phá',library:'Thư viện sách',store:'Cửa hàng sách',studio:'Nhạc & Không gian',video:'Góc video',pdf:'Kệ sách của tôi',community:'Cộng đồng',reviews:'Góc bài viết',plans:'Gói thành viên',profile:'Cá nhân',orders:'Đơn hàng của tôi'};
const ambientModes={
 rain:{title:'Mưa bên hiên',subtitle:'Dịu êm · thả lỏng',icon:'cloud-rain',tag:'Ambient'},
 piano:{title:'Piano buổi sớm',subtitle:'Nhẹ nhàng · tập trung',icon:'piano',tag:'Piano'},
 lofi:{title:'Lo-fi chiều muộn',subtitle:'Ấm áp · chậm rãi',icon:'disc-3',tag:'Lo-fi'},
 hanoi_rain:{title:'Mưa Đêm Hà Nội',subtitle:'Jazz Lo-fi · tiếng mưa cửa kính',icon:'cloud-rain',tag:'Chill VN'},
 dalat_pine:{title:'Rừng Thông Đà Lạt',subtitle:'Gió thông · Acoustic êm dịu',icon:'leaf',tag:'Thiên nhiên'},
 tokyo_night:{title:'Đêm Tokyo Mưa Rơi',subtitle:'City Lo-fi · beat trầm ấm',icon:'disc-3',tag:'Trend Lo-fi'},
 cafe_jazz:{title:'Cà Phê Chiều Thu',subtitle:'Acoustic Jazz · quán sách ấm',icon:'music-2',tag:'Cafe Jazz'},
 ocean_sunset:{title:'Sóng Biển Hoàng Hôn',subtitle:'Sóng dịu · đàn harp trong trẻo',icon:'sparkles',tag:'Thư giãn'},
 fireplace:{title:'Lò Sưởi Mùa Đông',subtitle:'Củi nổ ấm · Cello sâu lắng',icon:'flame',tag:'Cozy'},
 kyoto_zen:{title:'Trà Đạo Kyoto',subtitle:'Ngũ cung Á Đông · chuông gió',icon:'sprout',tag:'Zen'},
 starlight:{title:'Bầu Trời Đầy Sao',subtitle:'Space Ambient · đọc khuya',icon:'sparkles',tag:'Đọc đêm'},
 alpha_focus:{title:'Sóng Alpha Tập Trung',subtitle:'Tăng ghi nhớ · đọc sâu',icon:'headphones',tag:'Focus'},
 saigon_morning:{title:'Nắng Sớm Sài Gòn',subtitle:'Acoustic tươi sáng · ngày mới',icon:'music-2',tag:'Chill VN'}
};
const TREND_PLAYLISTS=[
 {id:'yt-lofi-girl',title:'Lofi Girl — Beats to Relax / Study to',artist:'Lofi Girl · Live 24/7 Trend',mood:'Lo-fi Trend',youtubeId:'jfKfPfyJRdk',color:'#6c4d84'},
 {id:'yt-chill-cafe',title:'Cozy Coffee Shop Jazz & Rain Ambience',artist:'Cafe Music BGM · Study Chill',mood:'Cafe Jazz',youtubeId:'Dx5qFachd3A',color:'#8a5436'},
 {id:'yt-ghibli-piano',title:'Studio Ghibli Piano Collection (Relaxing)',artist:'Ghibli Acoustic Piano',mood:'Piano Trend',youtubeId:'HGl75kurxok',color:'#2c6546'},
 {id:'yt-vpop-acoustic',title:'Nhạc Việt Acoustic Chill Đọc Sách & Làm Việc',artist:'Acoustic Chill Vietnam',mood:'V-Pop Chill',youtubeId:'4xDzrJKXOOY',color:'#b84568'},
 {id:'yt-synthwave',title:'Synthwave Radio — Beats to Chill / Focus',artist:'Lofi Girl Synthwave',mood:'Đêm khuya',youtubeId:'4xDzrJKXOOY',color:'#2b4c7c'},
 {id:'yt-classical-study',title:'Classical Piano & Strings for Deep Reading',artist:'HalidonMusic · Cổ điển',mood:'Giao hưởng',youtubeId:'mIYzp5rcTvU',color:'#92692c'},
 {id:'yt-rain-forest',title:'Tiếng Mưa Rừng & Piano Ngủ Ngon, Đọc Sách',artist:'Nature Relax Studio',mood:'Thiên nhiên',youtubeId:'q76bMs-NwRk',color:'#166b85'},
 {id:'yt-jazz-night',title:'Late Night Jazz Piano in a Bookshop',artist:'Smooth Jazz Reading',mood:'Bookshop',youtubeId:'MYPVQccHhAQ',color:'#5b4785'}
];
const BG_PATTERNS=[
 {id:'orbs3d',name:'Cầu kính 3D',desc:'Khối cầu nổi chiều sâu',group:'3d'},
 {id:'cubes3d',name:'Lập phương 3D',desc:'Khối pha lê xoay nổi',group:'3d'},
 {id:'tunnel3d',name:'Đường hầm 3D',desc:'Khung chiều sâu không gian',group:'3d'},
 {id:'ribbon3d',name:'Dải lụa 3D',desc:'Sóng lụa ánh sáng chéo',group:'3d'},
 {id:'nebula3d',name:'Tinh vân 3D',desc:'Đám mây vũ trụ đa sắc',group:'3d'},
 {id:'hex3d',name:'Tổ ong 3D',desc:'Lưới lục giác nghiêng 3D',group:'3d'},
 {id:'spotlight3d',name:'Ánh đèn 3D',desc:'Luồng sáng sân khấu dịu',group:'3d'},
 {id:'bubbles3d',name:'Bong bóng 3D',desc:'Bóng kính ngũ sắc bay lên',group:'3d'},
 {id:'constellation3d',name:'Chòm sao 3D',desc:'Mạng sao thiên văn xoay',group:'3d'},
 {id:'grid3d',name:'Lưới 3D không gian',desc:'Sàn phối cảnh 3D trượt',group:'3d'},
 {id:'aurora3d',name:'Cực quang 3D',desc:'Dải sáng uốn lượn mượt',group:'3d'},
 {id:'rings3d',name:'Quỹ đạo 3D',desc:'Vòng thiên văn xoay nhẹ',group:'3d'},
 {id:'prism',name:'Lăng kính 3D',desc:'Mặt cắt pha lê hiện đại',group:'3d'},
 {id:'paperstack',name:'Trang sách 3D',desc:'Lớp giấy bay chiều sâu',group:'3d'},
 {id:'bokeh',name:'Bokeh cà phê',desc:'Đèn ấm mờ ảo lung linh',group:'3d'},
 {id:'marble',name:'Đá cẩm thạch',desc:'Vân khoáng nghệ thuật',group:'3d'},
 {id:'mesh',name:'Aurora Mesh',desc:'Lưới màu phát sáng',group:'basic'},
 {id:'dots',name:'Chấm Studio',desc:'Dot Matrix hiện đại',group:'basic'},
 {id:'grid',name:'Lưới sổ tay',desc:'Giấy kiến trúc tinh tế',group:'basic'},
 {id:'waves',name:'Sóng lụa',desc:'Đường sóng mềm mại',group:'basic'},
 {id:'starry',name:'Ngàn sao',desc:'Bầu trời đêm lấp lánh',group:'basic'},
 {id:'sunset',name:'Hoàng hôn',desc:'Ánh kính ấm nghệ thuật',group:'basic'},
 {id:'botanical',name:'Vân lá cổ',desc:'Họa tiết thư viện',group:'basic'},
 {id:'clean',name:'Giấy mịn',desc:'Sạch sẽ, tối giản',group:'basic'}
];
const ART_WALLPAPERS={
 'art-mountains':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#dfe9e3"/><stop offset="55%" stop-color="#f5efe6"/><stop offset="100%" stop-color="#e8d8c5"/></linearGradient></defs><rect width="1440" height="900" fill="url(#g1)"/><circle cx="1120" cy="210" r="110" fill="#fff7e2" opacity=".88"/><path d="M0 540 Q260 360 540 490 T1120 440 T1440 500 L1440 900 L0 900Z" fill="#90ab9b" opacity=".38"/><path d="M0 640 Q340 470 720 600 T1440 540 L1440 900 L0 900Z" fill="#5b7d6b" opacity=".42"/><path d="M0 750 Q420 620 880 730 T1440 680 L1440 900 L0 900Z" fill="#2f5241" opacity=".48"/></svg>'),
 'art-nightsky':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ng" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#141e33"/><stop offset="55%" stop-color="#273259"/><stop offset="100%" stop-color="#4b3b6b"/></linearGradient></defs><rect width="1440" height="900" fill="url(#ng)"/><circle cx="1160" cy="190" r="78" fill="#fef4d4" opacity=".92"/><circle cx="1192" cy="172" r="70" fill="#232d50"/><g fill="#fff8dc" opacity=".8"><circle cx="220" cy="140" r="3"/><circle cx="410" cy="220" r="2.2"/><circle cx="640" cy="110" r="3.2"/><circle cx="840" cy="180" r="2.5"/><circle cx="960" cy="290" r="2"/><circle cx="310" cy="340" r="2.5"/><circle cx="720" cy="310" r="3"/></g><path d="M0 710 Q360 590 760 690 T1440 620 L1440 900 L0 900Z" fill="#101829" opacity=".7"/></svg>'),
 'art-botanical':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#edf4e8"/><stop offset="50%" stop-color="#f7f2e3"/><stop offset="100%" stop-color="#e5efe0"/></linearGradient></defs><rect width="1440" height="900" fill="url(#bg)"/><circle cx="1180" cy="180" r="260" fill="#c7deb9" opacity=".45"/><circle cx="240" cy="720" r="290" fill="#ead4b2" opacity=".45"/><path d="M980 0 C1050 180 1190 290 1440 320" stroke="#3c7352" stroke-width="6" fill="none" opacity=".28"/><ellipse cx="1120" cy="150" rx="75" ry="34" transform="rotate(-28 1120 150)" fill="#5a926d" opacity=".26"/><ellipse cx="1260" cy="230" rx="88" ry="38" transform="rotate(18 1260 230)" fill="#3b7350" opacity=".24"/><ellipse cx="220" cy="680" rx="95" ry="40" transform="rotate(-22 220 680)" fill="#c98952" opacity=".2"/></svg>'),
 'art-sakura-lake':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fdebf1"/><stop offset="58%" stop-color="#fce2ea"/><stop offset="100%" stop-color="#f4c7d6"/></linearGradient></defs><rect width="1440" height="900" fill="url(#sl)"/><circle cx="1040" cy="220" r="95" fill="#fff7fa" opacity=".9"/><path d="M0 570 Q360 490 740 560 T1440 530 L1440 900 L0 900Z" fill="#e9adc2" opacity=".42"/><path d="M0 680 Q440 635 880 680 T1440 660 L1440 900 L0 900Z" fill="#d989a5" opacity=".34"/><g fill="#f080a5" opacity=".55"><circle cx="220" cy="160" r="65"/><circle cx="310" cy="210" r="48"/><circle cx="1240" cy="140" r="78"/><circle cx="1140" cy="210" r="52"/></g></svg>'),
 'art-autumn-moon':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="am" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f7dfc1"/><stop offset="55%" stop-color="#f5c998"/><stop offset="100%" stop-color="#d88552"/></linearGradient></defs><rect width="1440" height="900" fill="url(#am)"/><circle cx="1080" cy="230" r="118" fill="#fff3cf" opacity=".92"/><path d="M0 600 Q320 440 690 565 T1440 510 L1440 900 L0 900Z" fill="#b8572c" opacity=".44"/><path d="M0 730 Q420 600 900 715 T1440 670 L1440 900 L0 900Z" fill="#7c3318" opacity=".5"/></svg>'),
 'art-winter-cabin':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="wc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cdddf0"/><stop offset="55%" stop-color="#e4eef8"/><stop offset="100%" stop-color="#f7fafe"/></linearGradient></defs><rect width="1440" height="900" fill="url(#wc)"/><circle cx="1130" cy="190" r="74" fill="#ffffff" opacity=".88"/><path d="M0 610 L260 450 L540 590 L860 410 L1180 565 L1440 460 L1440 900 L0 900Z" fill="#89a9d1" opacity=".34"/><path d="M0 720 Q460 630 960 720 T1440 685 L1440 900 L0 900Z" fill="#ffffff" opacity=".78"/><g fill="#3a5a85" opacity=".36"><polygon points="990,740 1030,570 1070,740"/><polygon points="1070,745 1120,535 1170,745"/><polygon points="1175,740 1215,595 1255,740"/></g></svg>'),
 'art-sunset-sea':'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8d8d0"/><stop offset="48%" stop-color="#f7cfa7"/><stop offset="100%" stop-color="#a5c3d9"/></linearGradient></defs><rect width="1440" height="900" fill="url(#ss)"/><circle cx="720" cy="460" r="145" fill="#fff2c2" opacity=".86"/><rect y="510" width="1440" height="390" fill="#5e87a8" opacity=".34"/><path d="M0 570 Q360 540 720 570 T1440 560 L1440 900 L0 900Z" fill="#3a668a" opacity=".28"/></svg>')
};
const BG_WALLPAPERS=[
 {id:'none',name:'Không ảnh nền',desc:'Chỉ dùng màu & nền 3D',url:''},
 {id:'photo-library',name:'Thư viện cổ điển',desc:'Kệ sách gỗ & ánh nắng',url:'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-bookshop',name:'Hiệu sách châu Âu',desc:'Không gian sách cổ kính',url:'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-cafe',name:'Quán sách mưa rơi',desc:'Cà phê ấm & cửa kính',url:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-rainwindow',name:'Cửa kính ngày mưa',desc:'Giọt mưa êm dịu chill',url:'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-sakura',name:'Vườn hoa anh đào',desc:'Sắc xuân dịu dàng',url:'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-autumn',name:'Đường lá phong đỏ',desc:'Sắc thu lãng mạn',url:'https://images.unsplash.com/photo-1507041957456-9c397ce39c97?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-kyoto',name:'Phố cổ Kyoto chiều',desc:'Đèn lồng ấm áp Á Đông',url:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-forest',name:'Rừng thông sương sớm',desc:'Yên bình & trong lành',url:'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-ocean',name:'Biển xanh hoàng hôn',desc:'Đường chân trời thư thái',url:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-snow',name:'Rừng tuyết Bắc Âu',desc:'Mùa đông êm đềm',url:'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-aurora',name:'Cực quang Bắc Cực',desc:'Bầu trời đêm huyền ảo',url:'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1600&q=75'},
 {id:'photo-lavender',name:'Cánh đồng Oải Hương',desc:'Tím mộng mơ hoàng hôn',url:'https://images.unsplash.com/photo-1499002238440-d264edd596ec?auto=format&fit=crop&w=1600&q=75'},
 {id:'art-mountains',name:'Tranh núi sương mù',desc:'Thủy mặc nghệ thuật 4K',url:ART_WALLPAPERS['art-mountains']},
 {id:'art-nightsky',name:'Tranh đêm trăng sao',desc:'Bầu trời đêm sâu lắng',url:ART_WALLPAPERS['art-nightsky']},
 {id:'art-botanical',name:'Tranh vườn thực vật',desc:'Lá xanh & nắng vàng 4K',url:ART_WALLPAPERS['art-botanical']},
 {id:'art-sakura-lake',name:'Tranh hồ anh đào',desc:'Sắc hồng pastel 4K',url:ART_WALLPAPERS['art-sakura-lake']},
 {id:'art-autumn-moon',name:'Tranh trăng thu',desc:'Trăng tròn đồi phong 4K',url:ART_WALLPAPERS['art-autumn-moon']},
 {id:'art-winter-cabin',name:'Tranh rừng tuyết 4K',desc:'Mùa đông trong trẻo',url:ART_WALLPAPERS['art-winter-cabin']},
 {id:'art-sunset-sea',name:'Tranh biển hoàng hôn',desc:'Nắng chiều lãng mạn 4K',url:ART_WALLPAPERS['art-sunset-sea']}
];
const AVATAR_PRESETS=[
 {id:'cat',name:'Mèo đọc sách',bg:'#f7e4d4',accent:'#b85d38',emoji:'🐱'},
 {id:'fox',name:'Cáo mùa thu',bg:'#fce4d6',accent:'#c45a28',emoji:'🦊'},
 {id:'bear',name:'Gấu trà sữa',bg:'#efe2cf',accent:'#7a5338',emoji:'🐻'},
 {id:'owl',name:'Cú tri thức',bg:'#e3ebf7',accent:'#335487',emoji:'🦉'},
 {id:'bunny',name:'Thỏ anh đào',bg:'#fce4ec',accent:'#b84568',emoji:'🐰'},
 {id:'astro',name:'Phi hành gia',bg:'#e6e4f7',accent:'#54428e',emoji:'🚀'},
 {id:'leaf',name:'Lá rừng xanh',bg:'#e2f0e4',accent:'#2c6546',emoji:'🌿'},
 {id:'star',name:'Ánh sao đêm',bg:'#fdf3d3',accent:'#9c6f1c',emoji:'✨'}
];
const COIN_REWARDS=[
 {id:'frame-gold',name:'Khung Avatar Vàng Kim',cost:80,icon:'👑',desc:'Viền hoàng kim phát sáng quanh ảnh đại diện của bạn.'},
 {id:'badge-scholar',name:'Huy hiệu Học Giả Lowf',cost:120,icon:'🎖️',desc:'Hiển thị danh hiệu Học Giả tinh tuyển trên hồ sơ.'},
 {id:'voucher-20k',name:'Mã ưu đãi sách giấy 20.000đ',cost:200,icon:'🎟️',desc:'Lưu mã giảm giá cho đơn đặt mua sách giấy tại Lowf.'}
];
function presetAvatarDataUrl(p){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="${p.bg}"/><circle cx="60" cy="60" r="52" fill="none" stroke="${p.accent}" stroke-width="4" stroke-opacity=".4"/><text x="60" y="75" text-anchor="middle" font-size="52">${p.emoji}</text></svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function userStorageId(){return state.user?.id||state.user?.email||'guest'}
function getUserAvatar(){
 if(!state.user)return '';
 if(typeof state.user.avatarUrl==='string'&&state.user.avatarUrl)return state.user.avatarUrl;
 try{return localStorage.getItem('lowf.avatar.'+userStorageId())||''}catch{return ''}
}
function isSafeAvatar(url){return typeof url==='string'&&/^data:image\/(?:webp|png|jpeg|svg\+xml);/i.test(url)}
function setUserAvatar(url){
 if(!state.user)return;
 const clean=isSafeAvatar(url)?url:'';
 state.user={...state.user,avatarUrl:clean};
 try{if(clean)localStorage.setItem('lowf.avatar.'+userStorageId(),clean);else localStorage.removeItem('lowf.avatar.'+userStorageId())}catch{}
 // Immediately reflect updated avatar across Community messages, replies & Leaderboard!
 state.messages=(state.messages||[]).map(m=>(m.userId===state.user.id||m.name===state.user.name)?{...m,avatar:clean}:m);
 state.readers=(state.readers||[]).map(r=>(r.id===state.user.id||r.name===state.user.name)?{...r,avatar:clean}:r);
 renderUser();renderRight();
 if(state.view==='profile'||state.view==='community')renderMain();
 api('/api/avatar',{method:'POST',body:{avatarUrl:clean}}).catch(()=>{});
}
function getWallet(){
 const key='lowf.wallet.'+userStorageId();
 const fallback={balance:120,lastCheckin:'',unlocked:[],history:[{id:'welcome',title:'Quà chào mừng độc giả Lowf',delta:120,date:dateKey()}]};
 if(!state.user)return fallback;
 try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Number.isFinite(saved.balance))return{...fallback,...saved,unlocked:Array.isArray(saved.unlocked)?saved.unlocked:[],history:Array.isArray(saved.history)?saved.history:fallback.history}}catch{}
 return fallback;
}
function saveWallet(w){if(!state.user)return;try{localStorage.setItem('lowf.wallet.'+userStorageId(),JSON.stringify(w))}catch{}}
function addCoins(delta,title){
 if(!state.user)return;
 const w=getWallet();
 w.balance=Math.max(0,(Number(w.balance)||0)+delta);
 w.history=[{id:Date.now()+'-'+Math.random().toString(36).slice(2,6),title,delta,date:dateKey()},...(w.history||[])].slice(0,25);
 saveWallet(w);renderUser();if(state.view==='profile')renderMain();
}
function claimDailyCoins(){
 if(!state.user){auth();return}
 const today=dateKey(),w=getWallet();
 if(w.lastCheckin===today){toast('Bạn đã điểm danh nhận Xu hôm nay rồi. Hẹn gặp lại ngày mai nhé!');return}
 w.lastCheckin=today;w.balance=(Number(w.balance)||0)+20;
 w.history=[{id:'chk-'+today,title:'Điểm danh đọc sách hằng ngày',delta:20,date:today},...(w.history||[])].slice(0,25);
 saveWallet(w);renderUser();if(state.view==='profile')renderMain();
 toast('🎉 +20 Lowf Xu! Chúc bạn một ngày đọc sách thật nhiều cảm hứng.');
}
function redeemCoinReward(id){
 if(!state.user){auth();return}
 const item=COIN_REWARDS.find(x=>x.id===id);if(!item)return;
 const w=getWallet();
 if(w.unlocked.includes(id)){toast('Bạn đã sở hữu vật phẩm này rồi.');return}
 if(w.balance<item.cost){toast(`Bạn cần thêm ${item.cost-w.balance} Xu để đổi "${item.name}". Hãy điểm danh hoặc hoàn thành đồng hồ đọc sách nhé!`);return}
 w.balance-=item.cost;w.unlocked=[...w.unlocked,id];
 w.history=[{id:'red-'+Date.now(),title:'Đổi quà: '+item.name,delta:-item.cost,date:dateKey()},...(w.history||[])].slice(0,25);
 saveWallet(w);renderUser();if(state.view==='profile')renderMain();
 toast(`✨ Đã đổi thành công "${item.name}"!`);
}
function avatarHTML(name,isSelf=false,explicitUrl=''){
 const pic=isSafeAvatar(explicitUrl)?explicitUrl:(isSelf?getUserAvatar():'');
 const gold=isSelf&&state.user&&getWallet().unlocked.includes('frame-gold');
 return `<span class="avatar ${gold?'avatar-gold':''}">${pic?`<img src="${esc(pic)}" alt="Ảnh đại diện ${esc(name||'')}">`:esc(name?initials(name):'L')}</span>`;
}
function openAvatarPicker(){
 if(!state.user){auth();return}
 const cur=getUserAvatar();
 modal('Đổi ảnh đại diện',`<p class="auth-subtitle" style="margin-top:0">Chọn 1 nhân vật dễ thương hoặc tải ảnh riêng từ máy của bạn.</p><div class="avatar-preview-row">${avatarHTML(state.user.name,true)}<div><strong>${esc(state.user.name)}</strong><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button type="button" class="button button-primary" data-action="avatar-upload">${icon('upload')} Tải ảnh từ thiết bị</button>${cur?`<button type="button" class="button button-soft" data-action="avatar-clear">Dùng chữ cái tên</button>`:''}</div></div></div><div class="avatar-preset-grid">${AVATAR_PRESETS.map(p=>`<button type="button" class="avatar-preset-item" data-action="avatar-preset" data-id="${p.id}"><img src="${esc(presetAvatarDataUrl(p))}" alt="${esc(p.name)}"><span>${esc(p.name)}</span></button>`).join('')}</div>`);
}
let timerMode='stopwatch',timerPaused=false,pomodoroTotal=0,pomodoroLeft=0,timerOpen=false;
function formatClock(sec){const s=Math.max(0,Math.floor(sec||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function renderTimerUI(){
 const clk=$('#readerClock'),modeEl=$('#readerTimerMode'),btn=$('#readerTimerBtn'),pop=$('#readerTimerPop');
 if(clk)clk.textContent=timerMode==='pomodoro'?formatClock(pomodoroLeft):formatClock(state.sessionSeconds);
 if(modeEl)modeEl.textContent=timerPaused?'Tạm dừng':timerMode==='pomodoro'?'Hẹn giờ':'Đếm';
 if(btn){btn.classList.toggle('is-pomodoro',timerMode==='pomodoro');btn.classList.toggle('is-paused',timerPaused);btn.setAttribute('aria-expanded',String(timerOpen));}
 if(pop){
  pop.hidden=!timerOpen;
  if(timerOpen){
   pop.innerHTML=`<div class="timer-pop-head"><strong>⏱️ Đồng hồ đọc sách</strong><span>${timerMode==='pomodoro'?'Đếm ngược tập trung':'Đang đếm thời gian đọc'}</span></div><div class="timer-big-readout">${timerMode==='pomodoro'?formatClock(pomodoroLeft):formatClock(state.sessionSeconds)}</div><div class="timer-controls"><button type="button" class="button button-soft" data-action="timer-pause">${timerPaused?'▶ Tiếp tục':'⏸ Tạm dừng'}</button><button type="button" class="button button-soft" data-action="timer-reset">↺ Đặt lại</button></div><div class="timer-presets-label">Hẹn giờ Pomodoro (Hoàn thành +15 Xu 💰)</div><div class="timer-presets">${[15,25,45,60].map(m=>`<button type="button" class="${timerMode==='pomodoro'&&pomodoroTotal===m*60?'active':''}" data-action="timer-pomodoro" data-id="${m}">${m} phút</button>`).join('')}</div><button type="button" class="text-button" style="margin-top:8px;width:100%;justify-content:center" data-action="timer-stopwatch">Chuyển về đồng hồ đếm tiến</button>`;
  }
 }
}
function playBookOpenFx(b){
 if(!b||matchMedia('(prefers-reduced-motion:reduce)').matches)return Promise.resolve();
 const fx=$('#bookOpenFx');if(!fx)return Promise.resolve();
 const cover=coverURL(b);
 fx.innerHTML=`<div class="book-open-stage"><div class="book-open-glow"></div><div class="book-open-3d"><div class="book-open-pages"><span>${esc(b.title)}</span><small>${esc(b.author||'Lowf')}</small></div><div class="book-open-cover">${cover?`<img src="${esc(cover)}" alt="">`:`<span>${esc(b.title)}</span>`}</div></div></div>`;
 fx.hidden=false;
 void fx.offsetWidth;
 fx.classList.add('opening');
 return new Promise(resolve=>setTimeout(()=>{fx.classList.remove('opening');fx.hidden=true;fx.replaceChildren();resolve()},220));
}
const READER_PAPERS=[
 {id:'ivory',name:'Ngà sách in',bg:'#faf6ed',ink:'#241f18'},
 {id:'sepia',name:'Cổ điển',bg:'#efe1c4',ink:'#312214'},
 {id:'kraft',name:'Sách cũ',bg:'#e8d8bc',ink:'#2c2013'},
 {id:'sage',name:'Lá trà êm',bg:'#e7f0e5',ink:'#1a2d21'},
 {id:'pure',name:'Trắng tinh',bg:'#ffffff',ink:'#141916'},
 {id:'warm',name:'Hoàng hôn',bg:'#f9ede6',ink:'#2e1f1c'},
 {id:'dusk',name:'Xám đêm',bg:'#242a2f',ink:'#dde3e8'},
 {id:'midnight',name:'Đêm OLED',bg:'#111714',ink:'#e4e8dc'}
];
const READER_FLIPS=[
 {id:'flip',name:'📖 Lật trang 3D'},
 {id:'slide',name:'✨ Trượt mượt'},
 {id:'fade',name:'🌫️ Tan dịu'},
 {id:'none',name:'⚡ Tức thì'}
];
const READER_FONTS=[
 {id:'newsreader',name:'Newsreader'},
 {id:'lora',name:'Lora cổ điển'},
 {id:'sans',name:'Hiện đại'}
];
let stylePopOpen=false,readerZen=false,tocOpen=false;
function readerPrefs(){
 const p=preferences();
 return {
  layout:['spread','single','scroll'].includes(p.readerLayout)?p.readerLayout:'spread',
  paper:READER_PAPERS.some(x=>x.id===p.paperTone)?p.paperTone:'ivory',
  flip:READER_FLIPS.some(x=>x.id===p.readerFlip)?p.readerFlip:'flip',
  fontFamily:READER_FONTS.some(x=>x.id===p.readerFont)?p.readerFont:'newsreader',
  lineHeight:['cozy','balanced','airy'].includes(p.readerLine)?p.readerLine:'balanced',
  align:p.readerAlign==='justify'?'justify':'left',
  measure:['narrow','normal','wide'].includes(p.readerMeasure)?p.readerMeasure:'normal',
  dim:Math.min(100,Math.max(55,Number(p.readerDim)||100)),
  fontSize:Math.min(30,Math.max(16,Number(p.font)||20)),
  scanBlend:p.pdfScanBlend!==false,
  pdfTrim:p.pdfTrim!==false,
  pdfFit:['page','spread','width'].includes(p.pdfFit)?p.pdfFit:'page',
  pdfZoom:Math.min(2.0,Math.max(0.7,Number(p.pdfZoom)||1))
 };
}
function loadPdfPage(id){try{return Math.max(1,Number(JSON.parse(localStorage.getItem('lowf.pdf.page.v1')||'{}')[id])||1)}catch{return 1}}
function savePdfPage(id,page){try{const m=JSON.parse(localStorage.getItem('lowf.pdf.page.v1')||'{}');m[id]=page;localStorage.setItem('lowf.pdf.page.v1',JSON.stringify(m))}catch{}}
function setReaderZen(on,{announce=false}={}){
 readerZen=!!on;
 const rd=$('#reader');if(!rd)return;
 rd.classList.toggle('reader-zen-mode',readerZen);
 const exitBtn=$('#readerZenExit'),zenBtn=$('#readerZenBtn'),zenSt=$('#readerZenStatus');
 if(exitBtn)exitBtn.hidden=!readerZen;
 if(zenSt){
  zenSt.hidden=!readerZen;
  if(readerZen&&!zenSt.textContent.trim()){zenSt.textContent=$('#readerProgress')?.textContent||'Chế độ Tập trung';}
 }
 if(zenBtn){
  zenBtn.setAttribute('aria-pressed',String(readerZen));
  zenBtn.innerHTML=`${icon(readerZen?'eye-off':'eye')}<span>${readerZen?'Hiện thanh':'Ẩn thanh'}</span>`;
  icons();
 }
 if(readerZen){stylePopOpen=false;timerOpen=false;tocOpen=false;renderReaderStylePop();renderTimerUI();renderReaderToc();}
 if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')&&state.reader.ready&&!state.reader.pdfReflow){
  requestAnimationFrame(()=>renderPDF(0));
 }
 if(announce)toast(readerZen?'👁️ Đã bật Chế độ Tập Trung: ẩn toàn bộ thanh công cụ. Bấm con mắt góc trên phải hoặc phím Z để hiện lại.':'Đã hiện lại đầy đủ thanh công cụ đọc sách.');
}
function applyReaderPrefs(){
 const rp=readerPrefs(),rd=$('#reader');
 if(!rd)return;
 rd.setAttribute('data-paper',rp.paper);
 rd.setAttribute('data-layout',rp.layout);
 rd.setAttribute('data-flip',rp.flip);
 rd.setAttribute('data-rfont',rp.fontFamily);
 rd.setAttribute('data-rline',rp.lineHeight);
 rd.setAttribute('data-ralign',rp.align);
 rd.setAttribute('data-rmeas',rp.measure);
 rd.style.setProperty('--r-dim',String(rp.dim/100));
 state.font=rp.fontSize;
 $('#readerBody')?.style.setProperty('--reader-font',rp.fontSize+'px');
 $('#pdfPageStage')?.classList.toggle('pdf-scan-blend',rp.scanBlend);
 $$('.paper-dot').forEach(d=>d.classList.toggle('active',d.dataset.id===rp.paper));
 $$('[data-action="reader-layout"]').forEach(b=>b.classList.toggle('active',b.dataset.id===rp.layout));
 renderReaderStylePop();
}
function renderReaderStylePop(){
 const pop=$('#readerStylePop'),btn=$('#readerStyleBtn');
 if(btn)btn.setAttribute('aria-expanded',String(stylePopOpen));
 if(!pop)return;
 pop.hidden=!stylePopOpen;
 if(!stylePopOpen)return;
 const rp=readerPrefs();
 pop.innerHTML=`<div class="rs-head"><strong>🎨 Tối ưu không gian đọc của bạn</strong><small>Áp dụng cho cả sách chữ, Ebook &amp; PDF scan</small></div>
  <div class="rs-section"><label>Chế độ hiển thị trang</label><div class="rs-grid-3">${[['spread','📖 2 trang lớn'],['single','📄 1 trang'],['scroll','📜 Cuộn liền mạch']].map(([id,lbl])=>`<button type="button" class="${rp.layout===id?'active':''}" data-action="reader-layout" data-id="${id}">${lbl}</button>`).join('')}</div></div>
  <div class="rs-section"><label>8 màu giấy bảo vệ mắt</label><div class="rs-papers-4">${READER_PAPERS.map(p=>`<button type="button" class="rs-paper ${rp.paper===p.id?'active':''}" data-action="paper-tone" data-id="${p.id}"><span style="background:${p.bg};color:${p.ink}">Aa</span><small>${p.name}</small></button>`).join('')}</div></div>
  <div class="rs-section"><label>Độ sáng dịu mắt (${rp.dim}%)</label><div class="rs-dim-row"><span>🌙</span><input type="range" id="readerDimRange" min="55" max="100" step="5" value="${rp.dim}" aria-label="Độ sáng trang đọc"><span>☀️</span></div></div>
  <div class="rs-section"><label>Hiệu ứng lật trang</label><div class="rs-grid-2">${READER_FLIPS.map(f=>`<button type="button" class="${rp.flip===f.id?'active':''}" data-action="reader-flip" data-id="${f.id}">${f.name}</button>`).join('')}</div></div>
  <div class="rs-section"><label>Phông chữ &amp; Căn lề</label><div class="rs-grid-3">${READER_FONTS.map(f=>`<button type="button" class="${rp.fontFamily===f.id?'active':''}" data-action="reader-font" data-id="${f.id}">${f.name}</button>`).join('')}</div><div class="rs-grid-2" style="margin-top:6px">${[['left','Căn trái tự nhiên'],['justify','Căn đều như sách in']].map(([id,lbl])=>`<button type="button" class="${rp.align===id?'active':''}" data-action="reader-align" data-id="${id}">${lbl}</button>`).join('')}</div></div>
  <div class="rs-section"><label>Cỡ chữ (${rp.fontSize}px) · Giãn dòng · Độ rộng</label><div class="rs-row-inline"><button type="button" class="rs-step" data-action="font" data-delta="-1">A−</button><button type="button" class="rs-step" data-action="font" data-delta="1">A+</button>${[['cozy','Gọn'],['balanced','Chuẩn'],['airy','Thoáng']].map(([id,lbl])=>`<button type="button" class="${rp.lineHeight===id?'active':''}" data-action="reader-line" data-id="${id}">${lbl}</button>`).join('')}</div><div class="rs-grid-3" style="margin-top:6px">${[['narrow','Cột gọn 62ch'],['normal','Chuẩn 72ch'],['wide','Rộng 86ch']].map(([id,lbl])=>`<button type="button" class="${rp.measure===id?'active':''}" data-action="reader-measure" data-id="${id}">${lbl}</button>`).join('')}</div></div>`;
}
function splitChapterPages(chapter,layout){
 const paras=(chapter?.paragraphs||[]).map(p=>String(p||'').trim()).filter(Boolean);
 if(!paras.length)return [[]];
 if(layout==='scroll')return [paras];
 const target=layout==='spread'?540:980;
 const pages=[];let cur=[],chars=0;
 for(const p of paras){
  if(cur.length&&chars+p.length>target){pages.push(cur);cur=[];chars=0;}
  cur.push(p);chars+=p.length;
 }
 if(cur.length)pages.push(cur);
 // In 2-page spread mode on desktop, if a chapter fits in 1 leaf but has >= 2 paragraphs, balance cleanly across Left & Right pages!
 if(layout==='spread'&&pages.length===1&&paras.length>=2){
  const mid=Math.ceil(paras.length/2);
  return [paras.slice(0,mid),paras.slice(mid)];
 }
 return pages;
}
function triggerPageTurn(dir=1){
 const rp=readerPrefs();
 if(rp.flip==='none'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const stage=state.reader?.type==='chapters'?$('#readerTextStage'):$('#pdfPageStage');
 if(!stage)return;
 const cls=`turn-${rp.flip}-${dir<0?'prev':'next'}`;
 stage.classList.remove('turn-flip-next','turn-flip-prev','turn-slide-next','turn-slide-prev','turn-fade-next','turn-fade-prev');
 void stage.offsetWidth;
 stage.classList.add(cls);
 setTimeout(()=>stage.classList.remove(cls),440);
}
function playTrendPlaylist(id){
 const p=TREND_PLAYLISTS.find(x=>x.id===id);if(!p)return;
 audio.pause();BookMedia.pause();window.LowfSpeech?.stop();renderPlayer();heartbeat();
 modal(p.title,`<iframe class="video-player youtube-player" src="https://www.youtube-nocookie.com/embed/${p.youtubeId}?autoplay=1" title="${esc(p.title)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><p class="small-note"><strong>${esc(p.artist)}</strong> · ${esc(p.mood)} · Phát trực tiếp từ YouTube chính hãng, bạn có thể để phát khi thư giãn hoặc ghi chú.</p>`,{wide:true});
}
const book=id=>state.books.find(b=>b.id===id);
function toast(message){const el=document.createElement('div');el.className='toast';el.textContent=message;$('#toasts').append(el);const d=$('dialog[open]');if(d){$('.dialog-notice',d)?.remove();const p=document.createElement('p');p.className='dialog-notice';p.setAttribute('role','status');p.textContent=message;d.append(p);setTimeout(()=>p.remove(),6500)}setTimeout(()=>el.remove(),5000)}
async function api(path,options={}){const headers={...(options.body?{'Content-Type':'application/json'}:{}),...options.headers};const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers,body:options.body&&typeof options.body!=='string'?JSON.stringify(options.body):options.body});let data;try{data=await response.json()}catch{throw new Error('Máy chủ chưa trả về dữ liệu hợp lệ. Vui lòng thử lại.')}if(!response.ok){const message=typeof data.error==='string'?data.error:data.error?.message||data.message||'Không thực hiện được thao tác. Hãy thử lại.';const error=new Error(message);error.status=response.status;error.code=data.code||data.error?.code||'';throw error}return data}
function preferences(){try{return JSON.parse(localStorage.getItem('la.preferences')||'{}')}catch{return {}}}
function setPreference(value){try{localStorage.setItem('la.preferences',JSON.stringify({...preferences(),...value}))}catch{}}
function theme(){const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';setPreference({theme:dark?'dark':'light'});$('meta[name="theme-color"]').content=dark?'#141e19':'#f5f4ee';applySettings();updateThemeButtons()}
function updateThemeButtons(){$$('.theme-toggle,.sky-toggle').forEach(b=>b.setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='dark')))}
function modal(title,body,{wide=false}={}){authEpoch++;clearTimeout(authCooldownTimer);const d=$('#modal');d.style.width=wide?'min(820px,calc(100% - 28px))':'';d.setAttribute('aria-label',title);$('#modalContent').innerHTML=`<div class="modal-body"><div class="modal-header"><h2>${esc(title)}</h2><button class="icon-button" data-action="modal-close" aria-label="Đóng">${icon('x')}</button></div>${body}</div>`;if(!d.open)d.showModal();icons();const firstField=$('input:not([type=hidden]),textarea,select',$('#modalContent'));if(firstField)requestAnimationFrame(()=>firstField.focus({preventScroll:true}))}
function closeModal(){clearTimeout(authCooldownTimer);authEpoch++;$$('iframe',$('#modal')).forEach(f=>f.remove());const v=$('video',$('#modal'));if(v){v.pause();v.removeAttribute('src');v.load()}$('#modal').close()}
const DECOR_KEY='lowf.customizer.v1';
const SEASON_THEMES={
 spring:{
  id:'spring',icon:'🌸',name:'Mùa Xuân',label:'Mùa Xuân · Hoa Anh Đào',
  badge:'🌸 MÙA XUÂN · KHỞI ĐẦU TRANG MỚI',
  ribbon:'Gió xuân khẽ lướt qua trang sách — mở ra những cảm hứng tinh khôi.',
  note:'spring blossoms & quiet pages.',
  palette:{primary:'#b84568',background:'#fcf6f7',surface:'#fffdfd',text:'#2c1c23'},
  accent:'#e88aa5',heroBg1:'#fce8ef',heroBg2:'#f7f2e8',heroBorder:'#efc9d6',
  fxName:'Cánh hoa anh đào rơi'
 },
 summer:{
  id:'summer',icon:'☀️',name:'Mùa Hạ',label:'Mùa Hạ · Biển Xanh & Nắng',
  badge:'☀️ MÙA HẠ · RỰC RỠ & TỰ DO',
  ribbon:'Nắng vàng bên khung cửa, tiếng sóng dịu nhẹ đồng hành cùng từng trang chữ.',
  note:'sunlit skies & ocean breeze.',
  palette:{primary:'#166b85',background:'#f1f8fb',surface:'#fcfefe',text:'#152a34'},
  accent:'#f0a534',heroBg1:'#dcf2fa',heroBg2:'#fef6e2',heroBorder:'#b8dfee',
  fxName:'Hạt nắng & đom đóm mùa hạ'
 },
 autumn:{
  id:'autumn',icon:'🍁',name:'Mùa Thu',label:'Mùa Thu · Lá Phong & Trà Ấm',
  badge:'🍁 MÙA THU · CHẬM LẠI BÊN TÁCH TRÀ',
  ribbon:'Sắc lá phong vàng rơi ngoài hiên — mùa đẹp nhất để cuộn mình đọc sách.',
  note:'golden leaves & warm tea.',
  palette:{primary:'#a84b28',background:'#fbf4eb',surface:'#fffcf7',text:'#2e1e15'},
  accent:'#df9237',heroBg1:'#fae8d2',heroBg2:'#f6efe3',heroBorder:'#e9cba9',
  fxName:'Lá phong vàng bay nhẹ'
 },
 winter:{
  id:'winter',icon:'❄️',name:'Mùa Đông',label:'Mùa Đông · Tuyết & Đèn Ấm',
  badge:'❄️ MÙA ĐÔNG · ĐÊM YÊN & SÁCH ẤM',
  ribbon:'Tuyết rơi khẽ bên ngoài ô kính, một bản piano dịu và trang sách ấm áp.',
  note:'frosty nights & cozy chapters.',
  palette:{primary:'#2c4e82',background:'#f2f5fa',surface:'#fbfdff',text:'#182336'},
  accent:'#7ba9df',heroBg1:'#e2ecfa',heroBg2:'#eef2f8',heroBorder:'#c3d5ef',
  fxName:'Bông tuyết pha lê rơi'
 },
 festive:{
  id:'festive',icon:'🏮',name:'Tết & Lễ hội',label:'Tết & Lễ Hội · Đèn Lồng Vàng',
  badge:'🏮 MÙA LỄ HỘI · AN KHANG & TRI THỨC',
  ribbon:'Ánh đèn lồng ấm áp và sắc hoa mai rực rỡ — gieo hạt tri thức cho năm mới.',
  note:'lantern glow & new beginnings.',
  palette:{primary:'#b3322a',background:'#fdf8ee',surface:'#fffdf8',text:'#301c17'},
  accent:'#d99b26',heroBg1:'#fce9d8',heroBg2:'#fcf3d7',heroBorder:'#efd0a6',
  fxName:'Đèn hoa đăng & ánh kim bay lên'
 },
 classic:{
  id:'classic',icon:'🌿',name:'Vườn Lowf',label:'Vườn Xanh · Bản Sắc Lowf',
  badge:'🌿 LOWF BOTANICAL · TRANG SÁCH YÊN',
  ribbon:'Một khoảng xanh dịu mắt giữa nhịp sống vội vã — đọc chậm và nghĩ sâu.',
  note:'a little pause, a little peace.',
  palette:{primary:'#2c6546',background:'#f6f5f0',surface:'#fdfcf9',text:'#1d2b22'},
  accent:'#c98552',heroBg1:'#e7efe1',heroBg2:'#f5efe2',heroBorder:'#d3e0c9',
  fxName:'Lá xanh & bụi sao dịu nhẹ'
 },
 rainy:{
  id:'rainy',icon:'🌧️',name:'Mùa Mưa',label:'Phố Mưa Chill · Bên Khung Cửa',
  badge:'🌧️ MÙA MƯA · TIẾNG MƯA & TRANG SÁCH',
  ribbon:'Ngoài hiên mưa rơi tí tách, bên trong một tách cà phê nóng và cuốn sách hay.',
  note:'raindrops on glass & warm pages.',
  palette:{primary:'#365b78',background:'#eff4f8',surface:'#fafdff',text:'#192734'},
  accent:'#6ea5cc',heroBg1:'#ddeaf4',heroBg2:'#edf2f6',heroBorder:'#bfd4e5',
  fxName:'Những giọt mưa bạc rơi chéo'
 },
 midautumn:{
  id:'midautumn',icon:'🌕',name:'Trung Thu',label:'Trăng Rằm · Đèn Hoa Đăng',
  badge:'🌕 MÙA TRUNG THU · TRĂNG RẰM & TRI THỨC',
  ribbon:'Ánh trăng rằm dịu ngọt và đèn trời bay lên giữa đêm thu bình yên.',
  note:'full moon glow & sky lanterns.',
  palette:{primary:'#9e511c',background:'#fdf6ea',surface:'#fffdf7',text:'#2e1f14'},
  accent:'#e6a532',heroBg1:'#fce8c8',heroBg2:'#f9f0de',heroBorder:'#ebd0a0',
  fxName:'Đèn trời & ánh trăng vàng bay lên'
 },
 christmas:{
  id:'christmas',icon:'🎄',name:'Giáng Sinh',label:'Giáng Sinh · Tuyết & Chuông Vàng',
  badge:'🎄 MÙA GIÁNG SINH · AN LÀNH & ẤM ÁP',
  ribbon:'Tuyết rơi khẽ bên tán thông xanh — mùa trao tặng những cuốn sách yêu thương.',
  note:'merry snow & cozy bookshop.',
  palette:{primary:'#1f5c43',background:'#f3f7f4',surface:'#fcfefd',text:'#172920'},
  accent:'#c93a3a',heroBg1:'#e0efe6',heroBg2:'#fae8e6',heroBorder:'#c7dfd0',
  fxName:'Tuyết & ánh sao Giáng Sinh'
 },
 meteor:{
  id:'meteor',icon:'🌠',name:'Sao Băng',label:'Đêm Sao Băng · Dải Ngân Hà',
  badge:'🌠 ĐÊM SAO BĂNG · KHÁM PHÁ VŨ TRỤ SÁCH',
  ribbon:'Mỗi cuốn sách là một vì sao sáng giữa bầu trời đêm vô tận.',
  note:'shooting stars & infinite stories.',
  palette:{primary:'#4d3d91',background:'#f3f2fa',surface:'#fcfbff',text:'#1f1a36'},
  accent:'#9c7df2',heroBg1:'#e4e0fb',heroBg2:'#f2ecfa',heroBorder:'#cfc7f2',
  fxName:'Mưa sao băng chéo lấp lánh'
 },
 dandelion:{
  id:'dandelion',icon:'🌬️',name:'Bồ Công Anh',label:'Gió Chiều · Đồng Cỏ Bồ Công Anh',
  badge:'🌬️ BỒ CÔNG ANH · NHẸ NHÀNG THEO GIÓ',
  ribbon:'Thả trôi những lo toan theo cánh bồ công anh bay giữa nắng chiều êm ả.',
  note:'dandelion seeds & soft breeze.',
  palette:{primary:'#587a38',background:'#f7f9f0',surface:'#fdfef9',text:'#212b18'},
  accent:'#c5a34e',heroBg1:'#ebf2dc',heroBg2:'#f8f5e3',heroBorder:'#d6e2bd',
  fxName:'Cánh bồ công anh trắng bay theo gió'
 },
 lotus:{
  id:'lotus',icon:'🪷',name:'Mùa Sen',label:'Đầm Sen Sớm · Thanh Tịnh',
  badge:'🪷 MÙA SEN · THANH TỊNH & SÂU LẮNG',
  ribbon:'Hương sen sớm mai dịu dàng, giữ tâm tĩnh tại cho từng trang sách sâu.',
  note:'morning lotus & quiet mind.',
  palette:{primary:'#a8456d',background:'#fbf4f7',surface:'#fffcfd',text:'#2d1a23'},
  accent:'#5c9a78',heroBg1:'#fae5ee',heroBg2:'#ebf4ee',heroBorder:'#ecc8d8',
  fxName:'Cánh hoa sen hồng & sương sớm rơi'
 }
};
function seasonArtSVG(id){
 if(id==='rainy')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><linearGradient id="rnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b7d3e8" stop-opacity=".6"/><stop offset="100%" stop-color="#e3eef7" stop-opacity="0"/></linearGradient></defs><rect width="640" height="320" fill="url(#rnG)"/><ellipse cx="470" cy="64" rx="88" ry="34" fill="#8cb3d1" fill-opacity=".35"/><ellipse cx="555" cy="78" rx="64" ry="26" fill="#6f9bbd" fill-opacity=".28"/><g stroke="#4f7fa3" stroke-opacity=".36" stroke-width="2" stroke-linecap="round"><line x1="430" y1="108" x2="412" y2="165"/><line x1="478" y1="102" x2="460" y2="162"/><line x1="528" y1="112" x2="510" y2="174"/><line x1="576" y1="106" x2="558" y2="166"/></g><path d="M0 264 Q200 228 420 264 T640 248 L640 320 L0 320Z" fill="#6d95b5" fill-opacity=".24"/></svg>`;
 if(id==='midautumn')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="maM" cx="80%" cy="28%" r="48%"><stop offset="0%" stop-color="#ffe79e" stop-opacity=".95"/><stop offset="100%" stop-color="#ffe79e" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#maM)"/><circle cx="520" cy="86" r="48" fill="#ffe184" fill-opacity=".82"/><path d="M440 120 Q495 100 560 116 T640 108" stroke="#d48c3b" stroke-opacity=".32" stroke-width="6" stroke-linecap="round"/><path d="M0 264 Q190 210 380 254 T640 226 L640 320 L0 320Z" fill="#d99643" fill-opacity=".3"/></svg>`;
 if(id==='christmas')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="xmG" cx="78%" cy="22%" r="48%"><stop offset="0%" stop-color="#ffe2a8" stop-opacity=".85"/><stop offset="100%" stop-color="#ffe2a8" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#xmG)"/><polygon points="520,56 472,188 568,188" fill="#2c6e50" fill-opacity=".34"/><polygon points="520,104 456,246 584,246" fill="#1f5c43" fill-opacity=".36"/><circle cx="520" cy="48" r="10" fill="#f0b63a" fill-opacity=".85"/><circle cx="496" cy="146" r="5" fill="#d64545" fill-opacity=".8"/><circle cx="542" cy="172" r="5" fill="#f0b63a" fill-opacity=".85"/><circle cx="508" cy="206" r="5.5" fill="#d64545" fill-opacity=".75"/><path d="M0 278 Q220 245 450 278 T640 265 L640 320 L0 320Z" fill="#ffffff" fill-opacity=".72"/></svg>`;
 if(id==='meteor')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><linearGradient id="mtG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9e87f2" stop-opacity=".32"/><stop offset="100%" stop-color="#5d4ea3" stop-opacity=".08"/></linearGradient></defs><rect width="640" height="320" fill="url(#mtG)"/><g stroke="#8c70e8" stroke-linecap="round"><line x1="590" y1="24" x2="468" y2="108" stroke-width="2.5" stroke-opacity=".55"/><line x1="630" y1="78" x2="532" y2="144" stroke-width="2" stroke-opacity=".42"/><line x1="490" y1="18" x2="408" y2="74" stroke-width="1.8" stroke-opacity=".38"/></g><g fill="#7c5ee0" fill-opacity=".5"><circle cx="468" cy="108" r="4"/><circle cx="532" cy="144" r="3"/><circle cx="566" cy="48" r="2.5"/></g><path d="M0 266 Q200 220 420 262 T640 236 L640 320 L0 320Z" fill="#6b56b8" fill-opacity=".2"/></svg>`;
 if(id==='dandelion')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="dnG" cx="76%" cy="24%" r="48%"><stop offset="0%" stop-color="#fff0b3" stop-opacity=".9"/><stop offset="100%" stop-color="#fff0b3" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#dnG)"/><path d="M510 320 Q518 220 538 140" stroke="#587a38" stroke-width="3" stroke-opacity=".45"/><circle cx="538" cy="136" r="34" stroke="#859e5a" stroke-opacity=".42" stroke-width="2" stroke-dasharray="3 6"/><circle cx="538" cy="136" r="14" fill="#d9be6c" fill-opacity=".5"/><path d="M0 266 Q210 218 430 260 T640 236 L640 320 L0 320Z" fill="#89a85d" fill-opacity=".28"/></svg>`;
 if(id==='lotus')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="ltG" cx="76%" cy="28%" r="48%"><stop offset="0%" stop-color="#ffdce9" stop-opacity=".9"/><stop offset="100%" stop-color="#ffdce9" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#ltG)"/><ellipse cx="520" cy="248" rx="96" ry="24" fill="#5c9a78" fill-opacity=".28"/><path d="M520 155 C548 188 548 224 520 242 C492 224 492 188 520 155Z" fill="#e0749c" fill-opacity=".55"/><path d="M520 242 C480 228 456 202 470 174 C495 186 512 212 520 242Z" fill="#eb95b6" fill-opacity=".55"/><path d="M520 242 C560 228 584 202 570 174 C545 186 528 212 520 242Z" fill="#eb95b6" fill-opacity=".55"/><path d="M0 270 Q210 245 430 272 T640 258 L640 320 L0 320Z" fill="#639e7d" fill-opacity=".22"/></svg>`;
 if(id==='spring')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="spSun" cx="78%" cy="22%" r="48%"><stop offset="0%" stop-color="#ffd5e3" stop-opacity=".95"/><stop offset="100%" stop-color="#ffd5e3" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#spSun)"/><path d="M0 260 Q160 205 320 248 T640 225 L640 320 L0 320Z" fill="#f3c9d7" fill-opacity=".42"/><path d="M0 288 Q210 240 430 278 T640 264 L640 320 L0 320Z" fill="#e8a7be" fill-opacity=".35"/><path d="M410 -10 C455 48 518 76 645 64" stroke="#8f4d5e" stroke-width="5" stroke-linecap="round" stroke-opacity=".45"/><path d="M495 45 C520 75 552 94 590 105" stroke="#8f4d5e" stroke-width="3" stroke-linecap="round" stroke-opacity=".38"/><g fill="#f289a8"><circle cx="458" cy="36" r="14" fill-opacity=".55"/><circle cx="476" cy="48" r="11" fill-opacity=".7"/><circle cx="534" cy="64" r="16" fill-opacity=".5"/><circle cx="566" cy="54" r="12" fill-opacity=".72"/><circle cx="595" cy="82" r="15" fill-opacity=".6"/><circle cx="614" cy="58" r="11" fill-opacity=".65"/><circle cx="514" cy="84" r="10" fill-opacity=".55"/></g><g fill="#fff2f6"><circle cx="464" cy="40" r="4"/><circle cx="538" cy="63" r="5"/><circle cx="592" cy="80" r="4.5"/><circle cx="568" cy="54" r="3.5"/></g></svg>`;
 if(id==='summer')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="smSun" cx="82%" cy="18%" r="46%"><stop offset="0%" stop-color="#ffe18c" stop-opacity=".95"/><stop offset="55%" stop-color="#ffd27d" stop-opacity=".32"/><stop offset="100%" stop-color="#ffd27d" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#smSun)"/><circle cx="532" cy="66" r="36" fill="#ffcf5c" fill-opacity=".75"/><circle cx="532" cy="66" r="54" stroke="#f7b944" stroke-opacity=".35" stroke-width="2" stroke-dasharray="6 8"/><path d="M0 245 Q120 218 250 244 T510 236 T640 248 L640 320 L0 320Z" fill="#76cbe0" fill-opacity=".35"/><path d="M0 274 Q160 250 320 274 T640 264 L640 320 L0 320Z" fill="#2c92b0" fill-opacity=".26"/><path d="M460 120 Q495 102 528 118 Q556 104 590 122" stroke="#166b85" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/><path d="M360 88 Q382 76 402 88" stroke="#166b85" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/></svg>`;
 if(id==='autumn')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="auSun" cx="76%" cy="28%" r="48%"><stop offset="0%" stop-color="#ffd28a" stop-opacity=".9"/><stop offset="100%" stop-color="#ffd28a" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#auSun)"/><circle cx="508" cy="88" r="46" fill="#f3b65d" fill-opacity=".55"/><path d="M0 256 Q175 198 355 245 T640 215 L640 320 L0 320Z" fill="#d98a4a" fill-opacity=".32"/><path d="M0 286 Q210 236 440 276 T640 258 L640 320 L0 320Z" fill="#a84b28" fill-opacity=".24"/><path d="M430 -8 C482 42 544 64 645 48" stroke="#7d3b1e" stroke-width="4.5" stroke-linecap="round" stroke-opacity=".4"/><g fill="#d45d2a" fill-opacity=".62"><ellipse cx="486" cy="40" rx="14" ry="8" transform="rotate(-24 486 40)"/><ellipse cx="540" cy="56" rx="16" ry="9" transform="rotate(18 540 56)"/><ellipse cx="590" cy="42" rx="13" ry="8" transform="rotate(-15 590 42)"/></g><g fill="#e8a135" fill-opacity=".7"><ellipse cx="514" cy="64" rx="12" ry="7" transform="rotate(32 514 64)"/><ellipse cx="574" cy="70" rx="14" ry="8" transform="rotate(-30 574 70)"/></g></svg>`;
 if(id==='winter')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><linearGradient id="wiAur" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7ec4f2" stop-opacity=".32"/><stop offset="50%" stop-color="#8b9cf2" stop-opacity=".22"/><stop offset="100%" stop-color="#87e0cb" stop-opacity=".28"/></linearGradient></defs><path d="M260 0 C340 85 450 28 640 95 L640 0Z" fill="url(#wiAur)"/><path d="M0 264 L110 205 L215 260 L345 190 L470 252 L565 182 L640 232 L640 320 L0 320Z" fill="#9fbbe3" fill-opacity=".34"/><path d="M0 286 Q190 248 390 282 T640 268 L640 320 L0 320Z" fill="#ffffff" fill-opacity=".65"/><g fill="#3c5e91" fill-opacity=".28"><polygon points="518,274 534,218 550,274"/><polygon points="552,278 572,206 592,278"/><polygon points="590,276 606,226 622,276"/></g><circle cx="520" cy="58" r="26" fill="#ffffff" fill-opacity=".7"/></svg>`;
 if(id==='festive')return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="feGlow" cx="76%" cy="24%" r="50%"><stop offset="0%" stop-color="#ffda75" stop-opacity=".85"/><stop offset="100%" stop-color="#ffda75" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#feGlow)"/><path d="M0 265 Q180 218 360 258 T640 232 L640 320 L0 320Z" fill="#e69e4c" fill-opacity=".28"/><line x1="510" y1="0" x2="510" y2="54" stroke="#b3322a" stroke-width="2" stroke-opacity=".55"/><ellipse cx="510" cy="76" rx="22" ry="26" fill="#d63b2f" fill-opacity=".82"/><rect x="502" y="48" width="16" height="6" rx="2" fill="#e5b038"/><rect x="504" y="100" width="12" height="5" rx="2" fill="#e5b038"/><line x1="510" y1="105" x2="510" y2="128" stroke="#e5b038" stroke-width="2.5"/><line x1="582" y1="0" x2="582" y2="34" stroke="#b3322a" stroke-width="2" stroke-opacity=".5"/><ellipse cx="582" cy="52" rx="17" ry="20" fill="#e04f3a" fill-opacity=".75"/><rect x="576" y="30" width="12" height="5" rx="2" fill="#e5b038"/><line x1="582" y1="72" x2="582" y2="92" stroke="#e5b038" stroke-width="2"/><g fill="#f2bc38" fill-opacity=".78"><circle cx="446" cy="48" r="8"/><circle cx="464" cy="36" r="6"/><circle cx="430" cy="64" r="5"/></g></svg>`;
 return `<svg class="hero-scene" viewBox="0 0 640 320" fill="none" aria-hidden="true"><defs><radialGradient id="clSun" cx="76%" cy="22%" r="48%"><stop offset="0%" stop-color="#d5ead0" stop-opacity=".95"/><stop offset="100%" stop-color="#d5ead0" stop-opacity="0"/></radialGradient></defs><rect width="640" height="320" fill="url(#clSun)"/><path d="M0 264 Q170 212 345 252 T640 222 L640 320 L0 320Z" fill="#8bb584" fill-opacity=".26"/><path d="M0 290 Q220 248 450 282 T640 266 L640 320 L0 320Z" fill="#2c6546" fill-opacity=".18"/><circle cx="524" cy="96" r="82" stroke="#2c6546" stroke-opacity=".14" stroke-width="1.5" stroke-dasharray="5 7"/></svg>`;
}
const THEME_PRESETS=[
 {id:'botanical',name:'Rừng Thông & Giấy Ấm',desc:'Êm mắt, thanh lịch',primary:'#2c6546',background:'#f6f5f0',surface:'#fdfcf9',text:'#1d2b22'},
 {id:'blush',name:'Hoa Anh Đào & Lụa Ngà',desc:'Dịu dàng, thơ mộng',primary:'#b84568',background:'#fcf6f7',surface:'#fffdfd',text:'#2c1c23'},
 {id:'espresso',name:'Cà Phê & Giấy Kraft',desc:'Ấm áp, cổ điển',primary:'#8a5436',background:'#f7f1e8',surface:'#fffcf7',text:'#2c211a'},
 {id:'nordic',name:'Sương Sớm Bắc Âu',desc:'Tươi sáng, hiện đại',primary:'#2b5b78',background:'#f2f6f8',surface:'#fcfdfe',text:'#1b2a34'},
 {id:'twilight',name:'Tím Khói & Mực Cổ',desc:'Sáng tạo, chiều sâu',primary:'#5b4785',background:'#f5f3f9',surface:'#fdfcff',text:'#231d30'},
 {id:'collector',name:'Vàng Kim & Sách Quý',desc:'Sang trọng, tinh tuyển',primary:'#92692c',background:'#faf7ee',surface:'#fffef9',text:'#292218'},
 {id:'matcha',name:'Matcha Kyoto',desc:'Tươi mát, cân bằng',primary:'#4a7c3f',background:'#f3f7ee',surface:'#fbfdf8',text:'#1e2b1b'},
 {id:'terracotta',name:'Gốm Đất Nung',desc:'Nghệ thuật Địa Trung Hải',primary:'#b85535',background:'#faf3ed',surface:'#fffcf9',text:'#2e1e18'},
 {id:'ocean',name:'Biển Lam San Hô',desc:'Khoáng đạt, trẻ trung',primary:'#0f766e',background:'#eef8f7',surface:'#fafefe',text:'#132a28'},
 {id:'lavender',name:'Oải Hương Provence',desc:'Mộng mơ, thanh tao',primary:'#6d4c9c',background:'#f7f4fc',surface:'#fdfcff',text:'#251c33'},
 {id:'rosewood',name:'Gỗ Hồng Rượu Vang',desc:'Quyến rũ, chiều sâu',primary:'#8c2f48',background:'#fbf3f5',surface:'#fffcfd',text:'#2e171e'},
 {id:'amber',name:'Mật Ong Nắng Chiều',desc:'Rạng rỡ, ấm cúng',primary:'#b5741e',background:'#fcf7eb',surface:'#fffdf7',text:'#2d2314'},
 {id:'slate',name:'Xanh Đá Tối Giản',desc:'Công nghệ, sắc nét',primary:'#334155',background:'#f4f6f9',surface:'#ffffff',text:'#17202c'},
 {id:'jade',name:'Ngọc Bích Hoàng Gia',desc:'Quý phái, dịu êm',primary:'#1e6b5b',background:'#eff7f5',surface:'#fafefd',text:'#162b26'},
 {id:'sunset',name:'Hoàng Hôn San Hô',desc:'Năng lượng tích cực',primary:'#c25442',background:'#fdf4f1',surface:'#fffcfb',text:'#301c18'},
 {id:'indigo',name:'Mực Chàm Nhật Bản',desc:'Cổ điển, trầm tĩnh',primary:'#283d7a',background:'#f2f5fb',surface:'#fcfdff',text:'#172038'}
];
const BRAND_LOGOS=[
 {id:'sprout',name:'Mầm Xanh',inner:'<path d="M12 20V11c0-3.2 2.5-5.6 6.2-5.6H19v.8c0 3.8-2.4 6.5-7 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 15c-3.4 0-6-2.3-6-5.7v-.6h.8c3.1 0 5.2 2 5.2 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'},
 {id:'open-book',name:'Sách Mở',inner:'<path d="M12 7v13M3 17.5A1.5 1.5 0 0 1 4.5 16H9a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4.5a1.5 1.5 0 0 1 1.5 1.5V6.5A1.5 1.5 0 0 0 19.5 5H15a3 3 0 0 0-3 3 3 3 0 0 0-3-3H4.5A1.5 1.5 0 0 0 3 6.5Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'},
 {id:'monogram',name:'Chữ L Cổ',inner:'<text x="12" y="17.5" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="700" fill="currentColor">L</text><circle cx="17.5" cy="16.5" r="2" fill="#f2bd4e"/>'},
 {id:'moon-book',name:'Trăng Sách',inner:'<path d="M15.5 4.5a6.8 6.8 0 1 0 4 11.4 5.6 5.6 0 0 1-4-11.4Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17.5" cy="6.5" r="1.4" fill="currentColor"/>'},
 {id:'feather',name:'Bút Lông',inner:'<path d="M20.2 4.8a4.2 4.2 0 0 0-6 0L6 13v5h5l8.2-8.2a4.2 4.2 0 0 0 0-5ZM16 8 4 20M17.5 15H9" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'},
 {id:'lotus',name:'Hoa Sen',inner:'<path d="M12 4c2.4 3.4 2.4 8.6 0 12-2.4-3.4-2.4-8.6 0-12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 16c-4.2-.8-6.8-3.4-5.6-6.8 2.4 1.1 4.4 3.6 5.6 6.8Zm0 0c4.2-.8 6.8-3.4 5.6-6.8-2.4 1.1-4.4 3.6-5.6 6.8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M5 19.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'}
];
function brandLogoInlineSvg(presetId){
 const item=BRAND_LOGOS.find(x=>x.id===presetId)||BRAND_LOGOS[0];
 return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">${item.inner}</svg>`;
}
function brandFaviconDataUrl(presetId,bg='#2c6546',dot='#e6a84c'){
 const item=BRAND_LOGOS.find(x=>x.id===presetId)||BRAND_LOGOS[0];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect x="4" y="4" width="56" height="56" rx="18" fill="${bg}"/><g transform="translate(12 12) scale(1.66)" color="#fdfcf7">${item.inner}</g><circle cx="49" cy="49" r="4" fill="${dot}"/></svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function applyBrandIdentity(s,navAccent,sea){
 const br=s.brand||{};
 const preset=br.logoPreset||'sprout';
 const logoUrl=br.logoAssetId?asset(br.logoAssetId):(isSafeAvatar(br.logoDataUrl)?br.logoDataUrl:'');
 const favUrl=br.faviconAssetId?asset(br.faviconAssetId):(isSafeAvatar(br.faviconDataUrl)?br.faviconDataUrl:(logoUrl||brandFaviconDataUrl(preset,navAccent||'#2c6546',sea?.accent||'#e6a84c')));
 $$('.brand-mark,.sticky-brand-mark').forEach(el=>{
  el.removeAttribute('data-lucide');
  if(logoUrl){
   el.classList.add('has-img');
   el.innerHTML=`<img src="${esc(logoUrl)}" alt="${esc(br.name||'Lowf')}">`;
  }else{
   el.classList.remove('has-img');
   el.innerHTML=brandLogoInlineSvg(preset);
  }
 });
 const fav=$('#siteFavicon'),app=$('#siteAppleIcon');
 if(fav&&fav.getAttribute('href')!==favUrl){fav.href=favUrl;fav.type=favUrl.startsWith('data:image/svg')?'image/svg+xml':'image/png';}
 if(app&&app.getAttribute('href')!==favUrl)app.href=favUrl;
}
const NAV_STYLES=[
 {id:'pill-glow',name:'Viên nang Glow',desc:'Nổi sáng Uiverse theo mùa'},
 {id:'glass',name:'Kính mờ Glass',desc:'Trong suốt phản chiếu nền'},
 {id:'floating',name:'Thẻ nổi 3D',desc:'Soft-UI nổi khối hiện đại'},
 {id:'solid-season',name:'Phủ màu đậm',desc:'Thanh bên đậm sắc nổi bật'},
 {id:'minimal-line',name:'Vạch sáng tối giản',desc:'Thanh trượt ánh sáng tinh tế'}
];
const NAV_EFFECTS=[
 {id:'magnetic',name:'Quét sáng 3D',desc:'Vệt sáng lướt + nảy nhẹ'},
 {id:'glow-border',name:'Viền phát sáng',desc:'Hào quang quanh nút Uiverse'},
 {id:'ripple-slide',name:'Trượt sóng màu',desc:'Nền trượt ngang + icon nảy'},
 {id:'neon-pulse',name:'Nhịp thở Neon',desc:'Tỏa sáng nhịp nhàng'},
 {id:'clean',name:'Chuyển mượt nhẹ',desc:'Tối giản êm mắt'}
];
const NAV_COLOR_SWATCHES=['#2c6546','#b84568','#9e511c','#166b85','#4d3d91','#b3322a','#0f766e','#1e293b'];
const defaultDecor={preset:'blush',season:'spring',bgPattern:'orbs3d',bgWallpaper:'none',bgOpacity:24,navSync:true,navColor:'',navStyle:'pill-glow',navEffect:'magnetic',landmark3d:true,fxLevel:'vivid',stars:'bright',petals:true,aurora:true,paperGrain:true,cardStyle:'hardcover'};
function seasonLandmark3D(id){
 const labels3d={
  christmas:'🎄 Cây Thông Noel 3D',
  winter:'❄️ Rừng Tuyết & Nhà Gỗ 3D',
  spring:'🌸 Cây Anh Đào 3D',
  festive:'🏮 Hoa Mai & Đèn Lồng 3D',
  midautumn:'🌕 Siêu Trăng & Đèn 3D',
  autumn:'🍁 Cây Phong Đỏ 3D',
  summer:'☀️ Mặt Trời & Đảo Dừa 3D',
  rainy:'🌧️ Đèn Phố Mưa Chill 3D',
  meteor:'🌠 Hành Tinh Vòng Nhẫn 3D',
  dandelion:'🌬️ Đóa Bồ Công Anh 3D',
  lotus:'🪷 Đóa Sen Nở Rộ 3D',
  classic:'🌿 Vườn Sách Nổi 3D'
 };
 let svg='';
 if(id==='christmas'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="xmHalo" cx="50%" cy="46%" r="50%"><stop offset="0%" stop-color="#ffe58f" stop-opacity=".55"/><stop offset="60%" stop-color="#2e8b57" stop-opacity=".16"/><stop offset="100%" stop-color="#2e8b57" stop-opacity="0"/></radialGradient>
    <linearGradient id="xmP1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3ca36e"/><stop offset="52%" stop-color="#1d6b47"/><stop offset="100%" stop-color="#0f3d28"/></linearGradient>
    <linearGradient id="xmP2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#329462"/><stop offset="55%" stop-color="#17593a"/><stop offset="100%" stop-color="#0b301f"/></linearGradient>
    <linearGradient id="xmSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#d7ecff"/></linearGradient>
    <radialGradient id="xmRed" cx="32%" cy="28%" r="70%"><stop offset="0%" stop-color="#ff9ea2"/><stop offset="45%" stop-color="#d92b3a"/><stop offset="100%" stop-color="#7c0f1b"/></radialGradient>
    <radialGradient id="xmGold" cx="32%" cy="28%" r="70%"><stop offset="0%" stop-color="#fff8cc"/><stop offset="45%" stop-color="#f2b82e"/><stop offset="100%" stop-color="#9e6208"/></radialGradient>
    <radialGradient id="xmBlue" cx="32%" cy="28%" r="70%"><stop offset="0%" stop-color="#e3f7ff"/><stop offset="45%" stop-color="#53b4e8"/><stop offset="100%" stop-color="#1c5c8a"/></radialGradient>
   </defs>
   <circle cx="160" cy="210" r="150" fill="url(#xmHalo)"/>
   <ellipse cx="160" cy="390" rx="116" ry="20" fill="#e8f3fb" fill-opacity=".85"/>
   <ellipse cx="160" cy="392" rx="86" ry="12" fill="#173a29" fill-opacity=".22"/>
   <rect x="142" y="328" width="36" height="58" rx="6" fill="#6b3e26"/>
   <rect x="160" y="328" width="18" height="58" rx="4" fill="#4d2917" fill-opacity=".6"/>
   <g class="lm3d-sway">
    <path d="M160 198 L40 342 Q160 364 280 342 Z" fill="url(#xmP2)"/>
    <path d="M40 342 Q100 356 160 354 Q220 356 280 342 Q265 328 248 336 Q205 346 160 344 Q115 346 72 336 Q55 328 40 342Z" fill="url(#xmSnow)" fill-opacity=".85"/>
    <path d="M160 132 L62 268 Q160 288 258 268 Z" fill="url(#xmP1)"/>
    <path d="M62 268 Q112 282 160 280 Q208 282 258 268 Q244 256 230 263 Q195 272 160 270 Q125 272 90 263 Q76 256 62 268Z" fill="url(#xmSnow)" fill-opacity=".88"/>
    <path d="M160 76 L88 194 Q160 212 232 194 Z" fill="url(#xmP2)"/>
    <path d="M88 194 Q124 206 160 205 Q196 206 232 194 Q220 183 206 190 Q182 197 160 196 Q138 197 114 190 Q100 183 88 194Z" fill="url(#xmSnow)" fill-opacity=".9"/>
    <path d="M160 36 L114 128 Q160 142 206 128 Z" fill="url(#xmP1)"/>
    <path d="M114 128 Q138 138 160 137 Q182 138 206 128 Q196 119 186 124 Q172 129 160 128 Q148 129 134 124 Q124 119 114 128Z" fill="url(#xmSnow)" fill-opacity=".92"/>
    <path d="M122 114 Q160 130 198 106 M96 184 Q162 204 224 174 M72 256 Q160 282 248 242 M54 330 Q162 356 266 314" stroke="#ffe794" stroke-width="2.4" stroke-dasharray="5 6" stroke-linecap="round" opacity=".82"/>
    <circle cx="136" cy="112" r="7.5" fill="url(#xmRed)"/>
    <circle cx="182" cy="120" r="6.5" fill="url(#xmGold)"/>
    <circle cx="122" cy="176" r="8.5" fill="url(#xmGold)"/>
    <circle cx="164" cy="164" r="8" fill="url(#xmRed)"/>
    <circle cx="204" cy="184" r="7.5" fill="url(#xmBlue)"/>
    <circle cx="102" cy="244" r="9.5" fill="url(#xmRed)"/>
    <circle cx="148" cy="232" r="8.5" fill="url(#xmBlue)"/>
    <circle cx="192" cy="248" r="9.5" fill="url(#xmGold)"/>
    <circle cx="228" cy="252" r="8" fill="url(#xmRed)"/>
    <circle cx="88" cy="316" r="10.5" fill="url(#xmGold)"/>
    <circle cx="136" cy="306" r="10" fill="url(#xmRed)"/>
    <circle cx="184" cy="320" r="10" fill="url(#xmBlue)"/>
    <circle cx="234" cy="312" r="10.5" fill="url(#xmRed)"/>
    <circle class="lm3d-bulb" cx="152" cy="96" r="4" fill="#fff4b8"/>
    <circle class="lm3d-bulb b2" cx="174" cy="144" r="4.2" fill="#ffd25e"/>
    <circle class="lm3d-bulb b3" cx="138" cy="204" r="4.5" fill="#fff4b8"/>
    <circle class="lm3d-bulb b4" cx="196" cy="212" r="4.2" fill="#ff9e9e"/>
    <circle class="lm3d-bulb" cx="118" cy="284" r="4.8" fill="#ffe787"/>
    <circle class="lm3d-bulb b2" cx="166" cy="288" r="4.5" fill="#a8e6ff"/>
    <circle class="lm3d-bulb b3" cx="216" cy="282" r="4.8" fill="#fff4b8"/>
    <circle class="lm3d-bulb b4" cx="250" cy="330" r="4.5" fill="#ffd25e"/>
    <g class="lm3d-star">
     <circle cx="160" cy="34" r="24" fill="#ffe47a" fill-opacity=".35"/>
     <polygon points="160,8 167,26 186,27 171,38 176,56 160,46 144,56 149,38 134,27 153,26" fill="#ffd94a" stroke="#fff6cc" stroke-width="1.5"/>
    </g>
   </g>
   <g>
    <rect x="76" y="348" width="44" height="38" rx="6" fill="#d9383a"/>
    <rect x="94" y="348" width="8" height="38" fill="#f7c948"/>
    <rect x="76" y="362" width="44" height="7" fill="#f7c948"/>
    <rect x="200" y="352" width="48" height="34" rx="6" fill="#2d6ea3"/>
    <rect x="220" y="352" width="8" height="34" fill="#ffe58f"/>
    <rect x="200" y="365" width="48" height="7" fill="#ffe58f"/>
    <rect x="134" y="360" width="38" height="28" rx="5" fill="#e6a22e"/>
    <rect x="149" y="360" width="7" height="28" fill="#fff4d6"/>
   </g>
  </svg>`;
 }else if(id==='winter'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="wiGlow" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#c2e2ff" stop-opacity=".6"/><stop offset="100%" stop-color="#c2e2ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="wiTree" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5a82ad"/><stop offset="100%" stop-color="#223a5e"/></linearGradient>
   </defs>
   <circle cx="160" cy="210" r="148" fill="url(#wiGlow)"/>
   <ellipse cx="160" cy="390" rx="122" ry="20" fill="#eef6ff" fill-opacity=".9"/>
   <g class="lm3d-spin" opacity=".88">
    <circle cx="160" cy="112" r="46" stroke="#ffffff" stroke-width="2" stroke-dasharray="4 6"/>
    <path d="M160 56 V168 M104 112 H216 M120 72 L200 152 M200 72 L120 152" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="160" cy="112" r="12" fill="#dff1ff" stroke="#7eb3e6" stroke-width="2"/>
   </g>
   <g class="lm3d-sway">
    <polygon points="88,162 42,356 134,356" fill="url(#wiTree)"/>
    <polygon points="88,162 66,246 110,246" fill="#ffffff" fill-opacity=".82"/>
    <polygon points="242,188 200,362 284,362" fill="url(#wiTree)"/>
    <polygon points="242,188 222,262 262,262" fill="#ffffff" fill-opacity=".82"/>
   </g>
   <g>
    <rect x="114" y="294" width="96" height="86" rx="8" fill="#694836"/>
    <polygon points="100,298 162,240 224,298" fill="#3a5275"/>
    <path d="M100 298 L162 240 L224 298 L212 304 L162 256 L112 304 Z" fill="#ffffff"/>
    <rect x="188" y="246" width="16" height="32" rx="3" fill="#4f372a"/>
    <circle class="lm3d-steam" cx="196" cy="232" r="8" fill="#ffffff" fill-opacity=".7"/>
    <circle class="lm3d-steam" cx="204" cy="212" r="11" fill="#ffffff" fill-opacity=".5"/>
    <rect x="130" y="318" width="24" height="24" rx="4" fill="#ffe184"/>
    <rect x="170" y="318" width="24" height="24" rx="4" fill="#ffe184"/>
    <rect class="lm3d-bulb" x="130" y="318" width="24" height="24" rx="4" fill="#fff5cc" fill-opacity=".5"/>
    <rect x="150" y="348" width="24" height="32" rx="4" fill="#422a1d"/>
   </g>
  </svg>`;
 }else if(id==='spring'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="spGlow" cx="50%" cy="42%" r="52%"><stop offset="0%" stop-color="#ffd1e3" stop-opacity=".65"/><stop offset="100%" stop-color="#ffd1e3" stop-opacity="0"/></radialGradient>
    <radialGradient id="spBl" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff0f6"/><stop offset="52%" stop-color="#f28cb0"/><stop offset="100%" stop-color="#b84568"/></radialGradient>
   </defs>
   <circle cx="160" cy="190" r="148" fill="url(#spGlow)"/>
   <ellipse cx="160" cy="390" rx="108" ry="18" fill="#f7dce6" fill-opacity=".85"/>
   <path d="M172 388 C164 316 146 270 166 206 C178 168 206 142 232 126 M162 248 C134 218 106 204 82 184" stroke="#6d3a46" stroke-width="18" stroke-linecap="round"/>
   <path d="M164 218 C154 176 130 144 114 114" stroke="#7d4654" stroke-width="11" stroke-linecap="round"/>
   <g class="lm3d-sway">
    <circle cx="164" cy="120" r="64" fill="url(#spBl)"/>
    <circle cx="102" cy="162" r="54" fill="url(#spBl)" fill-opacity=".94"/>
    <circle cx="224" cy="156" r="56" fill="url(#spBl)" fill-opacity=".92"/>
    <circle cx="144" cy="186" r="48" fill="#f7abc6" fill-opacity=".9"/>
    <circle cx="204" cy="108" r="44" fill="#ffc4d9" fill-opacity=".92"/>
    <circle class="lm3d-bulb" cx="132" cy="118" r="5.5" fill="#ffffff"/>
    <circle class="lm3d-bulb b2" cx="212" cy="144" r="5" fill="#fff5f9"/>
    <circle class="lm3d-bulb b3" cx="96" cy="156" r="4.5" fill="#ffffff"/>
    <circle class="lm3d-bulb b4" cx="174" cy="166" r="5.5" fill="#fff0f5"/>
   </g>
  </svg>`;
 }else if(id==='festive'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="feG" cx="50%" cy="46%" r="52%"><stop offset="0%" stop-color="#ffe184" stop-opacity=".6"/><stop offset="100%" stop-color="#ffe184" stop-opacity="0"/></radialGradient>
    <radialGradient id="feLan" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#ff8a6b"/><stop offset="55%" stop-color="#d42c24"/><stop offset="100%" stop-color="#7c120d"/></radialGradient>
   </defs>
   <circle cx="160" cy="195" r="146" fill="url(#feG)"/>
   <ellipse cx="160" cy="390" rx="108" ry="18" fill="#faebd0" fill-opacity=".85"/>
   <path d="M168 386 C162 308 148 258 174 188 C192 142 230 116 266 94 M160 244 C124 214 96 184 68 158" stroke="#633622" stroke-width="15" stroke-linecap="round"/>
   <g class="lm3d-sway">
    <g fill="#f5be2e">
     <circle cx="94" cy="168" r="16"/><circle cx="72" cy="152" r="13"/><circle cx="122" cy="188" r="14"/>
     <circle cx="182" cy="150" r="18"/><circle cx="218" cy="124" r="16"/><circle cx="250" cy="100" r="15"/>
     <circle cx="152" cy="130" r="14"/><circle cx="236" cy="154" r="13"/>
    </g>
    <g fill="#fff4bd"><circle cx="94" cy="168" r="5"/><circle cx="182" cy="150" r="6"/><circle cx="218" cy="124" r="5"/><circle cx="250" cy="100" r="4.5"/></g>
    <line x1="126" y1="196" x2="126" y2="236" stroke="#d99b26" stroke-width="3"/>
    <ellipse cx="126" cy="274" rx="34" ry="40" fill="url(#feLan)"/>
    <rect x="112" y="232" width="28" height="9" rx="3" fill="#f0b634"/>
    <rect x="114" y="310" width="24" height="8" rx="3" fill="#f0b634"/>
    <line x1="126" y1="318" x2="126" y2="352" stroke="#f0b634" stroke-width="4" stroke-linecap="round"/>
    <line x1="224" y1="142" x2="224" y2="178" stroke="#d99b26" stroke-width="2.6"/>
    <ellipse cx="224" cy="210" rx="26" ry="32" fill="url(#feLan)"/>
    <rect x="213" y="176" width="22" height="7" rx="3" fill="#f0b634"/>
    <rect x="214" y="239" width="20" height="7" rx="3" fill="#f0b634"/>
    <line x1="224" y1="246" x2="224" y2="274" stroke="#f0b634" stroke-width="3.2" stroke-linecap="round"/>
    <circle class="lm3d-bulb" cx="126" cy="274" r="12" fill="#ffe68a" fill-opacity=".45"/>
    <circle class="lm3d-bulb b2" cx="224" cy="210" r="9" fill="#ffe68a" fill-opacity=".45"/>
   </g>
  </svg>`;
 }else if(id==='midautumn'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="maMoon" cx="38%" cy="34%" r="65%"><stop offset="0%" stop-color="#fffbe0"/><stop offset="55%" stop-color="#ffd96e"/><stop offset="100%" stop-color="#d68a24"/></radialGradient>
    <radialGradient id="maHalo" cx="50%" cy="38%" r="50%"><stop offset="0%" stop-color="#ffe58f" stop-opacity=".68"/><stop offset="100%" stop-color="#ffe58f" stop-opacity="0"/></radialGradient>
   </defs>
   <circle cx="168" cy="158" r="146" fill="url(#maHalo)"/>
   <circle cx="168" cy="158" r="88" fill="url(#maMoon)"/>
   <circle cx="140" cy="134" r="14" fill="#e09a2b" fill-opacity=".24"/>
   <circle cx="198" cy="178" r="20" fill="#e09a2b" fill-opacity=".2"/>
   <path d="M62 214 Q122 184 188 206 T286 196" stroke="#fff6d6" stroke-width="12" stroke-linecap="round" opacity=".78"/>
   <g class="lm3d-sway">
    <path d="M116 252 Q160 228 204 252 L192 344 Q160 358 128 344 Z" fill="url(#maMoon)" stroke="#b55918" stroke-width="3"/>
    <rect x="132" y="242" width="56" height="10" rx="4" fill="#a84914"/>
    <rect x="138" y="344" width="44" height="9" rx="4" fill="#a84914"/>
    <line x1="160" y1="353" x2="160" y2="386" stroke="#e6a532" stroke-width="4" stroke-linecap="round"/>
    <circle class="lm3d-bulb" cx="160" cy="298" r="22" fill="#fff6c2" fill-opacity=".55"/>
   </g>
  </svg>`;
 }else if(id==='autumn'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="auCan" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#ffd07a"/><stop offset="50%" stop-color="#d95f26"/><stop offset="100%" stop-color="#872d12"/></radialGradient>
    <radialGradient id="auGlow" cx="50%" cy="44%" r="50%"><stop offset="0%" stop-color="#ffcf80" stop-opacity=".55"/><stop offset="100%" stop-color="#ffcf80" stop-opacity="0"/></radialGradient>
   </defs>
   <circle cx="160" cy="196" r="144" fill="url(#auGlow)"/>
   <ellipse cx="160" cy="390" rx="112" ry="18" fill="#f5dfd0" fill-opacity=".85"/>
   <path d="M164 388 C158 312 152 260 166 196 M160 250 C130 222 104 206 86 184 M164 236 C198 208 224 190 242 164" stroke="#61331c" stroke-width="18" stroke-linecap="round"/>
   <g class="lm3d-sway">
    <circle cx="164" cy="126" r="66" fill="url(#auCan)"/>
    <circle cx="100" cy="170" r="54" fill="#e67e2e" fill-opacity=".95"/>
    <circle cx="226" cy="164" r="56" fill="#c2461f" fill-opacity=".94"/>
    <circle cx="152" cy="186" r="50" fill="#f0a23a" fill-opacity=".9"/>
    <circle class="lm3d-bulb" cx="136" cy="134" r="5" fill="#fff1b8"/>
    <circle class="lm3d-bulb b2" cx="212" cy="156" r="5" fill="#ffe4a1"/>
   </g>
  </svg>`;
 }else if(id==='summer'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="smBall" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#fff8cc"/><stop offset="55%" stop-color="#ffbe3b"/><stop offset="100%" stop-color="#e37c19"/></radialGradient>
   </defs>
   <g class="lm3d-spin">
    <circle cx="194" cy="116" r="76" stroke="#ffcf5c" stroke-width="4" stroke-dasharray="10 12" opacity=".7"/>
    <circle cx="194" cy="116" r="54" fill="url(#smBall)"/>
   </g>
   <path d="M126 382 C112 310 116 250 142 186" stroke="#85522c" stroke-width="16" stroke-linecap="round"/>
   <g class="lm3d-sway" fill="#238068">
    <path d="M142 186 Q82 146 42 182 Q92 174 142 186Z"/>
    <path d="M142 186 Q102 122 68 124 Q108 152 142 186Z"/>
    <path d="M142 186 Q196 134 248 158 Q194 166 142 186Z"/>
    <path d="M142 186 Q206 168 242 216 Q192 192 142 186Z"/>
   </g>
   <path d="M36 364 Q106 334 176 362 T296 352 L296 398 L36 398 Z" fill="#2b9bbd" fill-opacity=".68"/>
   <path d="M24 382 Q108 358 188 380 T304 374 L304 404 L24 404 Z" fill="#166b85" fill-opacity=".78"/>
  </svg>`;
 }else if(id==='rainy'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="rnLamp" cx="50%" cy="32%" r="48%"><stop offset="0%" stop-color="#ffe7a3" stop-opacity=".78"/><stop offset="55%" stop-color="#8ec0e6" stop-opacity=".22"/><stop offset="100%" stop-color="#8ec0e6" stop-opacity="0"/></radialGradient>
   </defs>
   <circle cx="160" cy="146" r="134" fill="url(#rnLamp)"/>
   <ellipse cx="160" cy="390" rx="96" ry="16" fill="#9bc0db" fill-opacity=".5"/>
   <rect x="152" y="164" width="16" height="222" rx="8" fill="#2d4356"/>
   <rect x="134" y="372" width="52" height="16" rx="6" fill="#223545"/>
   <path d="M126 112 L194 112 L182 174 L138 174 Z" fill="#fff0ba" stroke="#2d4356" stroke-width="5"/>
   <path d="M118 112 L160 80 L202 112 Z" fill="#2d4356"/>
   <circle class="lm3d-bulb" cx="160" cy="142" r="18" fill="#ffffff" fill-opacity=".75"/>
   <g stroke="#7db1d9" stroke-width="3" stroke-linecap="round" opacity=".72">
    <line x1="88" y1="150" x2="72" y2="210"/><line x1="236" y1="138" x2="220" y2="198"/><line x1="106" y1="254" x2="90" y2="314"/><line x1="226" y1="246" x2="210" y2="306"/>
   </g>
  </svg>`;
 }else if(id==='meteor'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="mtPlanet" cx="34%" cy="28%" r="72%"><stop offset="0%" stop-color="#dfd6ff"/><stop offset="48%" stop-color="#7c5ee0"/><stop offset="100%" stop-color="#2b1e66"/></radialGradient>
    <radialGradient id="mtGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#b49cff" stop-opacity=".62"/><stop offset="100%" stop-color="#b49cff" stop-opacity="0"/></radialGradient>
   </defs>
   <circle cx="164" cy="210" r="146" fill="url(#mtGlow)"/>
   <ellipse cx="164" cy="210" rx="136" ry="38" transform="rotate(-18 164 210)" stroke="#d9ccff" stroke-width="14" stroke-opacity=".55"/>
   <circle cx="164" cy="210" r="76" fill="url(#mtPlanet)"/>
   <path d="M36 254 A136 38 -18 0 0 292 166" stroke="#fff3c4" stroke-width="8" stroke-linecap="round" opacity=".88"/>
   <circle class="lm3d-bulb" cx="76" cy="118" r="9" fill="#ffe699"/>
   <circle class="lm3d-bulb b2" cx="258" cy="112" r="6.5" fill="#ffffff"/>
   <circle class="lm3d-bulb b3" cx="242" cy="306" r="11" fill="#c4b5fd"/>
   <g class="lm3d-star"><polygon points="88,290 92,302 104,306 92,310 88,322 84,310 72,306 84,302" fill="#fff4c2"/></g>
  </svg>`;
 }else if(id==='dandelion'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="dnGlow" cx="50%" cy="38%" r="50%"><stop offset="0%" stop-color="#fff4c4" stop-opacity=".75"/><stop offset="100%" stop-color="#fff4c4" stop-opacity="0"/></radialGradient>
   </defs>
   <circle cx="160" cy="160" r="138" fill="url(#dnGlow)"/>
   <path d="M150 392 Q146 286 164 176" stroke="#587a38" stroke-width="8" stroke-linecap="round"/>
   <g class="lm3d-sway">
    <circle cx="164" cy="160" r="82" fill="#ffffff" fill-opacity=".35" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 7"/>
    <circle cx="164" cy="160" r="56" stroke="#85a35a" stroke-width="2" stroke-dasharray="2 8"/>
    <circle cx="164" cy="160" r="22" fill="#d9be6c"/>
    <circle class="lm3d-bulb" cx="238" cy="108" r="8" fill="#ffffff"/>
    <circle class="lm3d-bulb b2" cx="268" cy="144" r="6" fill="#ffffff"/>
    <circle class="lm3d-bulb b3" cx="88" cy="116" r="7" fill="#ffffff"/>
   </g>
  </svg>`;
 }else if(id==='lotus'){
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="ltP" cx="40%" cy="25%" r="75%"><stop offset="0%" stop-color="#fff5f9"/><stop offset="55%" stop-color="#ec89af"/><stop offset="100%" stop-color="#a83e69"/></radialGradient>
   </defs>
   <ellipse cx="160" cy="350" rx="126" ry="34" fill="#4f9471" fill-opacity=".68"/>
   <ellipse cx="160" cy="346" rx="94" ry="22" fill="#77ba96" fill-opacity=".55"/>
   <g class="lm3d-sway">
    <path d="M160 330 C92 314 54 268 78 214 C118 232 146 276 160 330Z" fill="url(#ltP)"/>
    <path d="M160 330 C228 314 266 268 242 214 C202 232 174 276 160 330Z" fill="url(#ltP)"/>
    <path d="M160 330 C112 288 102 222 128 176 C152 210 160 268 160 330Z" fill="#f7adc9"/>
    <path d="M160 330 C208 288 218 222 192 176 C168 210 160 268 160 330Z" fill="#f7adc9"/>
    <path d="M160 144 C196 196 196 280 160 330 C124 280 124 196 160 144Z" fill="url(#ltP)"/>
    <circle class="lm3d-bulb" cx="160" cy="242" r="14" fill="#ffe794"/>
   </g>
  </svg>`;
 }else{
  svg=`<svg class="lm3d-svg" viewBox="0 0 320 420" fill="none">
   <defs>
    <radialGradient id="clG" cx="50%" cy="48%" r="50%"><stop offset="0%" stop-color="#cde8c8" stop-opacity=".65"/><stop offset="100%" stop-color="#cde8c8" stop-opacity="0"/></radialGradient>
    <linearGradient id="clBk" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3f855e"/><stop offset="100%" stop-color="#1d4a32"/></linearGradient>
   </defs>
   <circle cx="160" cy="204" r="144" fill="url(#clG)"/>
   <ellipse cx="160" cy="382" rx="102" ry="16" fill="#d4e6cf" fill-opacity=".75"/>
   <g class="lm3d-sway">
    <path d="M76 346 C64 230 100 132 160 102 C220 132 256 230 244 346" stroke="#3c7a57" stroke-width="10" stroke-linecap="round" opacity=".55"/>
    <rect x="106" y="164" width="108" height="148" rx="12" transform="rotate(-7 160 238)" fill="url(#clBk)" stroke="#e6d3a3" stroke-width="3"/>
    <rect x="122" y="184" width="76" height="106" rx="6" transform="rotate(-7 160 238)" fill="none" stroke="#f0dfb4" stroke-opacity=".6" stroke-width="2"/>
    <circle class="lm3d-star" cx="160" cy="114" r="12" fill="#f5c95c"/>
    <circle class="lm3d-bulb" cx="102" cy="144" r="5" fill="#fff2b8"/>
    <circle class="lm3d-bulb b2" cx="222" cy="152" r="5" fill="#fff2b8"/>
   </g>
  </svg>`;
 }
 return {svg,label:labels3d[id]||'✨ Không gian 3D Lowf'};
}
function activeSeason(settings=mergedSettings()){const id=settings?.decor?.season||defaultDecor.season;return SEASON_THEMES[id]||SEASON_THEMES.classic}
function loadLocalDecor(){try{return JSON.parse(localStorage.getItem(DECOR_KEY)||'null')}catch{return null}}
function saveLocalDecor(patch){try{const cur=loadLocalDecor()||{};localStorage.setItem(DECOR_KEY,JSON.stringify({...cur,...patch}));}catch{}}
function mergedSettings(){
 const base=state.settings||{};const local=isOwner()?loadLocalDecor():null;
 if(!local)return base;
 return {
  ...base,
  brand:{...(base.brand||{name:'Lowf',tagline:'BOOK & BEYOND'}),...(local.brand||{})},
  palette:{...(base.palette||{primary:'#2c6546',background:'#f6f5f0',surface:'#fdfcf9',text:'#1d2b22'}),...(local.palette||{})},
  hero:{...(base.hero||{title:'Giữa bộn bề,\ntìm một trang yên.',subtitle:'Những cuốn sách hay, một bản nhạc dịu. Và khoảng thời gian dành riêng cho bạn.',ctaLabel:'Khám phá thư viện',ctaView:'library'}),...(local.hero||{})},
  sections:Array.isArray(local.sections)?local.sections:base.sections,
  font:local.font||base.font||'serif',
  radius:Number.isFinite(local.radius)?local.radius:(base.radius??18),
  decor:{...defaultDecor,...(base.decor||{}),...(local.decor||{})}
 };
}
function applySettings(){
 const s=mergedSettings(),brand=s.brandName||s.brand?.name||'Lowf',sea=activeSeason(s);
 $$('[data-brand]').forEach(e=>e.textContent=brand+'.');
 $$('[data-tagline]').forEach(e=>e.textContent=s.tagline||s.brand?.tagline||'BOOK & BEYOND');
 document.title=brand+' — Book & beyond';
 const root=document.documentElement,isDark=root.dataset.theme==='dark';
 const accent=s.accentColor||s.palette?.primary;
 if(!isDark&&/^#[\da-f]{6}$/i.test(accent||''))root.style.setProperty('--green',accent);else root.style.removeProperty('--green');
 const radius=Number(s.radius??s.cornerRadius);
 if(Number.isFinite(radius)&&radius>=8&&radius<=32)root.style.setProperty('--radius',radius+'px');
 for(const [key,token]of Object.entries({background:'--bg',surface:'--surface',text:'--ink'})){
  const value=s.palette?.[key];
  if(!isDark&&/^#[\da-f]{6}$/i.test(value||''))root.style.setProperty(token,value);else root.style.removeProperty(token);
 }
 root.style.setProperty('--season-accent',sea.accent);
 root.style.setProperty('--hero-bg-1',sea.heroBg1);
 root.style.setProperty('--hero-bg-2',sea.heroBg2);
 root.style.setProperty('--hero-border',sea.heroBorder);
 root.classList.toggle('font-sans',s.font==='sans');
 const decor={...defaultDecor,...(s.decor||{})};
 root.dataset.season=sea.id;
 root.dataset.bgPattern=decor.bgPattern||'orbs3d';
 root.dataset.navStyle=decor.navStyle||'pill-glow';
 root.dataset.navEffect=decor.navEffect||'magnetic';
 root.dataset.navSync=decor.navSync===false?'custom':'season';
 const customNav=decor.navSync===false&&/^#[\da-f]{6}$/i.test(decor.navColor||'')?decor.navColor:'';
 const navAccent=customNav||(/^#[\da-f]{6}$/i.test(accent||'')?accent:sea.palette.primary);
 if(!isDark){
  root.style.setProperty('--nav-accent',navAccent);
  root.style.setProperty('--mint',`color-mix(in srgb,${navAccent} 13%,var(--bg))`);
 }else{
  root.style.setProperty('--nav-accent',customNav||`color-mix(in srgb,${navAccent} 72%,#ffffff)`);
  root.style.removeProperty('--mint');
 }
 applyBrandIdentity(s,navAccent,sea);
 root.dataset.fxLevel=decor.fxLevel||'vivid';
 root.dataset.stars=decor.stars||'bright';
 root.dataset.cardStyle=decor.cardStyle||'hardcover';
 root.classList.toggle('decor-aurora',decor.aurora!==false);
 root.classList.toggle('decor-grain',decor.paperGrain!==false);
 const wpLayer=$('#bgWallpaperLayer');
 if(wpLayer){
  const wpEntry=BG_WALLPAPERS.find(w=>w.id===decor.bgWallpaper);
  const wpUrl=decor.bgImageAssetId?asset(decor.bgImageAssetId):(wpEntry?.url||'');
  const op=Math.max(8,Math.min(70,Number(decor.bgOpacity??32)))/100;
  if(wpUrl){
   let img=$('img',wpLayer);
   if(!img){img=document.createElement('img');img.alt='';img.decoding='async';wpLayer.replaceChildren(img);}
   if(img.getAttribute('src')!==wpUrl)img.src=wpUrl;
   wpLayer.style.opacity=String(op);
  }else{
   wpLayer.replaceChildren();
   wpLayer.style.opacity='0';
  }
  root.classList.toggle('has-bg-wallpaper',!!wpUrl);
 }
 const petals=$('#petalsLayer');if(petals)petals.hidden=!(decor.petals!==false&&(decor.fxLevel||'vivid')!=='off');
 const lm=$('#seasonLandmark3d');
 if(lm){
  const showLm=decor.landmark3d!==false&&(decor.fxLevel||'vivid')!=='off';
  lm.hidden=!showLm;
  if(showLm&&lm.dataset.renderedSeason!==sea.id){
   const art=seasonLandmark3D(sea.id);
   lm.dataset.renderedSeason=sea.id;
   lm.innerHTML=`<div class="lm3d-rig"><div class="lm3d-floor"></div><div class="lm3d-ring"></div>${art.svg}</div>`;
  }
 }
 if(state.loaded)renderRight();
 applyReaderPrefs();
}
function sectionEnabled(name){const s=mergedSettings();if(Array.isArray(s.sections))return s.sections.includes(name)||s.sections.some(x=>typeof x==='object'&&x.id===name&&x.visible!==false);if(s.sections&&typeof s.sections==='object')return s.sections[name]!==false;return true}
function renderOwnerControls(){
 const owner=isOwner(),lostOwner=renderedOwner&&!owner;renderedOwner=owner;
 const slots=[['#ownerSidebar',`<a href="/admin" class="nav-item management-link">${icon('sliders-horizontal')}<span>Quản lý website</span></a>`],['#ownerMobile',`<span>Không gian chủ website</span><a href="/admin">${icon('sliders-horizontal')} Quản lý website ${icon('arrow-up-right')}</a>`],['#ownerFooter',`<a href="/huong-dan.html">Hướng dẫn quản trị ${icon('arrow-up-right')}</a>`]];
 for(const [selector,markup]of slots){const slot=$(selector);if(slot){slot.hidden=!owner;slot.innerHTML=owner?markup:'';}}
 const decorBtn=$('#ownerDecorBtn');if(decorBtn)decorBtn.hidden=!owner;
 if(!owner){closeDecorDrawer();$('#decorDrawer')?.replaceChildren();}
 renderOwnerEnvironment();
 if(lostOwner){
  if($('#modalContent [data-owner-surface]')){closeModal();$('#modalContent').replaceChildren();}
  if(state.designPreview){state.designPreview=false;state.environment=null;state.settings={};applySettings();const url=new URL(location.href);url.searchParams.delete('designPreview');history.replaceState(null,'',url.pathname+url.search+url.hash);state.loaded=false;renderMain();void bootstrap();}
  else{applySettings();if(state.loaded)renderMain();}
 }
}
function renderOwnerEnvironment(){
 const slot=$('#ownerEnvironment');if(!slot)return;
 const owner=isOwner(),env=state.environment,draft=owner&&state.designPreview===true;
 slot.hidden=!(owner&&(draft||env));if(slot.hidden){slot.replaceChildren();return;}
 const envLink=value=>{try{const url=new URL(value);return url.protocol==='https:'&&['lowf-library.vercel.app','lowf-library-preview.vercel.app'].includes(url.hostname)&&!url.username&&!url.password?url.origin:'';}catch{return'';}};
 const preview=env?.name==='preview',target=envLink(preview?env?.productionUrl:env?.previewUrl);
 slot.innerHTML=`<div><strong>${draft?'Xem bản nháp giao diện — chưa xuất bản':preview?'Môi trường Preview':'Trang đã xuất bản'}</strong><span>${draft?'Chỉ tài khoản chủ website đang xem giao diện này.':preview?'Kiểm tra các thay đổi trong bản thử nghiệm.':'Chỉnh sửa trong Studio và kiểm tra trước khi xuất bản.'}</span></div><div class="owner-environment-actions">${draft?'<a href="/">Thoát xem nháp</a><a href="/admin?tab=design">Chỉnh giao diện ↗</a>':`${target?`<a href="${esc(target)}" target="_blank" rel="noopener noreferrer">${preview?'Mở trang đã xuất bản':'Mở môi trường Preview'} ↗</a>`:''}<a href="/admin">Mở Studio ↗</a>`}</div>`;
}

function renderUser(){
 const name=state.user?.name||'Bạn đọc mới',logged=!!state.user,w=logged?getWallet():null;
 $('#headerUser').classList.toggle('is-logged',logged);
 $('#headerUser').innerHTML=`${avatarHTML(logged?name:'',logged)}<span class="header-label"><strong>${logged?esc(name.split(' ').slice(-2).join(' ')):'Đăng nhập'}</strong>${logged?`<small class="user-sub-meta"><span class="coin-chip">🪙 ${w.balance} Xu</span> · Lv.${state.stats.level||1}</small>`:'<small>Tạo tài khoản</small>'}</span>${icon('chevron-down')}`;
 $('#headerUser').setAttribute('aria-label',isOwner()?'Mở hồ sơ cá nhân và quản lý website':logged?'Mở hồ sơ cá nhân và Ví Xu':'Đăng nhập');
 $('#headerUser').setAttribute('aria-haspopup',isOwner()?'dialog':'false');
 $('#sidebarUser').classList.toggle('is-logged',logged);
 $('#sidebarUser').innerHTML=`${avatarHTML(logged?name:'',logged)}<div><strong>${esc(name)}</strong><small>${logged?`🪙 ${w.balance} Xu · ${isOwner()?'Chủ trang':'Lv.'+(state.stats.level||1)}`:'Bấm để đăng nhập'}</small></div><span class="user-go-pill">${logged?'Hồ sơ':'Vào'}</span>`;
 renderOwnerControls();updateThemeButtons();icons();window.dispatchEvent(new Event('lowf:userchange'))
}
function navigate(view,{updateURL=true}={}){if(!labels[view])return;clearTimeout(orderPollTimer);state.view=view;state.query='';state.filter='all';$('#search').value='';$('#pageName').textContent=labels[view];$$('[data-action="nav"]').filter(e=>e.closest('.nav-list,.bottom-tabs')).forEach(e=>{const active=e.dataset.view===view||(view==='pdf'&&e.dataset.view==='library'&&e.closest('.bottom-tabs'))||(view==='video'&&e.dataset.view==='studio'&&e.closest('.bottom-tabs'))||(view==='orders'&&e.dataset.view==='profile'&&e.closest('.bottom-tabs'));e.classList.toggle('active',active);if(active)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current')});if(updateURL)viewURL(view);renderMain();window.scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});if(view==='pdf')loadPDFs();if(view==='community')loadCommunity();if(view==='reviews')loadReviews();if(view==='orders'&&state.user){loadOrders();if(state.selectedOrderId)loadOrder(state.selectedOrderId)}}
function empty(title,text,action='',symbol='book-open'){return `<div class="empty">${icon(symbol)}<h3>${title}</h3><p>${text}</p>${action}</div>`}
function minutes(){return Math.floor((Number(state.stats.todaySeconds)||0)/60)}
function streak(){let n=0,d=new Date(`${dateKey()}T12:00:00+07:00`);for(let i=0;i<366;i++){const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);if((state.data.secondsByDay[key]||0)<60){if(i===0){d.setDate(d.getDate()-1);continue}break}n++;d.setDate(d.getDate()-1)}return n}
function stats(){return `<div class="stats"><div class="stat"><span class="stat-icon">${icon('book-open')}</span><div><span>Đọc & tập trung hôm nay</span><strong><b data-today>${minutes()}</b><small>phút</small></strong></div></div><div class="stat"><span class="stat-icon">${icon('flame')}</span><div><span>Chuỗi ngày đọc sách</span><strong><b data-streak>${streak()}</b><small>ngày</small></strong></div></div><div class="stat"><span class="stat-icon">${icon('sparkles')}</span><div><span>Hành trình của bạn</span><strong>Lv. <b data-level>${state.stats.level||1}</b><small data-xp>${state.stats.xp||0} XP</small></strong></div></div></div>`}
function coverURL(b){return b.coverAssetId?asset(b.coverAssetId):(typeof b.cover==='string'&&(b.cover.startsWith('data:image/svg+xml')||safeURL(b.cover))?b.cover:'')}
function coverHTML(b,className=''){const url=coverURL(b);return url?`<span class="book-jacket ${className}"><img src="${esc(url)}" alt="Bìa ${esc(b.title)}" width="300" height="420" loading="lazy" decoding="async"></span>`:`<span class="book-placeholder">${esc(b.title)}</span>`}
function card(b){const saved=state.data.saved.includes(b.id);const tagLabel=b.access==='member'?'Thành viên':b.language==='en'?'English · IPA':b.pdfAssetId?'PDF':(b.format||'Ebook');return `<article class="book-card"><div class="book-cover">${coverHTML(b)}<button class="cover-target" data-action="read" data-id="${esc(b.id)}" aria-label="Đọc ${esc(b.title)}"></button><span class="format-tag">${esc(tagLabel)}</span><button class="bookmark ${saved?'saved':''}" data-action="bookmark" data-id="${esc(b.id)}" aria-label="${saved?'Bỏ lưu':'Lưu'} ${esc(b.title)}" aria-pressed="${saved}">${icon('bookmark')}</button></div><h3 title="${esc(b.title)}">${esc(b.title)}</h3><p class="author">${esc(b.author||'Lowf tuyển chọn')}</p><div class="book-meta">${icon(b.access==='member'?'sparkles':'leaf')} ${b.access==='member'?'Dành cho thành viên':b.language==='en'?'Song ngữ · IPA':'Đọc miễn phí'}</div><button class="button button-soft" data-action="read" data-id="${esc(b.id)}">${icon('book-open')} Mở trang sách</button></article>`}
const categoryOrder=['kinhte','kynang','vanhocvn','vanhocqt','tieuthuyet','khoahoc','lichsu','tamlinh','trinhtham','dacbiet'];
const categoryLabels={kinhte:'Kinh tế & Đầu tư',kynang:'Phát triển bản thân',vanhocvn:'Văn học Việt Nam',vanhocqt:'Văn học nước ngoài',tieuthuyet:'Tiểu thuyết & Kỳ ảo',khoahoc:'Khoa học & Công nghệ',lichsu:'Lịch sử & Quân sự',tamlinh:'Tôn giáo & Tâm linh',trinhtham:'Trinh thám & Kinh dị',dacbiet:'Tuyển chọn Lowf'};
function categories(){const present=new Set(state.books.map(b=>b.category).filter(Boolean));const values=[...categoryOrder.filter(k=>present.has(k)),...[...present].filter(k=>!categoryOrder.includes(k))];const countOf=id=>id==='all'?state.books.length:state.books.filter(b=>b.category===id).length;return `<div class="filters" role="group" aria-label="Lọc thể loại"><button class="filter ${state.filter==='all'?'active':''}" data-action="filter" data-id="all" aria-pressed="${state.filter==='all'}">Tất cả <small>(${countOf('all')})</small></button>${values.map(id=>`<button class="filter ${state.filter===id?'active':''}" data-action="filter" data-id="${esc(id)}" aria-pressed="${state.filter===id}">${esc(categoryLabels[id]||id)} <small>(${countOf(id)})</small></button>`).join('')}</div>`}
function matches(b){const q=state.query.toLocaleLowerCase('vi');const bySort=state.sort==='english'?b.language==='en':state.sort==='pdf'?!!b.pdfAssetId:state.sort==='epub'?!b.pdfAssetId:state.sort==='print'?['Sách giấy','Combo'].includes(b.format):true;return bySort&&(state.filter==='all'||b.category===state.filter)&&(!q||`${b.title} ${b.author}`.toLocaleLowerCase('vi').includes(q))}
function sortedBooks(){const list=state.books.filter(matches);if(state.sort==='az')return [...list].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'vi'));return list}
function shelf(home=false){
 const list=home?state.books.filter(matches):sortedBooks();
 const limit=home?16:(state.libraryLimit||24);
 const visible=list.slice(0,limit);
 const moreCount=Math.max(0,list.length-visible.length);
 const foot=home&&moreCount>0?`<div style="margin-top:14px;display:flex;justify-content:flex-end"><button type="button" class="text-button" data-action="nav" data-view="library">Xem toàn bộ ${list.length} cuốn sách trong Thư viện ${icon('arrow-right')}</button></div>`
  :!home&&moreCount>0?`<div style="margin-top:22px;text-align:center"><button type="button" class="button button-soft" data-action="library-more">Xem thêm ${Math.min(24,moreCount)} sách · Đang hiện ${visible.length} / ${list.length} ${icon('chevron-down')}</button></div>`:'';
 return `${categories()}${visible.length?`<div id="bookShelf" class="${home?'book-shelf':'book-grid'}">${visible.map(card).join('')}</div>${foot}`:empty(state.query?'Chưa tìm thấy cuốn sách này':'Thư viện đang được chuẩn bị',state.query?'Thử một tên sách, tác giả hoặc thể loại khác.':'Những cuốn sách được xuất bản sẽ xuất hiện ở đây.',state.query?'<button class="button button-soft" data-action="reset-search">Xóa bộ lọc</button>':isOwner()?'<a class="button button-primary" href="/admin">Thêm sách đầu tiên</a>':'')}`;
}
function dashboard(){const settings=mergedSettings(),sea=activeSeason(settings),recent=Object.entries(state.data.progress).sort((a,b)=>String(b[1].updated||'').localeCompare(String(a[1].updated||''))).map(([id])=>book(id)).find(Boolean),b=recent||state.books[0],p=b&&state.data.progress[b.id],total=b?.chapters?.length||b?.chapterCount||1,percent=p?Math.min(100,Math.round(((p.chapter||0)+(p.finished?1:0))/total*100)):0,heroTitle=settings.heroTitle||settings.hero?.title,heroSub=settings.heroSubtitle||settings.hero?.subtitle,heroImg=settings.heroImageAssetId||settings.hero?.imageAssetId;const books=state.books.slice(0,4);return `<div class="season-ribbon"><div class="season-ribbon-left"><span class="pulse-dot" aria-hidden="true"></span><span class="season-pill">${sea.badge}</span><span class="season-ribbon-text">${esc(sea.ribbon)}</span></div><div class="season-ribbon-right"><span class="ribbon-spark" aria-hidden="true">✦</span>${isOwner()?`<button type="button" class="ribbon-owner-btn" data-action="decor-open">${icon('sparkles')} Đổi mùa</button>`:`<span class="ribbon-date">${icon('calendar-days')}${new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date())}</span>`}</div></div><div class="intro"><div><div class="eyebrow">${sea.icon} MỘT NGÀY ĐẸP ĐỂ ĐỌC SÁCH</div><h1>${state.user?`Chào ${esc(state.user.name.split(' ').slice(-2).join(' '))}`:'Chào bạn, người yêu sách'} <span class="sun">${sea.icon}</span></h1><p>Chậm lại một chút. Một thế giới mới đang chờ bạn mở ra.</p></div><span class="date-chip">${icon('calendar-days')}${new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date())}</span></div>${sectionEnabled('hero')?`<section class="hero">${heroImg?'':seasonArtSVG(sea.id)}${!heroImg&&(settings.decor?.landmark3d!==false)&&(settings.decor?.fxLevel||'vivid')!=='off'?`<div class="hero-landmark-3d" aria-hidden="true">${seasonLandmark3D(sea.id).svg}</div>`:''}<div class="hero-sunbeams" aria-hidden="true"></div><span class="shooting-star" aria-hidden="true"></span><div class="hero-copy"><div class="eyebrow hero-eyebrow-pill">✦ ${sea.label.toUpperCase()}</div><h2>${heroTitle?esc(heroTitle).replace(/\n/g,'<br>'):'Giữa bộn bề,<br>tìm một <em>trang yên.</em>'}</h2><p>${heroSub?esc(heroSub):'Những cuốn sách hay, một bản nhạc dịu.<br>Và khoảng thời gian dành riêng cho bạn.'}</p><div class="hero-cta-row"><button class="uiverse-cta" data-action="nav" data-view="${({membership:'plans',store:'store',library:'library',studio:'studio',pdf:'pdf',community:'community',profile:'profile',reviews:'reviews'})[settings.heroCtaView||settings.hero?.ctaView]||'library'}"><span class="cta-glow" aria-hidden="true"></span><span class="cta-inner"><span>${esc(settings.heroCtaLabel||settings.hero?.ctaLabel||'Khám phá thư viện')}</span> ${icon('arrow-up-right')}</span></button>${isOwner()?`<button class="button button-soft hero-decor-btn" data-action="decor-open">${icon('sparkles')} Đổi mùa &amp; Trang trí</button>`:''}</div><div class="hero-chips"><span>${icon('book-open')} ${state.books.length} đầu sách</span><span>${icon('headphones')} 6 giọng đọc</span><span>${icon('languages')} Từ điển IPA</span></div></div>${heroImg?`<img class="hero-custom" src="${asset(heroImg)}" alt="Không gian Lowf">`:`<div class="hero-art" aria-hidden="true"><div class="hero-glow"></div><div class="orbit"></div><div class="star-field"><span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">✦</span><span class="star s4">•</span><span class="star s5">•</span><span class="star s6">✧</span></div>${[books[3]||books[0],books[1]||books[0],books[0]].filter(Boolean).map((bk,i)=>`<span class="hero-book-3d ${['one','two','three'][i]}"><img src="${esc(coverURL(bk))}" alt=""></span>`).join('')}<span class="hero-note">${esc(sea.note)}</span></div>`}</section>`:''}${sectionEnabled('stats')?stats():''}${b&&sectionEnabled('continue')?`<div class="section-heading"><h2>${p?'Tiếp nối câu chuyện':'Bắt đầu một trang mới'}</h2><button class="text-button" data-action="nav" data-view="pdf">Kệ sách của tôi ${icon('arrow-right')}</button></div><div class="continue">${coverHTML(b)}<div class="continue-info"><small>${p?'ĐANG ĐỌC DỞ':'LOWF GỢI Ý CHO BẠN'}</small><h3>${esc(b.title)}</h3><p>${esc(b.author)}${(b.chapters?.length||b.chapterCount)?` · Chương ${(p?.chapter||0)+1} / ${total}`:''}</p></div><div class="continue-progress"><small>${percent}% hành trình</small><div class="progress-line"><span style="width:${percent}%"></span></div></div><button class="button button-soft" data-action="read" data-id="${esc(b.id)}">${p?'Đọc tiếp':'Mở sách'} ${icon('arrow-right')}</button></div>`:''}${sectionEnabled('books')?`<div class="section-heading"><div><h2>Dành cho một tâm hồn tò mò</h2><p>Một vài cuốn sách, biết đâu lại thay đổi một ngày.</p></div><div class="shelf-arrows"><button class="icon-button" data-action="shelf-prev" aria-label="Xem sách trước">${icon('chevron-left')}</button><button class="icon-button" data-action="shelf-next" aria-label="Xem sách tiếp">${icon('chevron-right')}</button></div></div>${shelf(true)}`:''}<div class="bento">${sectionEnabled('ambient')?`<section class="bento-card ambient-card peace-sanctuary"><div class="peace-top"><div class="eyebrow">🌿 GÓC NHỎ BÌNH YÊN</div><span class="peace-eq ${isAudioPlaying()?'is-live':''}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></div><h3>Để thế giới ngoài kia<br>khẽ lại một chút.</h3><p>Hít vào thật sâu, bật một giai điệu dịu và mở một trang sách yên.</p><div class="peace-moods" role="group" aria-label="Bật nhanh âm thanh thư giãn">${[['hanoi_rain','🌧️ Mưa Hà Nội'],['dalat_pine','🌲 Rừng Đà Lạt'],['cafe_jazz','☕ Cafe Jazz']].map(([mid,lbl])=>`<button type="button" class="peace-mood-pill ${state.ambient===mid&&BookMedia.playing?'active':''}" data-action="ambient" data-id="${mid}">${lbl}</button>`).join('')}</div><div class="card-bottom"><span>${Object.keys(ambientModes).length} không gian · ${TREND_PLAYLISTS.length} Playlist Chill</span><button type="button" class="peace-studio-btn" data-action="nav" data-view="studio" aria-label="Mở phòng tập trung">${icon('headphones')} Vào phòng tập trung</button></div></section>`:''}${sectionEnabled('deal')?`<section class="bento-card member-card"><div class="eyebrow">MỘT HÀNH TRÌNH DÀI HƠN</div><h3>Một tài khoản.<br>Khoảng trời riêng bạn.</h3><p>Lưu sách yêu thích, nối tiếp hành trình đọc trên mọi thiết bị.</p><div class="card-bottom"><span>Bắt đầu miễn phí</span><button class="icon-button" data-action="nav" data-view="plans" aria-label="Xem gói thành viên">${icon('arrow-up-right')}</button></div></section>`:''}</div>`}
function readingWidget(){const t=minutes();return `<section class="widget"><div class="widget-heading"><h2>Mỗi ngày một chút</h2>${icon('sprout')}</div><p class="widget-sub">Hẹn mình 30 phút đọc sách hôm nay nhé.</p><div class="reading-ring"><svg viewBox="0 0 128 128" aria-hidden="true"><circle class="ring-track" cx="64" cy="64" r="56"/><circle class="ring-progress" cx="64" cy="64" r="56" style="stroke-dashoffset:${351.86*(1-Math.min(t/30,1))}"/></svg><div class="ring-center"><strong><b data-today>${t}</b><small> / 30</small></strong><span>phút hôm nay</span></div></div><div class="reading-stats"><div><span>Tháng này</span><strong>${Math.floor((state.stats.monthSeconds||0)/60)} phút</strong></div><div><span>Chuỗi ngày đọc</span><strong>${streak()} ngày</strong></div></div><p class="widget-foot">${state.user?'Thời gian đọc và nhạc tập trung được ghi nhận trên tài khoản.':'Đăng nhập để lưu thời gian đọc và tích lũy XP.'}</p></section>`}
function rankWidget(full=false){const readers=state.readers.slice(0,full?10:4),soc=full?getSocial():null;return `<section class="widget"><div class="widget-heading"><h2>Những người bạn chăm đọc</h2>${icon('trophy')}</div><p class="widget-sub">Top độc giả tháng ${Number(dateKey().slice(5,7))}</p>${readers.length?`<div class="rank-list">${readers.map((r,i)=>{const pid=peerIdFor(r.name),isSelf=!!state.user&&(r.id===state.user.id||r.name===state.user.name),isFr=soc?.friends?.includes(pid),isSent=soc?.sent?.includes(pid);return `<div class="${full?'rank-row-social':'rank-row'}"><span class="rank-num">${String(i+1).padStart(2,'0')}</span>${avatarHTML(r.name,isSelf,r.avatar||'')}<div class="rank-info"><strong>${esc(r.name)}</strong><small>${Number(r.hours??(r.seconds||0)/3600).toFixed(1)} giờ đọc</small></div>${full&&!isSelf?`<div class="rank-mini-acts"><button type="button" class="${isFr?'is-friend':''}" data-action="friend-toggle" data-id="${esc(pid)}" data-name="${esc(r.name)}">${isFr?'✓ Bạn bè':isSent?'Đã gửi':'+ Kết bạn'}</button><button type="button" data-action="comm-dm-open" data-id="${esc(pid)}" data-name="${esc(r.name)}">💬</button></div>`:`<span class="level-badge">Lv. ${Number(r.level)||1}</span>`}</div>`}).join('')}</div>`:`<p class="mini-note">${state.readersError?'Chưa tải được bảng xếp hạng. Hãy thử lại sau.':'Bảng xếp hạng sẽ bắt đầu từ những phút đọc đầu tiên của cộng đồng.'}</p>`}${!full?`<button class="text-button" data-action="nav" data-view="community">Ghé thăm cộng đồng ${icon('arrow-right')}</button>`:''}</section>`}
function seasonStageWidget(){
 const s=mergedSettings(),dec={...defaultDecor,...(s.decor||{})};
 if(dec.landmark3d===false||(dec.fxLevel||'vivid')==='off')return '';
 const sea=activeSeason(s),art=seasonLandmark3D(sea.id);
 return `<section class="widget season-stage-widget" aria-label="Không gian 3D theo mùa"><div class="season-stage-head"><small>KHÔNG GIAN 3D · ${esc(sea.name)}</small><span>${sea.icon}</span></div><div class="season-stage-box"><div class="lm3d-rig"><div class="lm3d-floor"></div><div class="lm3d-ring"></div>${art.svg}<span class="lm3d-caption">${esc(art.label)}</span></div></div></section>`;
}
function renderRight(){$('#rightPanel').innerHTML=seasonStageWidget()+readingWidget()+rankWidget()+`<section class="widget community-callout"><div class="widget-heading"><h2>Trạm dừng chân</h2>${icon('messages-square')}</div><p>Một cuốn sách,<br>nhiều cách cảm nhận.</p><button class="button" data-action="nav" data-view="community">Cùng nhau trò chuyện ${icon('arrow-up-right')}</button></section><div class="quote"><span>“</span><p>Có những chuyến đi,<br>chỉ cần mở một trang sách.</p><small>MỘT CHÚT CẢM HỨNG TỪ LOWF</small></div>`;icons()}
function library(){const shown=sortedBooks().length;return `<div class="page-intro"><div class="eyebrow">MỖI CUỐN SÁCH LÀ MỘT CÁNH CỬA</div><h1>Một thư viện, ngàn cảm hứng.</h1><p>Khám phá ${state.books.length} đầu sách tuyển chọn — tích hợp 6 giọng đọc truyền cảm, ghi chú, bút vẽ và từ điển IPA.</p></div><div class="library-bar"><div class="page-tabs" style="margin-bottom:0"><button class="button button-primary" data-action="nav" data-view="library">${icon('book-open')} Thư viện (${shown})</button><button class="button button-soft" data-action="nav" data-view="pdf">${icon('upload')} PDF của tôi</button>${isOwner()?'<a class="button button-soft" href="/admin?tab=books">Quản lý sách</a>':''}</div><label class="library-sort"><span>Hiển thị</span><select id="librarySort" aria-label="Sắp xếp thư viện"><option value="featured" ${state.sort==='featured'?'selected':''}>Tuyển chọn nổi bật</option><option value="az" ${state.sort==='az'?'selected':''}>Tên sách A – Z</option><option value="epub" ${state.sort==='epub'?'selected':''}>Sách chữ (Ebook / EPUB)</option><option value="pdf" ${state.sort==='pdf'?'selected':''}>Sách PDF</option><option value="english" ${state.sort==='english'?'selected':''}>Sách tiếng Anh · IPA</option><option value="print" ${state.sort==='print'?'selected':''}>Sách giấy & Combo</option></select></label></div>${state.query?`<div class="notice" style="margin-bottom:20px">Kết quả cho “${esc(state.query)}” · ${shown} cuốn sách</div>`:''}${shelf()}`}
function pdfPage(){const saved=state.data.saved.map(book).filter(Boolean);return `<div class="page-intro"><div class="eyebrow">MỘT GÓC RẤT RIÊNG</div><h1>Kệ sách của tôi</h1><p>Tải lên file sách scan PDF, Ebook EPUB, TXT hoặc Markdown — Lowf tự động lọc nền giấy scan, nâng nét chữ và tối ưu cảm giác đọc mượt mà.</p></div><button class="upload-zone" data-action="upload-pdf">${icon('file-up')}<strong>Thêm sách PDF (kể cả bản Scan), EPUB, TXT vào kệ</strong><span>Tự động tối ưu chữ, lọc nền giấy scan &amp; đồng bộ màu giấy · tối đa 30 MB / file</span></button><div class="notice">Sách tải lên cá nhân được giữ riêng trên trình duyệt này. File EPUB/TXT sẽ tự tách chương sang giao diện sách Lowf; file PDF Scan tự lọc nền xám và thích ứng chế độ đọc đêm. ${isOwner()?'Để xuất bản sách cho mọi người, vào <a href="/admin">Quản trị → Sách</a>.':''}</div><div class="section-heading"><h2>Sách trên thiết bị (${state.pdfs.length})</h2></div><div class="pdf-list">${state.pdfs.length?state.pdfs.map(p=>`<article class="pdf-row">${icon(p.kind==='ebook'?'book-open':'file-text')}<div class="pdf-info"><h3>${esc(p.name)}</h3><p>${p.kind==='ebook'?`Ebook tự tối ưu · ${p.chapterCount||1} chương`:'PDF / Scan tự lọc nền'} · ${(p.size/1048576).toFixed(1)} MB</p></div><button class="button button-soft" data-action="read-local" data-id="${esc(p.id)}">Đọc ngay</button><button class="icon-button" data-action="export-pdf" data-id="${esc(p.id)}" aria-label="Tải bản gốc">${icon('download')}</button><button class="icon-button" data-action="delete-pdf" data-id="${esc(p.id)}" aria-label="Xóa tệp">${icon('trash-2')}</button></article>`).join(''):empty('Một kệ sách đang chờ được lấp đầy','Thêm file PDF scan, EPUB hoặc TXT đầu tiên để trải nghiệm chế độ đọc tự động tối ưu.')}</div><div class="section-heading"><h2>Sách đã lưu (${saved.length})</h2>${hasLegacySaved()?'<button class="text-button" data-action="import-saved">Nhập sách đã lưu từ bản cũ</button>':''}</div>${!state.user?empty('Một chiếc kệ mang tên bạn','Đăng nhập để lưu sách yêu thích và đồng bộ giữa các thiết bị.','<button class="button button-primary" data-action="auth">Đăng nhập</button>'):saved.length?`<div class="book-grid">${saved.map(card).join('')}</div>`:empty('Chưa có sách yêu thích','Chạm biểu tượng đánh dấu trên bìa sách để lưu tại đây.')}`}
function studio(){
 const modeList=Object.entries(ambientModes);
 return `<div class="page-intro"><div class="eyebrow">MUSIC &amp; AMBIENT STUDIO</div><h1>Một khoảng lặng cho bạn.</h1><p>${modeList.length} không gian âm thanh Studio phát tức thì &amp; ${TREND_PLAYLISTS.length} Playlist nhạc Trend Chill YouTube đồng hành cùng từng trang sách.</p></div><div class="page-tabs"><button class="button button-primary" data-action="nav" data-view="studio">${icon('headphones')} Âm nhạc (${modeList.length+TREND_PLAYLISTS.length})</button><button class="button button-soft" data-action="nav" data-view="video">${icon('clapperboard')} Góc video</button>${isOwner()?'<a class="button button-soft" href="/admin">Thêm nhạc &amp; video</a>':''}</div><section class="studio-hero"><div class="star-field star-field-studio" aria-hidden="true"><span class="star s1">✦</span><span class="star s2">✧</span><span class="star s3">•</span><span class="star s4">✦</span><span class="star s5">•</span></div><div class="eyebrow">KHÔNG GIAN TẬP TRUNG CỦA LOWF</div><h2>Để những thanh âm<br>ôm lấy một ngày dài.</h2><p>Từ mưa đêm Hà Nội, rừng thông Đà Lạt, Cafe Jazz đến những playlist Lo-fi / Acoustic đang thịnh hành. Bật nhạc rồi mở sách đọc ngay.</p><button class="button button-white" data-action="play-first">${icon('play')} ${isAudioPlaying()?'Tiếp tục cùng âm nhạc':'Bắt đầu lắng nghe'}</button></section><div class="section-heading"><div><h2>Âm nhạc Studio phát liền mạch (${modeList.length} chủ đề)</h2><p>Phát ngay khi đang đọc sách · không quảng cáo · tự giảm nhỏ khi bật giọng đọc</p></div></div><div class="ambient-options ambient-grid-rich">${modeList.map(([id,t])=>{const on=state.ambient===id&&BookMedia.playing;return `<button class="ambient-option ${on?'active':''}" data-action="ambient" data-id="${id}" aria-pressed="${on}"><div class="ambient-head">${icon(t.icon)}<span class="ambient-tag">${esc(t.tag||'Studio')}</span>${on?'<span class="wave-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>':''}</div><strong>${t.title}</strong><span>${t.subtitle}</span></button>`}).join('')}</div><label class="volume-control">${icon('volume-2')}<span>Âm lượng</span><input id="volume" type="range" min="0" max="100" value="${Math.round(state.volume*100)}" aria-label="Âm lượng nhạc"></label><div class="section-heading"><div><h2>🔥 Playlist Nhạc Trend &amp; Chill (YouTube Chính Hãng)</h2><p>${TREND_PLAYLISTS.length} tuyển tập Lo-fi, Piano Ghibli, V-Pop Acoustic &amp; Cafe Jazz được nghe nhiều nhất</p></div></div><div class="trend-grid">${TREND_PLAYLISTS.map(p=>`<button type="button" class="trend-card" data-action="play-trend" data-id="${esc(p.id)}"><span class="trend-art" style="background:linear-gradient(135deg,${p.color},#18241d)"><img src="https://i.ytimg.com/vi/${esc(p.youtubeId)}/mqdefault.jpg" alt="" loading="lazy"><span class="trend-play">${icon('play')}</span><span class="trend-mood">${esc(p.mood)}</span></span><strong>${esc(p.title)}</strong><small>${esc(p.artist)}</small></button>`).join('')}</div><label class="music-search">${icon('search')}<input id="musicSearch" type="search" placeholder="Tìm bản nhạc, nghệ sĩ…" aria-label="Tìm bản nhạc"></label><div class="section-heading"><div><h2>Bản nhạc tải lên từ Lowf Studio</h2><p>${state.tracks.length} bản nhạc · nguồn và giấy phép trong từng bản nhạc</p></div></div><div class="music-list">${state.tracks.length?state.tracks.map((t,i)=>`<article class="music-row ${state.trackIndex===i&&!state.ambient?'active':''}"><span class="music-icon">${icon('music-2')}</span><div class="music-info"><h3>${esc(t.title)}</h3><p>${esc(t.artist||t.composer||'Lowf tuyển chọn')}${t.license?' · '+esc(t.license):''}</p></div><span class="duration">${t.durationSeconds?time(t.durationSeconds):''}</span><button class="icon-button" data-action="play-track" data-id="${esc(t.id)}" aria-label="Phát ${esc(t.title)}">${icon(state.trackIndex===i&&!audio.paused&&!state.ambient?'pause':'play')}</button><button class="icon-button" data-action="track-credit" data-id="${esc(t.id)}" aria-label="Thông tin và giấy phép">${icon('info')}</button></article>`).join(''):empty('Bạn có thể nghe ngay 13 bản Studio & 8 Playlist Trend phía trên','Chủ website cũng có thể tải thêm file MP3 riêng trong mục Quản trị → Âm nhạc.',isOwner()?'<a class="button button-primary" href="/admin?tab=tracks">Tải thêm nhạc MP3</a>':'','music-2')}</div>`;
}
function videos(){return `<div class="page-intro"><div class="eyebrow">GÓC VIDEO CỦA LOWF</div><h1>Thêm một góc nhìn.</h1><p>Những hình ảnh và câu chuyện được chọn để đồng hành cùng hành trình đọc.</p></div><div class="page-tabs"><button class="button button-soft" data-action="nav" data-view="studio">${icon('headphones')} Âm nhạc</button><button class="button button-primary" data-action="nav" data-view="video">${icon('clapperboard')} Video</button>${isOwner()?'<a class="button button-soft" href="/admin">Thêm video</a>':''}</div><div class="video-grid">${state.videos.length?state.videos.map(v=>`<article class="video-card"><button class="video-poster" data-action="play-video" data-id="${esc(v.id)}" aria-label="Xem ${esc(v.title)}">${v.coverAssetId||v.posterAssetId?`<img src="${asset(v.coverAssetId||v.posterAssetId)}" alt="${esc(v.title)}" loading="lazy">`:''}<span>${icon('play')}</span></button><h3>${esc(v.title)}</h3><p>${esc(v.description||'Mở video để bắt đầu xem.')}</p></article>`).join(''):empty('Góc video đang chờ câu chuyện đầu tiên','Những video mới sẽ xuất hiện tại đây khi sẵn sàng.',isOwner()?'<a class="button button-primary" href="/admin">Tải video lên</a>':'','clapperboard')}</div>`}
function peerIdFor(name){return 'u-'+String(name||'reader').toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)}
function socialKey(){return 'lowf.social.v1.'+userStorageId()}
const SEED_PEERS=[
 {id:'u-minh-anh',name:'Minh Anh',bio:'Yêu tản văn & đọc sách bên mưa',genre:'Văn học VN',level:10,hours:95},
 {id:'u-khanh-linh',name:'Khánh Linh',bio:'Thích tâm lý học & ghi chú sách',genre:'Kỹ năng sống',level:9,hours:82},
 {id:'u-hoang-nam',name:'Hoàng Nam',bio:'Đọc kinh tế mỗi sáng cùng cà phê',genre:'Kinh tế & Đầu tư',level:8,hours:76},
 {id:'u-thu-ha',name:'Thu Hà',bio:'Sưu tầm sách văn học Nhật & piano',genre:'Văn học nước ngoài',level:6,hours:54}
];
function getSocial(){
 const fallback={
  friends:['u-minh-anh'],
  requests:[{id:'u-khanh-linh',name:'Khánh Linh',bio:'Thích tâm lý học & đọc sách mỗi tối',genre:'Kỹ năng sống'}],
  sent:[],
  likes:{},
  replies:{},
  dms:{
   'u-minh-anh':[
    {id:'dm-seed-1',from:'them',name:'Minh Anh',text:'Chào bạn! Mình thấy bạn cũng hay đọc sách trên Lowf. Dạo này bạn đang đọc cuốn nào thế? 📖',at:new Date(Date.now()-3600000).toISOString()}
   ]
  },
  peers:{}
 };
 try{
  const raw=JSON.parse(localStorage.getItem(socialKey())||'null');
  if(raw&&typeof raw==='object')return {...fallback,...raw,friends:Array.isArray(raw.friends)?raw.friends:fallback.friends,requests:Array.isArray(raw.requests)?raw.requests:fallback.requests,sent:Array.isArray(raw.sent)?raw.sent:[],likes:raw.likes||{},replies:raw.replies||{},dms:{...fallback.dms,...(raw.dms||{})},peers:raw.peers||{}};
 }catch{}
 return fallback;
}
function saveSocial(soc){try{localStorage.setItem(socialKey(),JSON.stringify(soc))}catch{}}
function allCommunityPeers(soc=getSocial()){
 const map=new Map();
 SEED_PEERS.forEach(p=>map.set(p.id,p));
 (state.readers||[]).forEach(r=>{
  const id=peerIdFor(r.name);
  const existing=map.get(id);
  if(!existing)map.set(id,{id,name:r.name,avatar:r.avatar||'',bio:'Độc giả tích cực trên bảng xếp hạng Lowf',genre:'Đa thể loại',level:Number(r.level)||1,hours:Number(r.hours||0)});
  else if(r.avatar)map.set(id,{...existing,avatar:r.avatar});
 });
 (state.messages||[]).forEach(m=>{
  const id=peerIdFor(m.name);
  const existing=map.get(id);
  if(m.name&&!existing)map.set(id,{id,name:m.name,avatar:m.avatar||'',bio:'Thành viên Trạm dừng chân Lowf',genre:'Yêu sách',level:3,hours:18});
  else if(existing&&m.avatar)map.set(id,{...existing,avatar:m.avatar});
 });
 Object.values(soc.peers||{}).forEach(p=>{if(p?.id&&!map.has(p.id))map.set(p.id,p);});
 const myId=state.user?peerIdFor(state.user.name):'';
 return [...map.values()].filter(p=>p.id!==myId);
}
function formatShortTime(ts){if(!ts)return 'Vừa xong';try{return new Intl.DateTimeFormat('vi-VN',{hour:'2-digit',minute:'2-digit',day:'numeric',month:'numeric'}).format(new Date(ts))}catch{return ''}}
function messageIdOf(m,idx=0){return String(m.id||('m-'+peerIdFor(m.name)+'-'+idx))}
function messageHTML(m,idx=0){
 const soc=getSocial(),mid=messageIdOf(m,idx),pid=peerIdFor(m.name),isSelf=!!state.user&&(m.userId===state.user.id||m.name===state.user.name);
 const liked=!!soc.likes[mid],likeCount=(liked?1:0)+(idx%3+1);
 const replies=Array.isArray(soc.replies[mid])?soc.replies[mid]:[];
 const isFr=soc.friends.includes(pid),isSent=soc.sent.includes(pid);
 const isReplying=state.replyingTo===mid;
 return `<article class="comm-thread" data-mid="${esc(mid)}">
  <div class="comm-thread-head">
   ${avatarHTML(m.name,isSelf,m.avatar||'')}
   <div class="comm-thread-meta">
    <strong>${esc(m.name||'Bạn đọc')} ${isSelf?'<span class="level-badge">Bạn</span>':''}</strong>
    <small>${formatShortTime(m.createdAt)}</small>
   </div>
   ${!isSelf?`<button type="button" class="comm-act-btn ${isFr?'is-friend':''}" data-action="friend-toggle" data-id="${esc(pid)}" data-name="${esc(m.name||'Bạn đọc')}">${isFr?'✓ Bạn bè':isSent?'Đã gửi lời mời':'+ Kết bạn'}</button>`:''}
  </div>
  <p class="comm-thread-text">${esc(m.text)}</p>
  <div class="comm-thread-actions">
   <button type="button" class="comm-act-btn ${liked?'liked':''}" data-action="comm-like" data-id="${esc(mid)}">${liked?'❤️':'🤍'} Thích (${likeCount})</button>
   <button type="button" class="comm-act-btn" data-action="comm-reply-open" data-id="${esc(mid)}">↩️ Trả lời (${replies.length})</button>
   ${!isSelf?`<button type="button" class="comm-act-btn" data-action="comm-dm-open" data-id="${esc(pid)}" data-name="${esc(m.name||'Bạn đọc')}">💬 Nhắn riêng</button>`:''}
  </div>
  ${replies.length?`<div class="comm-replies">${replies.map(rep=>{const repSelf=!!state.user&&rep.name===state.user.name;return `<div class="comm-reply-item">${avatarHTML(rep.name,repSelf,rep.avatar||'')}<div class="comm-reply-body"><strong>${esc(rep.name)}</strong><small>${formatShortTime(rep.at)}</small><p>${esc(rep.text)}</p></div></div>`}).join('')}</div>`:''}
  ${isReplying?`<form class="comm-reply-form" data-reply-form="${esc(mid)}"><input name="reply" maxlength="400" placeholder="Trả lời bình luận của ${esc(m.name||'bạn đọc')}…" required><button type="submit">Gửi trả lời</button></form>`:''}
 </article>`;
}
function communityFriendsView(soc,peers){
 const q=(state.friendQuery||'').trim().toLocaleLowerCase('vi');
 const friendList=peers.filter(p=>soc.friends.includes(p.id)&&(!q||p.name.toLocaleLowerCase('vi').includes(q)));
 const suggestList=peers.filter(p=>!soc.friends.includes(p.id)&&!soc.requests.some(r=>r.id===p.id)&&(!q||p.name.toLocaleLowerCase('vi').includes(q)));
 return `<section class="widget">
  <div class="widget-heading"><h2>👥 Kết nối bạn đọc cùng gu</h2><span class="level-badge">${soc.friends.length} bạn bè</span></div>
  <p class="widget-sub">Kết bạn để dễ dàng trao đổi cảm nhận sách, gợi ý sách hay và nhắn tin riêng cùng nhau.</p>
  <label class="music-search" style="margin-top:14px">${icon('search')}<input id="friendSearch" type="search" value="${esc(state.friendQuery||'')}" placeholder="Tìm bạn đọc theo tên…" aria-label="Tìm bạn đọc"></label>
  ${soc.requests.length?`<div class="section-heading" style="margin-top:20px"><h2>Lời mời kết bạn (${soc.requests.length})</h2></div><div class="friends-grid">${soc.requests.map(req=>`<div class="friend-card"><div class="friend-card-top">${avatarHTML(req.name,false,req.avatar||'')}<div><strong>${esc(req.name)}</strong><small>${esc(req.bio||'Muốn kết bạn đọc sách cùng bạn')}</small></div></div><span class="friend-tag">📚 ${esc(req.genre||'Yêu sách')}</span><div class="friend-card-btns"><button type="button" class="button button-primary" data-action="friend-accept" data-id="${esc(req.id)}" data-name="${esc(req.name)}">✓ Chấp nhận</button><button type="button" class="button button-soft" data-action="friend-decline" data-id="${esc(req.id)}">Bỏ qua</button></div></div>`).join('')}</div>`:''}
  <div class="section-heading" style="margin-top:22px"><h2>Bạn bè của bạn (${friendList.length})</h2></div>
  ${friendList.length?`<div class="friends-grid">${friendList.map(p=>`<div class="friend-card"><div class="friend-card-top">${avatarHTML(p.name,false,p.avatar||'')}<div><strong>${esc(p.name)}</strong><small>Lv.${p.level} · ${p.hours} giờ đọc · ${esc(p.bio)}</small></div></div><span class="friend-tag">✓ Bạn đọc thân thiết</span><div class="friend-card-btns"><button type="button" class="button button-primary" data-action="comm-dm-open" data-id="${esc(p.id)}" data-name="${esc(p.name)}">💬 Nhắn tin</button><button type="button" class="button button-soft" data-action="friend-toggle" data-id="${esc(p.id)}" data-name="${esc(p.name)}">Hủy kết bạn</button></div></div>`).join('')}</div>`:`<p class="mini-note">Chưa có bạn bè nào khớp tìm kiếm. Hãy gửi lời mời kết bạn bên dưới nhé!</p>`}
  <div class="section-heading" style="margin-top:22px"><h2>Gợi ý kết bạn đọc sách</h2></div>
  <div class="friends-grid">${suggestList.map(p=>{const isSent=soc.sent.includes(p.id);return `<div class="friend-card"><div class="friend-card-top">${avatarHTML(p.name,false,p.avatar||'')}<div><strong>${esc(p.name)}</strong><small>Lv.${p.level} · ${p.hours} giờ đọc</small></div></div><span class="friend-tag">✨ ${esc(p.genre||'Thư viện Lowf')}</span><div class="friend-card-btns"><button type="button" class="button ${isSent?'button-soft':'button-primary'}" data-action="friend-toggle" data-id="${esc(p.id)}" data-name="${esc(p.name)}">${isSent?'✓ Đã gửi lời mời':'+ Kết bạn'}</button><button type="button" class="button button-soft" data-action="comm-dm-open" data-id="${esc(p.id)}" data-name="${esc(p.name)}">💬 Nhắn</button></div></div>`}).join('')}</div>
 </section>`;
}
function communityDmView(soc,peers){
 const activeId=state.activeDmPeer||soc.friends[0]||peers[0]?.id||'u-minh-anh';
 const peer=peers.find(p=>p.id===activeId)||SEED_PEERS[0];
 const thread=Array.isArray(soc.dms[peer.id])?soc.dms[peer.id]:[];
 const isFr=soc.friends.includes(peer.id);
 return `<section class="dm-shell" aria-label="Nhắn tin riêng giữa bạn đọc">
  <aside class="dm-list">
   <div class="dm-list-head"><span>💬 Hộp thư bạn đọc</span><small style="color:var(--muted)">${peers.length}</small></div>
   <div class="dm-list-items">${peers.map(p=>{const msgs=soc.dms[p.id]||[];const last=msgs[msgs.length-1]?.text||(soc.friends.includes(p.id)?'Bạn bè · Bấm để nhắn tin':'Bắt đầu trò chuyện');return `<button type="button" class="dm-peer ${p.id===peer.id?'active':''}" data-action="comm-dm-open" data-id="${esc(p.id)}" data-name="${esc(p.name)}">${avatarHTML(p.name,false,p.avatar||'')}<span class="dm-peer-info"><strong>${esc(p.name)}</strong><small>${esc(last)}</small></span><span class="dm-online-dot" title="Đang hoạt động"></span></button>`}).join('')}</div>
  </aside>
  <div class="dm-pane">
   <div class="dm-pane-head">
    <div>${avatarHTML(peer.name,false,peer.avatar||'')}<div><strong>${esc(peer.name)}</strong><small>${isFr?'✓ Bạn bè đọc sách':'Thành viên Lowf'} · ${esc(peer.genre||'Yêu sách')}</small></div></div>
    <button type="button" class="button ${isFr?'button-soft':'button-primary'}" data-action="friend-toggle" data-id="${esc(peer.id)}" data-name="${esc(peer.name)}" style="min-height:32px;padding:6px 12px;font-size:10.5px">${isFr?'✓ Bạn bè':'+ Kết bạn'}</button>
   </div>
   <div class="dm-messages" id="dmMessages">${thread.length?thread.map(t=>`<div class="dm-bubble-row ${t.from==='me'?'me':'them'}"><div class="dm-bubble">${esc(t.text)}</div><span class="dm-bubble-time">${formatShortTime(t.at)}</span></div>`).join(''):`<p class="mini-note" style="text-align:center;margin:auto">Gửi lời chào hoặc chia sẻ một cuốn sách hay với <strong>${esc(peer.name)}</strong> nhé!</p>`}</div>
   <form id="dmForm" class="dm-compose" data-peer="${esc(peer.id)}" data-peer-name="${esc(peer.name)}">
    <button type="button" class="dm-quick-book" data-action="dm-share-book" data-id="${esc(peer.id)}" data-name="${esc(peer.name)}" title="Gợi ý nhanh một cuốn sách trong thư viện">📚 Gợi ý sách</button>
    <input name="dm" maxlength="500" placeholder="Nhắn tin trao đổi với ${esc(peer.name)}…" required autocomplete="off">
    <button type="submit" class="button button-primary" style="min-height:36px;padding:7px 14px">${icon('send')}</button>
   </form>
  </div>
 </section>`;
}
function community(){
 const soc=getSocial(),peers=allCommunityPeers(soc),tab=state.communityTab||'feed';
 const dmTotal=Object.values(soc.dms||{}).reduce((s,arr)=>s+(Array.isArray(arr)?arr.length:0),0);
 return `<div class="page-intro"><div class="eyebrow">ĐỌC CÙNG NHAU, ĐI XA HƠN</div><h1>Trạm dừng chân.</h1><p>Thảo luận, trả lời bình luận, kết bạn cùng gu sách và nhắn tin trao đổi trực tiếp với cộng đồng Lowf.</p></div>
 <div class="comm-tabs" role="tablist" aria-label="Chuyên mục cộng đồng">
  <button type="button" class="comm-tab ${tab==='feed'?'active':''}" data-action="comm-tab" data-id="feed">💬 Thảo luận &amp; Bình luận <span class="comm-tab-badge">${state.messages.length}</span></button>
  <button type="button" class="comm-tab ${tab==='friends'?'active':''}" data-action="comm-tab" data-id="friends">👥 Kết bạn (${soc.friends.length}) ${soc.requests.length?`<span class="comm-tab-badge">+${soc.requests.length} mới</span>`:''}</button>
  <button type="button" class="comm-tab ${tab==='dm'?'active':''}" data-action="comm-tab" data-id="dm">✉️ Nhắn tin riêng <span class="comm-tab-badge">${dmTotal}</span></button>
 </div>
 ${tab==='friends'?communityFriendsView(soc,peers):tab==='dm'?communityDmView(soc,peers):`<div class="comm-feed-layout">
  <section class="widget">
   <div class="widget-heading"><h2>Một cuốn sách, nhiều góc nhìn</h2>${icon('messages-square')}</div>
   <p class="widget-sub">Bấm <strong>↩️ Trả lời</strong> ngay dưới mỗi bình luận để trò chuyện theo luồng, hoặc bấm <strong>+ Kết bạn / 💬 Nhắn riêng</strong>.</p>
   <div class="chat-messages" id="chatMessages" style="max-height:560px;gap:14px">${state.messages.length?state.messages.map((m,i)=>messageHTML(m,i)).join(''):`<p class="mini-note">${state.communityLoaded?(state.messagesError?'Chưa tải được cuộc trò chuyện. Vui lòng thử lại sau.':'Chưa có lời nhắn nào. Hãy bắt đầu câu chuyện đầu tiên.'):'Đang tải cuộc trò chuyện…'}</p>`}</div>
   <form id="chatForm" class="chat-form"><input name="message" maxlength="500" placeholder="${state.user?'Chia sẻ cảm nhận sách hoặc đặt câu hỏi cho cộng đồng…':'Đăng nhập để bình luận &amp; trao đổi…'}" aria-label="Tin nhắn cộng đồng" required><button type="submit" aria-label="Gửi bình luận">${icon('send')}</button></form>
   <p class="small-note">Tin nhắn được chia sẻ với cộng đồng. Hãy giữ không khí văn minh và ấm áp nhé.</p>
  </section>
  <div>${rankWidget(true)}</div>
 </div>`}`;
}
function reviews(){const cats=['all',...new Set(state.reviews.map(p=>p.category).filter(Boolean))];const countCat=c=>c==='all'?state.reviews.length:state.reviews.filter(p=>p.category===c).length;const list=state.reviews.filter(p=>state.reviewCat==='all'||p.category===state.reviewCat);const hero=list[0],rest=list.slice(1);const formatDate=d=>d?new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'long',year:'numeric'}).format(new Date(d)):'';const hasBody=p=>Array.isArray(p.paragraphs)&&p.paragraphs.length;const cardAction=p=>hasBody(p)?`<span class="uiverse-read-btn">Đọc bài viết ${icon('arrow-right')}</span>`:safeURL(p.url)?`<a class="uiverse-read-btn" href="${esc(safeURL(p.url))}" target="_blank" rel="noopener noreferrer">Đọc bài viết ${icon('arrow-up-right')}</a>`:'';return `<div class="page-intro"><div class="eyebrow">TẠP CHÍ &amp; GÓC ĐIỂM SÁCH LOWF</div><h1>Đọc xong, còn đọng lại.</h1><p>Điểm sách chuyên sâu, phương pháp đọc hiệu quả và những trang tản văn đồng hành cùng hành trình đọc của bạn.</p></div>${state.reviews.length?`<div class="review-filters-ui" role="group" aria-label="Lọc chuyên mục điểm sách">${cats.map(c=>`<button type="button" class="review-cat-pill ${state.reviewCat===c?'active':''}" data-action="review-cat" data-id="${esc(c)}" aria-pressed="${state.reviewCat===c}"><span>${c==='all'?'Tất cả bài viết':esc(c)}</span><small>${countCat(c)}</small></button>`).join('')}</div>${hero?`<article class="review-featured" ${hasBody(hero)?`data-action="read-article" data-id="${esc(hero.id)}" tabindex="0"`:''}>${hero.image&&(hero.image.startsWith('data:image/svg+xml')||safeURL(hero.image))?`<div class="review-featured-media"><img src="${esc(hero.image)}" alt="${esc(hero.title)}" loading="lazy"></div>`:''}<div class="review-featured-body"><div class="eyebrow">${esc(hero.category||'ĐIỂM SÁCH')} · ${hero.readMinutes?hero.readMinutes+' phút đọc · ':''}${formatDate(hero.date)}</div><h2>${esc(hero.title)}</h2><p>${esc(hero.excerpt)}</p><div class="review-featured-foot"><span class="review-author">${esc(hero.author||'Ban Biên Tập Lowf')}</span>${cardAction(hero)}</div></div></article>`:''}${rest.length?`<div class="review-grid">${rest.map(p=>`<article class="review-card" ${hasBody(p)?`data-action="read-article" data-id="${esc(p.id)}" tabindex="0"`:''}>${p.image&&(p.image.startsWith('data:image/svg+xml')||safeURL(p.image))?`<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`:''}<div class="eyebrow">${esc(p.category||'ĐIỂM SÁCH')} · ${p.readMinutes?p.readMinutes+' phút đọc':formatDate(p.date)}</div><h2>${esc(p.title)}</h2><p>${esc(p.excerpt)}</p><div class="review-card-foot"><span class="review-author">${esc(p.author||'Lowf')}</span>${cardAction(p)}</div></article>`).join('')}</div>`:''}`:empty(state.reviewsLoaded?(state.reviewsAvailable===false?'Chưa tải được bài viết':'Một câu chuyện đang được ấp ủ'):'Đang tải bài viết…',state.reviewsLoaded?(state.reviewsAvailable===false?'Vui lòng thử lại sau. Bài viết sẽ hiển thị khi kết nối hoạt động trở lại.':'Các bài viết đã xuất bản sẽ được cập nhật tại đây.'):'Chờ một chút để tải bài viết.','','notebook-pen')}`}
function openArticle(id){const p=state.reviews.find(x=>String(x.id)===String(id));if(!p)return;const linked=p.linkedBookId?book(p.linkedBookId):null;const dateStr=p.date?new Intl.DateTimeFormat('vi-VN',{day:'numeric',month:'long',year:'numeric'}).format(new Date(p.date)):'';modal(p.category||'Góc bài viết',`<article class="article-reader">${p.image&&(p.image.startsWith('data:image/svg+xml')||safeURL(p.image))?`<img class="article-banner" src="${esc(p.image)}" alt="${esc(p.title)}">`:''}<div class="eyebrow">${esc(p.category||'LOWF EDITORIAL')} · ${p.readMinutes?p.readMinutes+' phút đọc · ':''}${dateStr}</div><h2 class="article-title">${esc(p.title)}</h2><p class="article-byline">Thực hiện: <strong>${esc(p.author||'Ban Biên Tập Lowf')}</strong></p>${p.quote?`<blockquote class="article-quote">“${esc(p.quote)}”</blockquote>`:''}<div class="article-content">${(p.paragraphs||[]).map(t=>`<p>${esc(t)}</p>`).join('')}</div>${linked?`<div class="article-linked-book">${coverHTML(linked)}<div><small>SÁCH LIÊN QUAN TRONG BÀI VIẾT</small><strong>${esc(linked.title)}</strong><span>${esc(linked.author)}</span></div><button class="button button-primary" data-action="read-from-article" data-id="${esc(linked.id)}">${icon('book-open')} Đọc ngay</button></div>`:''}</article>`,{wide:true})}
function plans(){const list=state.plans;return `<div class="page-intro"><div class="eyebrow">CHỌN NHỊP ĐỌC CỦA RIÊNG MÌNH</div><h1>Một hành trình cùng Lowf.</h1><p>Lưu những cuốn sách yêu thích, chọn một gói phù hợp và đọc theo nhịp của bạn.</p></div><div class="plans-grid">${list.map((p,i)=>{const price=Number(p.price)||0,active=state.membership?.planId===p.id&&state.membership?.status==='active',available=p.enabled===true&&(price===0||state.commerce.enabled);return `<section class="plan ${i===0?'featured':''}"><div class="eyebrow">${active?'GÓI HIỆN TẠI':price===0?'BẮT ĐẦU NHẸ NHÀNG':'ĐỌC NHIỀU HƠN'}</div><h2>${esc(p.name)}</h2><div class="plan-price">${price?money(price):'Miễn phí'}${price?`<small> / ${p.interval==='year'?'năm':p.interval==='month'?'tháng':'gói'}</small>`:''}</div><p class="small-note">${esc(p.description||'Một không gian dành cho người yêu sách.')}</p><ul>${(p.features||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul><button class="button ${available?'button-primary':'button-soft'}" data-action="join-plan" data-id="${esc(p.id)}" ${active&&price===0||!available?'disabled':''}>${active&&price===0?'Đang sử dụng':available?(price?(active?'Gia hạn qua VNPAY':'Chọn gói qua VNPAY'):(state.user?'Đăng ký miễn phí':'Tạo tài khoản miễn phí')):'Chưa mở đăng ký'}</button>${price?`<p class="small-note">${available?'Thanh toán cho kỳ đã chọn. Không tự động trừ tiền gia hạn.':'Gói này chưa mở thanh toán. Hiện không thu tiền.'}</p>`:''}${active&&state.membership?.expiresAt?`<p class="small-note">Có hiệu lực đến ${esc(orderDate(state.membership.expiresAt))}.</p>`:''}</section>`}).join('')}</div>${!list.length?empty('Các gói thành viên đang được chuẩn bị','Tài khoản miễn phí vẫn có thể đọc thư viện và lưu tiến độ.'):''}<div class="notice" style="margin-top:22px">${state.commerce.enabled?'Thanh toán VNPAY được xác nhận qua hệ thống ngân hàng trước khi cấp quyền đọc.':'Gói Free có thể đăng ký ngay. Gói trả phí chỉ mở khi VNPAY đã được kích hoạt.'}</div>`}
function ownerQuickActions(){if(!isOwner())return'';return `<div class="owner-quick-actions" data-owner-surface><a href="/admin?tab=books&action=add">${icon('book-open')}<span><strong>Thêm sách</strong><small>Thêm ảnh bìa, PDF, giá và quyền đọc</small></span>${icon('arrow-up-right')}</a><a href="/admin?tab=design">${icon('sliders-horizontal')}<span><strong>Thiết kế giao diện</strong><small>Chỉnh màu, banner và thứ tự các phần; xem trước rồi xuất bản</small></span>${icon('arrow-up-right')}</a><a href="/admin?tab=payments">${icon('shopping-bag')}<span><strong>Thanh toán VNPAY</strong><small>Kết nối tài khoản người bán và kiểm tra thanh toán</small></span>${icon('arrow-up-right')}</a><a href="/admin?tab=orders">${icon('package')}<span><strong>Quản lý đơn hàng</strong><small>Xem thanh toán và cập nhật quá trình giao sách</small></span>${icon('arrow-up-right')}</a></div>`}
function openAccount(){
 closeModal();
 if(!state.user){auth();return}
 if(!isOwner()){navigate('profile');return}
 const w=getWallet();
 modal('Tài khoản & quản lý website',`<div class="account-hero-choice"><button type="button" class="button button-primary" data-action="nav" data-view="profile">${icon('user-round')} Hồ sơ cá nhân &amp; Ví ${w.balance} Xu</button><a class="button button-soft" href="/admin">${icon('sliders-horizontal')} Mở Lowf Studio ↗</a></div><p class="auth-subtitle" style="margin:14px 0 12px">Lối tắt quản trị nhanh cho <strong>${esc(state.user.name)}</strong>:</p>${ownerQuickActions()}<div class="owner-account-links"><button class="text-button" data-action="avatar-open">${icon('sparkles')} Đổi ảnh đại diện</button><a class="text-button" href="/huong-dan.html">Hướng dẫn sử dụng ↗</a></div>`);
}
function profile(){
 if(!state.user)return `<div class="page-intro"><div class="eyebrow">HÀNH TRÌNH CỦA RIÊNG BẠN</div><h1>Chào người bạn mới.</h1><p>Một chiếc kệ sách, Ví Xu Lowf, những phút tập trung và cảm hứng mỗi ngày — cùng một tài khoản Lowf.</p></div>${empty('Bắt đầu từ một trang sách','Tạo tài khoản miễn phí hoặc đăng nhập để lưu hành trình, đổi ảnh đại diện và tích lũy Xu Lowf.','<button class="button button-primary" data-action="auth">Đăng nhập / Tạo tài khoản</button>','user-round')}`;
 const xp=state.stats.xp||0,w=getWallet(),checkedToday=w.lastCheckin===dateKey(),hasScholar=w.unlocked.includes('badge-scholar');
 return `<div class="page-intro"><div class="eyebrow">KHÔNG GIAN CÁ NHÂN</div><h1>Hành trình của ${esc(state.user.name.split(' ').slice(-1)[0])}.</h1></div>
 <section class="profile-card">
  <div class="profile-top">
   <button type="button" class="avatar-edit-btn" data-action="avatar-open" aria-label="Thay đổi ảnh đại diện" title="Bấm để đổi ảnh đại diện">${avatarHTML(state.user.name,true)}<span class="avatar-cam">📷 Đổi ảnh</span></button>
   <div>
    <h2>${esc(state.user.name)} ${hasScholar?'<span class="scholar-tag">🎖️ Học Giả</span>':''}</h2>
    <p>${esc(state.user.email)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
     <span class="level-badge">${isOwner()?'Quản trị viên · ':''}Level <b data-level>${state.stats.level||1}</b></span>
     <span class="coin-pill-lg">🪙 ${w.balance} Lowf Xu</span>
     <button type="button" class="text-button" data-action="avatar-open">${icon('sparkles')} Đổi ảnh đại diện</button>
    </div>
   </div>
  </div>
  ${!state.user.emailVerified?'<div class="notice" style="margin-top:20px">Email chưa được xác minh. Hãy kiểm tra hộp thư để xác nhận tài khoản. <button class="text-button" data-action="verify-email">Nhập mã / Xác minh email</button></div>':''}
  <div class="xp-block"><div><span data-total-xp>${xp} XP tích lũy</span><span data-next-xp>${1000-xp%1000} XP đến cấp tiếp theo</span></div><div class="progress-line"><span data-xp-bar style="width:${xp%1000/10}%"></span></div></div>
  <div class="profile-actions"><button class="button button-soft" data-action="reader-vocabulary">${icon('languages')} Sổ từ vựng</button><button class="button button-soft" data-action="nav" data-view="orders">${icon('shopping-bag')} Đơn hàng</button><button class="button button-soft" data-action="nav" data-view="pdf">${icon('library')} Kệ sách</button><button class="button button-soft" data-action="nav" data-view="plans">${icon('sparkles')} Gói thành viên</button>${isOwner()?'<a class="button button-primary" href="/admin">Quản trị website ↗</a>':''}<button class="button button-soft" data-action="logout">${icon('log-out')} Đăng xuất</button></div>
 </section>
 <section class="wallet-card" aria-label="Ví Xu tài khoản riêng">
  <div class="wallet-head">
   <div>
    <div class="eyebrow">TÀI KHOẢN XU RIÊNG CỦA BẠN</div>
    <h2>🪙 ${w.balance} <span>Lowf Xu</span></h2>
    <p>Tích lũy Xu từ điểm danh mỗi ngày, hoàn thành đồng hồ đọc sách Pomodoro và đọc hết sách để đổi khung đại diện &amp; ưu đãi.</p>
   </div>
   <div class="wallet-actions">
    <button type="button" class="button button-primary" data-action="coin-checkin" ${checkedToday?'disabled':''}>${checkedToday?'✓ Đã điểm danh hôm nay':'🎁 Điểm danh +20 Xu'}</button>
    <button type="button" class="button button-soft" data-action="nav" data-view="library">${icon('book-open')} Đọc sách kiếm Xu</button>
   </div>
  </div>
  <div class="wallet-rewards">${COIN_REWARDS.map(r=>{const owned=w.unlocked.includes(r.id);return `<div class="reward-item ${owned?'owned':''}"><span class="reward-ico">${r.icon}</span><div><strong>${esc(r.name)}</strong><small>${esc(r.desc)}</small></div><button type="button" class="button ${owned?'button-soft':'button-primary'}" data-action="coin-redeem" data-id="${r.id}" ${owned?'disabled':''}>${owned?'Đã sở hữu':`${r.cost} Xu`}</button></div>`}).join('')}</div>
  <div class="wallet-history"><h3>Lịch sử Xu gần đây</h3>${(w.history||[]).slice(0,5).map(h=>`<div class="wallet-tx"><span><strong>${esc(h.title)}</strong><small>${esc(h.date||'')}</small></span><b class="${h.delta>=0?'pos':'neg'}">${h.delta>=0?'+':''}${h.delta} Xu</b></div>`).join('')}</div>
 </section>
 ${isOwner()?ownerQuickActions():''}${stats()}
 <div class="section-heading"><h2>Lịch sử đọc</h2></div>
 <div class="profile-card">${Object.entries(state.data.progress).filter(([id])=>book(id)).map(([id,p])=>`<div class="history-row"><div><strong>${esc(book(id).title)}</strong><small>${p.finished?'Đã đọc hết':(book(id).chapters?.length||book(id).chapterCount)?`Chương ${(p.chapter||0)+1} / ${book(id).chapters?.length||book(id).chapterCount}`:'Đã mở đọc'}</small></div><button class="text-button" data-action="read" data-id="${esc(id)}">Đọc tiếp ${icon('arrow-right')}</button></div>`).join('')||'<p class="notice">Mở sách để bắt đầu hành trình đọc đầu tiên.</p>'}</div>
 ${hasLegacySaved()?'<div class="notice" style="margin-top:20px">Trình duyệt này còn sách đã lưu từ bản Lowf cũ. <button class="text-button" data-action="import-saved">Chọn nhập sách đã lưu</button></div>':''}`;
}
function renderMain(){if(!state.loaded){$('#main').innerHTML=state.error?empty('Chưa kết nối được với Lowf',esc(state.error),'<button class="button button-primary" data-action="retry">Thử lại</button>','wifi-off'):'<div class="page-loading"><div class="book-loader" aria-hidden="true"><span></span><span></span><span></span></div><p>Đang mở không gian Lowf…</p></div>';icons();return}const pages={dashboard,library,store:shop,pdf:pdfPage,studio,video:videos,community,reviews,plans,profile,orders};$('#main').innerHTML=pages[state.view]();if(state.view==='dashboard')layoutDashboard();icons()}
function layoutDashboard(){const main=$('#main'),groups={},gather=(id,nodes)=>{const present=nodes.filter(Boolean);if(!present.length)return;const wrapper=document.createElement('section');wrapper.className='dashboard-section';wrapper.dataset.section=id;present.forEach(node=>wrapper.append(node));groups[id]=wrapper};gather('hero',[$('.hero',main)]);gather('stats',[$('.stats',main)]);const resume=$('.continue',main);if(resume)gather('continue',[resume.previousElementSibling,resume]);const shelf=$('#bookShelf',main),filters=$('.filters',main);if(filters)gather('books',[filters.previousElementSibling,filters,shelf||filters.nextElementSibling]);gather('ambient',[$('.ambient-card',main)]);gather('deal',[$('.member-card',main)]);$('.bento',main)?.remove();const s=mergedSettings(),order=Array.isArray(s.sections)?s.sections:['hero','stats','continue','books','ambient','deal'];for(const id of order){if(groups[id])main.append(groups[id])}}
async function refreshMe(){const result=await api('/api/me');state.user=result.user||null;state.data={saved:[],progress:{},secondsByDay:{},...(result.data||{})};state.membership=result.membership||null;state.stats={xp:0,level:1,todaySeconds:0,monthSeconds:0,...result.stats};renderUser();renderRight();return result}
function applyBootstrapData(data){
 state.books=Array.isArray(data.books)?data.books:[];
 state.tracks=Array.isArray(data.tracks)?data.tracks:[];
 state.videos=Array.isArray(data.videos)?data.videos:[];
 state.plans=Array.isArray(data.plans)?data.plans:[];
 state.settings=data.settings||{};
 const featured=state.settings.featuredBookIds||[];
 state.books.sort((a,b)=>{const i=featured.indexOf(a.id),j=featured.indexOf(b.id);return(i<0?999:i)-(j<0?999:j)});
 state.commerce=data.commerce||{enabled:false};
 state.loaded=true;
}
async function bootstrap(){
 const epoch=++bootstrapEpoch;state.error=null;
 const urlParams=new URLSearchParams(location.search),oauthVerifier=urlParams.get('neon_auth_session_verifier'),isDraft=urlParams.get('designPreview')==='1';
 const initView=labels[urlParams.get('view')]?urlParams.get('view'):'dashboard';
 // Instant Stale-While-Revalidate hydration (<50ms first paint, zero spinner lag!)
 let swrSig='';
 if(!isDraft&&!oauthVerifier){
  try{
   const cached=JSON.parse(localStorage.getItem('lowf.boot.cache.v1')||'null');
   if(cached&&Array.isArray(cached.books)&&cached.books.length){
    applyBootstrapData(cached);
    applySettings();
    navigate(initView,{updateURL:false});
    swrSig=cached.books.length+'|'+JSON.stringify(cached.settings||{});
   }else renderMain();
  }catch{renderMain();}
 }else renderMain();
 try{
  if(oauthVerifier){try{await api('/api/auth/get-session?neon_auth_session_verifier='+encodeURIComponent(oauthVerifier)+'&disableCookieCache=true')}catch{}urlParams.delete('neon_auth_session_verifier');history.replaceState(null,'',location.pathname+(urlParams.size?'?'+urlParams.toString():'')+location.hash)}
  const [data]=await Promise.all([api('/api/bootstrap'+(isDraft?'?designPreview=1':'')),refreshMe()]);
  if(epoch!==bootstrapEpoch)return;
  if(oauthVerifier&&state.user){let savedNext='',savedAfter='';try{savedNext=sessionStorage.getItem('lowf.auth.next')||'';savedAfter=sessionStorage.getItem('lowf.auth.after')||'';sessionStorage.removeItem('lowf.auth.next');sessionStorage.removeItem('lowf.auth.after')}catch{}if(isOwner()&&savedNext&&savedNext.startsWith('/admin')){location.assign(savedNext);return}if(savedAfter==='cart')state.afterAuth='cart'}
  applyBootstrapData(data);
  const freshSig=(data.books?.length||0)+'|'+JSON.stringify(data.settings||{});
  if(!isDraft){try{localStorage.setItem('lowf.boot.cache.v1',JSON.stringify({books:(data.books||[]).slice(0,48),tracks:data.tracks,videos:data.videos,plans:data.plans,settings:data.settings,commerce:data.commerce}))}catch{}}
  state.environment=isOwner()&&['preview','production'].includes(data.environment?.name)?data.environment:null;
  state.designPreview=isOwner()&&data.designPreview===true;
  renderOwnerEnvironment();
  applySettings();renderCartCount();loadLeaderboard();loadPDFs();
  const params=new URLSearchParams(location.search),orderId=params.get('order'),view=labels[params.get('view')]?params.get('view'):'dashboard';
  if(validOrderId(orderId))state.selectedOrderId=orderId;
  if(!swrSig||swrSig!==freshSig||validOrderId(orderId)||state.user)navigate(validOrderId(orderId)?'orders':view,{updateURL:false});
  if(oauthVerifier&&state.user){toast(`Chào mừng ${state.user.name} đã đăng nhập thành công!`);if(state.afterAuth==='cart'){state.afterAuth='';showCart()}}
  else if(params.get('token'))auth('reset');
  else if(['signup','login','otp-signin','forgot','verify','reset-code'].includes(params.get('auth')))auth(params.get('auth'));
  else if(validOrderId(orderId))viewURL('orders');
  else if(params.has('error'))toast(params.get('error')==='access_denied'?'Bạn đã hủy đăng nhập Google. Bạn có thể thử lại hoặc dùng mã Email bất cứ lúc nào.':'Liên kết xác nhận chưa hoàn tất. Bạn có thể đăng nhập lại hoặc gửi mã mới.');
  else if(params.get('book')&&book(params.get('book')))openBook(params.get('book')).catch(e=>toast(e.message));
 }catch(e){if(epoch!==bootstrapEpoch)return;if(!state.loaded){state.error=e.message;renderMain()}}
}
async function loadLeaderboard(){try{const result=await api('/api/leaderboard');state.readers=result.readers||[];state.readersError=false;renderRight();if(state.view==='community'){const draft=$('#chatForm input')?.value||'';renderMain();if($('#chatForm input'))$('#chatForm input').value=draft}}catch{state.readersError=true;renderRight()}}
async function loadCommunity(){try{const result=await api('/api/messages');state.messages=result.messages||[];state.messagesError=false;state.communityLoaded=true;if(state.view==='community'){const input=$('#chatForm input'),draft=input?.value||'',focus=document.activeElement===input;renderMain();const now=$('#chatForm input');if(now){now.value=draft;if(focus)now.focus({preventScroll:true})}}loadLeaderboard()}catch(e){state.messagesError=true;state.communityLoaded=true;if(state.view==='community'){renderMain();toast(e.message)}}}
async function loadReviews(){try{const result=await api('/api/reviews');state.reviews=result.posts||[];state.reviewsAvailable=result.available!==false&&!result.unavailable;state.reviewsLoaded=true;if(state.view==='reviews')renderMain()}catch(e){state.reviewsLoaded=true;if(state.view==='reviews'){renderMain();toast(e.message)}}}
async function loadPDFs(){try{state.pdfs=await BookMedia.listPDFs();if(state.view==='pdf')renderMain()}catch(e){if(state.view==='pdf')toast(e.message)}}
let authEmail='',authBusy=false,authEpoch=0,authCooldownTimer=null;
const otpCooldowns=new Map();
const otpType=tab=>tab==='reset-code'||tab==='forgot'?'forget-password':tab==='otp-signin'||tab==='otp-signin-verify'?'sign-in':'email-verification';
const otpKey=(email,type)=>type+':'+email.trim().toLowerCase();
const googleLogoSVG='<svg class="auth-google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.54-5.17 3.54-8.89Z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3.02c-1.07.72-2.44 1.15-4.05 1.15-3.12 0-5.76-2.1-6.7-4.93H1.3v3.11A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.3 14.3A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.57.38-2.3V6.59H1.3A12 12 0 0 0 0 12c0 1.94.46 3.78 1.3 5.41l4-3.11Z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.3 6.59l4 3.11c.94-2.83 3.58-4.93 6.7-4.93Z"/></svg>';
function authMessage(error){
 const code=String(error?.code||'').toUpperCase(),message=String(error?.message||''),hay=(code+' '+message.toUpperCase());
 if(/OTP_EXPIRED|EXPIRED.*(?:OTP|CODE)|(?:OTP|CODE).*EXPIRED/.test(hay))return'Mã đã hết hạn. Bấm Gửi mã mới, rồi nhập mã trong email mới nhất.';
 if(/INVALID_OTP|OTP_NOT_FOUND|INVALID.*(?:OTP|CODE)|(?:OTP|CODE).*INVALID|VERIFICATION.*NOT.FOUND/.test(hay))return'Mã chưa đúng hoặc đã hết hạn. Hãy kiểm tra lại mã 6 số trong email mới nhất.';
 if(/OTP.*(?:ATTEMPT|LIMIT)|TOO_MANY_ATTEMPTS/.test(hay))return'Mã này đã vượt số lần thử. Hãy bấm Gửi mã mới rồi nhập mã mới nhất.';
 if(/EMAIL_NOT_VERIFIED/.test(hay))return'Email của bạn chưa được xác minh. Hãy nhập mã xác minh trong hộp thư hoặc bấm Gửi mã mới.';
 if(/INVALID_EMAIL_OR_PASSWORD|INVALID_PASSWORD|INVALID_CREDENTIALS|WRONG.*PASSWORD/.test(hay))return'Email hoặc mật khẩu chưa đúng. Bạn có thể bấm biểu tượng mắt để kiểm tra hoặc chọn tab "Mã Email" để đăng nhập không cần mật khẩu.';
 if(/USER_ALREADY_EXISTS|ALREADY_EXISTS|EMAIL.*TAKEN/.test(hay))return'Email này đã có tài khoản Lowf. Hãy chuyển sang tab Đăng nhập hoặc dùng Mã Email không mật khẩu.';
 if(/USER_NOT_FOUND/.test(hay))return'Chưa tìm thấy tài khoản với email này. Kiểm tra lại email hoặc bấm Tạo tài khoản.';
 if(/PASSWORD_TOO_SHORT/.test(hay))return'Mật khẩu cần có ít nhất 8 ký tự.';
 if(/PASSWORD_TOO_LONG/.test(hay))return'Mật khẩu tối đa 128 ký tự.';
 if(/INVALID_EMAIL/.test(hay))return'Địa chỉ email chưa đúng định dạng. Vui lòng kiểm tra lại.';
 if(/PROVIDER_NOT_FOUND|SOCIAL.*NOT|OAUTH.*DISABLED|GOOGLE.*NOT/.test(hay))return'Đăng nhập Google chưa được kích hoạt trong Neon Auth Console. Hãy dùng tab "Mã Email" (không cần mật khẩu) ngay bên dưới để vào tức thì.';
 if(/ORIGIN_REJECTED|INVALID_ORIGIN|CSRF/.test(hay))return'Phiên truy cập chưa khớp tên miền. Hãy tải lại trang và thử đăng nhập lại.';
 if(error?.status===429||/TOO_MANY|RATE_LIMIT/.test(hay))return'Bạn đã thử nhiều lần. Vui lòng đợi khoảng 1 phút rồi thử lại.';
 if(error?.status===503||/AUTH_REQUEST_FAILED/.test(hay))return'Hệ thống đăng nhập tạm bận. Vui lòng đợi vài giây rồi thử lại.';
 return message||'Chưa thực hiện được thao tác. Hãy thử lại.';
}
function refreshAuthControls(){
 clearTimeout(authCooldownTimer);const form=$('#authForm');if(!form||!$('#modal').open)return;
 const submit=$('[type=submit]',form);if(submit)submit.disabled=authBusy;
 const googleBtn=$('[data-action=auth-google]');if(googleBtn)googleBtn.disabled=authBusy;
 const resend=$('[data-action=auth-resend]'),email=$('[name=email]',form)?.value||authEmail;
 if(resend){const remaining=Math.max(0,Math.ceil(((otpCooldowns.get(otpKey(email,otpType(state.authTab)))||0)-Date.now())/1000));resend.disabled=authBusy||remaining>0;resend.textContent=authBusy?'Đang xử lý…':remaining?`Gửi lại sau ${remaining}s`:'Gửi mã mới';if(remaining>0)authCooldownTimer=setTimeout(refreshAuthControls,1000);}
}
function auth(tab='login',options={}){
 let rememberedEmail='';try{rememberedEmail=localStorage.getItem('lowf.auth.email')||''}catch{}
 authEpoch++;clearTimeout(authCooldownTimer);authEmail=String(options.email??$('#authForm [name=email]')?.value.trim()??(authEmail||state.user?.email||rememberedEmail||''));state.authTab=tab;
 const isCode=['verify','reset-code','otp-signin-verify'].includes(tab);
 const hasPassword=['signup','login','reset','reset-code'].includes(tab);
 const showTabs=['login','otp-signin','signup'].includes(tab);
 const showSocial=['login','otp-signin','signup'].includes(tab);
 const titles={
  login:'Chào mừng bạn trở lại.',
  'otp-signin':'Đăng nhập nhanh không mật khẩu.',
  'otp-signin-verify':'Nhập mã đăng nhập 1 chạm.',
  signup:'Bắt đầu một chương mới.',
  forgot:'Khôi phục mật khẩu.',
  reset:'Đặt mật khẩu mới.',
  'reset-code':'Đặt lại mật khẩu bằng mã.',
  verify:'Xác minh email tài khoản.'
 };
 const subtitle=tab==='verify'?'Nhập mã số vừa gửi tới hộp thư của bạn để kích hoạt đầy đủ tính năng lưu sách, ghi chú và quản trị.'
  :tab==='otp-signin'?'Chỉ cần nhập Email — Lowf sẽ gửi mã bảo mật 6 số (OTP) giúp bạn đăng nhập tức thì mà không cần nhớ mật khẩu.'
  :tab==='otp-signin-verify'?'Nhập mã 6 số vừa gửi đến hộp thư của bạn (kiểm tra thêm mục Spam / Quảng cáo nếu chưa thấy).'
  :tab==='reset-code'?'Nhập mã số trong email đặt lại mật khẩu và tạo mật khẩu mới.'
  :tab==='forgot'?'Nhập email đã đăng ký. Hệ thống sẽ gửi mã khôi phục để bạn đặt lại mật khẩu ngay tại đây.'
  :tab==='reset'?'Chọn mật khẩu mới để tiếp tục hành trình đọc.'
  :tab==='signup'?'Một tài khoản miễn phí để đồng bộ kệ sách, tiến độ đọc, ghi chú và sổ từ vựng trên mọi thiết bị.'
  :'Đăng nhập an toàn bằng Google, mã Email không mật khẩu hoặc mật khẩu truyền thống.';
 const stepBadge=tab==='signup'?'<div class="auth-step-hint">Bước 1 / 2 · Điền thông tin tạo tài khoản → Nhận mã xác minh qua email</div>'
  :tab==='verify'?'<div class="auth-step-hint">Bước 2 / 2 · Nhập mã xác minh từ Hộp thư đến (hoặc mục Spam)</div>'
  :tab==='otp-signin-verify'?'<div class="auth-step-hint">Bước 2 / 2 · Nhập mã đăng nhập 6 số gửi về email của bạn</div>'
  :tab==='forgot'?'<div class="auth-step-hint">Bước 1 / 2 · Yêu cầu gửi mã khôi phục về email</div>'
  :tab==='reset-code'?'<div class="auth-step-hint">Bước 2 / 2 · Nhập mã khôi phục &amp; đặt mật khẩu mới</div>':'';
 const footerLeft=tab==='login'?'<button type="button" data-action="auth-tab" data-id="forgot">Quên mật khẩu?</button>'
  :tab==='signup'?'<button type="button" data-action="auth-tab" data-id="login">Đã có tài khoản? Đăng nhập</button>'
  :'<button type="button" data-action="auth-tab" data-id="login">← Đăng nhập bằng mật khẩu</button>';
 const footerRight=tab==='forgot'?'<button type="button" data-action="auth-tab" data-id="reset-code">Tôi đã có mã đặt lại</button>'
  :tab==='verify'?'<button type="button" data-action="auth-tab" data-id="reset-code">Đặt lại mật khẩu</button>'
  :tab==='otp-signin-verify'?'<button type="button" data-action="auth-tab" data-id="otp-signin">Đổi địa chỉ email</button>'
  :tab==='reset-code'?'<button type="button" data-action="auth-tab" data-id="verify">Xác minh email</button>'
  :'<button type="button" data-action="auth-tab" data-id="verify">Nhập mã xác minh email</button>';
 const socialBlock=showSocial?`<button type="button" class="auth-google-btn" data-action="auth-google">${googleLogoSVG}<span>Tiếp tục nhanh với Google</span></button><div class="auth-or"><span>hoặc dùng Email</span></div>`:'';
 const passwordField=hasPassword?`<label class="form-field"><span>${['reset','reset-code'].includes(tab)?'Mật khẩu mới':'Mật khẩu'} ${tab==='signup'||tab==='reset'||tab==='reset-code'?'(tối thiểu 8 ký tự)':''}</span><div class="pw-wrap"><input type="password" name="password" autocomplete="${tab==='login'?'current-password':'new-password'}" minlength="8" maxlength="128" required placeholder="Nhập mật khẩu…"><button type="button" class="pw-eye" data-action="toggle-pw" aria-label="Hiện mật khẩu" aria-pressed="false">${icon('eye')}</button></div></label>`:'';
 const submitLabel=tab==='signup'?'Tiếp tục tạo tài khoản'
  :tab==='otp-signin'?'Gửi mã đăng nhập về Email'
  :tab==='otp-signin-verify'?'Xác nhận mã &amp; Đăng nhập ngay'
  :tab==='forgot'?'Nhận mã khôi phục'
  :tab==='verify'?'Xác nhận mã &amp; hoàn tất'
  :tab==='reset'||tab==='reset-code'?'Lưu mật khẩu mới'
  :'Đăng nhập vào Lowf';
 modal('Tài khoản Lowf',`<div class="auth-brand">Lowf.</div><h2 class="auth-title" style="margin-top:14px">${titles[tab]||'Chào mừng bạn trở lại.'}</h2><p class="auth-subtitle">${subtitle}</p>${showTabs?`<div class="auth-tabs" role="tablist"><button type="button" class="${tab==='login'?'active':''}" data-action="auth-tab" data-id="login">Mật khẩu</button><button type="button" class="${tab==='otp-signin'?'active':''}" data-action="auth-tab" data-id="otp-signin">${icon('sparkles')} Mã Email</button><button type="button" class="${tab==='signup'?'active':''}" data-action="auth-tab" data-id="signup">Đăng ký</button></div>`:''}${socialBlock}${stepBadge}<form id="authForm">${tab==='signup'?'<label class="form-field"><span>Tên hiển thị của bạn</span><input name="name" autocomplete="name" required maxlength="80" placeholder="Ví dụ: Minh Anh"></label>':''}${tab!=='reset'?`<label class="form-field"><span>Địa chỉ Email</span><input type="email" name="email" autocomplete="email" required maxlength="150" placeholder="ban@email.com" value="${esc(authEmail)}"></label>`:''}${isCode?'<label class="form-field auth-code-field"><span>Mã bảo mật gồm chữ số</span><input class="auth-code-input" type="text" name="otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{4,10}" minlength="4" maxlength="10" required placeholder="000000" aria-describedby="authCodeHelp"></label><p class="small-note" id="authCodeHelp">Nhập mã 6 số trong email mới nhất. Không chia sẻ mã này với bất kỳ ai.</p>':''}${passwordField}<p class="auth-status" id="authStatus" role="status">${esc(options.notice||'')}</p><p class="form-error" id="authError" role="alert"></p><button class="button button-primary button-block" type="submit">${submitLabel} ${icon('arrow-right')}</button></form>${isCode?'<div class="auth-otp-actions"><span>Chưa nhận được thư hoặc mã hết hạn?</span><button class="button button-soft" type="button" data-action="auth-resend">Gửi mã mới</button></div>':''}<div class="auth-links">${footerLeft}${footerRight}</div>`);
 refreshAuthControls();
 requestAnimationFrame(()=>{
  const f=$('#authForm');if(!f)return;
  const target=(isCode?$('[name=otp]',f):null)||[...$$('input',f)].find(inp=>!inp.value)||$('input',f);
  target?.focus({preventScroll:true});
 });
}
async function startSocialAuth(provider='google'){
 if(authBusy)return;
 const epoch=authEpoch,errEl=$('#authError'),statusEl=$('#authStatus');
 authBusy=true;if(errEl)errEl.textContent='';if(statusEl)statusEl.textContent='Đang kết nối với Google…';refreshAuthControls();
 try{
  const next=adminReturnPath();
  try{if(next)sessionStorage.setItem('lowf.auth.next',next);if(state.afterAuth)sessionStorage.setItem('lowf.auth.after',state.afterAuth)}catch{}
  const result=await api('/api/auth/sign-in/social',{method:'POST',body:{provider,callbackURL:location.origin+'/'}});
  if(epoch!==authEpoch)return;
  if(result?.url&&safeURL(result.url)){location.assign(result.url);return}
  if(result?.user||result?.token){
   await refreshMe();if(epoch!==authEpoch)return;
   if(isOwner()&&next){location.assign(next);return}
   closeModal();renderMain();
   if(state.user&&state.afterAuth==='cart'){state.afterAuth='';showCart()}
   if(state.user)toast(`Chào mừng ${state.user.name} đã đăng nhập bằng Google!`);
   return;
  }
  throw new Error('Không nhận được đường dẫn xác thực Google.');
 }catch(e){
  if(epoch===authEpoch){if(statusEl)statusEl.textContent='';if(errEl)errEl.textContent=authMessage(e)}
 }finally{authBusy=false;refreshAuthControls()}
}
async function requestAuthOtp(email,type){const result=await api('/api/auth/email-otp/send-verification-otp',{method:'POST',body:{email:email.trim().toLowerCase(),type}});if(result.success!==true)throw new Error('Chưa gửi được mã. Hãy thử lại.');otpCooldowns.set(otpKey(email,type),Date.now()+60000);}
async function resendAuthOtp(){
 if(authBusy)return;const form=$('#authForm'),input=form&&$('[name=email]',form);if(!input||!input.reportValidity())return;const email=input.value.trim(),type=otpType(state.authTab);if((otpCooldowns.get(otpKey(email,type))||0)>Date.now())return;
 const epoch=authEpoch;authBusy=true;$('#authError').textContent='';$('#authStatus').textContent='';refreshAuthControls();
 try{await requestAuthOtp(email,type);if(epoch===authEpoch)$('#authStatus').textContent='Đã yêu cầu gửi mã mới. Kiểm tra Hộp thư đến và Spam, rồi nhập mã trong email mới nhất.';}
 catch(error){if(epoch===authEpoch)$('#authError').textContent=authMessage(error);}
 finally{authBusy=false;refreshAuthControls();}
}
async function submitAuth(form){
 if(authBusy)return;if(!form.checkValidity()){form.reportValidity();return;}
 const error=$('#authError'),fields=new FormData(form),tab=state.authTab,epoch=authEpoch,email=String(fields.get('email')||authEmail).trim().toLowerCase(),password=String(fields.get('password')||''),otp=String(fields.get('otp')||'').replace(/\s+/g,'');authEmail=email;if(email){try{localStorage.setItem('lowf.auth.email',email)}catch{}}authBusy=true;error.textContent='';refreshAuthControls();
 try{
  if(tab==='otp-signin'){
   await requestAuthOtp(email,'sign-in');
   if(epoch===authEpoch)auth('otp-signin-verify',{email,notice:'Đã gửi mã đăng nhập 6 số về email của bạn. Kiểm tra Hộp thư đến (và Spam) rồi nhập mã bên dưới.'});
   return;
  }
  if(tab==='otp-signin-verify'){
   await api('/api/auth/sign-in/email-otp',{method:'POST',body:{email,otp}});
   try{await api('/api/auth/get-session?disableCookieCache=true')}catch{}
   await refreshMe();if(epoch!==authEpoch)return;
   const next=adminReturnPath();if(isOwner()&&next){location.assign(next);return;}
   closeModal();renderMain();
   if(state.user&&state.afterAuth==='cart'){state.afterAuth='';showCart();}
   else if(state.user&&state.view==='orders'){loadOrders();if(state.selectedOrderId)loadOrder(state.selectedOrderId);}
   if(state.user)toast(`Chào mừng ${state.user.name} đã đăng nhập không cần mật khẩu!`);
   else auth('login',{email,notice:'Phiên đăng nhập chưa đồng bộ. Hãy thử đăng nhập lại.'});
   return;
  }
  if(tab==='forgot'){await requestAuthOtp(email,'forget-password');if(epoch===authEpoch)auth('reset-code',{email,notice:'Nếu email có tài khoản, mã đặt lại mật khẩu đã được gửi. Kiểm tra cả thư mục Spam.'});return;}
  if(tab==='reset-code'){const result=await api('/api/auth/email-otp/reset-password',{method:'POST',body:{email,otp,password}});if(result.success!==true)throw new Error('Chưa đặt lại được mật khẩu. Hãy kiểm tra mã và thử lại.');if(epoch===authEpoch){auth('login',{email,notice:'Đã đổi mật khẩu. Đăng nhập bằng mật khẩu mới để tiếp tục.'});}return;}
  if(tab==='verify'){
   const verified=await api('/api/auth/email-otp/verify-email',{method:'POST',body:{email,otp}});if(verified.status!==true)throw new Error('Chưa xác minh được mã. Hãy kiểm tra mã và thử lại.');
   try{await api('/api/auth/get-session?disableCookieCache=true');await refreshMe();}catch{if(epoch===authEpoch)auth('login',{email,notice:'Mã đã được xác nhận nhưng chưa tải lại được tài khoản. Hãy đăng nhập lại để cập nhật; không cần nhập lại mã.'});return;}
   if(epoch!==authEpoch)return;const next=adminReturnPath();if(isOwner()&&next){location.assign(next);return;}
   if(state.user?.emailVerified){closeModal();if(state.afterAuth==='cart'){state.afterAuth='';showCart();}else navigate('profile');toast('Email đã được xác minh. Tài khoản của bạn đã sẵn sàng.');}
   else auth('login',{email,notice:'Mã đã được xác nhận. Hãy đăng nhập lại để cập nhật tài khoản.'});return;
  }
  if(tab==='reset'){const token=new URLSearchParams(location.search).get('token');if(!token)throw new Error('Liên kết đặt lại mật khẩu chưa có mã xác nhận hoặc đã hết hạn. Hãy gửi yêu cầu mới.');await api('/api/auth/reset-password',{method:'POST',body:{token,newPassword:password}});if(epoch===authEpoch){history.replaceState(null,'',location.pathname);auth('login',{email,notice:'Đã đổi mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.'});}return;}
  const signup=tab==='signup',body=signup?{name:String(fields.get('name')||'').trim(),email,password,callbackURL:location.origin+'/'}:{email,password,callbackURL:location.origin+'/'};
  await api(signup?'/api/auth/sign-up/email':'/api/auth/sign-in/email',{method:'POST',body});await refreshMe();if(epoch!==authEpoch)return;
  if(signup&&(!state.user||!state.user.emailVerified)){
   auth('verify',{email,notice:'Tài khoản đã được tạo. Đang yêu cầu gửi mã xác minh…'});const verifyEpoch=authEpoch;
   try{await requestAuthOtp(email,'email-verification');if(verifyEpoch===authEpoch)$('#authStatus').textContent='Tài khoản đã được tạo. Hãy nhập mã xác minh trong email vừa gửi; kiểm tra cả Spam.';}
   catch(sendError){if(verifyEpoch===authEpoch){$('#authStatus').textContent='Tài khoản đã được tạo, nhưng chưa gửi được mã. Bạn có thể bấm Gửi mã mới.';$('#authError').textContent=authMessage(sendError);}}return;
  }
  const next=adminReturnPath();if(isOwner()&&next){location.assign(next);return;}
  if(state.user&&!state.user.emailVerified&&next){auth('verify',{email,notice:'Bạn đã đăng nhập. Nhập mã xác minh đang có, hoặc bấm Gửi mã mới để mở quyền chủ trang.'});return;}
  closeModal();renderMain();if(state.user&&state.afterAuth==='cart'){state.afterAuth='';showCart();}else if(state.user&&state.view==='orders'){loadOrders();if(state.selectedOrderId)loadOrder(state.selectedOrderId);}
  if(state.user)toast(`Chào mừng ${state.user.name} trở lại.`);else auth('verify',{email,notice:'Hãy xác minh email tài khoản, sau đó quay lại đăng nhập.'});
 }catch(e){
  if(epoch===authEpoch){
   if(tab==='login'&&/EMAIL_NOT_VERIFIED/.test(String(e?.code||'')+' '+String(e?.message||'').toUpperCase())){
    auth('verify',{email,notice:'Email của tài khoản này chưa được xác minh. Nhập mã đã nhận trong hộp thư hoặc bấm Gửi mã mới bên dưới.'});return;
   }
   error.textContent=authMessage(e);
   if(isCodeTab(tab))$('[name=otp]',form)?.focus();
  }
 }
 finally{authBusy=false;refreshAuthControls();}
}
function isCodeTab(tab){return ['verify','reset-code','otp-signin-verify'].includes(tab)}
async function signOut(){clearTimeout(saveTimer);await saveUserData(true);await heartbeat(false);await api('/api/auth/sign-out',{method:'POST',body:{}});state.user=null;state.orders=[];state.selectedOrder=null;state.shippingDraft={};clearTimeout(orderPollTimer);readingSession=crypto.randomUUID();await refreshMe();renderMain();toast('Đã đăng xuất. Hẹn gặp lại ở trang sách tiếp theo.')}
function verifyEmail(){if(!state.user)return;auth('verify',{email:state.user.email});}
function saveUserData(immediate=false){if(!state.user)return;clearTimeout(saveTimer);const send=async()=>{try{await api('/api/user-data',{method:'POST',body:{saved:state.data.saved,progress:state.data.progress}})}catch(e){toast('Chưa lưu được tiến độ: '+e.message)}};if(immediate)return send();saveTimer=setTimeout(send,550)}
function spawnSaveFx(el){
 if(!el||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 el.classList.remove('save-pop');void el.offsetWidth;el.classList.add('save-pop');
 const rect=el.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const colors=['#e8b03c','#376d4c','#f59e0b','#78b88a','#ffd666','#e88aa5'];
 for(let i=0;i<6;i++){
  const sp=document.createElement('span');sp.className='save-spark';
  const ang=(Math.PI*2*i)/6 - Math.PI/2,dist=22+Math.random()*16;
  sp.style.left=cx+'px';sp.style.top=cy+'px';
  sp.style.setProperty('--sx',Math.round(Math.cos(ang)*dist)+'px');
  sp.style.setProperty('--sy',Math.round(Math.sin(ang)*dist)+'px');
  sp.style.setProperty('--sc',colors[i%colors.length]);
  document.body.appendChild(sp);
  setTimeout(()=>sp.remove(),620);
 }
}
function syncReaderBookmarkBtn(){
 const btn=$('#readerBookmarkBtn');if(!btn)return;
 const id=state.reader?.bookId;
 const saved=!!id&&!state.reader?.localBook&&state.data.saved.includes(id);
 btn.classList.toggle('is-saved',saved);
 btn.setAttribute('aria-pressed',String(saved));
 btn.title=saved?'Đã lưu trong Kệ sách của bạn (bấm để bỏ lưu)':'Lưu sách vào Kệ sách của bạn';
}
async function bookmark(id,anchorEl=null){if(!book(id))return;if(!state.user){auth();return}const old=[...state.data.saved],i=old.indexOf(id),saving=i<0;state.data.saved=saving?[...old,id]:old.filter(x=>x!==id);syncReaderBookmarkBtn();if(saving)spawnSaveFx(anchorEl||$('#readerBookmarkBtn'));renderMain();try{await api('/api/user-data',{method:'POST',body:{saved:state.data.saved}});toast(saving?'🔖 Đã lưu sách vào Kệ sách của bạn!':'Đã bỏ lưu sách.')}catch(e){state.data.saved=old;syncReaderBookmarkBtn();renderMain();toast(e.message)}}
function legacySaved(){try{const sessions=[JSON.parse(localStorage.getItem('la.v1.data.guest')||'{}')];const oldUser=JSON.parse(localStorage.getItem('la.v1.session')||'null');if(oldUser?.email&&oldUser.email===state.user?.email)sessions.push(JSON.parse(localStorage.getItem('la.v1.data.'+oldUser.email)||'{}'));return [...new Set(sessions.flatMap(s=>Array.isArray(s.saved)?s.saved:[]))].filter(id=>book(id))}catch{return []}}
function hasLegacySaved(){return !!state.user&&legacySaved().some(id=>!state.data.saved.includes(id))}
function confirmImport(){const ids=legacySaved().filter(id=>!state.data.saved.includes(id));if(!ids.length){toast('Không có sách mới để nhập.');return}modal('Nhập sách đã lưu từ thiết bị này',`<p class="auth-subtitle">Thêm ${ids.length} cuốn sách vào tài khoản ${esc(state.user.email)}. PDF cá nhân và tài khoản demo không được tải lên.</p><p class="notice">${ids.map(id=>esc(book(id).title)).join('<br>')}</p><button class="button button-primary button-block" data-action="import-confirm">Nhập sách đã chọn</button>`)}
function readerActive(){return !!state.reader?.ready}
function isAudioPlaying(){return BookMedia.playing||(!audio.paused&&!audio.ended&&!!audio.getAttribute('src'))}
async function heartbeat(force){const active=force===false?false:document.visibilityState!=='hidden'&&(readerActive()||isAudioPlaying());if(!state.user){wasActive=false;return}if(heartbeatBusy)return;if(!active&&!wasActive)return;heartbeatBusy=true;try{const result=await api('/api/reading',{method:'POST',body:{active,bookId:state.reader?.bookId||undefined,source:readerActive()?'reader':'audio',sessionId:readingSession}});wasActive=active;if(result.stats)state.stats={...state.stats,...result.stats};if(result.secondsByDay)state.data.secondsByDay=result.secondsByDay;renderUser();renderRight();$$('[data-today]').forEach(e=>e.textContent=minutes());$$('[data-streak]').forEach(e=>e.textContent=streak());$$('[data-level]').forEach(e=>e.textContent=state.stats.level||1);$$('[data-xp]').forEach(e=>e.textContent=(state.stats.xp||0)+' XP');$$('[data-total-xp]').forEach(e=>e.textContent=(state.stats.xp||0)+' XP tích lũy');$$('[data-next-xp]').forEach(e=>e.textContent=(1000-(state.stats.xp||0)%1000)+' XP đến cấp tiếp theo');$$('[data-xp-bar]').forEach(e=>e.style.width=((state.stats.xp||0)%1000/10)+'%')}catch(e){if(e.status===401){state.user=null;renderUser()}else console.warn('Reading sync temporarily unavailable.')}finally{heartbeatBusy=false}}
function startReaderClock(){
 clearInterval(readerTimer);state.sessionSeconds=0;timerPaused=false;timerOpen=false;readerStamp=performance.now();renderTimerUI();
 readerTimer=setInterval(()=>{
  const now=performance.now(),delta=Math.min(2,Math.max(0,(now-readerStamp)/1000));readerStamp=now;
  if(document.visibilityState!=='hidden'&&readerActive()&&!timerPaused){
   state.sessionSeconds+=delta;
   if(timerMode==='pomodoro'&&pomodoroLeft>0){
    pomodoroLeft=Math.max(0,pomodoroLeft-delta);
    if(pomodoroLeft<=0){
     timerMode='stopwatch';pomodoroTotal=0;
     BookMedia.chime?.();
     if(state.user){addCoins(15,'Hoàn thành phiên đọc tập trung Pomodoro');toast('🔔 Hết giờ tập trung! Bạn nhận được +15 Lowf Xu 💰');}
     else toast('🔔 Hoàn thành phiên đọc tập trung! Hãy nghỉ mắt một chút nhé.');
    }
   }
   renderTimerUI();
  }
 },1000);
}
async function openBook(id){let b=book(id);if(!b)return;const fxDone=playBookOpenFx(b);let fresh;try{fresh=await api('/api/books/'+encodeURIComponent(id))}catch(e){await fxDone;if(e.status===401||e.status===403){if(!state.user){auth();return}modal('Mở quyền đọc sách',`<p class="auth-subtitle">${esc(e.message)}</p>${b.saleEnabled&&state.commerce.enabled?`<button class="button button-primary button-block" data-action="cart-add" data-kind="book" data-id="${esc(id)}">Thêm sách vào giỏ · ${money(b.price)}</button>`:''}<button class="button button-soft button-block" data-action="nav" data-view="plans">Xem gói thành viên</button>`);return}throw e}await fxDone;if(!fresh.book)throw new Error('Không tìm thấy nội dung sách.');b=fresh.book;state.books=state.books.map(x=>x.id===id?b:x);BookMedia.cancelPDF();const saved=state.data.progress[id],chapter=Math.max(0,Math.min((b.chapters?.length||1)-1,Number(saved?.chapter)||0));state.reader={type:b.pdfAssetId?'remote':'chapters',bookId:id,id:b.pdfAssetId||id,title:b.title,chapter,page:b.pdfAssetId?loadPdfPage('remote:'+b.pdfAssetId):1,pageStep:1,pages:1,ready:false,pdfReflow:false,isScan:false,pdfParagraphs:[]};$('#readerTitle').textContent=b.title;$('#readerSubtitle').textContent=b.author||'Lowf';const credit=$('#readerSource'),sourceURL=typeof b.sourceUrl==='string'&&/^https:\/\//.test(b.sourceUrl)?b.sourceUrl:'';credit.hidden=!(b.licenseLabel||sourceURL);credit.innerHTML=`${esc(b.licenseLabel||'')}${sourceURL?` · <a href="${esc(sourceURL)}" target="_blank" rel="noopener noreferrer">Nguồn bản sách ↗</a>`:''}`;$('#reader').showModal();startReaderClock();renderPlayer();updateThemeButtons();if(b.pdfAssetId){$('#chapterSelect').disabled=true;$('#chapterSelect').innerHTML='<option>Đang mở PDF…</option>';await renderPDF()}else if(b.chapters?.length){$('#chapterSelect').disabled=false;$('#chapterSelect').dataset.pdfId='';$('#chapterSelect').innerHTML=b.chapters.map((c,i)=>`<option value="${i}">${i+1}. ${esc(c.title)}</option>`).join('');renderChapter()}else{$('#readerTextStage').hidden=false;$('#pdfPageStage').hidden=true;$('#readerBody').hidden=false;$('#pdfCanvas').hidden=true;$('#readerBody').innerHTML=empty('Sách đang được hoàn thiện','Nội dung đọc chưa được xuất bản. Hãy quay lại sau.');$('#readerProgress').textContent='Chưa có nội dung';$('#chapterSelect').innerHTML='<option>Chưa có chương</option>';$('#chapterSelect').disabled=true;$$('[data-action="prev-page"],[data-action="next-page"]').forEach(e=>e.disabled=true);icons()}if(state.user){state.data.progress[id]={chapter,finished:!!saved?.finished,updated:dateKey()};saveUserData()}heartbeat()}
function renderReaderToc(){
 const pop=$('#readerTocPop'),btn=$('#readerTocBtn'),lbl=$('#readerTocLabel'),r=state.reader;
 if(btn)btn.setAttribute('aria-expanded',String(tocOpen));
 if(lbl&&r){
  if(r.type==='chapters'){
   const b=r.localBook||book(r.bookId),c=b?.chapters?.[r.chapter];
   lbl.textContent=c?`${r.chapter+1}. ${c.title}`:`Chương ${(r.chapter||0)+1}`;
  }else{
   lbl.textContent=r.pageEnd>r.page?`Trang ${r.page}–${r.pageEnd} / ${r.pages||1}`:`Trang ${r.page||1} / ${r.pages||1}`;
  }
 }
 if(!pop)return;
 pop.hidden=!tocOpen||!r;
 if(!tocOpen||!r)return;
 if(r.type==='chapters'){
  const b=r.localBook||book(r.bookId),chs=b?.chapters||[],pct=Math.round(((r.chapter+1)/Math.max(1,chs.length))*100);
  pop.innerHTML=`<div class="toc-head"><div class="toc-head-top"><strong>📑 Mục lục sách</strong><small style="margin:0">${chs.length} chương · ${pct}%</small></div><small>${esc(b?.title||r.title||'')}</small><div class="toc-progress-bar"><span style="width:${pct}%"></span></div></div>
   <div class="toc-list">${chs.map((c,i)=>`<button type="button" class="toc-item ${i===r.chapter?'active':i<r.chapter?'done':''}" data-action="toc-jump-chapter" data-id="${i}"><span class="toc-num">${i<r.chapter?'✓':String(i+1).padStart(2,'0')}</span><span class="toc-title">${esc(c.title)}</span>${i===r.chapter?'<small style="font-size:9px;opacity:.75">Đang đọc</small>':''}</button>`).join('')}</div>`;
 }else{
  const total=Math.max(1,r.pages||1),cur=r.page||1,pct=Math.round((r.pageEnd||cur)/total*100);
  const step=total<=20?2:total<=60?5:total<=150?15:Math.max(20,Math.round(total/10));
  const chips=[1];for(let p=step;p<total;p+=step)chips.push(p);if(!chips.includes(total))chips.push(total);
  const start=Math.max(1,cur-12),end=Math.min(total,cur+28);
  const rows=[];for(let p=start;p<=end;p++)rows.push(`<button type="button" class="toc-item ${p===cur?'active':p<cur?'done':''}" data-action="toc-jump-page" data-id="${p}"><span class="toc-num">${p}</span><span class="toc-title">Trang ${p} / ${total}</span>${p===cur?'<small style="font-size:9px;opacity:.75">Hiện tại</small>':''}</button>`);
  pop.innerHTML=`<div class="toc-head"><div class="toc-head-top"><strong>📑 Mục lục trang PDF</strong><small style="margin:0">${total} trang · ${pct}%</small></div><small>${esc(r.title||'')}</small><div class="toc-progress-bar"><span style="width:${pct}%"></span></div></div>
   <form class="toc-pdf-jump" id="tocPdfJumpForm"><input type="number" name="page" min="1" max="${total}" value="${cur}" placeholder="Nhập số trang (1–${total})…" aria-label="Đi tới số trang"><button type="submit" class="button button-primary" style="min-height:32px;padding:5px 12px;font-size:10px">Đi tới</button></form>
   <div class="toc-pdf-chips">${chips.slice(0,12).map(p=>`<button type="button" class="toc-pdf-chip ${p===cur?'active':''}" data-action="toc-jump-page" data-id="${p}">Tr. ${p}</button>`).join('')}</div>
   <div class="toc-list">${rows.join('')}</div>`;
 }
}
function renderPdfSmartBar(){
 const bar=$('#pdfSmartBar'),r=state.reader;
 if(!bar)return;
 const isPdf=!!r&&(r.type==='remote'||r.type==='local');
 bar.hidden=!isPdf;
 if(!isPdf){bar.replaceChildren();return}
 const rp=readerPrefs();
 const hasText=(r.pdfParagraphs?.length||0)>0&&!r.isScan;
 bar.innerHTML=`<span class="pdf-smart-badge">${r.isScan?'🪄 Sách Scan tối ưu':'📄 PDF sắc nét Retina'}</span>
  <div class="pdf-fit-group" role="group" aria-label="Khung hiển thị trang PDF">
   <button type="button" class="pdf-smart-btn ${rp.pdfFit==='page'?'active':''}" data-action="pdf-fit" data-id="page" title="Vừa trọn 1 trang trong màn hình, không cắt xén, không cần cuộn">📄 Vừa 1 trang</button>
   <button type="button" class="pdf-smart-btn ${rp.pdfFit==='spread'?'active':''}" data-action="pdf-fit" data-id="spread" title="Mở 2 trang cạnh nhau như sách giấy">📖 2 trang</button>
   <button type="button" class="pdf-smart-btn ${rp.pdfFit==='width'?'active':''}" data-action="pdf-fit" data-id="width" title="Phóng lớn vừa chiều ngang và cuộn dọc">↔️ Đọc to</button>
  </div>
  <button type="button" class="pdf-smart-btn ${rp.scanBlend?'active':''}" data-action="pdf-scan-toggle" title="Tự động lọc nền xám scan và hòa vào màu giấy bạn chọn">🪄 Lọc scan &amp; Hòa giấy</button>
  <button type="button" class="pdf-smart-btn ${rp.pdfTrim?'active':''}" data-action="pdf-trim-toggle" title="Tự cắt khoảng trắng viền scan thừa để chữ to rõ hơn mà không cắt chữ">✂️ Gọt viền thừa</button>
  ${hasText?`<button type="button" class="pdf-smart-btn ${r.pdfReflow?'active':''}" data-action="pdf-reflow-toggle" title="Chuyển trang PDF sang trang chữ Lowf để chỉnh cỡ chữ, giãn dòng và lật mượt">${r.pdfReflow?'📄 Xem trang PDF':'✨ Chữ mượt'}</button>`:''}
  <button type="button" class="pdf-smart-btn" data-action="pdf-zoom" data-delta="-0.15" aria-label="Thu nhỏ PDF">🔍−</button>
  <button type="button" class="pdf-smart-btn" data-action="pdf-zoom-reset" title="Đặt lại vừa khung 100%" style="min-width:44px;justify-content:center">${Math.round(rp.pdfZoom*100)}%</button>
  <button type="button" class="pdf-smart-btn" data-action="pdf-zoom" data-delta="0.15" aria-label="Phóng to PDF">🔍+</button>`;
}
function renderChapter(turnDir=0){
 window.LowfSpeech?.stop();
 const r=state.reader,b=r.localBook||book(r.bookId),c=b.chapters[r.chapter],rp=readerPrefs();
 const isNarrow=window.innerWidth<900;
 const effectiveLayout=rp.layout==='spread'&&isNarrow?'single':rp.layout;
 const leaves=splitChapterPages(c,effectiveLayout);
 const step=effectiveLayout==='spread'?2:1;
 const totalViews=Math.max(1,Math.ceil(leaves.length/step));
 r.subPage=Math.max(0,Math.min(totalViews-1,Number(r.subPage)||0));
 r.subTotal=totalViews;
 r.leafStep=step;
 r.totalLeaves=leaves.length;
 $('#readerTextStage').hidden=false;$('#pdfPageStage').hidden=true;$('#pdfCanvas').hidden=true;$('#readerBody').hidden=false;
 renderPdfSmartBar();
 applyReaderPrefs();
 const chHead=`<div class="chapter-label">CHƯƠNG ${String(r.chapter+1).padStart(2,'0')} / ${String(b.chapters.length).padStart(2,'0')}</div><h2>${esc(c.title)}</h2>`;
 if(effectiveLayout==='spread'){
  const li=r.subPage*2,ri=li+1;
  const leftParas=leaves[li]||[],rightParas=leaves[ri]||[];
  $('#readerBody').className='book-spread';
  $('#readerBody').innerHTML=`<div class="book-leaf left-leaf"><div class="leaf-running"><span>${esc(b.title)}</span><span>Chương ${r.chapter+1}</span></div><div class="leaf-content">${li===0?chHead:''}${leftParas.map(p=>`<p>${esc(p)}</p>`).join('')}</div><div class="leaf-num">Trang ${li+1}</div></div><div class="book-spine" aria-hidden="true"></div><div class="book-leaf right-leaf"><div class="leaf-running"><span>${esc(c.title)}</span><span>Lowf Edition</span></div><div class="leaf-content">${rightParas.length?rightParas.map(p=>`<p>${esc(p)}</p>`).join(''):`<div class="leaf-end-ornament"><span>✦</span><p>Hết chương ${r.chapter+1}</p><small>${r.chapter<b.chapters.length-1?'Bấm Lật tiếp để sang chương mới':'Bạn đã đi tới trang cuối cùng của cuốn sách'}</small></div>`}</div><div class="leaf-num">${rightParas.length?`Trang ${ri+1}`:'✦'}</div></div>`;
 }else{
  const curParas=leaves[r.subPage]||[];
  const nextChObj=effectiveLayout==='scroll'&&r.chapter<b.chapters.length-1?b.chapters[r.chapter+1]:null;
  const scrollFoot=effectiveLayout==='scroll'?`<button type="button" class="scroll-chapter-next" data-action="next-page"><div><small>${nextChObj?'CHƯƠNG TIẾP THEO':'HOÀN TẤT CUỐN SÁCH'}</small><strong>${nextChObj?esc(nextChObj.title):'Bạn đã đọc hết chương cuối cùng!'}</strong></div><span class="button button-primary">${nextChObj?'Đọc tiếp chương sau':'Hoàn tất'} ${icon(nextChObj?'arrow-right':'check')}</span></button>`:'';
  $('#readerBody').className=effectiveLayout==='scroll'?'book-sheet book-scroll':'book-sheet';
  $('#readerBody').innerHTML=`<div class="leaf-running"><span>${esc(b.title)}</span><span>${esc(c.title)}</span></div>${r.subPage===0?chHead:''}${curParas.map(p=>`<p>${esc(p)}</p>`).join('')}${effectiveLayout==='single'?`<div class="leaf-num">Trang ${r.subPage+1} / ${leaves.length}</div>`:scrollFoot}`;
 }
 $('#chapterSelect').value=r.chapter;
 const pageInfo=effectiveLayout==='spread'?`Trang ${r.subPage*2+1}${r.subPage*2+2<=leaves.length?'–'+(r.subPage*2+2):''} / ${leaves.length}`:effectiveLayout==='single'?`Trang ${r.subPage+1} / ${leaves.length}`:'Cuộn liền mạch';
 const pct=Math.min(100,Math.round(((r.chapter+(r.subPage+1)/totalViews)/Math.max(1,b.chapters.length))*100));
 const statusLine=`Chương ${r.chapter+1}/${b.chapters.length} · ${pageInfo} · ${pct}%`;
 $('#readerProgress').textContent=statusLine;
 const zenSt=$('#readerZenStatus');if(zenSt)zenSt.textContent=statusLine;
 const fill=$('#readerProgressFill');if(fill)fill.style.width=pct+'%';
 syncReaderBookmarkBtn();renderReaderToc();
 $('#readerScroll').scrollTop=0;
 const atStart=r.chapter===0&&r.subPage===0;
 const atEnd=r.chapter===b.chapters.length-1&&r.subPage>=totalViews-1;
 $$('[data-action="prev-page"]').forEach(btn=>btn.disabled=atStart);
 $$('[data-action="next-page"]').forEach(btn=>btn.disabled=false);
 const footNext=$('.reader-footer [data-action="next-page"]');
 if(footNext)footNext.innerHTML=atEnd?`Hoàn tất ${icon('check')}`:`Lật tiếp ${icon('arrow-right')}`;
 r.ready=true;
 if(turnDir)triggerPageTurn(turnDir);
 if(state.user&&!r.localBook){state.data.progress[b.id]={chapter:r.chapter,finished:state.data.progress[b.id]?.finished||false,updated:dateKey()};saveUserData()}
 icons();window.dispatchEvent(new Event('lowf:readerchange'))
}
async function openLocalPDF(id){
 const file=state.pdfs.find(p=>p.id===id);if(!file)return;
 BookMedia.cancelPDF();
 const fullRec=await BookMedia.getPDF(id).catch(()=>null);
 if(fullRec?.kind==='ebook'&&Array.isArray(fullRec.chapters)&&fullRec.chapters.length){
  const localBook={id:'local:'+id,title:fullRec.name,author:'Sách Ebook cá nhân · Tự tối ưu Lowf',chapters:fullRec.chapters};
  state.reader={type:'chapters',bookId:localBook.id,localBook,id,title:localBook.title,chapter:0,page:1,pages:1,ready:false};
  $('#readerTitle').textContent=localBook.title;$('#readerSubtitle').textContent='Ebook tự động tối ưu · chỉ trên thiết bị này';
  $('#readerSource').hidden=true;
  $('#chapterSelect').disabled=false;
  $('#chapterSelect').innerHTML=localBook.chapters.map((c,i)=>`<option value="${i}">${i+1}. ${esc(c.title)}</option>`).join('');
  $('#reader').showModal();startReaderClock();renderPlayer();updateThemeButtons();renderChapter();heartbeat();
  return;
 }
 state.reader={type:'local',id,title:file.name,page:loadPdfPage('local:'+id),pageStep:1,pages:1,ready:false,pdfReflow:false,isScan:false,pdfParagraphs:[]};
 $('#readerTitle').textContent=file.name;$('#readerSubtitle').textContent='PDF / Scan cá nhân · tự lọc giấy & vừa trọn 1 trang';$('#readerSource').hidden=true;$('#chapterSelect').disabled=true;$('#chapterSelect').innerHTML='<option>Đang tối ưu PDF…</option>';$('#reader').showModal();startReaderClock();renderPlayer();updateThemeButtons();await renderPDF();heartbeat()
}
async function renderPDF(turnDir=0){
 const r=state.reader;if(!r||state.pdfBusy)return;state.pdfBusy=true;r.ready=false;window.LowfSpeech?.stop();window.dispatchEvent(new Event('lowf:readerloading'));
 const firstOpen=!r.pages||r.pages<=1;
 if(firstOpen){$('#readerTextStage').hidden=false;$('#pdfPageStage').hidden=true;$('#pdfTextLayer').replaceChildren();$('#readerBody').hidden=false;$('#readerBody').innerHTML='<p class="notice">Đang mở và tự động tối ưu trang sách vừa khung…</p>';$('#pdfCanvas').hidden=true;}
 $$('[data-action="prev-page"],[data-action="next-page"]').forEach(e=>e.disabled=true);
 try{
  const rp=readerPrefs();
  renderPdfSmartBar();
  const opts={enhanceScan:rp.scanBlend,trimMargins:rp.pdfTrim,fitMode:rp.pdfFit,zoom:rp.pdfZoom,canvas2:$('#pdfCanvas2')};
  const result=r.type==='remote'?await BookMedia.renderRemotePDF(r.id,r.title,$('#pdfCanvas'),r.page,$('#pdfTextLayer'),opts):await BookMedia.renderPDF(r.id,$('#pdfCanvas'),r.page,$('#pdfTextLayer'),opts);
  if(state.reader!==r)return;
  r.page=result.page;r.pageEnd=result.pageEnd||result.page;r.pageStep=result.pageStep||1;r.pages=result.pages;r.pdfText=result.text||'';r.pdfParagraphs=result.paragraphs||[];r.isScan=!!result.isScan;
  savePdfPage((r.type==='remote'?'remote:':'local:')+r.id,r.page);
  if(r.isScan)r.pdfReflow=false;
  r.ready=true;
  applyReaderPrefs();
  renderPdfSmartBar();
  const isSpread=!!result.spread&&!r.pdfReflow;
  $('#pdfPageStage').classList.toggle('pdf-spread-active',isSpread);
  $('#pdfSpine').hidden=!isSpread;
  $('#pdfLeaf2').hidden=!isSpread;
  if(r.pdfReflow&&r.pdfParagraphs.length){
   $('#readerTextStage').hidden=false;$('#pdfPageStage').hidden=true;$('#pdfCanvas').hidden=true;$('#readerBody').hidden=false;
   $('#readerBody').className='book-sheet';
   $('#readerBody').innerHTML=`<div class="leaf-running"><span>${esc(r.title)}</span><span>Trang ${r.page} / ${r.pages} · Chữ mượt</span></div>${r.pdfParagraphs.map(p=>`<p>${esc(p)}</p>`).join('')}<div class="leaf-num">Trang ${r.page} / ${r.pages}</div>`;
  }else{
   $('#readerTextStage').hidden=true;$('#pdfPageStage').hidden=false;$('#readerBody').hidden=true;$('#pdfCanvas').hidden=false;
  }
  const sel=$('#chapterSelect');
  if(sel){
   if(Number(sel.dataset.pdfPages)!==r.pages||sel.dataset.pdfId!==r.id){
    const optsHtml=[];for(let i=1;i<=r.pages;i++)optsHtml.push(`<option value="${i}">Trang ${i} / ${r.pages}</option>`);
    sel.innerHTML=optsHtml.join('');sel.dataset.pdfPages=String(r.pages);sel.dataset.pdfId=String(r.id);
   }
   sel.disabled=false;sel.value=String(r.page);
  }
  const pageLabel=r.pageEnd>r.page?`Trang ${r.page}–${r.pageEnd} / ${r.pages}`:`Trang ${r.page} / ${r.pages}`;
  const pct=Math.round((r.pageEnd||r.page)/Math.max(1,r.pages)*100);
  const statusLine=`${pageLabel} · ${pct}%${r.isScan?' · Scan tối ưu':''}`;
  $('#readerProgress').textContent=statusLine;
  const zenSt=$('#readerZenStatus');if(zenSt)zenSt.textContent=statusLine;
  const fill=$('#readerProgressFill');if(fill)fill.style.width=pct+'%';
  syncReaderBookmarkBtn();renderReaderToc();
  $$('[data-action="prev-page"]').forEach(btn=>btn.disabled=r.page<=1);
  $$('[data-action="next-page"]').forEach(btn=>btn.disabled=(r.pageEnd||r.page)>=r.pages);
  const footNext=$('.reader-footer [data-action="next-page"]');if(footNext)footNext.innerHTML=`Lật tiếp ${icon('arrow-right')}`;
  $('#readerScroll').scrollTop=0;
  if(turnDir)triggerPageTurn(turnDir);
  icons();window.dispatchEvent(new Event('lowf:readerchange'));
 }catch(e){
  if(e.name==='AbortError'||state.reader!==r)return;
  $('#readerTextStage').hidden=false;$('#pdfPageStage').hidden=true;$('#readerBody').hidden=false;
  $('#readerBody').innerHTML=empty('Chưa mở được tệp sách',esc(e.message),`<button class="button button-primary" data-action="retry-pdf">Thử lại</button>${r.type==='local'?`<button class="button button-soft" data-action="export-pdf" data-id="${esc(r.id)}">Tải bản gốc</button>`:''}`,'file-warning');
  icons();
 }finally{if(state.reader===r)state.pdfBusy=false}
}
function closeReader(){window.LowfSpeech?.stop();window.dispatchEvent(new Event('lowf:readerclose'));setReaderZen(false);timerOpen=false;stylePopOpen=false;tocOpen=false;renderTimerUI();renderReaderStylePop();renderReaderToc();const prior=state.reader;state.reader=null;state.pdfBusy=false;clearInterval(readerTimer);BookMedia.cancelPDF();$('#pdfSmartBar').hidden=true;$('#reader').close();if(prior?.bookId&&!prior?.localBook)saveUserData(true);heartbeat();renderMain()}
function changePage(delta){
 const r=state.reader;if(!r)return;
 if(r.type!=='chapters'){if(state.pdfBusy)return;const step=r.pageStep||1;const page=Math.max(1,Math.min(r.pages,r.page+delta*step));if(page!==r.page){r.page=page;renderPDF(delta)}return}
 const b=r.localBook||book(r.bookId),subTotal=r.subTotal||1,nextSub=(r.subPage||0)+delta;
 if(nextSub>=0&&nextSub<subTotal){r.subPage=nextSub;renderChapter(delta);return}
 const nextCh=r.chapter+(delta>0?1:-1);
 if(nextCh>=b.chapters.length){
  if(state.user&&!r.localBook){if(!state.data.progress[b.id]?.finished){addCoins(25,'Hoàn thành cuốn sách: '+b.title)}state.data.progress[b.id].finished=true;saveUserData(true)}
  closeReader();toast('🎉 Bạn đã đọc hết cuốn sách!'+(state.user&&!r.localBook?' +25 Lowf Xu 💰':''));
 }else if(nextCh>=0){
  r.chapter=nextCh;
  if(delta<0){
   const rp=readerPrefs(),eff=rp.layout==='spread'&&window.innerWidth<900?'single':rp.layout;
   const leaves=splitChapterPages(b.chapters[nextCh],eff);
   r.subPage=Math.max(0,Math.ceil(leaves.length/(eff==='spread'?2:1))-1);
  }else r.subPage=0;
  renderChapter(delta);
 }
}
function renderPlayer(){const playing=isAudioPlaying(),t=state.ambient?ambientModes[state.ambient]:state.tracks[state.trackIndex];$('#player').hidden=!t;$('#playerTitle').textContent=t?.title||'Âm nhạc của bạn';$('#playerArtist').textContent=state.ambient?`${t?.tag||'Studio'} · phát trực tiếp`:t?.artist||t?.composer||'Lowf tuyển chọn';$('#playerPlay').innerHTML=icon(playing?'pause':'play');$('#playerPlay').setAttribute('aria-label',playing?'Tạm dừng':'Phát nhạc');$('#audioSeek').disabled=!!state.ambient;const rBtn=$('#readerMusicBtn');if(rBtn){rBtn.classList.toggle('is-playing',playing);rBtn.setAttribute('aria-pressed',String(playing));const lbl=$('span:last-child',rBtn);if(lbl)lbl.textContent=playing?'Đang phát':'Nhạc';}icons()}
async function playTrack(id){const index=state.tracks.findIndex(t=>t.id===id);if(index<0)return;if(state.tracks[index].access==='member'&&!isOwner()&&!state.membership?.premium){state.user?navigate('plans'):auth();return}if(index===state.trackIndex&&!state.ambient&&audio.getAttribute('src')){await toggleAudio();return}audioEpoch++;BookMedia.pause();state.ambient=null;state.trackIndex=index;const t=state.tracks[index];if(!t.assetId&&!safeURL(t.url))throw new Error('Bản nhạc này chưa có tệp âm thanh.');audio.src=t.assetId?asset(t.assetId):safeURL(t.url);audio.volume=state.volume;try{await audio.play();heartbeat();renderPlayer();if(state.view==='studio')renderMain()}catch{renderPlayer();throw new Error('Chưa phát được bản nhạc. Hãy thử lại hoặc chọn bản khác.')}}
async function playAmbient(id){if(!ambientModes[id])return;audioEpoch++;audio.pause();state.trackIndex=-1;state.ambient=id;await BookMedia.play(id);BookMedia.setVolume(state.volume);renderPlayer();if(state.view==='studio')renderMain();heartbeat()}
async function toggleAudio(){const playable=state.tracks.find(t=>t.assetId||safeURL(t.url));if(state.ambient){if(BookMedia.playing){BookMedia.pause();heartbeat()}else await BookMedia.play(state.ambient)}else if(audio.getAttribute('src')){if(audio.paused)await audio.play();else audio.pause()}else if(playable){await playTrack(playable.id);return}else{await playAmbient('hanoi_rain');return}renderPlayer();if(state.view==='studio')renderMain();heartbeat()}
function stopAudio(){audioEpoch++;audio.pause();audio.removeAttribute('src');audio.load();BookMedia.pause();state.ambient=null;state.trackIndex=-1;renderPlayer();if(state.view==='studio')renderMain();heartbeat()}
async function nextTrack(delta){if(!state.tracks.length)return;const index=state.trackIndex<0?0:(state.trackIndex+delta+state.tracks.length)%state.tracks.length;const t=state.tracks[index];state.trackIndex=-1;await playTrack(t.id)}
function trackCredit(id){const t=id?state.tracks.find(x=>x.id===id):state.tracks[state.trackIndex];if(state.ambient&&!id){modal('Âm thanh Ambient','<p class="license-info">Piano, Lo-fi và tiếng mưa được tổng hợp trực tiếp trên thiết bị bằng Web Audio. Không tải tệp âm nhạc ngoài và không có quảng cáo.</p>');return}if(!t)return;modal(t.title,`<div class="license-info"><p><strong>${esc(t.artist||t.composer||'')}</strong></p><p style="margin-top:15px">${esc(t.attribution||t.description||'Bản nhạc do Lowf tuyển chọn.')}</p>${t.license?`<p style="margin-top:12px">Giấy phép: ${esc(t.license)}</p>`:''}${safeURL(t.sourceUrl||t.source)?`<p style="margin-top:12px"><a href="${esc(safeURL(t.sourceUrl||t.source))}" target="_blank" rel="noopener noreferrer">Xem nguồn bản thu ↗</a></p>`:''}${safeURL(t.licenseUrl)?`<p><a href="${esc(safeURL(t.licenseUrl))}" target="_blank" rel="noopener noreferrer">Đọc giấy phép ↗</a></p>`:''}</div>`)}
function playVideo(id){const v=state.videos.find(x=>x.id===id);if(!v)return;if(v.access==='member'&&!isOwner()&&!state.membership?.premium){state.user?navigate('plans'):auth();return}const youtubeId=/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId||'')?v.youtubeId:null;if(!v.assetId&&!youtubeId){toast('Video này chưa có nội dung để phát.');return}audio.pause();BookMedia.pause();window.LowfSpeech?.stop();renderPlayer();heartbeat();const player=youtubeId?`<iframe class="video-player youtube-player" src="https://www.youtube-nocookie.com/embed/${youtubeId}" title="${esc(v.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`:`<video class="video-player" controls playsinline preload="metadata" src="${asset(v.assetId)}" ${v.coverAssetId||v.posterAssetId?`poster="${asset(v.coverAssetId||v.posterAssetId)}"`:''}>Trình duyệt chưa hỗ trợ video.</video>`;modal(v.title,`${player}<p class="small-note">${esc(v.description||'')}</p>${v.attribution?`<p class="small-note">${esc(v.attribution)}</p>`:''}${v.license?`<p class="small-note">Giấy phép: ${esc(v.license)}</p>`:''}`,{wide:true});const video=$('video',$('#modal'));video?.addEventListener('error',()=>toast('Chưa tải được video. Hãy thử lại hoặc kiểm tra quyền truy cập.'))}
async function joinPlan(id){const p=state.plans.find(p=>p.id===id);if(!p||p.enabled!==true){toast('Gói này chưa mở đăng ký.');return}if(Number(p.price)>0){addToCart('plan',id);return}if(!state.user){auth('signup');return}await api('/api/membership',{method:'POST',body:{planId:id}});await refreshMe();renderMain();toast('Bạn đã tham gia gói thành viên miễn phí của Lowf.')}
function about(){modal('Lowf — Book & beyond',`<p class="auth-subtitle">Một không gian cho sách, những giai điệu tập trung và cộng đồng yêu đọc.</p><div class="notice">Lưu sách yêu thích, ghi chú và những từ mới trong tài khoản của bạn. PDF cá nhân trong kệ sách được giữ trên trình duyệt của thiết bị này.</div>${isOwner()?`<section data-owner-surface><h3 style="font-size:15px;margin:22px 0 10px">Chăm chút không gian Lowf</h3><p class="small-note">Thêm sách, ảnh bìa, PDF, nhạc và video; chỉnh màu, banner và bố cục trước khi xuất bản.</p><a class="button button-primary button-block" href="/admin" style="margin-top:20px">Mở quản trị website ↗</a><p style="margin-top:18px"><a class="text-button" href="/huong-dan.html">Hướng dẫn quản trị ↗</a></p></section>`:'<button class="button button-soft button-block" data-action="account" style="margin-top:20px">Mở tài khoản của tôi</button>'}<p class="small-note" style="margin-top:18px">Đọc một trang sách, bật một bản nhạc và dành một chút thời gian cho chính mình.</p>`)}
function shop(){const list=state.books.filter(matches);return `<div class="page-intro"><div class="eyebrow">BOOKSHOP · LOWF</div><h1>Giữ một cuốn sách bên mình.</h1><p>Những cuốn sách cho tủ sách của bạn. Chọn định dạng phù hợp và tiếp tục hành trình đọc.</p></div><div class="page-tabs"><button class="button button-primary" data-action="cart">${icon('shopping-bag')} Giỏ hàng (${state.cart.reduce((n,x)=>n+x.quantity,0)})</button><button class="button button-soft" data-action="nav" data-view="orders">Đơn hàng của tôi</button>${isOwner()?'<a class="button button-soft" href="/admin?tab=books&action=add">Thêm sách để bán ↗</a>':''}</div>${!state.commerce.enabled?`<div class="notice commerce-readiness" style="margin-bottom:24px">${icon('shopping-bag')}<div><strong>Chưa mở thanh toán VNPAY</strong><p>${esc(state.commerce.reason||'Cửa hàng đang hoàn tất kết nối thanh toán. Hiện chưa nhận tiền. Bạn vẫn có thể đọc sách miễn phí.')}</p>${isOwner()?'<a class="text-button" href="/admin?tab=payments">Thiết lập VNPAY trong Studio ↗</a>':''}</div></div>`:''}${categories()}<div class="book-grid">${list.map(b=>{const sale=b.saleEnabled===true&&Number(b.price)>0;return `<article class="book-card"><div class="book-cover">${coverHTML(b)}<span class="format-tag">${esc(b.format||'Ebook')}</span><button class="cover-target" data-action="read" data-id="${esc(b.id)}" aria-label="Đọc ${esc(b.title)}"></button></div><h3>${esc(b.title)}</h3><p class="author">${esc(b.author)}</p><div class="book-meta store-price">${sale?money(b.price):b.access==='free'?'Bản đọc miễn phí':'Chưa mở bán'}</div><button class="button button-soft" data-action="read" data-id="${esc(b.id)}">${icon('book-open')} ${b.access==='free'?'Đọc ngay':'Mở nội dung'}</button><button class="button ${sale&&state.commerce.enabled?'button-primary':'button-soft'}" data-action="cart-add" data-kind="book" data-id="${esc(b.id)}" ${!sale||!state.commerce.enabled?'disabled':''} style="margin-top:8px">${sale?(state.commerce.enabled?'+ Thêm vào giỏ':'Chờ mở thanh toán'):'Chưa mở đặt mua'}</button></article>`}).join('')}</div>${!list.length?empty('Chưa có sách trong danh mục','Những tựa sách được xuất bản sẽ xuất hiện tại đây.'):''}`}
function loadCart(){try{const items=JSON.parse(localStorage.getItem('lowf.cart.v1')||'[]');if(!Array.isArray(items))return[];const seen=new Set();return items.filter(x=>x&&['book','plan'].includes(x.kind)&&typeof x.id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=20&&!seen.has(x.kind+':'+x.id)&&(seen.add(x.kind+':'+x.id),true)).slice(0,30).map(({kind,id,quantity})=>({kind,id,quantity:kind==='plan'?1:quantity}))}catch{return[]}}
function saveCart(){try{localStorage.setItem('lowf.cart.v1',JSON.stringify(state.cart))}catch{toast('Trình duyệt chưa lưu được giỏ hàng. Giỏ hiện tại vẫn có thể sử dụng.')}renderCartCount()}
function renderCartCount(){const el=$('#cartCount');if(!el)return;const count=state.cart.reduce((n,x)=>n+x.quantity,0);el.textContent=String(count);el.hidden=!count;el.parentElement.setAttribute('aria-label',`Mở giỏ hàng, ${count} sản phẩm`)}
function cartProduct(line){return line.kind==='plan'?state.plans.find(p=>p.id===line.id):book(line.id)}
function cartAvailable(line){const p=cartProduct(line);return !!p&&(line.kind==='plan'?p.enabled===true&&Number(p.price)>0:p.saleEnabled===true&&Number(p.price)>0)}
function cartPhysical(){return state.cart.some(x=>x.kind==='book'&&['Sách giấy','Combo'].includes(cartProduct(x)?.format))}
function cartTotal(){return state.cart.reduce((n,x)=>n+(Number(cartProduct(x)?.price)||0)*x.quantity,0)}
function captureShipping(){const form=$('#checkoutForm');if(!form)return;const fields=new FormData(form);state.shippingDraft={name:String(fields.get('name')||''),phone:String(fields.get('phone')||''),address:String(fields.get('address')||''),city:String(fields.get('city')||'')}}
function addToCart(kind,id){const product=kind==='plan'?state.plans.find(p=>p.id===id):book(id),line={kind,id,quantity:1};if(!product||!cartAvailable(line)){toast('Sản phẩm này chưa mở bán.');return}if(!state.commerce.enabled){showCommerceNotice();return}const existing=state.cart.find(x=>x.kind===kind&&x.id===id);if(existing){if(kind==='book'&&['Sách giấy','Combo'].includes(product.format))existing.quantity=Math.min(20,existing.quantity+1)}else{if(state.cart.length>=30){toast('Giỏ hàng đã có 30 sản phẩm. Hãy hoàn tất đơn hiện tại trước.');return}if(kind==='plan'&&state.cart.some(x=>x.kind==='plan'))state.cart=state.cart.filter(x=>x.kind!=='plan');state.cart.push(line)}saveCart();showCart()}
function changeCart(kind,id,delta){captureShipping();const row=state.cart.find(x=>x.kind===kind&&x.id===id);if(!row)return;if(delta===0)state.cart=state.cart.filter(x=>x!==row);else{const max=kind==='plan'||!['Sách giấy','Combo'].includes(cartProduct(row)?.format)?1:20;row.quantity=Math.max(1,Math.min(max,row.quantity+delta))}saveCart();showCart()}
function showCommerceNotice(){modal('Thanh toán VNPAY',`<p class="auth-subtitle">${esc(state.commerce.reason||'Cửa hàng chưa mở thanh toán. Bạn vẫn có thể đọc các sách miễn phí và nghe nhạc.')}</p>${isOwner()?'<a class="button button-primary button-block" href="/admin?tab=payments">Thiết lập VNPAY trong Lowf Studio ↗</a>':'<button class="button button-primary button-block" data-action="nav" data-view="library">Về thư viện miễn phí</button>'}`)}
function showCart(){checkoutRedirect='';const physical=cartPhysical(),subtotal=cartTotal(),shipping=physical?(Number(state.commerce.shippingFeeVnd)||0):0,valid=state.cart.length&&state.cart.every(cartAvailable),draft=state.shippingDraft;modal('Giỏ sách của bạn',!state.cart.length?empty('Giỏ hàng đang chờ một cuốn sách','Chọn những cuốn sách hoặc gói thành viên đang mở bán.','<button class="button button-primary" data-action="nav" data-view="store">Khám phá cửa hàng</button>','shopping-bag'):`<div class="cart-layout"><section class="cart-items" aria-label="Sản phẩm trong giỏ">${state.cart.map(x=>{const p=cartProduct(x),available=cartAvailable(x),quantityLimit=x.kind==='plan'||!['Sách giấy','Combo'].includes(p?.format)?1:20;return `<article class="cart-item"><div class="cart-cover">${x.kind==='book'&&p?coverHTML(p):icon('sparkles')}</div><div class="cart-item-info"><h3>${esc(p?.title||p?.name||'Nội dung không còn được bán')}</h3><p>${x.kind==='plan'?'Gói thành viên':esc(p?.format||'Sách')}${available?'':' · Chưa mở bán'}</p><strong>${money(p?.price)}</strong><div class="quantity-control"><button type="button" data-action="cart-quantity" data-kind="${x.kind}" data-id="${esc(x.id)}" data-delta="-1" ${x.quantity<=1?'disabled':''} aria-label="Giảm số lượng">−</button><span aria-label="Số lượng">${x.quantity}</span><button type="button" data-action="cart-quantity" data-kind="${x.kind}" data-id="${esc(x.id)}" data-delta="1" ${x.quantity>=quantityLimit?'disabled':''} aria-label="Tăng số lượng">+</button></div></div><button class="icon-button" type="button" data-action="cart-remove" data-kind="${x.kind}" data-id="${esc(x.id)}" aria-label="Xóa ${esc(p?.title||p?.name||'sản phẩm')} khỏi giỏ">${icon('trash-2')}</button></article>`}).join('')}<button class="text-button" data-action="nav" data-view="store">${icon('arrow-left')} Chọn thêm sách</button></section><form id="checkoutForm" class="checkout-form"><div class="cart-totals"><div><span>Tạm tính</span><strong>${money(subtotal)}</strong></div>${physical?`<div><span>Phí giao hàng</span><strong>${money(shipping)}</strong></div>`:''}<div class="cart-total"><span>Tổng dự kiến</span><strong>${money(subtotal+shipping)}</strong></div></div>${physical?`<h3>Thông tin nhận sách</h3><label class="form-field"><span>Họ tên người nhận</span><input name="name" autocomplete="shipping name" required maxlength="100" value="${esc(draft.name||state.user?.name||'')}" placeholder="Họ và tên"></label><label class="form-field"><span>Số điện thoại</span><input name="phone" type="tel" autocomplete="shipping tel" required maxlength="20" value="${esc(draft.phone||'')}" placeholder="Số liên hệ nhận sách"></label><label class="form-field"><span>Địa chỉ giao hàng</span><textarea name="address" autocomplete="shipping street-address" required maxlength="300" rows="2" placeholder="Số nhà, đường, phường/xã">${esc(draft.address||'')}</textarea></label><label class="form-field"><span>Tỉnh / Thành phố</span><input name="city" autocomplete="shipping address-level1" maxlength="80" value="${esc(draft.city||'')}" placeholder="Tỉnh hoặc thành phố"></label>`:'<p class="small-note">Nội dung số và quyền thành viên được gắn với tài khoản thanh toán.</p>'}${!valid?'<p class="commerce-warning">Có sản phẩm chưa mở bán. Hãy xóa sản phẩm đó để tiếp tục.</p>':''}${!state.commerce.enabled?`<p class="commerce-warning">${esc(state.commerce.reason||'VNPAY chưa được kích hoạt. Hiện chưa nhận thanh toán.')}</p>`:''}${state.user&&!state.user.emailVerified?'<p class="commerce-warning">Hãy xác minh email trước khi đặt hàng. <button class="text-button" type="button" data-action="verify-email">Nhập mã / Xác minh email</button></p>':''}<p id="checkoutError" class="form-error" role="alert"></p><button class="button button-primary button-block" type="submit" ${!valid||!state.commerce.enabled||state.user&&!state.user.emailVerified?'disabled':''}>${icon('shopping-bag')} ${state.user?'Kiểm tra đơn hàng':'Đăng nhập để thanh toán'}</button><p class="small-note">Bạn sẽ xem tổng tiền chính xác trước khi chuyển sang VNPAY. Không lưu thông tin thẻ trên Lowf.</p></form></div>`,{wide:true});if($('#checkoutForm'))$('#checkoutForm').noValidate=!state.user}
async function submitCheckout(form){if(state.checkoutBusy)return;if(!state.user){captureShipping();state.afterAuth='cart';auth();return}if(!form.reportValidity())return;if(!state.user.emailVerified){toast('Hãy xác minh email trước khi thanh toán.');return}if(!state.commerce.enabled||!state.cart.every(cartAvailable)){showCommerceNotice();return}captureShipping();const button=$('button[type="submit"]',form),error=$('#checkoutError');button.disabled=true;state.checkoutBusy=true;error.textContent='';try{const payload={items:state.cart.map(({kind,id,quantity})=>({kind,id,quantity})),...(cartPhysical()?{shipping:state.shippingDraft}:{})},raw=new TextEncoder().encode(JSON.stringify({user:state.user.id,...payload})),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),n=>n.toString(16).padStart(2,'0')).join('');let attempt;try{attempt=JSON.parse(sessionStorage.getItem('lowf.checkout.attempt')||'null')}catch{}if(!attempt||attempt.fingerprint!==digest)attempt={fingerprint:digest,key:crypto.randomUUID()};try{sessionStorage.setItem('lowf.checkout.attempt',JSON.stringify(attempt))}catch{}const result=await api('/api/orders',{method:'POST',body:{...payload,idempotencyKey:attempt.key}});if(!result.order?.id)throw new Error('Chưa nhận được thông tin đơn hàng. Hãy kiểm tra mục Đơn hàng trước khi thử lại.');state.selectedOrder=result.order;state.selectedOrderId=result.order.id;try{sessionStorage.setItem('lowf.checkout.order',result.order.id)}catch{}const payment=safePaymentURL(result.paymentUrl);if(!payment)throw new Error('Đơn đã được tạo nhưng chưa có liên kết VNPAY hợp lệ. Bạn có thể kiểm tra trong Đơn hàng.');checkoutRedirect=payment;modal('Kiểm tra trước khi thanh toán',`<div class="checkout-confirm">${orderSummary(result.order)}<p class="notice">${result.order.mode==='sandbox'?'Đây là giao dịch thử nghiệm Sandbox, không cấp quyền đọc trả phí thật.':'VNPAY sẽ hiển thị phương thức thanh toán và tổng tiền để bạn xác nhận.'}</p><button class="button button-primary button-block" data-action="checkout-pay">${result.order.mode==='sandbox'?'Mở VNPAY Sandbox':'Tiếp tục đến VNPAY'} ${icon('arrow-up-right')}</button><button class="button button-soft button-block" data-action="view-order" data-id="${esc(result.order.id)}">Xem đơn hàng</button></div>`)}catch(e){if(error.isConnected)error.textContent=e.message;else toast(e.message)}finally{state.checkoutBusy=false;if(button.isConnected)button.disabled=false}}
function safePaymentURL(value){try{const u=new URL(String(value));return u.protocol==='https:'&&['pay.vnpay.vn','sandbox.vnpayment.vn'].includes(u.hostname)&&!u.username&&!u.password&&['/vpcpay.html','/paymentv2/vpcpay.html'].includes(u.pathname)?u.href:''}catch{return''}}
const orderStateLabels={pending:'Chờ xác nhận thanh toán',paid:'Đã thanh toán',failed:'Thanh toán chưa thành công',expired:'Đã hết thời gian thanh toán',sandbox_paid:'Đã nhận thanh toán thử nghiệm'};
const fulfillmentLabels={unfulfilled:'Chưa xử lý',pending:'Chưa xử lý',processing:'Đang chuẩn bị',shipped:'Đang giao sách',delivered:'Đã giao sách',completed:'Đã hoàn tất',cancelled:'Đã hủy xử lý',not_required:'Nội dung số'};
function orderDate(value){const d=new Date(value);return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(d):''}
function orderSummary(o){return `<div class="order-topline"><span class="order-reference">Đơn ${esc(o.reference||o.id)}</span><span class="order-status ${o.status==='paid'?'is-paid':o.status==='sandbox_paid'?'is-test':''}">${esc(orderStateLabels[o.status]||'Đang kiểm tra')}</span></div>${o.mode==='sandbox'?'<p class="commerce-warning">SANDBOX · Giao dịch thử nghiệm, không phải thanh toán mua hàng thật.</p>':''}<div class="order-lines">${(o.items||[]).map(x=>`<div><span>${esc(x.title||'Sản phẩm')}<small>${x.kind==='plan'?'Gói thành viên':x.kind==='test'?'Kiểm tra kết nối':esc(x.format||'Sách')} · SL ${Number(x.quantity)||1}</small></span><strong>${money(x.lineTotalVnd)}</strong></div>`).join('')}</div><div class="cart-totals"><div><span>Tiền sản phẩm</span><strong>${money(o.subtotalVnd)}</strong></div>${Number(o.shippingFeeVnd)>0?`<div><span>Phí giao hàng</span><strong>${money(o.shippingFeeVnd)}</strong></div>`:''}<div class="cart-total"><span>Tổng thanh toán</span><strong>${money(o.totalVnd)}</strong></div></div>`}
function orders(){if(!state.user)return `<div class="page-intro"><div class="eyebrow">CÙNG BẠN SAU MỖI LỰA CHỌN</div><h1>Đơn hàng của tôi.</h1></div>${empty('Đăng nhập để xem đơn hàng','Đơn hàng chỉ hiển thị cho tài khoản đã đặt mua.','<button class="button button-primary" data-action="orders-auth">Đăng nhập</button>','shopping-bag')}`;const selected=state.selectedOrder;return `<div class="page-intro"><div class="eyebrow">TỦ SÁCH ĐANG ĐƯỢC LẤP ĐẦY</div><h1>Đơn hàng của tôi.</h1><p>Xem thanh toán, giao hàng và các quyền đọc đã mua trong tài khoản của bạn.</p></div><div class="page-tabs"><button class="button button-soft" data-action="nav" data-view="store">${icon('shopping-bag')} Về cửa hàng</button><button class="button button-soft" data-action="orders-refresh">${icon('refresh-cw')} Cập nhật trạng thái</button></div>${state.selectedOrderId?`<section class="order-detail">${state.orderLoading&&!selected?'<p class="notice">Đang kiểm tra đơn hàng…</p>':state.orderError?`<p class="commerce-warning">${esc(state.orderError)}</p>`:selected?`${orderSummary(selected)}<p class="order-timestamp">Tạo lúc ${esc(orderDate(selected.createdAt))}${selected.paidAt?` · Xác nhận lúc ${esc(orderDate(selected.paidAt))}`:''}</p>${selected.status==='pending'?'<div class="notice">Đang chờ xác nhận từ VNPAY. Nếu bạn đã thanh toán, vui lòng đợi cập nhật; không cần thanh toán lại. Trang sẽ tự kiểm tra khi bạn đang xem.</div>':selected.status==='paid'?'<div class="notice">Lowf đã nhận xác nhận thanh toán. Quyền đọc nội dung số đã được cập nhật cho tài khoản của bạn.</div>':selected.status==='sandbox_paid'?'<div class="notice">Đã nhận thông báo thử nghiệm từ VNPAY. Đơn này không cấp sách hoặc gói thành viên trả phí.</div>':'<div class="notice">Đơn chưa được xác nhận đã thanh toán. Nếu tài khoản ngân hàng đã bị trừ tiền, hãy giữ mã giao dịch để đối soát trước khi đặt lại.</div>'}${selected.shipping?`<div class="order-shipping"><h3>Giao sách</h3><p>${esc(fulfillmentLabels[selected.fulfillmentStatus]||selected.fulfillmentStatus||'Chưa xử lý')}</p><strong>${esc(selected.shipping.name)}</strong><p>${esc(selected.shipping.phone)}</p><p>${esc(selected.shipping.address)}${selected.shipping.city?', '+esc(selected.shipping.city):''}</p></div>`:''}${selected.status==='paid'?'<button class="button button-primary" data-action="nav" data-view="library">Về thư viện đọc sách</button>':''}`:''}</section>`:''}<div class="section-heading"><h2>Lịch sử đơn hàng</h2></div>${state.ordersLoading&&!state.orders.length?'<div class="notice">Đang tải đơn hàng…</div>':state.ordersError?`<div class="commerce-warning">${esc(state.ordersError)}</div>`:state.orders.length?`<div class="orders-list">${state.orders.map(o=>`<button class="order-list-item ${state.selectedOrderId===o.id?'selected':''}" data-action="view-order" data-id="${esc(o.id)}"><span><strong>${esc(o.reference||o.id)}</strong><small>${esc(orderDate(o.createdAt))}${o.mode==='sandbox'?' · Sandbox':''}</small></span><span class="order-list-summary"><strong>${money(o.totalVnd)}</strong><small>${esc(orderStateLabels[o.status]||'Đang kiểm tra')}</small></span>${icon('chevron-right')}</button>`).join('')}</div><div class="order-pagination"><button class="button button-soft" data-action="orders-page" data-delta="-1" ${state.ordersPage<=1||state.ordersLoading?'disabled':''}>Trang trước</button><span>Trang ${state.ordersPage}</span><button class="button button-soft" data-action="orders-page" data-delta="1" ${!state.ordersHasMore||state.ordersLoading?'disabled':''}>Trang tiếp</button></div>`:empty('Chưa có đơn hàng nào','Các đơn mua sách và gói thành viên sẽ xuất hiện tại đây.','<button class="button button-primary" data-action="nav" data-view="store">Khám phá cửa hàng</button>','shopping-bag')}`}
async function loadOrders(page=state.ordersPage){if(!state.user||state.ordersLoading)return;state.ordersLoading=true;state.ordersError='';if(state.view==='orders')renderMain();try{const result=await api('/api/orders?page='+Math.max(1,page));state.orders=Array.isArray(result.orders)?result.orders:[];state.ordersPage=Number(result.page)||page;state.ordersHasMore=result.hasMore===true}catch(e){state.ordersError=e.message}finally{state.ordersLoading=false;if(state.view==='orders')renderMain()}}
function clearPurchasedCart(o){let expected;try{expected=sessionStorage.getItem('lowf.checkout.order')}catch{}if(o.status!=='paid'||expected!==o.id)return;for(const item of o.items||[]){const line=state.cart.find(x=>x.kind===item.kind&&x.id===item.id);if(line)line.quantity-=Number(item.quantity)||0}state.cart=state.cart.filter(x=>x.quantity>0);saveCart();try{sessionStorage.removeItem('lowf.checkout.order');sessionStorage.removeItem('lowf.checkout.attempt')}catch{}}
async function loadOrder(id,{poll=false}={}){if(!state.user||!validOrderId(id)||state.orderLoading)return;state.selectedOrderId=id;state.orderLoading=true;state.orderError='';if(state.view==='orders'&&!poll)renderMain();try{const result=await api('/api/orders/'+encodeURIComponent(id));if(state.selectedOrderId!==id)return;state.selectedOrder=result.order;clearPurchasedCart(result.order);if(result.order.status==='paid'){await refreshMe();const fresh=await api('/api/bootstrap');if(Array.isArray(fresh.books))state.books=fresh.books}if(result.order.status==='pending'&&state.view==='orders'&&state.orderPolls<24){clearTimeout(orderPollTimer);orderPollTimer=setTimeout(()=>{if(state.view==='orders'&&document.visibilityState==='visible'){state.orderPolls++;loadOrder(id,{poll:true})}},5000)}}catch(e){state.orderError=e.message}finally{state.orderLoading=false;if(state.view==='orders')renderMain()}}
function validOrderId(id){return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)}
async function viewOrder(id){if(!validOrderId(id))return;closeModal();clearTimeout(orderPollTimer);if(state.selectedOrderId!==id)state.selectedOrder=null;state.selectedOrderId=id;state.orderPolls=0;navigate('orders');if(state.user)await loadOrder(id)}
function adminReturnPath(){const raw=new URLSearchParams(location.search).get('next');if(!raw||!raw.startsWith('/admin'))return'';try{const url=new URL(raw,location.origin);if(url.origin!==location.origin||url.pathname!=='/admin')return'';const params=new URLSearchParams(),tab=url.searchParams.get('tab'),action=url.searchParams.get('action');if(['overview','books','tracks','videos','plans','design','payments','orders','auth'].includes(tab))params.set('tab',tab);if(['add','new'].includes(action)&&['books','tracks','videos','plans'].includes(tab))params.set('action',action);return'/admin'+(params.size?'?'+params.toString():'')}catch{return''}}
function viewURL(view){const params=new URLSearchParams();if(isOwner()&&state.designPreview===true)params.set('designPreview','1');if(view!=='dashboard')params.set('view',view);if(view==='orders'&&validOrderId(state.selectedOrderId))params.set('order',state.selectedOrderId);history.replaceState(null,'','/'+(params.size?'?'+params.toString():''))}

function renderDecorDrawer(){
 const drawer=$('#decorDrawer');if(!drawer||!isOwner())return;
 const s=mergedSettings(),d={...defaultDecor,...(s.decor||{})},p=s.palette||{},b=s.brand||{},h=s.hero||{},curSea=activeSeason(s);
 const secList=[['hero','Banner Sách 3D'],['stats','Thống kê đọc'],['continue','Đọc tiếp'],['books','Kệ sách nổi bật'],['ambient','Phòng nhạc Ambient'],['deal','Thẻ thành viên']];
 const curSections=Array.isArray(s.sections)?s.sections:['hero','stats','continue','books','ambient','deal'];
 drawer.innerHTML=`<div class="decor-head"><div><small>CHỦ WEBSITE · LIVE STUDIO</small><h2>Trang trí theo mùa</h2></div><button type="button" class="icon-button" data-action="decor-close" aria-label="Đóng bảng trang trí">${icon('x')}</button></div>
 <div class="decor-body">
  <section class="decor-group">
   <h3>1. Chủ đề 12 Mùa &amp; Cảnh rơi (Đổi cả Màu + Tranh + Hiệu ứng)</h3>
   <div class="decor-seasons">${Object.values(SEASON_THEMES).map(st=>`<button type="button" class="decor-season ${curSea.id===st.id?'active':''}" data-action="decor-season" data-id="${st.id}"><span class="season-ico">${st.icon}</span><span><strong>${st.name}</strong><small>${st.fxName}</small></span><span class="season-dot" style="background:${st.palette.primary}"></span></button>`).join('')}</div>
   <div class="decor-seg-label" style="margin-top:10px">Mức độ hiệu ứng rơi (${curSea.fxName})</div>
   <div class="decor-seg">${[['off','Tắt'],['gentle','Dịu nhẹ'],['vivid','Rực rỡ rõ nét']].map(([id,lbl])=>`<button type="button" class="${(d.fxLevel||'vivid')===id?'active':''}" data-action="decor-fx" data-id="${id}">${lbl}</button>`).join('')}</div>
  </section>
  <section class="decor-group">
   <h3>2. Thanh công cụ &amp; Menu (Khám phá / Đọc / Mua sách) kiểu Uiverse</h3>
   <div class="decor-seg">${[['season','🔄 Đồng bộ theo mùa'],['custom','🎨 Màu tự chọn riêng']].map(([id,lbl])=>`<button type="button" class="${(d.navSync===false?'custom':'season')===id?'active':''}" data-action="decor-nav-sync" data-id="${id}">${lbl}</button>`).join('')}</div>
   <div class="decor-nav-swatches" aria-label="Chọn nhanh màu thanh công cụ">${NAV_COLOR_SWATCHES.map(hex=>`<button type="button" class="nav-swatch ${d.navSync===false&&(d.navColor||'').toLowerCase()===hex.toLowerCase()?'active':''}" style="background:${hex}" data-action="decor-nav-swatch" data-id="${hex}" title="Đổi thanh công cụ sang màu ${hex}"></button>`).join('')}</div>
   <label class="decor-color-row"><span>Tự chọn màu thanh công cụ bạn thích</span><input type="color" id="decorNavColor" value="${esc(d.navColor||p.primary||curSea.palette.primary)}"></label>
   <div class="decor-seg-label" style="margin-top:10px">Kiểu thiết kế thanh công cụ (${NAV_STYLES.length} mẫu)</div>
   <div class="decor-patterns">${NAV_STYLES.map(ns=>`<button type="button" class="decor-pattern ${(d.navStyle||'pill-glow')===ns.id?'active':''}" data-action="decor-nav-style" data-id="${ns.id}"><strong>✨ ${ns.name}</strong><small>${ns.desc}</small></button>`).join('')}</div>
   <div class="decor-seg-label" style="margin-top:10px">Hiệu ứng chạm &amp; di chuột Uiverse (${NAV_EFFECTS.length} kiểu)</div>
   <div class="decor-patterns">${NAV_EFFECTS.map(ne=>`<button type="button" class="decor-pattern ${(d.navEffect||'magnetic')===ne.id?'active':''}" data-action="decor-nav-effect" data-id="${ne.id}"><strong>⚡ ${ne.name}</strong><small>${ne.desc}</small></button>`).join('')}</div>
  </section>
  <section class="decor-group">
   <h3>3. Nền Hiệu Ứng 3D &amp; Hoa Văn (${BG_PATTERNS.length} kiểu)</h3>
   <div class="decor-patterns">${BG_PATTERNS.map(bg=>`<button type="button" class="decor-pattern ${(d.bgPattern||'orbs3d')===bg.id?'active':''}" data-action="decor-bg" data-id="${bg.id}"><strong>${bg.group==='3d'?'🧊 ':''}${bg.name}</strong><small>${bg.desc}</small></button>`).join('')}</div>
  </section>
  <section class="decor-group">
   <h3>4. Ảnh Nền Toàn Trang (${BG_WALLPAPERS.length} phong cảnh &amp; tranh)</h3>
   <div class="decor-wallpapers">${BG_WALLPAPERS.map(w=>`<button type="button" class="decor-wp ${(d.bgWallpaper||'none')===w.id?'active':''}" data-action="decor-wallpaper" data-id="${w.id}"><span class="wp-thumb" style="${w.url?`background-image:url('${w.url}')`:''}"></span><strong>${w.name}</strong></button>`).join('')}</div>
   <label class="decor-range"><span>Độ nổi bật ảnh nền <strong>${Number(d.bgOpacity??24)}%</strong></span><input type="range" id="decorBgOpacity" min="8" max="60" step="2" value="${Number(d.bgOpacity??24)}"></label>
  </section>
  <section class="decor-group">
   <h3>5. Kho Phối Màu Đa Dạng (${THEME_PRESETS.length} bảng màu)</h3>
   <div class="decor-presets">${THEME_PRESETS.map(pr=>`<button type="button" class="decor-preset ${d.preset===pr.id?'active':''}" data-action="decor-preset" data-id="${pr.id}"><span class="decor-swatches"><i style="background:${pr.background}"></i><i style="background:${pr.primary}"></i><i style="background:${pr.text}"></i></span><span><strong>${pr.name}</strong><small>${pr.desc}</small></span></button>`).join('')}</div>
   <label class="decor-color-row"><span>Tự chọn màu nhấn riêng</span><input type="color" id="decorPrimaryColor" value="${esc(p.primary||'#2c6546')}"></label>
  </section>
  <section class="decor-group">
   <h3>6. Bầu trời sao &amp; Hiệu ứng không gian</h3>
   <div class="decor-seg-label">Hiệu ứng sao lấp lánh</div>
   <div class="decor-seg">${[['off','Tắt'],['soft','Dịu nhẹ'],['bright','Lung linh']].map(([id,lbl])=>`<button type="button" class="${d.stars===id?'active':''}" data-action="decor-stars" data-id="${id}">${lbl}</button>`).join('')}</div>
   <label class="decor-switch"><span>🎄 Mô hình 3D lớn theo mùa (Cây thông Noel, Anh đào, Trăng…)</span><input type="checkbox" data-decor-toggle="landmark3d" ${d.landmark3d!==false?'checked':''}></label>
   <label class="decor-switch"><span>${curSea.icon} ${curSea.fxName}</span><input type="checkbox" data-decor-toggle="petals" ${d.petals!==false?'checked':''}></label>
   <label class="decor-switch"><span>✨ Vầng sáng Aurora đầu trang</span><input type="checkbox" data-decor-toggle="aurora" ${d.aurora!==false?'checked':''}></label>
   <label class="decor-switch"><span>📄 Vân giấy sách tinh tế</span><input type="checkbox" data-decor-toggle="paperGrain" ${d.paperGrain!==false?'checked':''}></label>
  </section>
  <section class="decor-group">
   <h3>7. Thiết kế thẻ sách &amp; phông chữ</h3>
   <div class="decor-seg">${[['hardcover','Bìa cứng 3D'],['glass','Kính mờ'],['minimal','Tối giản']].map(([id,lbl])=>`<button type="button" class="${(d.cardStyle||'hardcover')===id?'active':''}" data-action="decor-card" data-id="${id}">${lbl}</button>`).join('')}</div>
   <div class="decor-seg" style="margin-top:8px">${[['serif','Chữ Tạp chí (Serif)'],['sans','Chữ Hiện đại (Sans)']].map(([id,lbl])=>`<button type="button" class="${(s.font||'serif')===id?'active':''}" data-action="decor-font" data-id="${id}">${lbl}</button>`).join('')}</div>
   <label class="decor-range"><span>Độ bo góc thẻ <strong>${Number(s.radius??18)}px</strong></span><input type="range" id="decorRadius" min="8" max="28" step="2" value="${Number(s.radius??18)}"></label>
  </section>
  <section class="decor-group">
   <h3>8. Logo, Favicon &amp; Thương hiệu Website</h3>
   <div class="decor-brand-preview">
    <span class="decor-tab-pill"><img src="${esc(b.faviconAssetId?asset(b.faviconAssetId):(isSafeAvatar(b.faviconDataUrl)?b.faviconDataUrl:(b.logoAssetId?asset(b.logoAssetId):(isSafeAvatar(b.logoDataUrl)?b.logoDataUrl:brandFaviconDataUrl(b.logoPreset||'sprout',p.primary||curSea.palette.primary,curSea.accent)))))}" alt=""><span>${esc(b.name||'Lowf')} — Tab trình duyệt</span></span>
   </div>
   <div class="decor-seg-label">Chọn nhanh 6 mẫu Logo &amp; Favicon</div>
   <div class="decor-logo-grid">${BRAND_LOGOS.map(lg=>`<button type="button" class="decor-logo-card ${(b.logoPreset||'sprout')===lg.id&&!b.logoAssetId&&!b.logoDataUrl?'active':''}" data-action="decor-logo-preset" data-id="${lg.id}"><span class="decor-logo-ico">${brandLogoInlineSvg(lg.id)}</span><span>${lg.name}</span></button>`).join('')}</div>
   <div class="decor-upload-row">
    <button type="button" class="button button-soft" data-action="decor-logo-upload">${icon('upload')} Tải ảnh Logo riêng</button>
    ${(b.logoAssetId||b.logoDataUrl)?'<button type="button" class="button button-soft" data-action="decor-logo-clear" style="flex:0 0 auto">Bỏ Logo ảnh</button>':''}
   </div>
   <div class="decor-upload-row">
    <button type="button" class="button button-soft" data-action="decor-favicon-upload">${icon('sparkles')} Tải Favicon riêng</button>
    ${(b.faviconAssetId||b.faviconDataUrl)?'<button type="button" class="button button-soft" data-action="decor-favicon-clear" style="flex:0 0 auto">Dùng theo Logo</button>':''}
   </div>
   <label class="decor-input" style="margin-top:10px"><span>Tên thương hiệu</span><input type="text" maxlength="40" data-decor-field="brand.name" value="${esc(b.name||'Lowf')}"></label>
   <label class="decor-input"><span>Tiêu đề Banner (xuống dòng được)</span><textarea rows="2" maxlength="160" data-decor-field="hero.title">${esc(h.title||'Giữa bộn bề,\ntìm một trang yên.')}</textarea></label>
   <label class="decor-input"><span>Mô tả ngắn dưới tiêu đề</span><textarea rows="2" maxlength="300" data-decor-field="hero.subtitle">${esc(h.subtitle||'Những cuốn sách hay, một bản nhạc dịu. Và khoảng thời gian dành riêng cho bạn.')}</textarea></label>
  </section>
  <section class="decor-group">
   <h3>9. Bật / tắt các khu vực trang chủ</h3>
   ${secList.map(([id,lbl])=>`<label class="decor-switch"><span>${lbl}</span><input type="checkbox" data-decor-section="${id}" ${curSections.includes(id)?'checked':''}></label>`).join('')}
  </section>
 </div>
 <div class="decor-foot">
  <button type="button" class="button button-primary button-block" data-action="decor-publish">${icon('sparkles')} Lưu &amp; Xuất bản cho tất cả độc giả</button>
  <button type="button" class="button button-soft button-block" data-action="decor-reset" style="margin-top:8px">${icon('refresh-cw')} Khôi phục mặc định</button>
 </div>`;
 icons();
}
function openDecorDrawer(){if(!isOwner())return;const d=$('#decorDrawer');if(!d)return;d.hidden=false;requestAnimationFrame(()=>d.classList.add('open'));renderDecorDrawer();}
function closeDecorDrawer(){const d=$('#decorDrawer');if(!d)return;d.classList.remove('open');setTimeout(()=>{if(!d.classList.contains('open'))d.hidden=true},240);}
function updateDecor(patch,{rerender=false}={}){
 const cur=loadLocalDecor()||{};
 const next={
  ...cur,
  ...patch,
  brand:{...(cur.brand||{}),...(patch.brand||{})},
  palette:{...(cur.palette||{}),...(patch.palette||{})},
  hero:{...(cur.hero||{}),...(patch.hero||{})},
  decor:{...(cur.decor||{}),...(patch.decor||{})}
 };
 if(patch.sections)next.sections=patch.sections;
 saveLocalDecor(next);
 applySettings();
 if(rerender&&state.view==='dashboard')renderMain();
 if(!$('#decorDrawer')?.hidden)renderDecorDrawer();
}
async function publishLiveDesign(){
 const s=mergedSettings();
 const br=s.brand||{};
 const brandPayload={
  name:String(br.name||'Lowf').slice(0,40),
  tagline:String(br.tagline||'BOOK & BEYOND').slice(0,100),
  ...(br.logoPreset?{logoPreset:br.logoPreset}:{}),
  ...(br.logoAssetId?{logoAssetId:br.logoAssetId}:{}),
  ...(br.faviconAssetId?{faviconAssetId:br.faviconAssetId}:{}),
  ...(isSafeAvatar(br.logoDataUrl)?{logoDataUrl:br.logoDataUrl}:{}),
  ...(isSafeAvatar(br.faviconDataUrl)?{faviconDataUrl:br.faviconDataUrl}:{})
 };
 const payload={
  brand:brandPayload,
  palette:{primary:s.palette?.primary||'#2c6546',background:s.palette?.background||'#f6f5f0',surface:s.palette?.surface||'#fdfcf9',text:s.palette?.text||'#1d2b22'},
  hero:{title:String(s.hero?.title||'Giữa bộn bề,\ntìm một trang yên.').slice(0,160),subtitle:String(s.hero?.subtitle||'').slice(0,500),ctaLabel:String(s.hero?.ctaLabel||'Khám phá thư viện').slice(0,60),ctaView:s.hero?.ctaView||'library',...(s.hero?.imageAssetId?{imageAssetId:s.hero.imageAssetId}:{})},
  sections:Array.isArray(s.sections)&&s.sections.length?s.sections:['hero','stats','continue','books','ambient'],
  font:s.font==='sans'?'sans':'serif',
  radius:Math.max(8,Math.min(32,Number(s.radius??18))),
  featuredBookIds:Array.isArray(s.featuredBookIds)?s.featuredBookIds:['slow','garden','peace','clear'],
  decor:{...defaultDecor,...(s.decor||{})}
 };
 await api('/api/admin/design',{method:'POST',body:{action:'save',settings:payload}});
 await api('/api/admin/design',{method:'POST',body:{action:'publish'}});
 state.settings=payload;
 toast('Đã xuất bản diện mạo mới cho toàn bộ độc giả Lowf!');
}
function openMobileMenu(){
 const items=[
  ['dashboard','layout-grid','Khám phá','Trang chủ & tiến độ đọc'],
  ['library','book-open','Thư viện sách',`${state.books.length} đầu sách đọc ngay`],
  ['store','shopping-bag','Cửa hàng sách','Sách giấy, Ebook & Combo'],
  ['studio','headphones','Nhạc & Không gian','Piano & âm thanh tập trung'],
  ['video','clapperboard','Góc video','Video & cảm hứng đọc'],
  ['pdf','library','Kệ sách của tôi','PDF cá nhân & sách đã lưu'],
  ['reviews','notebook-pen','Góc bài viết','Điểm sách & ghi chép'],
  ['community','messages-square','Cộng đồng','Bảng xếp hạng & trò chuyện'],
  ['plans','sparkles','Gói thành viên','Quyền lợi độc giả Lowf'],
  ['orders','package','Đơn hàng của tôi','Theo dõi đơn mua sách']
 ];
 modal('Không gian Lowf',`<p class="auth-subtitle" style="margin-top:0">Chọn chuyên mục bạn muốn ghé thăm.</p><div class="mobile-nav-grid">${items.map(([view,ic,title,desc])=>`<button type="button" class="mobile-nav-card ${state.view===view?'active':''}" data-action="nav" data-view="${view}">${icon(ic)}<span><strong>${title}</strong><small>${esc(desc)}</small></span></button>`).join('')}<button type="button" class="mobile-nav-card" data-action="mobile-vocab">${icon('languages')}<span><strong>Sổ từ vựng</strong><small>Từ mới & phiên âm IPA đã lưu</small></span></button></div>${isOwner()?'<a class="button button-primary button-block" href="/admin" style="margin-top:16px">Mở Lowf Studio (Quản trị) ↗</a>':''}`);
}
async function handleAction(b){const action=b.dataset.action,id=b.dataset.id;if(b.disabled)return;switch(action){case'go-home':closeModal();if(state.view!=='dashboard')navigate('dashboard');window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});break;case'nav':closeModal();navigate(b.dataset.view);break;case'decor-open':if(!isOwner())break;$('#decorDrawer')?.classList.contains('open')?closeDecorDrawer():openDecorDrawer();break;case'decor-close':closeDecorDrawer();break;case'decor-preset':{if(!isOwner())break;const pr=THEME_PRESETS.find(x=>x.id===id);if(pr)updateDecor({palette:{primary:pr.primary,background:pr.background,surface:pr.surface,text:pr.text},decor:{preset:pr.id}});break}case'decor-season':{if(!isOwner())break;const st=SEASON_THEMES[id];if(st)updateDecor({palette:{...st.palette},decor:{season:st.id,preset:st.id,petals:true,fxLevel:'vivid',stars:'bright',aurora:true}},{rerender:true});break}case'decor-fx':if(!isOwner())break;updateDecor({decor:{fxLevel:id,petals:id!=='off'}});break;case'decor-bg':if(!isOwner())break;updateDecor({decor:{bgPattern:id}});break;case'decor-wallpaper':if(!isOwner())break;updateDecor({decor:{bgWallpaper:id,bgImageAssetId:''}});break;case'decor-nav-sync':if(!isOwner())break;updateDecor({decor:{navSync:id==='season',...(id==='season'?{navColor:''}:{})}});break;case'decor-nav-swatch':if(!isOwner())break;updateDecor({decor:{navSync:false,navColor:id}});break;case'decor-nav-style':if(!isOwner())break;updateDecor({decor:{navStyle:id}});break;case'decor-nav-effect':if(!isOwner())break;updateDecor({decor:{navEffect:id}});break;case'decor-logo-preset':if(!isOwner())break;updateDecor({brand:{logoPreset:id,logoAssetId:'',logoDataUrl:''}});toast('Đã đổi mẫu Logo & Favicon!');break;case'decor-logo-upload':if(!isOwner())break;$('#logoFileInput')?.click();break;case'decor-logo-clear':if(!isOwner())break;updateDecor({brand:{logoAssetId:'',logoDataUrl:''}});toast('Đã chuyển về Logo biểu tượng mặc định.');break;case'decor-favicon-upload':if(!isOwner())break;$('#faviconFileInput')?.click();break;case'decor-favicon-clear':if(!isOwner())break;updateDecor({brand:{faviconAssetId:'',faviconDataUrl:''}});toast('Favicon sẽ tự đồng bộ theo Logo.');break;case'comm-tab':state.communityTab=id;renderMain();break;case'comm-like':{const soc=getSocial();soc.likes[id]=!soc.likes[id];saveSocial(soc);renderMain();break}case'comm-reply-open':{state.replyingTo=state.replyingTo===id?'':id;renderMain();if(state.replyingTo)requestAnimationFrame(()=>$(`[data-reply-form="${state.replyingTo}"] input`)?.focus());break}case'comm-dm-open':{const soc=getSocial(),pname=b.dataset.name||'Bạn đọc';if(id&&!soc.peers[id])soc.peers[id]={id,name:pname,bio:'Thành viên Trạm dừng chân Lowf',genre:'Yêu sách',level:3,hours:20};saveSocial(soc);state.activeDmPeer=id;state.communityTab='dm';if(state.view!=='community')navigate('community');else renderMain();requestAnimationFrame(()=>{const box=$('#dmMessages');if(box)box.scrollTop=box.scrollHeight;$('#dmForm input')?.focus()});break}case'dm-share-book':{const soc=getSocial(),bk=state.books[Math.floor(Math.random()*Math.max(1,state.books.length))];const text=bk?`📚 Mình vừa đọc cuốn "${bk.title}" (${bk.author||'Lowf'}) thấy rất hay, gợi ý bạn đọc thử cùng mình nhé!`:'📚 Hôm nay bạn đang đọc cuốn sách nào trên Lowf thế?';soc.dms[id]=[...(soc.dms[id]||[]),{id:'dm-'+Date.now(),from:'me',name:state.user?.name||'Bạn',text,at:new Date().toISOString()}];saveSocial(soc);renderMain();requestAnimationFrame(()=>{const box=$('#dmMessages');if(box)box.scrollTop=box.scrollHeight});toast('Đã gửi gợi ý sách vào cuộc trò chuyện!');break}case'friend-toggle':{if(!state.user){auth();break}const soc=getSocial(),pname=b.dataset.name||'Bạn đọc';if(id&&!soc.peers[id])soc.peers[id]={id,name:pname,bio:'Độc giả Lowf',genre:'Yêu sách',level:4,hours:24};if(soc.friends.includes(id)){soc.friends=soc.friends.filter(x=>x!==id);toast(`Đã hủy kết bạn với ${pname}.`);}else if(soc.sent.includes(id)){soc.sent=soc.sent.filter(x=>x!==id);toast(`Đã hủy lời mời kết bạn tới ${pname}.`);}else{soc.friends=[...soc.friends,id];soc.requests=soc.requests.filter(r=>r.id!==id);if(!soc.dms[id])soc.dms[id]=[{id:'dm-hi-'+Date.now(),from:'them',name:pname,text:`Cảm ơn ${state.user.name} đã kết bạn! Rất vui được cùng trao đổi sách trên Lowf nhé ✨`,at:new Date().toISOString()}];toast(`🎉 Bạn và ${pname} đã trở thành bạn đọc trên Lowf!`);}saveSocial(soc);renderMain();break}case'friend-accept':{const soc=getSocial(),pname=b.dataset.name||'Bạn đọc';soc.requests=soc.requests.filter(r=>r.id!==id);if(!soc.friends.includes(id))soc.friends=[...soc.friends,id];if(!soc.dms[id])soc.dms[id]=[{id:'dm-acc-'+Date.now(),from:'them',name:pname,text:`Cảm ơn bạn đã chấp nhận lời mời kết bạn! Mình cùng trao đổi sách hay nhé 📚`,at:new Date().toISOString()}];saveSocial(soc);renderMain();toast(`🤝 Đã kết bạn với ${pname}! Giờ hai bạn có thể nhắn tin ngay.`);break}case'friend-decline':{const soc=getSocial();soc.requests=soc.requests.filter(r=>r.id!==id);saveSocial(soc);renderMain();toast('Đã bỏ qua lời mời kết bạn.');break}case'decor-stars':if(!isOwner())break;updateDecor({decor:{stars:id}});break;case'decor-card':if(!isOwner())break;updateDecor({decor:{cardStyle:id}});break;case'decor-font':if(!isOwner())break;updateDecor({font:id});break;case'decor-reset':if(!isOwner())break;try{localStorage.removeItem(DECOR_KEY)}catch{}applySettings();if(state.view==='dashboard')renderMain();renderDecorDrawer();toast('Đã khôi phục thiết kế mặc định của Lowf.');break;case'decor-publish':if(!isOwner())break;await publishLiveDesign();break;case'paper-tone':setPreference({paperTone:id});applyReaderPrefs();break;case'reader-zen-toggle':setReaderZen(!readerZen,{announce:true});break;case'reader-align':setPreference({readerAlign:id});applyReaderPrefs();break;case'reader-measure':setPreference({readerMeasure:id});applyReaderPrefs();break;case'pdf-fit':{setPreference({pdfFit:id,pdfZoom:1});applyReaderPrefs();if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote'))await renderPDF(0);break}case'pdf-trim-toggle':{const next=!readerPrefs().pdfTrim;setPreference({pdfTrim:next});if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote'))await renderPDF(0);toast(next?'✂️ Đã bật tự động gọt viền scan thừa để chữ to rõ hơn!':'Đã giữ nguyên toàn bộ viền gốc của trang PDF.');break}case'pdf-scan-toggle':{const next=!readerPrefs().scanBlend;setPreference({pdfScanBlend:next});applyReaderPrefs();if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote'))await renderPDF(0);toast(next?'🪄 Đã bật lọc nền sách scan & hòa màu giấy!':'Đã chuyển về hiển thị PDF gốc.');break}case'pdf-zoom':{const cur=readerPrefs().pdfZoom,next=Math.round(Math.min(2.0,Math.max(0.7,cur+Number(b.dataset.delta||0)))*100)/100;setPreference({pdfZoom:next});if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote'))await renderPDF(0);break}case'pdf-zoom-reset':{setPreference({pdfZoom:1});if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote'))await renderPDF(0);break}case'pdf-reflow-toggle':{if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')){state.reader.pdfReflow=!state.reader.pdfReflow;await renderPDF(0);}break}case'reader-toc-toggle':tocOpen=!tocOpen;if(tocOpen){stylePopOpen=false;timerOpen=false;renderReaderStylePop();renderTimerUI();}renderReaderToc();break;case'toc-jump-chapter':{if(state.reader?.type==='chapters'){const prev=state.reader.chapter,next=Number(id)||0;state.reader.chapter=next;state.reader.subPage=0;tocOpen=false;renderReaderToc();renderChapter(next>=prev?1:-1);}break}case'toc-jump-page':{if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')){const prev=state.reader.page,next=Math.max(1,Math.min(state.reader.pages,Number(id)||1));state.reader.page=next;tocOpen=false;renderReaderToc();await renderPDF(next>=prev?1:-1);}break}case'reader-style-toggle':stylePopOpen=!stylePopOpen;if(stylePopOpen){timerOpen=false;tocOpen=false;renderReaderToc();}renderTimerUI();renderReaderStylePop();break;case'reader-layout':setPreference({readerLayout:id,...(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')?{pdfFit:id==='spread'?'spread':id==='scroll'?'width':'page',pdfZoom:1}:{})});applyReaderPrefs();if(state.reader?.type==='chapters'){state.reader.subPage=0;renderChapter(0)}else if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')){await renderPDF(0)}break;case'reader-flip':setPreference({readerFlip:id});applyReaderPrefs();if(state.reader?.ready)triggerPageTurn(1);break;case'reader-font':setPreference({readerFont:id});applyReaderPrefs();break;case'reader-line':setPreference({readerLine:id});applyReaderPrefs();break;case'mobile-menu':openMobileMenu();break;case'mobile-vocab':closeModal();window.LowfReaderTools?.openVocabulary();break;case'theme':theme();break;case'account':openAccount();break;case'auth':auth();break;case'auth-tab':auth(id);break;case'auth-google':await startSocialAuth('google');break;case'toggle-pw':{const wrap=b.closest('.pw-wrap'),inp=wrap&&$('input',wrap);if(inp){const show=inp.type==='password';inp.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');b.innerHTML=icon(show?'eye-off':'eye');icons();}break}case'auth-resend':await resendAuthOtp();break;case'modal-close':closeModal();break;case'logout':await signOut();break;case'verify-email':await verifyEmail();break;case'filter':state.filter=id;state.libraryLimit=24;renderMain();break;case'library-more':state.libraryLimit=(state.libraryLimit||24)+24;renderMain();break;case'review-cat':state.reviewCat=id;renderMain();break;case'read-article':openArticle(id);break;case'read-from-article':closeModal();await openBook(id);break;case'reset-search':state.query='';state.filter='all';state.sort='featured';$('#search').value='';renderMain();break;case'shelf-prev':case'shelf-next':$('#bookShelf')?.scrollBy({left:(action==='shelf-prev'?-1:1)*350,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});break;case'read':await openBook(id);break;case'bookmark':await bookmark(id,b);break;case'upload-pdf':$('#pdfInput').click();break;case'read-local':await openLocalPDF(id);break;case'export-pdf':await BookMedia.exportPDF(id);break;case'delete-pdf':{const p=state.pdfs.find(x=>x.id===id);if(p)modal('Xóa PDF khỏi thiết bị?',`<p class="auth-subtitle">Xóa ${esc(p.name)} khỏi kệ của trình duyệt này. File gốc trên máy của bạn không bị ảnh hưởng.</p><button class="button button-primary button-block" data-action="delete-pdf-confirm" data-id="${esc(id)}">Xóa khỏi kệ</button>`);break}case'delete-pdf-confirm':await BookMedia.deletePDF(id);closeModal();await loadPDFs();toast('Đã xóa PDF khỏi kệ của thiết bị.');break;case'import-saved':state.user?confirmImport():auth();break;case'import-confirm':if(state.user){const saved=[...new Set([...state.data.saved,...legacySaved()])];await api('/api/user-data',{method:'POST',body:{saved}});state.data.saved=saved;closeModal();renderMain();toast('Đã nhập sách đã lưu vào tài khoản.')}break;case'reader-vocabulary':window.LowfReaderTools?.openVocabulary();break;case'reader-close':closeReader();break;case'prev-page':changePage(-1);break;case'next-page':changePage(1);break;case'retry-pdf':await renderPDF();break;case'font':state.font=Math.min(30,Math.max(16,state.font+Number(b.dataset.delta)));setPreference({font:state.font});applyReaderPrefs();break;case'reader-bookmark':if(state.reader?.bookId&&!state.reader?.localBook){await bookmark(state.reader.bookId,b)}else{spawnSaveFx(b);toast('🔖 Cuốn sách này đã được lưu sẵn trên Kệ sách thiết bị của bạn!')}break;case'play-track':await playTrack(id);break;case'ambient':if(state.ambient===id)await toggleAudio();else await playAmbient(id);if(state.view==='dashboard')renderMain();break;case'audio-toggle':await toggleAudio();break;case'audio-stop':stopAudio();break;case'prev-track':await nextTrack(-1);break;case'next-track':await nextTrack(1);break;case'play-first':{const playable=state.tracks.find(t=>t.assetId||safeURL(t.url));if(isAudioPlaying()){toast('Nhạc đang phát. Bạn có thể mở sách để đọc cùng.')}else if(playable)await playTrack(playable.id);else await playAmbient('hanoi_rain');break}case'play-trend':playTrendPlaylist(id);break;case'timer-toggle':timerOpen=!timerOpen;if(timerOpen)stylePopOpen=false;renderReaderStylePop();renderTimerUI();break;case'timer-pause':timerPaused=!timerPaused;renderTimerUI();break;case'timer-reset':if(timerMode==='pomodoro')pomodoroLeft=pomodoroTotal;else state.sessionSeconds=0;timerPaused=false;renderTimerUI();break;case'timer-pomodoro':{const m=Number(id)||25;timerMode='pomodoro';pomodoroTotal=m*60;pomodoroLeft=m*60;timerPaused=false;timerOpen=false;renderTimerUI();toast(`⏱️ Đã hẹn đồng hồ tập trung ${m} phút! Hoàn thành nhận +15 Lowf Xu.`);break}case'timer-stopwatch':timerMode='stopwatch';pomodoroTotal=0;pomodoroLeft=0;timerPaused=false;timerOpen=false;renderTimerUI();break;case'avatar-open':openAvatarPicker();break;case'avatar-upload':$('#avatarInput')?.click();break;case'avatar-clear':setUserAvatar('');closeModal();toast('Đã chuyển về ảnh chữ cái tên.');break;case'avatar-preset':{const pr=AVATAR_PRESETS.find(x=>x.id===id);if(pr){setUserAvatar(presetAvatarDataUrl(pr));closeModal();toast(`Đã đổi ảnh đại diện "${pr.name}"!`);}break}case'coin-checkin':claimDailyCoins();break;case'coin-redeem':redeemCoinReward(id);break;case'track-credit':trackCredit(id);break;case'play-video':playVideo(id);break;case'join-plan':await joinPlan(id);break;case'cart':showCart();break;case'cart-add':addToCart(b.dataset.kind||'book',id);break;case'cart-quantity':changeCart(b.dataset.kind,id,Number(b.dataset.delta));break;case'cart-remove':changeCart(b.dataset.kind,id,0);break;case'checkout-pay':if(checkoutRedirect&&safePaymentURL(checkoutRedirect)){b.disabled=true;location.assign(checkoutRedirect)}break;case'view-order':await viewOrder(id);break;case'orders-auth':auth();break;case'orders-refresh':state.orderPolls=0;await loadOrders();if(state.selectedOrderId)await loadOrder(state.selectedOrderId);break;case'orders-page':await loadOrders(state.ordersPage+Number(b.dataset.delta));break;case'about':about();break;case'retry':await bootstrap();break;}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;if(b.dataset.action==='go-home')e.preventDefault();handleAction(b).catch(error=>toast(error.message||'Chưa thực hiện được thao tác. Hãy thử lại.'))});
document.addEventListener('submit',async e=>{if(e.target.id==='tocPdfJumpForm'){e.preventDefault();const p=Math.max(1,Math.min(state.reader?.pages||1,Number($('[name=page]',e.target)?.value)||1));if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')){const prev=state.reader.page;state.reader.page=p;tocOpen=false;renderReaderToc();renderPDF(p>=prev?1:-1);}return}if(e.target.id==='checkoutForm'){e.preventDefault();submitCheckout(e.target);return}if(e.target.id==='authForm'){e.preventDefault();submitAuth(e.target);return}if(e.target.matches('[data-reply-form]')){e.preventDefault();if(!state.user){auth();return}const mid=e.target.dataset.replyForm,inp=$('input',e.target),txt=inp.value.trim();if(!txt)return;const soc=getSocial();soc.replies[mid]=[...(soc.replies[mid]||[]),{id:'rep-'+Date.now(),name:state.user.name,avatar:getUserAvatar(),text:txt,at:new Date().toISOString()}];saveSocial(soc);state.replyingTo='';renderMain();toast('Đã gửi trả lời bình luận!');return}if(e.target.id==='dmForm'){e.preventDefault();if(!state.user){auth();return}const peerId=e.target.dataset.peer,peerName=e.target.dataset.peerName||'Bạn đọc',inp=$('input',e.target),txt=inp.value.trim();if(!txt||!peerId)return;const soc=getSocial();soc.dms[peerId]=[...(soc.dms[peerId]||[]),{id:'dm-'+Date.now(),from:'me',name:state.user.name,text:txt,at:new Date().toISOString()}];saveSocial(soc);renderMain();requestAnimationFrame(()=>{const box=$('#dmMessages');if(box)box.scrollTop=box.scrollHeight;$('#dmForm input')?.focus()});return}if(e.target.id!=='chatForm')return;e.preventDefault();if(!state.user){auth();return}if(!state.user.emailVerified){toast('Hãy xác minh email để gửi lời nhắn. Bạn có thể gửi lại email trong trang Cá nhân.');return}const form=e.target,input=$('input',form),text=input.value.trim(),button=$('button',form);if(!text)return;button.disabled=true;try{const result=await api('/api/messages',{method:'POST',body:{text}});if(result.message)state.messages.push(result.message);input.value='';$('#chatMessages').innerHTML=state.messages.map((m,i)=>messageHTML(m,i)).join('');$('#chatMessages').scrollTop=$('#chatMessages').scrollHeight;icons()}catch(error){toast(error.message)}finally{button.disabled=false}});
$('#search').addEventListener('input',e=>{clearTimeout(searchTimer);const value=e.target.value;searchTimer=setTimeout(()=>{if(!['library','store'].includes(state.view)){navigate('library');$('#search').value=value;$('#search').focus()}state.query=value;state.libraryLimit=24;renderMain()},160)});
document.addEventListener('change',e=>{if(e.target.id==='librarySort'){state.sort=e.target.value;state.libraryLimit=24;renderMain()}else if(e.target.dataset.decorToggle){updateDecor({decor:{[e.target.dataset.decorToggle]:e.target.checked}},{rerender:e.target.dataset.decorToggle==='landmark3d'})}else if(e.target.dataset.decorSection){const sec=e.target.dataset.decorSection,s=mergedSettings(),cur=new Set(Array.isArray(s.sections)?s.sections:['hero','stats','continue','books','ambient','deal']);if(e.target.checked)cur.add(sec);else cur.delete(sec);const ordered=['hero','stats','continue','books','ambient','deal'].filter(x=>cur.has(x));updateDecor({sections:ordered.length?ordered:['hero']},{rerender:true})}});
document.addEventListener('input',e=>{if(e.target.id==='readerDimRange'){setPreference({readerDim:Number(e.target.value)});applyReaderPrefs();return}if(e.target.id==='decorPrimaryColor'){updateDecor({palette:{primary:e.target.value},decor:{preset:'custom'}});return}if(e.target.id==='decorNavColor'){updateDecor({decor:{navSync:false,navColor:e.target.value}});return}if(e.target.id==='friendSearch'){state.friendQuery=e.target.value;renderMain();const el=$('#friendSearch');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}return}if(e.target.id==='decorRadius'){updateDecor({radius:Number(e.target.value)});return}if(e.target.id==='decorBgOpacity'){updateDecor({decor:{bgOpacity:Number(e.target.value)}});return}if(e.target.dataset.decorField){const [group,field]=e.target.dataset.decorField.split('.');const cur=loadLocalDecor()||{};const next={...cur,[group]:{...(cur[group]||{}),[field]:e.target.value}};saveLocalDecor(next);applySettings();if(group==='hero'&&state.view==='dashboard'){const h2=$('.hero h2'),hp=$('.hero p');if(field==='title'&&h2)h2.innerHTML=esc(e.target.value).replace(/\n/g,'<br>');if(field==='subtitle'&&hp)hp.textContent=e.target.value;}return}if(e.target.closest('#authForm')){if(e.target.name==='otp')e.target.value=e.target.value.replace(/[^0-9]/g,'').slice(0,10);if(e.target.name==='email')refreshAuthControls();}if(e.target.id==='volume'){state.volume=Number(e.target.value)/100;audio.volume=state.volume;BookMedia.setVolume(state.volume)}else if(e.target.id==='musicSearch'){const q=e.target.value.toLocaleLowerCase('vi');$$('.music-row').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase('vi').includes(q))}});
$('#audioSeek').addEventListener('input',e=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=audio.duration*Number(e.target.value)/100});
for(const event of ['play','pause'])audio.addEventListener(event,()=>{renderPlayer();heartbeat()});
audio.addEventListener('ended',()=>{nextTrack(1).catch(e=>toast(e.message))});
audio.addEventListener('timeupdate',()=>{$('#audioTime').textContent=time(audio.currentTime);$('#audioSeek').value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration*100:0});
audio.addEventListener('error',()=>{if(audio.getAttribute('src')){renderPlayer();toast('Không tải được âm thanh. Vui lòng chọn lại bản nhạc hoặc thử sau.')}});
$('#pdfInput').addEventListener('change',async e=>{const files=[...e.target.files];if(!files.length)return;let count=0;for(const file of files){try{await BookMedia.savePDF(file);count++}catch(error){toast(error.message)}}e.target.value='';navigate('pdf');await loadPDFs();if(count)toast(`✨ Đã tự động tối ưu & thêm ${count} sách vào kệ trên thiết bị.`)});
$('#avatarInput')?.addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>5*1024*1024){toast('Ảnh đại diện tối đa 5 MB.');return}const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const c=document.createElement('canvas');c.width=192;c.height=192;const ctx=c.getContext('2d'),min=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-min)/2,(img.height-min)/2,min,min,0,0,192,192);URL.revokeObjectURL(url);setUserAvatar(c.toDataURL('image/webp',0.85));closeModal();toast('Đã cập nhật ảnh đại diện mới của bạn!');};img.onerror=()=>{URL.revokeObjectURL(url);toast('Chưa đọc được tệp ảnh này.');};img.src=url;});
function handleBrandImageFile(file,targetKey,size,successMsg){
 if(!file)return;
 if(file.size>5*1024*1024){toast('Ảnh tối đa 5 MB.');return}
 if(file.type==='image/svg+xml'){
  const fr=new FileReader();
  fr.onload=()=>{const v=String(fr.result||'');if(v.length>135000){toast('Tệp SVG quá lớn, hãy chọn ảnh nhỏ hơn.');return}updateDecor({brand:{[targetKey]:v,...(targetKey==='logoDataUrl'?{logoAssetId:''}:{faviconAssetId:''})}});toast(successMsg);};
  fr.readAsDataURL(file);return;
 }
 const img=new Image(),url=URL.createObjectURL(file);
 img.onload=()=>{
  const c=document.createElement('canvas');c.width=size;c.height=size;
  const ctx=c.getContext('2d'),scale=Math.min(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;
  ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
  URL.revokeObjectURL(url);
  updateDecor({brand:{[targetKey]:c.toDataURL('image/png'),...(targetKey==='logoDataUrl'?{logoAssetId:''}:{faviconAssetId:''})}});
  toast(successMsg);
 };
 img.onerror=()=>{URL.revokeObjectURL(url);toast('Chưa đọc được tệp ảnh này.');};
 img.src=url;
}
$('#logoFileInput')?.addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';handleBrandImageFile(f,'logoDataUrl',192,'Đã cập nhật Logo riêng cho website!');});
$('#faviconFileInput')?.addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';handleBrandImageFile(f,'faviconDataUrl',96,'Đã cập nhật Favicon trên tab trình duyệt!');});
$('#chapterSelect').addEventListener('change',e=>{if(state.reader?.type==='chapters'){const prev=state.reader.chapter,next=Number(e.target.value);state.reader.chapter=next;state.reader.subPage=0;renderChapter(next>=prev?1:-1)}else if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')){const prev=state.reader.page,next=Math.max(1,Math.min(state.reader.pages,Number(e.target.value)||1));state.reader.page=next;renderPDF(next>=prev?1:-1)}e.target.blur()});
$('#reader').addEventListener('cancel',e=>{e.preventDefault();if(readerZen){setReaderZen(false);return}closeReader()});
$('#reader').addEventListener('click',e=>{if(stylePopOpen&&!e.target.closest('.reader-style-wrap')){stylePopOpen=false;renderReaderStylePop()}if(timerOpen&&!e.target.closest('.reader-timer-wrap')){timerOpen=false;renderTimerUI()}if(tocOpen&&!e.target.closest('.reader-toc-wrap')){tocOpen=false;renderReaderToc()}});
// Live continuous scroll reading progress + Touch/Trackpad/Mouse-drag glide page turning (no button needed!)
$('#readerScroll')?.addEventListener('scroll',()=>{
 const r=state.reader;if(!r||!r.ready||r.type!=='chapters'||readerPrefs().layout!=='scroll')return;
 const el=$('#readerScroll'),max=Math.max(1,el.scrollHeight-el.clientHeight),frac=Math.min(1,Math.max(0,el.scrollTop/max));
 const b=r.localBook||book(r.bookId),totalCh=Math.max(1,b?.chapters?.length||1);
 const pct=Math.min(100,Math.round(((r.chapter+frac)/totalCh)*100));
 const fill=$('#readerProgressFill');if(fill)fill.style.width=pct+'%';
 const line=`Chương ${r.chapter+1}/${totalCh} · Cuộn ${Math.round(frac*100)}% · Tổng ${pct}%`;
 $('#readerProgress').textContent=line;
 const zenSt=$('#readerZenStatus');if(zenSt)zenSt.textContent=line;
},{passive:true});
let swipeX=0,swipeY=0,swipeT=0,wheelSwipeLock=0,dragX=0,dragY=0,dragT=0;
$('#readerScroll')?.addEventListener('touchstart',e=>{if(e.touches.length===1){swipeX=e.touches[0].clientX;swipeY=e.touches[0].clientY;swipeT=Date.now();}},{passive:true});
$('#readerScroll')?.addEventListener('touchend',e=>{
 if(!swipeT||!state.reader?.ready||Date.now()-swipeT>520)return;
 const t=e.changedTouches?.[0];if(!t)return;
 const dx=t.clientX-swipeX,dy=t.clientY-swipeY;swipeT=0;
 if(Math.abs(dx)>56&&Math.abs(dx)>Math.abs(dy)*1.4){
  if(readerPrefs().layout!=='scroll'||state.reader.type!=='chapters')changePage(dx<0?1:-1);
 }
},{passive:true});
// MacBook trackpad horizontal 2-finger swipe to glide across book pages
$('#readerScroll')?.addEventListener('wheel',e=>{
 if(!state.reader?.ready||Date.now()<wheelSwipeLock)return;
 if(readerPrefs().layout==='scroll'&&state.reader.type==='chapters')return;
 const ax=Math.abs(e.deltaX),ay=Math.abs(e.deltaY);
 if(ax>28&&ax>ay*1.45){
  wheelSwipeLock=Date.now()+520;
  changePage(e.deltaX>0?1:-1);
 }
},{passive:true});
// Desktop mouse drag-swipe across page & desk margins (smartly preserves deliberate text selection!)
let dragOnCanvas=false;
$('#readerScroll')?.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,a,input,select,.reader-ink.drawing-enabled,.reader-toc-pop,.reader-style-pop,.reader-timer-pop'))return;
 dragX=e.clientX;dragY=e.clientY;dragT=Date.now();
 dragOnCanvas=!e.target.closest('p,h1,h2,h3,blockquote,.pdf-text-layer');
});
window.addEventListener('pointerup',e=>{
 if(!dragT||e.pointerType!=='mouse'||!state.reader?.ready||!$('#reader')?.open)return;
 const dt=Date.now()-dragT,dx=e.clientX-dragX,dy=e.clientY-dragY,fromCanvas=dragOnCanvas;
 dragT=0;dragOnCanvas=false;
 const selText=window.getSelection()?.toString().trim()||'';
 if(dt>750)return;
 if(Math.abs(dx)>64&&Math.abs(dx)>Math.abs(dy)*1.5){
  if(!fromCanvas&&selText.length>2&&Math.abs(dx)<150)return;
  if(selText)window.getSelection()?.removeAllRanges();
  if(readerPrefs().layout!=='scroll'||state.reader.type!=='chapters')changePage(dx<0?1:-1);
 }
});
let resizeTimer=null;window.addEventListener('resize',()=>{if(state.reader?.type==='chapters'){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderChapter(0),180)}else if(state.reader&&(state.reader.type==='local'||state.reader.type==='remote')&&state.reader.ready&&!state.reader.pdfReflow){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>renderPDF(0),220)}});
$('#modal').addEventListener('cancel',()=>{$$('iframe',$('#modal')).forEach(f=>f.remove());const video=$('video',$('#modal'));if(video){video.pause();video.removeAttribute('src');video.load()}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)return;if(e.target.closest('input,textarea,select,[contenteditable],[data-reader-panel]')||$('#vocabularyDialog')?.open)return;if(e.key==='/'&&!$('#reader').open&&!$('#modal').open){e.preventDefault();$('#search').focus()}if($('#reader').open&&!$('#modal').open&&window.getSelection()?.isCollapsed!==false){if(e.key==='ArrowRight')changePage(1);else if(e.key==='ArrowLeft')changePage(-1);else if(e.key==='z'||e.key==='Z'){e.preventDefault();setReaderZen(!readerZen,{announce:true});}}});
document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('is-tab-hidden',document.hidden);readerStamp=performance.now();heartbeat(document.visibilityState==='hidden'?false:undefined)});
window.addEventListener('pagehide',()=>{if(state.user&&wasActive)navigator.sendBeacon('/api/reading',new Blob([JSON.stringify({active:false,source:readerActive()?'reader':'audio',sessionId:readingSession})],{type:'application/json'}))});
setInterval(()=>heartbeat(),15000);setInterval(()=>{if(state.view==='community'&&document.visibilityState!=='hidden')loadCommunity()},30000);
let lastFocusRefresh=0;window.addEventListener('focus',()=>{if(state.user&&!$('#modal').open&&Date.now()-lastFocusRefresh>45000){lastFocusRefresh=Date.now();refreshMe().then(()=>{if(state.view==='profile')renderMain()}).catch(()=>{})}});
window.LowfReaderBridge=Object.freeze({getContext:()=>{const r=state.reader,b=r?.bookId?book(r.bookId):null;return {open:$('#reader').open,ready:!!r?.ready,bookId:r?.bookId||(r?.type==='local'?'local:'+r.id:''),chapter:r?.chapter||0,page:r?.page||1,type:r?.type||'',title:r?.title||'',language:b?.language||'vi',user:state.user,text:r?.type==='chapters'?[b?.chapters?.[r.chapter]?.title,...(b?.chapters?.[r.chapter]?.paragraphs||[])].filter(Boolean).join('\n\n'):r?.pdfText||''}},requestAuth:()=>auth(),api,toast});
window.addEventListener('lowf:speech-state',e=>{const speaking=e.detail?.status==='playing',duck=e.detail?.duckAmbient!==false;if(speaking){if(!duck&&isAudioPlaying()){audio.pause();BookMedia.pause();renderPlayer()}else{const low=Math.max(0.05,state.volume*0.18);audio.volume=low;BookMedia.setVolume(low)}}else{audio.volume=state.volume;BookMedia.setVolume(state.volume)}});
window.addEventListener('scroll',()=>{document.body.classList.toggle('is-scrolled',window.scrollY>36)},{passive:true});
state.font=Math.min(30,Math.max(16,Number(preferences().font)||20));renderUser();renderPlayer();renderCartCount();bootstrap();
})();
