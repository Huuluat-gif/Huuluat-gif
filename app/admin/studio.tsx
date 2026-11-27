"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { upload } from "@vercel/blob/client";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CloudUpload,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Film,
  Headphones,
  ImagePlus,
  LayoutDashboard,
  Leaf,
  LoaderCircle,
  LogOut,
  Menu,
  Monitor,
  Music2,
  Paintbrush,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import styles from "./admin.module.css";
import { PaymentSettingsPanel, OrdersPanel } from "./commerce";

type Tab = "overview" | "books" | "tracks" | "videos" | "design" | "plans" | "payments" | "orders" | "auth";
type Kind = "books" | "tracks" | "videos" | "plans";
type AssetKind = "image" | "pdf" | "audio" | "video";
type ItemStatus = "draft" | "processing" | "needs_review" | "ready" | "published" | "archived" | "failed";
type RecordItem = {
  id: string;
  title?: string;
  name?: string;
  author?: string;
  category?: string;
  format?: string;
  price?: number;
  description?: string;
  cover?: string;
  coverAssetId?: string;
  pdfAssetId?: string;
  artist?: string;
  assetId?: string;
  source?: string;
  license?: string;
  attribution?: string;
  access?: "free" | "member";
  status?: ItemStatus;
  interval?: "month" | "year" | "once";
  features?: string[];
  enabled?: boolean;
  saleEnabled?: boolean;
  chapters?: { title: string; paragraphs: string[] }[];
  chapterCount?: number;
  language?: string;
  sourceUrl?: string;
  licenseLabel?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  translator?: string;
  copyrightStatus?: "public_domain" | "licensed" | "owner_authorized" | "needs_review";
  coverSource?: string;
  metadataVerified?: boolean;
  sourceKind?: "upload" | "youtube";
  youtubeUrl?: string;
  youtubeId?: string;
  createdAt?: string;
  updatedAt?: string;
};
type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
};
type Me = { user: User | null };
type DesignDecor = {
  preset?: string;
  season?:
    | "classic"
    | "spring"
    | "summer"
    | "autumn"
    | "winter"
    | "festive"
    | "rainy"
    | "midautumn"
    | "christmas"
    | "meteor"
    | "dandelion"
    | "lotus";
  bgPattern?:
    | "clean"
    | "mesh"
    | "dots"
    | "grid"
    | "waves"
    | "starry"
    | "sunset"
    | "botanical"
    | "grid3d"
    | "orbs3d"
    | "aurora3d"
    | "prism"
    | "rings3d"
    | "paperstack"
    | "bokeh"
    | "marble"
    | "cubes3d"
    | "tunnel3d"
    | "ribbon3d"
    | "nebula3d"
    | "hex3d"
    | "spotlight3d"
    | "bubbles3d"
    | "constellation3d";
  bgWallpaper?: string;
  bgImageAssetId?: string;
  bgOpacity?: number;
  navSync?: boolean;
  navColor?: string;
  navStyle?: "glass" | "pill-glow" | "floating" | "solid-season" | "minimal-line";
  navEffect?: "magnetic" | "glow-border" | "ripple-slide" | "neon-pulse" | "clean";
  landmark3d?: boolean;
  fxLevel?: "off" | "gentle" | "vivid";
  stars?: "off" | "soft" | "bright";
  petals?: boolean;
  aurora?: boolean;
  paperGrain?: boolean;
  cardStyle?: "hardcover" | "glass" | "minimal";
};
type Design = {
  brand: {
    name: string;
    tagline: string;
    logoPreset?: "sprout" | "open-book" | "monogram" | "moon-book" | "feather" | "lotus";
    logoAssetId?: string;
    faviconAssetId?: string;
    logoDataUrl?: string;
    faviconDataUrl?: string;
  };
  palette: {
    primary: string;
    background: string;
    surface: string;
    text: string;
  };
  hero: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaView: string;
    imageAssetId?: string;
  };
  sections: string[];
  font: "serif" | "sans";
  radius: number;
  featuredBookIds: string[];
  decor?: DesignDecor;
};
type Version = {
  id: string;
  settings: Design;
  createdAt: string;
  status?: string;
};
type DesignResponse = {
  draft: Version | null;
  published: Version | null;
  versions: Version[];
};
const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "books", label: "Sách & Ebook", icon: BookOpen },
  { id: "tracks", label: "Âm nhạc", icon: Headphones },
  { id: "videos", label: "Video", icon: Film },
  { id: "design", label: "Giao diện & 4 Mùa", icon: Paintbrush },
  { id: "plans", label: "Gói thành viên", icon: CreditCard },
  { id: "orders", label: "Đơn hàng", icon: ShoppingBag },
  { id: "payments", label: "Thanh toán VNPAY", icon: CreditCard },
  { id: "auth", label: "Đăng nhập & Bảo mật", icon: ShieldCheck },
];
const labels: Record<
  Kind,
  { single: string; plural: string; description: string; icon: typeof BookOpen }
> = {
  books: {
    single: "sách",
    plural: "Sách & Ebook",
    description:
      "Từ một tấm bìa đến những trang cuối. Mọi cuốn sách đều có chỗ ở đây.",
    icon: BookOpen,
  },
  tracks: {
    single: "bản nhạc",
    plural: "Thư viện âm nhạc",
    description:
      "Những thanh âm làm dịu một ngày và đồng hành cùng mỗi trang sách.",
    icon: Music2,
  },
  videos: {
    single: "video",
    plural: "Không gian video",
    description: "Thêm một câu chuyện chuyển động vào thế giới của Lowf.",
    icon: Film,
  },
  plans: {
    single: "gói",
    plural: "Gói thành viên",
    description: "Thiết kế một hành trình phù hợp cho từng người đọc.",
    icon: CreditCard,
  },
};
const sectionLabels: Record<string, string> = {
  hero: "Lời chào & ảnh đầu trang",
  stats: "Tiến độ của người đọc",
  continue: "Đọc tiếp",
  books: "Sách nổi bật",
  ambient: "Không gian âm nhạc",
  deal: "Gói thành viên",
};
const defaultDecor: Required<Omit<DesignDecor, "bgImageAssetId">> & { bgImageAssetId?: string } = {
  preset: "blush",
  season: "spring",
  bgPattern: "orbs3d",
  bgWallpaper: "none",
  bgOpacity: 24,
  navSync: true,
  navColor: "",
  navStyle: "pill-glow",
  navEffect: "magnetic",
  landmark3d: true,
  fxLevel: "vivid",
  stars: "bright",
  petals: true,
  aurora: true,
  paperGrain: true,
  cardStyle: "hardcover",
};
const bgPatternCatalog: {
  id: NonNullable<DesignDecor["bgPattern"]>;
  name: string;
  desc: string;
  is3d?: boolean;
}[] = [
  { id: "orbs3d", name: "Cầu kính 3D", desc: "Khối cầu nổi chiều sâu", is3d: true },
  { id: "cubes3d", name: "Lập phương 3D", desc: "Khối pha lê xoay nổi", is3d: true },
  { id: "tunnel3d", name: "Đường hầm 3D", desc: "Khung chiều sâu không gian", is3d: true },
  { id: "ribbon3d", name: "Dải lụa 3D", desc: "Sóng lụa ánh sáng chéo", is3d: true },
  { id: "nebula3d", name: "Tinh vân 3D", desc: "Đám mây vũ trụ đa sắc", is3d: true },
  { id: "hex3d", name: "Tổ ong 3D", desc: "Lưới lục giác nghiêng 3D", is3d: true },
  { id: "spotlight3d", name: "Ánh đèn 3D", desc: "Luồng sáng sân khấu dịu", is3d: true },
  { id: "bubbles3d", name: "Bong bóng 3D", desc: "Bóng kính ngũ sắc bay lên", is3d: true },
  { id: "constellation3d", name: "Chòm sao 3D", desc: "Mạng sao thiên văn xoay", is3d: true },
  { id: "grid3d", name: "Lưới 3D không gian", desc: "Sàn phối cảnh 3D trượt", is3d: true },
  { id: "aurora3d", name: "Cực quang 3D", desc: "Dải sáng uốn lượn mượt", is3d: true },
  { id: "rings3d", name: "Quỹ đạo 3D", desc: "Vòng thiên văn xoay nhẹ", is3d: true },
  { id: "prism", name: "Lăng kính 3D", desc: "Mặt cắt pha lê hiện đại", is3d: true },
  { id: "paperstack", name: "Trang sách 3D", desc: "Lớp giấy bay chiều sâu", is3d: true },
  { id: "bokeh", name: "Bokeh cà phê", desc: "Đèn ấm mờ ảo lung linh", is3d: true },
  { id: "marble", name: "Đá cẩm thạch", desc: "Vân khoáng nghệ thuật", is3d: true },
  { id: "mesh", name: "Aurora Mesh", desc: "Lưới màu phát sáng" },
  { id: "dots", name: "Chấm Studio", desc: "Dot Matrix hiện đại" },
  { id: "grid", name: "Lưới sổ tay", desc: "Giấy kiến trúc tinh tế" },
  { id: "waves", name: "Sóng lụa", desc: "Đường sóng mềm mại" },
  { id: "starry", name: "Ngàn sao", desc: "Bầu trời đêm lấp lánh" },
  { id: "sunset", name: "Hoàng hôn", desc: "Ánh kính ấm nghệ thuật" },
  { id: "botanical", name: "Vân lá cổ", desc: "Họa tiết thư viện" },
  { id: "clean", name: "Giấy mịn", desc: "Sạch sẽ, tối giản" },
];
const bgWallpaperCatalog: { id: string; name: string; desc: string; thumb?: string }[] = [
  { id: "none", name: "Không ảnh nền", desc: "Chỉ dùng màu & nền 3D" },
  { id: "photo-library", name: "Thư viện cổ điển", desc: "Kệ sách gỗ & ánh nắng", thumb: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-bookshop", name: "Hiệu sách châu Âu", desc: "Không gian sách cổ kính", thumb: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-cafe", name: "Quán sách mưa rơi", desc: "Cà phê ấm & cửa kính", thumb: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-rainwindow", name: "Cửa kính ngày mưa", desc: "Giọt mưa êm dịu chill", thumb: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-sakura", name: "Vườn hoa anh đào", desc: "Sắc xuân dịu dàng", thumb: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-autumn", name: "Đường lá phong đỏ", desc: "Sắc thu lãng mạn", thumb: "https://images.unsplash.com/photo-1507041957456-9c397ce39c97?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-kyoto", name: "Phố cổ Kyoto chiều", desc: "Đèn lồng ấm áp Á Đông", thumb: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-forest", name: "Rừng thông sương sớm", desc: "Yên bình & trong lành", thumb: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-ocean", name: "Biển xanh hoàng hôn", desc: "Chân trời thư thái", thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-snow", name: "Rừng tuyết Bắc Âu", desc: "Mùa đông êm đềm", thumb: "https://images.unsplash.com/photo-1483664852095-d6cc6870702d?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-aurora", name: "Cực quang Bắc Cực", desc: "Bầu trời đêm huyền ảo", thumb: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=400&q=60" },
  { id: "photo-lavender", name: "Cánh đồng Oải Hương", desc: "Tím mộng mơ hoàng hôn", thumb: "https://images.unsplash.com/photo-1499002238440-d264edd596ec?auto=format&fit=crop&w=400&q=60" },
  { id: "art-mountains", name: "Tranh núi sương mù", desc: "Thủy mặc nghệ thuật 4K" },
  { id: "art-nightsky", name: "Tranh đêm trăng sao", desc: "Bầu trời đêm sâu lắng" },
  { id: "art-botanical", name: "Tranh vườn thực vật", desc: "Lá xanh & nắng vàng 4K" },
  { id: "art-sakura-lake", name: "Tranh hồ anh đào", desc: "Sắc hồng pastel 4K" },
  { id: "art-autumn-moon", name: "Tranh trăng thu", desc: "Trăng tròn đồi phong 4K" },
  { id: "art-winter-cabin", name: "Tranh rừng tuyết 4K", desc: "Mùa đông trong trẻo" },
  { id: "art-sunset-sea", name: "Tranh biển hoàng hôn", desc: "Nắng chiều lãng mạn 4K" },
];
const seasonPresets: {
  id: NonNullable<DesignDecor["season"]>;
  icon: string;
  name: string;
  desc: string;
  palette: Design["palette"];
}[] = [
  { id: "spring", icon: "🌸", name: "Mùa Xuân · Hoa Anh Đào", desc: "Sắc hồng đào & cánh hoa rơi", palette: { primary: "#b84568", background: "#fcf6f7", surface: "#fffdfd", text: "#2c1c23" } },
  { id: "summer", icon: "☀️", name: "Mùa Hạ · Biển Xanh", desc: "Xanh biển sáng & hạt nắng bay", palette: { primary: "#166b85", background: "#f1f8fb", surface: "#fcfefe", text: "#152a34" } },
  { id: "autumn", icon: "🍁", name: "Mùa Thu · Lá Phong", desc: "Cam đất ấm & lá phong rơi", palette: { primary: "#a84b28", background: "#fbf4eb", surface: "#fffcf7", text: "#2e1e15" } },
  { id: "winter", icon: "❄️", name: "Mùa Đông · Tuyết Pha Lê", desc: "Xanh tuyết & bông tuyết rơi", palette: { primary: "#2c4e82", background: "#f2f5fa", surface: "#fbfdff", text: "#182336" } },
  { id: "festive", icon: "🏮", name: "Tết & Lễ Hội", desc: "Đỏ son vàng kim & đèn hoa đăng", palette: { primary: "#b3322a", background: "#fdf8ee", surface: "#fffdf8", text: "#301c17" } },
  { id: "classic", icon: "🌿", name: "Vườn Lowf Mặc Định", desc: "Xanh rừng dịu mắt & bụi sao", palette: { primary: "#2c6546", background: "#f6f5f0", surface: "#fdfcf9", text: "#1d2b22" } },
  { id: "rainy", icon: "🌧️", name: "Mùa Mưa · Phố Mưa Chill", desc: "Xanh xám dịu & vệt mưa bạc rơi", palette: { primary: "#365b78", background: "#eff4f8", surface: "#fafdff", text: "#192734" } },
  { id: "midautumn", icon: "🌕", name: "Trung Thu · Trăng Rằm", desc: "Vàng hổ phách & đèn trời bay lên", palette: { primary: "#9e511c", background: "#fdf6ea", surface: "#fffdf7", text: "#2e1f14" } },
  { id: "christmas", icon: "🎄", name: "Giáng Sinh · Thông Noel", desc: "Xanh thông đỏ Noel & tuyết lấp lánh", palette: { primary: "#1f5c43", background: "#f3f7f4", surface: "#fcfefd", text: "#172920" } },
  { id: "meteor", icon: "🌠", name: "Đêm Sao Băng · Ngân Hà", desc: "Tím thiên hà & mưa sao băng chéo", palette: { primary: "#4d3d91", background: "#f3f2fa", surface: "#fcfbff", text: "#1f1a36" } },
  { id: "dandelion", icon: "🌬️", name: "Bồ Công Anh · Gió Chiều", desc: "Xanh đồng cỏ & cánh hoa bay ngang", palette: { primary: "#587a38", background: "#f7f9f0", surface: "#fdfef9", text: "#212b18" } },
  { id: "lotus", icon: "🪷", name: "Mùa Sen · Sớm Mai", desc: "Hồng sen thanh tịnh & sương rơi", palette: { primary: "#a8456d", background: "#fbf4f7", surface: "#fffcfd", text: "#2d1a23" } },
];
const initialDesign: Design = {
  brand: { name: "Lowf", tagline: "Book & beyond" },
  palette: {
    primary: "#2c6546",
    background: "#f6f5f0",
    surface: "#fdfcf9",
    text: "#1d2b22",
  },
  hero: {
    title: "Giữa bộn bề,\ntìm một trang yên.",
    subtitle:
      "Những cuốn sách hay, một bản nhạc dịu. Và khoảng thời gian dành riêng cho bạn.",
    ctaLabel: "Khám phá thư viện",
    ctaView: "library",
  },
  sections: ["hero", "stats", "continue", "books", "ambient", "deal"],
  font: "serif",
  radius: 18,
  featuredBookIds: [],
  decor: defaultDecor,
};
const designPresets: {id:string;name:string;description:string;palette:Design['palette'];font:Design['font'];radius:number}[] = [
  {id:'botanical',name:'Rừng Thông & Giấy Ấm',description:'Êm mắt, thanh lịch — bản sắc Lowf.',palette:{primary:'#2c6546',background:'#f6f5f0',surface:'#fdfcf9',text:'#1d2b22'},font:'serif',radius:18},
  {id:'blush',name:'Hoa Anh Đào & Lụa Ngà',description:'Dịu dàng, tinh tế và giàu chất thơ.',palette:{primary:'#b84568',background:'#fcf6f7',surface:'#fffdfd',text:'#2c1c23'},font:'serif',radius:20},
  {id:'espresso',name:'Cà Phê & Giấy Kraft',description:'Ấm áp, cổ điển như hiệu sách gỗ.',palette:{primary:'#8a5436',background:'#f7f1e8',surface:'#fffcf7',text:'#2c211a'},font:'serif',radius:20},
  {id:'nordic',name:'Sương Sớm Bắc Âu',description:'Tươi sáng, gọn gàng nhiều khoảng thở.',palette:{primary:'#2b5b78',background:'#f2f6f8',surface:'#fcfdfe',text:'#1b2a34'},font:'sans',radius:14},
  {id:'twilight',name:'Tím Khói & Mực Cổ',description:'Sáng tạo, sâu lắng cho buổi đọc tối.',palette:{primary:'#5b4785',background:'#f5f3f9',surface:'#fdfcff',text:'#231d30'},font:'serif',radius:18},
  {id:'collector',name:'Vàng Kim & Sách Quý',description:'Sang trọng, tinh tuyển ấn bản sưu tầm.',palette:{primary:'#92692c',background:'#faf7ee',surface:'#fffef9',text:'#292218'},font:'serif',radius:16},
  {id:'matcha',name:'Matcha Kyoto',description:'Tươi mát, cân bằng và đầy sức sống.',palette:{primary:'#4a7c3f',background:'#f3f7ee',surface:'#fbfdf8',text:'#1e2b1b'},font:'serif',radius:18},
  {id:'terracotta',name:'Gốm Đất Nung',description:'Nghệ thuật ấm áp phong cách Địa Trung Hải.',palette:{primary:'#b85535',background:'#faf3ed',surface:'#fffcf9',text:'#2e1e18'},font:'serif',radius:20},
  {id:'ocean',name:'Biển Lam San Hô',description:'Khoáng đạt, trẻ trung và hiện đại.',palette:{primary:'#0f766e',background:'#eef8f7',surface:'#fafefe',text:'#132a28'},font:'sans',radius:16},
  {id:'lavender',name:'Oải Hương Provence',description:'Mộng mơ, thanh tao và mềm mại.',palette:{primary:'#6d4c9c',background:'#f7f4fc',surface:'#fdfcff',text:'#251c33'},font:'serif',radius:20},
  {id:'rosewood',name:'Gỗ Hồng Rượu Vang',description:'Quyến rũ, chiều sâu kiểu hiệu sách châu Âu.',palette:{primary:'#8c2f48',background:'#fbf3f5',surface:'#fffcfd',text:'#2e171e'},font:'serif',radius:18},
  {id:'amber',name:'Mật Ong Nắng Chiều',description:'Rạng rỡ, ấm cúng và gần gũi.',palette:{primary:'#b5741e',background:'#fcf7eb',surface:'#fffdf7',text:'#2d2314'},font:'serif',radius:18},
  {id:'slate',name:'Xanh Đá Tối Giản',description:'Công nghệ, sắc nét và cực gọn gàng.',palette:{primary:'#334155',background:'#f4f6f9',surface:'#ffffff',text:'#17202c'},font:'sans',radius:12},
  {id:'jade',name:'Ngọc Bích Hoàng Gia',description:'Quý phái, dịu êm và sang trọng.',palette:{primary:'#1e6b5b',background:'#eff7f5',surface:'#fafefd',text:'#162b26'},font:'serif',radius:18},
  {id:'sunset',name:'Hoàng Hôn San Hô',description:'Ấm áp, năng lượng tích cực mỗi ngày.',palette:{primary:'#c25442',background:'#fdf4f1',surface:'#fffcfb',text:'#301c18'},font:'serif',radius:20},
  {id:'indigo',name:'Mực Chàm Nhật Bản',description:'Cổ điển, trầm tĩnh và tập trung sâu.',palette:{primary:'#283d7a',background:'#f2f5fb',surface:'#fcfdff',text:'#172038'},font:'serif',radius:16},
];
const money = (n = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
const date = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Chưa có";
const assetUrl = (id?: string) =>
  id ? `/api/assets/${encodeURIComponent(id)}` : "";
const titleOf = (item: RecordItem) => item.title || item.name || "Chưa đặt tên";
function youtubeIdFromUrl(value?: string) {
  try {
    const url = new URL(value || "");
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    const host = url.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1] || "";
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/").filter(Boolean);
      id = parts[0] === "watch" ? url.searchParams.get("v") || "" : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] || "" : "";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  } catch { return ""; }
}
const chapterCount = (item: RecordItem) => item.chapters?.length || item.chapterCount || 0;
function isKind(tab: Tab): tab is Kind {
  return ["books", "tracks", "videos", "plans"].includes(tab);
}
function freshItem(kind: Kind): RecordItem {
  return {
    id: "",
    title: "",
    name: "",
    author: "",
    description: "",
    category: "vanhocvn",
    format: "Ebook Free",
    price: 0,
    access: "free",
    status: "draft",
    artist: "",
    license: "",
    source: "",
    attribution: "",
    interval: "month",
    features: [],
    enabled: false,
    saleEnabled: false,
    chapters: [],
    language: "vi",
    sourceKind: "upload",
    youtubeUrl: "",
  };
}
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await res
    .json()
    .catch(() => ({ error: "Máy chủ trả về dữ liệu chưa hợp lệ." }));
  if (!res.ok && Array.isArray(data.issues) && data.issues.length) {
    const labels:Record<string,string>={title:'Tên nội dung',name:'Tên',author:'Tác giả',source:'Nguồn',sourceUrl:'Liên kết nguồn',licenseUrl:'Liên kết giấy phép',youtubeUrl:'Liên kết YouTube',price:'Giá',status:'Trạng thái',pdfAssetId:'File PDF',assetId:'File nội dung',coverAssetId:'Ảnh bìa'};
    const issue=data.issues[0],field=labels[String(issue.path).split('.').at(-1)||''];
    throw new Error(`${field||'Thông tin'}: ${/url|URL|https/i.test(String(issue.message))?'Hãy nhập liên kết https:// hợp lệ hoặc để trống nếu không bắt buộc.':String(issue.message)}`);
  }
  if (!res.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
            data.message ||
            `Không thực hiện được yêu cầu (${res.status}).`,
    );
  return data as T;
}
function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function StateBadge({ item }: { item: RecordItem }) {
  const state: ItemStatus =
    item.status === "archived"
      ? "archived"
      : item.enabled !== undefined
        ? item.enabled
          ? "published"
          : "draft"
        : item.status || "draft";
  const badgeMap: Record<ItemStatus, { cls: string; text: string }> = {
    published: { cls: styles.greenBadge, text: "Đang hiển thị" },
    ready: { cls: styles.greenBadge, text: "Sẵn sàng duyệt" },
    needs_review: { cls: styles.goldBadge, text: "Cần rà soát" },
    processing: { cls: styles.goldBadge, text: "Đang xử lý" },
    draft: { cls: styles.goldBadge, text: "Bản nháp" },
    failed: { cls: styles.grayBadge, text: "Lỗi xử lý" },
    archived: { cls: styles.grayBadge, text: "Đã lưu trữ" },
  };
  const info = badgeMap[state] || badgeMap.draft;
  return (
    <span className={`${styles.badge} ${info.cls}`}>
      <span />
      {info.text}
    </span>
  );
}
function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
    const cancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current();
    };
    el?.addEventListener("cancel", cancel);
    return () => {
      el?.removeEventListener("cancel", cancel);
      el?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wideDialog : ""}`}
      aria-label={title}
    >
      <header className={styles.dialogHeader}>
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className={styles.iconButton}
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
async function uploadLargeAsset(params: {
  file: File;
  userId: string;
  kind: AssetKind;
  title: string;
  signal?: AbortSignal;
  onProgress?: (pct: number) => void;
}): Promise<string> {
  const { file, userId, kind, title, signal, onProgress } = params;
  const fallbackMime: Record<AssetKind, string> = {
    image: "image/jpeg",
    pdf: "application/pdf",
    audio: "audio/mpeg",
    video: "video/mp4",
  };
  const contentType = (file.type || fallbackMime[kind]).split(";")[0].trim().toLowerCase();
  const presign = await request<{
    backend: "r2" | "vercel-blob";
    pathname?: string;
    uploadUrl?: string;
    contentType?: string;
  }>("/api/uploads/presign", {
    method: "POST",
    body: JSON.stringify({
      kind,
      contentType,
      byteSize: file.size,
      originalName: title,
    }),
  });

  if (presign.backend === "r2" && presign.uploadUrl && presign.pathname) {
    if (onProgress) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.uploadUrl!, true);
        xhr.setRequestHeader("Content-Type", presign.contentType || contentType);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Tải tệp lên R2 lỗi (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Lỗi kết nối khi tải tệp lên R2."));
        xhr.onabort = () => reject(new Error("Đã hủy tải tệp."));
        if (signal) {
          if (signal.aborted) {
            xhr.abort();
            return;
          }
          signal.addEventListener("abort", () => xhr.abort(), { once: true });
        }
        xhr.send(file);
      });
    } else {
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": presign.contentType || contentType },
        body: file,
        signal,
      });
      if (!putRes.ok) throw new Error(`Tải tệp lên R2 lỗi (${putRes.status})`);
    }
    const fin = await request<{ asset: { id: string } }>("/api/uploads/finalize", {
      method: "POST",
      body: JSON.stringify({
        pathname: presign.pathname,
        kind,
        originalName: title,
      }),
    });
    return fin.asset.id;
  }

  const ext =
    title
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || (kind === "pdf" ? "pdf" : "bin");
  const blob = await upload(`lowf/${userId}/${kind}/${crypto.randomUUID()}.${ext}`, file, {
    access: "private",
    handleUploadUrl: "/api/uploads",
    clientPayload: JSON.stringify({ kind, title }),
    contentType: file.type || undefined,
    multipart: file.size > 10 * 1024 * 1024,
    abortSignal: signal,
    onUploadProgress: onProgress ? ({ percentage }) => onProgress(Math.round(percentage)) : undefined,
  });
  const fin = await request<{ asset: { id: string } }>("/api/uploads/finalize", {
    method: "POST",
    body: JSON.stringify({
      url: blob.url,
      kind,
      originalName: title,
    }),
  });
  return fin.asset.id;
}
function UploadField({
  label,
  kind,
  value,
  userId,
  onChange,
}: {
  label: string;
  kind: AssetKind;
  value?: string;
  userId: string;
  onChange: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [fileName, setFileName] = useState("");
  const abort = useRef<AbortController | null>(null),
    input = useRef<HTMLInputElement>(null);
  const sizes: Record<AssetKind, number> = {
    image: 5,
    pdf: 50,
    audio: 50,
    video: 250,
  };
  const accepts: Record<AssetKind, string> = {
    image: "image/jpeg,image/png,image/webp",
    pdf: "application/pdf",
    audio: "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm",
    video: "video/mp4,video/webm,video/quicktime",
  };
  useEffect(() => () => abort.current?.abort(), []);
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > sizes[kind] * 1024 * 1024) {
      setError(`Tệp vượt quá ${sizes[kind]} MB. Hãy chọn một tệp nhỏ hơn.`);
      return;
    }
    setFileName(file.name);
    setProgress(0);
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const assetId = await uploadLargeAsset({
        file,
        userId,
        kind,
        title: file.name,
        signal: controller.signal,
        onProgress: (pct) => setProgress(pct),
      });
      onChange(assetId);
      setProgress(100);
    } catch (e) {
      setError(
        controller.signal.aborted
          ? "Đã hủy tải tệp. Bạn có thể thử lại."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  return (
    <div className={styles.uploadField}>
      <div className={styles.uploadLabel}>
        <span>{label}</span>
        {value && !busy && (
          <span>
            <CheckCircle2 size={13} /> Đã lưu tệp
          </span>
        )}
      </div>
      <div className={`${styles.uploadBox} ${value ? styles.uploaded : ""}`}>
        {kind === "image" && value ? (
          <img
            src={assetUrl(value)}
            alt="Ảnh đã tải lên"
            className={styles.uploadImage}
          />
        ) : (
          <div className={styles.uploadGlyph}>
            {kind === "image" ? (
              <ImagePlus />
            ) : kind === "pdf" ? (
              <FileText />
            ) : kind === "audio" ? (
              <Music2 />
            ) : (
              <Film />
            )}
          </div>
        )}
        <div className={styles.uploadText}>
          <strong>
            {busy
              ? `Đang tải lên · ${progress}%`
              : fileName ||
                (value ? "Tệp đã sẵn sàng" : "Chọn tệp từ thiết bị")}
          </strong>
          <small>
            {kind === "image"
              ? "JPG, PNG hoặc WebP"
              : kind === "pdf"
                ? "Tài liệu PDF"
                : kind === "audio"
                  ? "MP3, M4A, WAV, OGG"
                  : "MP4, WebM hoặc MOV"}{" "}
            · tối đa {sizes[kind]} MB
          </small>
          {busy && (
            <div className={styles.progress}>
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={accepts[kind]}
          onChange={choose}
          hidden
          aria-label={label}
        />
        {busy ? (
          <button
            className={styles.smallButton}
            type="button"
            onClick={() => abort.current?.abort()}
          >
            Hủy
          </button>
        ) : (
          <button
            className={styles.smallButton}
            type="button"
            onClick={() => input.current?.click()}
          >
            <Upload size={14} />
            {value ? "Thay tệp" : "Tải lên"}
          </button>
        )}
      </div>
      {value && kind !== "image" && (
        <a
          className={styles.assetLink}
          href={assetUrl(value)}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={12} /> Xem tệp đã tải lên
        </a>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AdminStudio({environment='production'}:{environment?:'preview'|'production'}={}) {
  const [me, setMe] = useState<Me | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("overview"),
    [mobileMenu, setMobileMenu] = useState(false),
    [content, setContent] = useState<Record<Kind, RecordItem[]>>({
      books: [],
      tracks: [],
      videos: [],
      plans: [],
    });
  const [loading, setLoading] = useState(false),
    [loadError, setLoadError] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [bookCategory, setBookCategory] = useState("all");
  const [editor, setEditor] = useState<{ kind: Kind; item: RecordItem } | null>(
      null,
    ),
    [editorTab, setEditorTab] = useState("info"),
    [formError, setFormError] = useState(""),
    [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{
      title: string;
      body: string;
      action: () => Promise<void>;
    } | null>(null),
    [toast, setToast] = useState(""),
    [confirmError, setConfirmError] = useState("");
  const [design, setDesign] = useState<Design>(initialDesign),
    [designData, setDesignData] = useState<DesignResponse>({
      draft: null,
      published: null,
      versions: [],
    }),
    [designDirty, setDesignDirty] = useState(false),
    [designBusy, setDesignBusy] = useState(false),
    [previewMobile, setPreviewMobile] = useState(false),
    [showHistory, setShowHistory] = useState(false);
  const [commerceEnabled,setCommerceEnabled]=useState(false),[commerceChecked,setCommerceChecked]=useState(false);
  const initialNavigation=useRef(false);
  const [adminReturnPath,setAdminReturnPath]=useState('/admin');
  const [verificationBusy,setVerificationBusy]=useState(false),[verificationCooldown,setVerificationCooldown]=useState(0),[verificationNotice,setVerificationNotice]=useState("");
  const [accessChecking,setAccessChecking]=useState(false),[accessError,setAccessError]=useState("");
  const [verificationCode,setVerificationCode]=useState(""),[verificationSubmitting,setVerificationSubmitting]=useState(false);
  const user = me?.user;
  const inform = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [books, tracks, videos, plans, versions] = await Promise.all([
        request<{ items: RecordItem[] }>("/api/admin/content/books"),
        request<{ items: RecordItem[] }>("/api/admin/content/tracks"),
        request<{ items: RecordItem[] }>("/api/admin/content/videos"),
        request<{ items: RecordItem[] }>("/api/admin/content/plans"),
        request<DesignResponse>("/api/admin/design"),
      ]);
      setContent({
        books: books.items,
        tracks: tracks.items,
        videos: videos.items,
        plans: plans.items,
      });
      setDesignData(versions);
      setDesign(
        versions.draft?.settings ||
          versions.published?.settings ||
          initialDesign,
      );
      setDesignDirty(false);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    request<Me>("/api/me")
      .then((result) => {
        setMe(result);
        if (result.user?.isAdmin) void load();
      })
      .catch((e) => setAuthError(e.message))
      .finally(() => setAuthLoading(false));
  }, [load]);
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search),requested=params.get('tab');
    if(requested&&tabs.some(t=>t.id===requested)){
      const action=['add','new'].includes(params.get('action')||'')?'&action=add':'';
      setAdminReturnPath(`/admin?tab=${requested}${action}`);
    }
  },[]);
  useEffect(()=>{
    if(verificationCooldown<=0)return;
    const timer=window.setTimeout(()=>setVerificationCooldown(seconds=>Math.max(0,seconds-1)),1000);
    return()=>window.clearTimeout(timer);
  },[verificationCooldown]);
  async function resendVerification(){
    if(!user||user.emailVerified||verificationBusy||verificationSubmitting||verificationCooldown>0)return;
    setVerificationBusy(true);setAccessError("");setVerificationNotice("");
    try{
      await request('/api/auth/email-otp/send-verification-otp',{method:'POST',body:JSON.stringify({email:user.email,type:'email-verification'})});
      setVerificationCode("");
      setVerificationNotice("Đã yêu cầu gửi mã xác minh. Hãy kiểm tra Hộp thư đến hoặc Spam, rồi nhập mã mới nhất vào ô bên dưới.");
      setVerificationCooldown(60);
    }catch(error){setAccessError((error as Error).message);setVerificationCooldown(10);}
    finally{setVerificationBusy(false);}
  }
  async function verifyAccount(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!user||user.emailVerified||verificationSubmitting||verificationBusy)return;
    const otp=verificationCode.trim();
    if(!/^[0-9]{4,10}$/.test(otp)){setAccessError("Hãy nhập mã số trong email xác minh.");return;}
    setVerificationSubmitting(true);setAccessError("");setVerificationNotice("");
    let confirmed=false;
    try{
      const verified=await request<{status:boolean}>('/api/auth/email-otp/verify-email',{method:'POST',body:JSON.stringify({email:user.email,otp})});
      if(verified.status!==true)throw new Error("Máy chủ chưa xác nhận mã. Hãy thử lại.");
      confirmed=true;setVerificationCode("");
      await request('/api/auth/get-session?disableCookieCache=true');
      const result=await request<Me>('/api/me');setMe(result);setAuthError("");
      if(result.user?.isAdmin){await load();inform("Email đã xác minh. Chào mừng bạn đến Lowf Studio.");}
      else if(result.user?.emailVerified)setVerificationNotice("Email đã được xác minh. Tài khoản này chưa có quyền quản trị; hãy dùng tài khoản chủ website.");
      else setVerificationNotice("Mã đã được xác nhận. Bấm Kiểm tra lại để cập nhật phiên đăng nhập.");
    }catch(error){
      const message=(error as Error).message;
      setAccessError(confirmed?"Email đã được xác minh nhưng chưa tải lại được tài khoản. Bấm Kiểm tra lại, không cần nhập lại mã.":/expired|invalid.*otp|otp.*invalid|verification.*not.*found|otp.*not.*found/i.test(message)?"Mã không đúng hoặc đã hết hạn. Kiểm tra mã mới nhất trong email, hoặc bấm Gửi mã mới.":/too many|too_many|attempt|rate.limit/i.test(message)?"Bạn đã thử nhiều lần. Hãy đợi một lúc rồi yêu cầu mã mới.":message);
    }finally{setVerificationSubmitting(false);}
  }
  async function refreshAccess(){
    if(accessChecking)return;
    setAccessChecking(true);setAccessError("");setVerificationNotice("");
    try{
      await request('/api/auth/get-session?disableCookieCache=true');
      const result=await request<Me>('/api/me');setMe(result);setAuthError("");
      if(result.user?.isAdmin)await load();
      else if(result.user&&!result.user.emailVerified)setVerificationNotice("Email chưa được xác minh. Nhập mã trong email vào ô Mã xác minh bên dưới, rồi bấm Xác minh tài khoản.");
      else if(result.user)setVerificationNotice("Email đã được xác minh. Tài khoản hiện tại chưa có quyền quản trị; hãy đăng nhập bằng tài khoản chủ website.");
      else setVerificationNotice("Bạn chưa đăng nhập. Chọn Đăng nhập hoặc Tạo tài khoản bên dưới.");
    }catch(error){setAccessError((error as Error).message);}
    finally{setAccessChecking(false);}
  }
  useEffect(()=>{
    if(!user?.isAdmin)return;
    request<{config:{enabled:boolean}}>('/api/admin/payments').then(result=>{
      setCommerceEnabled(result.config.enabled===true);setCommerceChecked(true);
    }).catch(()=>setCommerceChecked(false));
  },[user?.isAdmin]);
  useEffect(()=>{
    if(!user?.isAdmin||loading||loadError||initialNavigation.current)return;
    initialNavigation.current=true;
    const params=new URLSearchParams(window.location.search),requested=params.get('tab');
    if(!requested||!tabs.some(t=>t.id===requested))return;
    const next=requested as Tab;setTab(next);
    if(isKind(next)&&['add','new'].includes(params.get('action')||'')){
      setEditor({kind:next,item:freshItem(next)});setEditorTab('info');setFormError('');
    }
  },[user?.isAdmin,loading,loadError]);
  const closeEditor = useCallback(() => {
    if (saving) return;
    setEditor(null);
    setFormError("");
  }, [saving]);
  function nav(next: Tab) {
    if (designDirty && tab === "design" && next !== "design") {
      setConfirm({
        title: "Bạn đang có thay đổi chưa lưu",
        body: "Lưu bản nháp trước khi chuyển mục để giữ các thay đổi giao diện.",
        action: async () => {
          await saveDesign("save");
          setTab(next);
          setMobileMenu(false);
          setQuery("");
          setFilter("all");
          window.history.replaceState(null,'',`/admin?tab=${next}`);
        },
      });
      return;
    }
    setTab(next);
    setMobileMenu(false);
    setQuery("");
    setFilter("all");
    window.history.replaceState(null,'',`/admin?tab=${next}`);
  }
  function openEditor(kind: Kind, item?: RecordItem) {
    setEditor({ kind, item: item ? structuredClone(item) : freshItem(kind) });
    setEditorTab("info");
    setFormError("");
  }
  function patchItem(patch: Partial<RecordItem>) {
    setEditor((prev) =>
      prev ? { ...prev, item: { ...prev.item, ...patch } } : prev,
    );
  }
  function nextEditorStep() {
    if (!editor) return;
    if (editorTab === "info" && (!(editor.kind === "plans" ? editor.item.name : editor.item.title)?.trim() || (editor.kind === "books" && !editor.item.author?.trim()))) {
      setFormError(editor.kind === "books" ? "Hãy nhập tên sách và tác giả để tiếp tục." : "Hãy nhập tên nội dung để tiếp tục.");
      return;
    }
    if (editorTab === "files" && editor.kind === "videos" && editor.item.sourceKind === "youtube" && !youtubeIdFromUrl(editor.item.youtubeUrl)) {
      setFormError("Dán liên kết YouTube hợp lệ, ví dụ https://www.youtube.com/watch?v=… hoặc https://youtu.be/…");
      return;
    }
    setFormError("");
    setEditorTab(editorTab === "info" && editor.kind !== "plans" ? "files" : "publish");
  }
  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    const { kind } = editor;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    // Enter advances the guided form; publication always uses an explicit final action.
    if (editorTab !== "publish" && submitter?.value !== "draft") { nextEditorStep(); return; }
    const action = submitter?.value;
    const explicitStatuses: ItemStatus[] = ["draft", "processing", "needs_review", "ready", "published", "archived", "failed"];
    const item: RecordItem = explicitStatuses.includes(action as ItemStatus)
      ? { ...editor.item, status: action as ItemStatus }
      : editor.item;
    if (
      !(kind === "plans" ? item.name : item.title)?.trim() ||
      (kind === "books" && !item.author?.trim())
    ) {
      setEditorTab("info");
      setFormError(
        kind === "books"
          ? "Hãy nhập tên sách và tác giả."
          : "Hãy nhập tên nội dung trước khi lưu.",
      );
      return;
    }
    if (
      (item.features || []).filter((f) => f.trim()).length > 15 &&
      kind === "plans"
    ) {
      setEditorTab("info");
      setFormError("Mỗi gói có tối đa 15 quyền lợi.");
      return;
    }
    if(kind==='books'&&item.saleEnabled&&((item.price||0)<=0||item.format==='Ebook Free')){
      setEditorTab('info');setFormError(item.format==='Ebook Free'?'Chọn định dạng Ebook, Sách giấy hoặc Combo trước khi mở bán.':'Sách mở bán cần có giá lớn hơn 0.');return;
    }
    if (kind === "videos" && item.sourceKind === "youtube" && (item.status === "published" || item.youtubeUrl?.trim()) && !youtubeIdFromUrl(item.youtubeUrl)) {
      setEditorTab("files");
      setFormError("Liên kết YouTube chưa hợp lệ. Dán liên kết video, Shorts hoặc youtu.be dùng HTTPS.");
      return;
    }
    if (item.status === "published" && kind === "books" && item.format !== "Sách giấy" && !item.pdfAssetId && !chapterCount(item)) {
      setEditorTab("files"); setFormError("Thêm file PDF hoặc nội dung đọc trước khi xuất bản ebook. Bạn vẫn có thể lưu bản nháp."); return;
    }
    if (item.status === "published" && (kind === "tracks" || (kind === "videos" && item.sourceKind !== "youtube")) && !item.assetId) {
      setEditorTab("files"); setFormError(kind === "tracks" ? "Tải file âm thanh trước khi xuất bản." : "Tải file video hoặc chọn dán link YouTube trước khi xuất bản."); return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> =
        kind === "books"
          ? {
              title: item.title,
              author: item.author,
              category: item.category,
              format: item.format,
              price: item.price || 0,
              saleEnabled: !!item.saleEnabled,
              description: item.description || "",
              cover: item.cover,
              coverAssetId: item.coverAssetId,
              pdfAssetId: item.pdfAssetId,
              access: item.access || "free",
              status: item.status || "draft",
              chapters: item.chapters,
              language: item.language || "vi",
              sourceUrl: item.sourceUrl || "",
              licenseLabel: item.licenseLabel || "",
              ...(item.isbn?.trim() ? { isbn: item.isbn.trim() } : {}),
              ...(item.publisher?.trim() ? { publisher: item.publisher.trim() } : {}),
              ...(item.publishedYear ? { publishedYear: Number(item.publishedYear) } : {}),
              ...(item.translator?.trim() ? { translator: item.translator.trim() } : {}),
              ...(item.copyrightStatus ? { copyrightStatus: item.copyrightStatus } : {}),
              ...(item.coverSource?.trim() ? { coverSource: item.coverSource.trim() } : {}),
            }
          : kind === "plans"
            ? {
                name: item.name,
                description: item.description || "",
                price: item.price || 0,
                interval: item.interval || "month",
                features: (item.features || [])
                  .map((f) => f.trim())
                  .filter(Boolean),
                enabled: !!item.enabled && ((item.price || 0) === 0 || commerceEnabled),
                status:
                  item.enabled && ((item.price || 0) === 0 || commerceEnabled)
                    ? "published"
                    : "draft",
              }
            : {
                title: item.title,
                artist: item.artist || "",
                description: item.description || "",
                assetId: item.assetId,
                coverAssetId: item.coverAssetId,
                license: item.license || "",
                source: item.source || "",
                attribution: item.attribution || "",
                access: item.access || "free",
                status: item.status || "draft",
                ...(kind === "videos" ? { sourceKind: item.sourceKind || "upload", youtubeUrl: item.sourceKind === "youtube" ? item.youtubeUrl?.trim() : "" } : {}),
              };
      const path = `/api/admin/content/${kind}${item.id ? "/" + encodeURIComponent(item.id) : ""}`;
      const result = await request<{ item: RecordItem }>(path, {
        method: item.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setContent((prev) => ({
        ...prev,
        [kind]: item.id
          ? prev[kind].map((x) => (x.id === item.id ? result.item : x))
          : [result.item, ...prev[kind]],
      }));
      setEditor(null);
      inform(
        result.item.status === "published"
          ? "Đã lưu và xuất bản nội dung."
          : "Đã lưu nội dung trên máy chủ.",
      );
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function archive(kind: Kind, item: RecordItem) {
    setConfirm({
      title: `Lưu trữ “${titleOf(item)}”?`,
      body: "Nội dung sẽ được ẩn khỏi website. Tệp gốc và bản ghi vẫn được giữ để bạn có thể chỉnh sửa hoặc xuất bản lại.",
      action: async () => {
        await request(
          `/api/admin/content/${kind}/${encodeURIComponent(item.id)}`,
          { method: "DELETE" },
        );
        setContent((prev) => ({
          ...prev,
          [kind]: prev[kind].map((x) =>
            x.id === item.id
              ? {
                  ...x,
                  status: "archived",
                  ...(kind === "plans" ? { enabled: false } : {}),
                }
              : x,
          ),
        }));
        inform("Đã chuyển nội dung vào lưu trữ.");
      },
    });
  }
  async function saveDesign(action: "save" | "publish", versionId?: string) {
    setDesignBusy(true);
    try {
      let selected = versionId;
      if (action === "publish" && designDirty) {
        const saved = await request<DesignResponse>("/api/admin/design", {
          method: "POST",
          body: JSON.stringify({ action: "save", settings: design }),
        });
        setDesignData(saved);
        selected = saved.draft?.id;
      }
      const result = await request<DesignResponse>("/api/admin/design", {
        method: "POST",
        body: JSON.stringify(
          action === "save"
            ? { action, settings: design }
            : { action, versionId: selected },
        ),
      });
      setDesignData(result);
      setDesign(result.draft?.settings || result.published?.settings || design);
      setDesignDirty(false);
      inform(
        action === "publish"
          ? "Giao diện mới đã được xuất bản."
          : "Đã lưu bản nháp. Website đang hiển thị chưa thay đổi.",
      );
    } catch (e) {
      inform((e as Error).message);
      throw e;
    } finally {
      setDesignBusy(false);
    }
  }
  async function openDesignPreview(){
    const preview=window.open('','_blank');
    if(preview){preview.opener=null;preview.document.body.textContent='Đang lưu bản nháp và mở bản xem trước…';}
    try{await saveDesign('save');if(preview)preview.location.replace('/?designPreview=1');else window.location.assign('/?designPreview=1');}
    catch{preview?.close();}
  }
  function changeDesign(next: Design) {
    setDesign(next);
    setDesignDirty(true);
  }
  function applyPreset(preset:typeof designPresets[number]){
    const apply=()=>{changeDesign({...design,palette:{...preset.palette},font:preset.font,radius:preset.radius,decor:{...defaultDecor,...(design.decor||{}),preset:preset.id}});inform(`Đã áp dụng ${preset.name} vào bản nháp. Lưu và xuất bản khi bạn sẵn sàng.`);};
    if(designDirty){setConfirm({title:`Dùng giao diện ${preset.name}?`,body:'Màu sắc, phông chữ và độ bo góc đang chỉnh sẽ được thay bằng mẫu đã chọn. Nội dung và thứ tự các phần vẫn được giữ.',action:async()=>apply()});}
    else apply();
  }
  function moveSection(index: number, direction: number) {
    const sections = [...design.sections];
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    changeDesign({ ...design, sections });
  }
  async function signOut() {
    await request("/api/auth/sign-out", { method: "POST", body: "{}" });
    window.location.assign("/");
  }
  const totalPublished = ["books", "tracks", "videos"].reduce(
    (sum, kind) =>
      sum +
      content[kind as Kind].filter((x) => x.status === "published").length,
    0,
  );

  if (authLoading)
    return (
      <div className={styles.loadingPage}>
        <span className={styles.loadingLogo}>
          <Leaf size={26} /> Lowf.
        </span>
        <LoaderCircle className={styles.spin} size={25} />
        <p>Đang mở không gian quản trị…</p>
      </div>
    );
  if (!user?.isAdmin)
    return (
      <div className={styles.accessPage}>
        <a href="/" className={styles.brand}>
          <span>
            <Leaf size={23} />
          </span>
          Lowf<span className={styles.brandDot}>.</span>
        </a>
        <div className={styles.accessCard}>
          <span className={styles.accessIcon}>
            <ShieldCheck size={30} />
          </span>
          <p className={styles.eyebrow}>KHÔNG GIAN CỦA NGƯỜI SÁNG TẠO</p>
          <h1>
            {!user
              ? "Chào mừng trở lại."
              : !user.emailVerified
                ? "Xác minh email để tiếp tục."
                : "Đây là không gian quản trị."}
          </h1>
          <p>
            {authError ||
              (!user
                ? "Đăng nhập bằng tài khoản chủ website để quản lý sách, âm nhạc và thiết kế Lowf."
                : !user.emailVerified
                  ? "Bạn đã đăng nhập. Nếu email có mã xác minh, nhập mã ngay bên dưới. Không cần tìm liên kết trong thư."
                  : "Tài khoản hiện tại chưa có quyền quản trị. Chỉ tài khoản chủ website đã xác minh email mới có quyền thay đổi nội dung.")}
          </p>
          {(!user||!user.emailVerified)&&<ol className={styles.accessSteps}>
            <li><strong>{user?"Đã đăng nhập":"Đăng nhập hoặc tạo tài khoản"}</strong><span>{user?"Tài khoản của bạn đã được tạo.":"Dùng email chủ website đã được cấu hình. Đã có tài khoản thì chọn Đăng nhập."}</span></li>
            <li><strong>Xác minh email</strong><span>Nhập mã trong email và bấm Xác minh tài khoản. Chỉ yêu cầu mã mới khi mã cũ đã hết hạn hoặc chưa nhận được.</span></li>
            <li><strong>Vào Lowf Studio</strong><span>Chọn Sách & Ebook → Thêm sách để tải bìa và PDF.</span></li>
          </ol>}
          {user&&!user.emailVerified&&<form className={styles.verificationForm} onSubmit={verifyAccount}>
            <p>Mã xác minh cho <strong>{user.email}</strong></p>
            <label htmlFor="ownerVerificationCode">Mã xác minh</label>
            <input id="ownerVerificationCode" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" autoCapitalize="off" spellCheck={false} pattern="[0-9]{4,10}" maxLength={10} required value={verificationCode} onChange={event=>setVerificationCode(event.target.value.replace(/\s/g,''))} placeholder="Nhập mã trong email" aria-describedby="ownerVerificationHelp" disabled={verificationSubmitting}/>
            <small id="ownerVerificationHelp">Nếu đã có mã, nhập ngay. Bấm Gửi mã mới sẽ yêu cầu một mã thay thế.</small>
            <button type="submit" className={`${styles.primary} ${styles.verifyButton}`} disabled={verificationSubmitting||verificationBusy}>
              {verificationSubmitting?<LoaderCircle className={styles.spin} size={17}/>:<ShieldCheck size={17}/>}
              {verificationSubmitting?"Đang xác minh…":"Xác minh tài khoản"}
            </button>
            <button type="button" className={`${styles.secondary} ${styles.verifyButton}`} onClick={resendVerification} disabled={verificationBusy||verificationSubmitting||verificationCooldown>0}>
              {verificationBusy?<LoaderCircle className={styles.spin} size={17}/>:<RefreshCw size={17}/>}
              {verificationBusy?"Đang gửi mã…":verificationCooldown>0?`Gửi lại sau ${verificationCooldown}s`:"Gửi mã mới"}
            </button>
            <a className={styles.backLink} href={`/?auth=reset-code&next=${encodeURIComponent(adminReturnPath)}`}>Mã trong thư dùng để đặt lại mật khẩu?</a>
          </form>}
          {accessError&&<p className={styles.accessError} role="alert"><CircleAlert size={16}/>{accessError}</p>}
          {verificationNotice&&<p className={styles.accessNotice} role="status">{verificationNotice}</p>}
          <div className={styles.accessActions}>
            <a href={!user?`/?auth=login&next=${encodeURIComponent(adminReturnPath)}`:"/?view=profile"} className={!user?styles.primary:styles.secondary}>
              <ArrowRight size={17} />{" "}
              {!user ? "Đăng nhập" : "Mở tài khoản"}
            </a>
            {!user?<a className={styles.secondary} href={`/?auth=signup&next=${encodeURIComponent(adminReturnPath)}`}><Plus size={17}/> Tạo tài khoản</a>:<button
              type="button"
              onClick={refreshAccess}
              disabled={accessChecking}
              className={styles.secondary}
            >
              {accessChecking?<LoaderCircle className={styles.spin} size={16}/>:<RefreshCw size={16}/>}{accessChecking?"Đang kiểm tra…":"Kiểm tra lại"}
            </button>}
          </div>
          {!user&&<><a className={styles.backLink} href={`/?auth=otp-signin&next=${encodeURIComponent(adminReturnPath)}`}>Đăng nhập nhanh không mật khẩu (Mã Email 6 số)</a><a className={styles.backLink} href={`/?auth=verify&next=${encodeURIComponent(adminReturnPath)}`}>Tôi đã có mã xác minh email</a><a className={styles.backLink} href={`/?auth=forgot&next=${encodeURIComponent(adminReturnPath)}`}>Đã có tài khoản nhưng quên mật khẩu?</a></>}
          {!user&&authError&&<button type="button" className={styles.secondary} disabled={accessChecking} onClick={refreshAccess}><RefreshCw size={16}/> Thử kiểm tra lại</button>}
          <a className={styles.backLink} href="/">
            <ArrowLeft size={14} /> Trở về không gian đọc
          </a>
        </div>
        <small>Lowf Studio · Sách hay bắt đầu từ những người chăm chút.</small>
      </div>
    );

  return (
    <div className={styles.shell}>
      {mobileMenu && (
        <button
          className={styles.mobileScrim}
          onClick={() => setMobileMenu(false)}
          aria-label="Đóng điều hướng"
        />
      )}
      <aside
        className={`${styles.sidebar} ${mobileMenu ? styles.sidebarOpen : ""}`}
      >
        <a href="/" className={styles.brand}>
          <span>
            <Leaf size={23} />
          </span>
          Lowf<span className={styles.brandDot}>.</span>
        </a>
        <div className={styles.studioBadge}>
          STUDIO <span>QUẢN TRỊ</span>
        </div>
        <p className={styles.navLabel}>TỔNG QUAN</p>
        <nav className={styles.nav}>
          {tabs.filter(t => t.id === "overview").map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? styles.navActive : ""}
              onClick={() => nav(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {tab === id && <ChevronRight size={15} className={styles.navArrow} />}
            </button>
          ))}
        </nav>
        <p className={styles.navLabel}>NỘI DUNG &amp; THƯ VIỆN</p>
        <nav className={styles.nav}>
          {tabs.filter(t => ["books", "tracks", "videos"].includes(t.id)).map(({ id, label, icon: Icon }) => {
            const count = content[id as Kind]?.filter(x => x.status !== "archived").length ?? 0;
            return (
              <button
                key={id}
                className={tab === id ? styles.navActive : ""}
                onClick={() => nav(id)}
                aria-current={tab === id ? "page" : undefined}
              >
                <Icon size={18} />
                {label}
                <span className={styles.navCount}>{count}</span>
              </button>
            );
          })}
        </nav>
        <p className={styles.navLabel}>GIAO DIỆN &amp; BÁN HÀNG</p>
        <nav className={styles.nav}>
          {tabs.filter(t => ["design", "plans", "orders", "payments", "auth"].includes(t.id)).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? styles.navActive : ""}
              onClick={() => nav(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {id === "design" && <span className={styles.navNew}>Live</span>}
              {id === "plans" && (
                <span className={styles.navCount}>
                  {content.plans.filter(x => x.status !== "archived").length}
                </span>
              )}
              {tab === id && id !== "design" && id !== "plans" && <ChevronRight size={15} className={styles.navArrow} />}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <a href="/" target="_blank" rel="noreferrer" className={styles.sidebarCta}>
            <Eye size={16} /> Mở website xem thực tế <ArrowUpRight size={15} />
          </a>
          <a
            className={styles.wordpressLink}
            href="/huong-dan.html"
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={16} /> Hướng dẫn quản trị <ExternalLink size={12} />
          </a>
          <div className={styles.owner}>
            <span className={styles.avatar}>
              {user.name
                ?.split(" ")
                .slice(-2)
                .map((n) => n[0])
                .join("") || "L"}
            </span>
            <div>
              <strong>{user.name || "Chủ website"}</strong>
              <small>
                <ShieldCheck size={10} /> Quản trị viên
              </small>
            </div>
            <button
              onClick={() => void signOut().catch((e) => inform(e.message))}
              className={styles.iconButton}
              aria-label="Đăng xuất"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={`${styles.iconButton} ${styles.mobileMenuButton}`}
            onClick={() => setMobileMenu(true)}
            aria-label="Mở điều hướng"
          >
            <Menu size={21} />
          </button>
          <div className={styles.breadcrumb}>
            Lowf Studio <ChevronRight size={12} />
            <strong>{tabs.find((t) => t.id === tab)?.label}</strong>
          </div>
          <div className={styles.topActions}>
            <span className={styles.verified}>
              <span /> Tài khoản đã xác minh
            </span>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className={styles.viewSite}
            >
              <Eye size={15} /> Xem website <ArrowUpRight size={14} />
            </a>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.environmentNotice}>
            <div><strong>{environment==='preview'?'Staging / Preview · Môi trường thử nghiệm':'Website chính · Production (lowflibray.com)'}</strong><span>{environment==='preview'?'Dữ liệu và kho R2 thử nghiệm tách riêng hoàn toàn. Xuất bản tại đây không ảnh hưởng website chính thức.':'Lưu nháp hoặc gắn Cần rà soát để xem riêng; chỉ bấm Xuất bản khi bạn duyệt cho độc giả xem.'}</span></div>
            <a href={environment==='preview'?'https://www.lowflibray.com/admin':'/admin?tab=overview'} target={environment==='preview'?'_blank':undefined} rel={environment==='preview'?'noopener noreferrer':undefined}>{environment==='preview'?'Mở quản trị website chính':'Trung tâm vận hành Lowf'} <ArrowUpRight size={15}/></a>
          </div>
          {loadError && (
            <div className={styles.errorBanner} role="alert">
              <CircleAlert size={18} />
              <span>{loadError}</span>
              <button onClick={() => void load()}>Thử lại</button>
            </div>
          )}
          {loading ? (
            <div className={styles.loadingBlock}>
              <LoaderCircle className={styles.spin} />
              <span>Đang tải nội dung của bạn…</span>
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <>
                  <div className={styles.pageHeading}>
                    <div>
                      <p className={styles.eyebrow}>CHÀO CHỦ NHÂN LOWF</p>
                      <h1>Hôm nay bạn muốn chăm chút gì?</h1>
                      <p>
                        Quản lý toàn bộ sách, âm nhạc, giao diện 4 mùa và hệ
                        thống đăng nhập tại một nơi duy nhất.
                      </p>
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => openEditor("books")}
                    >
                      <Plus size={17} /> Thêm sách mới ngay
                    </button>
                  </div>
                  <div className={styles.kpiGrid4}>
                    {(["books", "tracks", "videos"] as Kind[]).map((kind) => (
                      <button
                        key={kind}
                        onClick={() => nav(kind)}
                        className={styles.kpiCard}
                      >
                        <small>{labels[kind].plural}</small>
                        <strong>
                          {
                            content[kind].filter((x) => x.status !== "archived")
                              .length
                          }
                        </strong>
                        <span>
                          {
                            content[kind].filter((x) => x.status === "published")
                              .length
                          }{" "}
                          đang hiển thị
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => nav("design")}
                      className={styles.kpiCard}
                    >
                      <small>Giao diện &amp; 12 Mùa</small>
                      <strong>12</strong>
                      <span>Chủ đề mùa &amp; Biểu tượng 3D</span>
                    </button>
                  </div>
                  <OperationsHealthPanel onNavigateBooks={() => nav("books")} />
                  <section
                    className={styles.panel}
                    aria-label="Thao tác nhanh cho chủ website"
                  >
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>Thao tác nhanh cho chủ website</h2>
                        <p>
                          Bấm 1 nút để thêm nội dung mới hoặc đổi toàn bộ phong
                          cách theo mùa cho website.
                        </p>
                      </div>
                      <a className={styles.secondary} href="/api/admin/source">
                        <CloudUpload size={15} /> Tải mã nguồn
                      </a>
                    </div>
                    <div className={styles.quickGrid4}>
                      <button
                        className={styles.quickCard}
                        onClick={() => openEditor("books")}
                      >
                        <BookOpen size={19} />
                        <strong>Thêm cuốn sách mới</strong>
                        <small>Ảnh bìa, file PDF, giá bán &amp; quyền đọc</small>
                      </button>
                      <button
                        className={styles.quickCard}
                        onClick={() => nav("design")}
                      >
                        <Paintbrush size={19} />
                        <strong>Đổi màu &amp; Trang trí 4 Mùa</strong>
                        <small>Xuân, Hạ, Thu, Đông, Tết &amp; hiệu ứng rơi</small>
                      </button>
                      <button
                        className={styles.quickCard}
                        onClick={() => openEditor("videos")}
                      >
                        <Film size={19} />
                        <strong>Thêm Video / Nhạc</strong>
                        <small>Dán link YouTube hoặc tải tệp âm thanh</small>
                      </button>
                      <button
                        className={styles.quickCard}
                        onClick={() => nav("auth")}
                      >
                        <ShieldCheck size={19} />
                        <strong>Đăng nhập &amp; Bảo mật</strong>
                        <small>Google 1 chạm, Mã Email không mật khẩu</small>
                      </button>
                    </div>
                    <div className={styles.authSecurityBox}>
                      <div>
                        <strong>
                          <ShieldCheck size={15} /> Hệ thống Đăng nhập tiên tiến
                          đã sẵn sàng
                        </strong>
                        <p>
                          Chủ website đang đăng nhập: <b>{user.email}</b> (Đã
                          xác minh email).{" "}
                          {commerceChecked
                            ? commerceEnabled
                              ? "Thanh toán VNPAY Production đã sẵn sàng."
                              : "Thanh toán VNPAY đang ở chế độ chờ thiết lập."
                            : ""}
                        </p>
                      </div>
                      <div className={styles.authMethodPills}>
                        <span>✓ Google OAuth 1 chạm</span>
                        <span>✓ Mã Email 6 số (Không mật khẩu)</span>
                        <span>✓ Email + Mật khẩu có nút mắt</span>
                        <span>✓ Khóa quyền /admin riêng chủ web</span>
                      </div>
                    </div>
                  </section>
                  <section className={styles.panel}>
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>Sách mới nhất trong thư viện</h2>
                        <p>
                          {totalPublished} nội dung đã xuất bản ·{" "}
                          {
                            content.books.filter((x) => x.status === "draft")
                              .length
                          }{" "}
                          cuốn sách đang ở bản nháp
                        </p>
                      </div>
                      <button
                        className={styles.secondary}
                        onClick={() => nav("books")}
                      >
                        Xem tất cả ({content.books.length}){" "}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {content.books.slice(0, 6).length ? (
                      <div className={styles.recentList}>
                        {content.books.slice(0, 6).map((b) => (
                          <div key={b.id} className={styles.recentRow}>
                            <span className={styles.recentThumb}>
                              {b.coverAssetId || b.cover ? (
                                <img
                                  src={
                                    b.coverAssetId
                                      ? assetUrl(b.coverAssetId)
                                      : b.cover
                                  }
                                  alt=""
                                />
                              ) : (
                                <BookOpen size={18} />
                              )}
                            </span>
                            <div className={styles.recentInfo}>
                              <strong>{titleOf(b)}</strong>
                              <small>
                                {b.author || "Chưa có tác giả"} ·{" "}
                                {b.format || "Ebook Free"}
                                {chapterCount(b) > 0
                                  ? ` · ${chapterCount(b)} chương`
                                  : ""}
                              </small>
                            </div>
                            <StateBadge item={b} />
                            <button
                              className={styles.secondary}
                              onClick={() => openEditor("books", b)}
                            >
                              <Pencil size={14} /> Sửa
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.empty}>
                        <BookOpen />
                        <h3>Thư viện đang chờ cuốn sách đầu tiên</h3>
                        <p>
                          Thêm sách và lưu bản nháp trước khi chia sẻ với độc
                          giả.
                        </p>
                        <button
                          onClick={() => openEditor("books")}
                          className={styles.primary}
                        >
                          <Plus size={16} /> Thêm sách
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}
              {isKind(tab) && (
                <>
                  <div className={styles.pageHeading}>
                    <div>
                      <p className={styles.eyebrow}>THƯ VIỆN CỦA BẠN</p>
                      <h1>{labels[tab].plural}</h1>
                      <p>{labels[tab].description}</p>
                    </div>
                    <button
                      className={styles.primary}
                      onClick={() => openEditor(tab)}
                    >
                      <Plus size={17} /> Thêm {labels[tab].single}
                    </button>
                  </div>
                  {tab === "books" && (
                    <>
                      <LocalLibrarySyncPanel
                        userId={user.id}
                        existingIds={content.books.filter((b) => b.status === "published" || b.status === "draft").map((b) => b.id)}
                        existingCoverMap={Object.fromEntries(
                          content.books
                            .filter((b) => (b.status === "published" || b.status === "draft") && typeof b.coverAssetId === "string" && b.coverAssetId)
                            .map((b) => [b.id, String(b.coverAssetId)])
                        )}
                        onSynced={(synced) => {
                          if (synced.length) {
                            setContent((prev) => {
                              const map = new Map<string, RecordItem>();
                              for (const item of prev.books) map.set(item.id, item);
                              for (const item of synced) map.set(item.id, item);
                              return { ...prev, books: Array.from(map.values()) };
                            });
                            inform(`✨ Đã đồng bộ ${synced.length} cuốn sách lên thư viện chính!`);
                          }
                        }}
                      />
                      <BulkPdfImporter
                        userId={user.id}
                        onDone={(created) => {
                          if (created.length) {
                            setContent((prev) => ({
                              ...prev,
                              books: [...created, ...prev.books],
                            }));
                            inform(`✨ Đã nhập thành công ${created.length} cuốn sách vào thư viện!`);
                          }
                        }}
                      />
                      <div className={styles.notice} style={{ marginTop: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Trash2 size={18} />
                          <div>
                            <strong>Dọn sạch sách mẫu cũ &amp; sách ngắn dưới 20 trang</strong>
                            <p style={{ margin: "2px 0 0" }}>
                              Ẩn toàn bộ 24 cuốn sách minh họa cũ và các sách chữ ngắn dưới 20 trang để chỉ giữ lại đầu sách đạt chuẩn.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => {
                            setConfirm({
                              title: "Ẩn toàn bộ sách mẫu cũ & sách dưới 20 trang?",
                              body: "Toàn bộ 24 cuốn sách minh họa cũ và các sách chữ ngắn dưới 20 trang sẽ được chuyển vào mục Lưu trữ. Bạn vẫn có thể khôi phục bất kỳ lúc nào.",
                              action: async () => {
                                const res = await request<{ archivedCount: number; archivedIds: string[] }>(
                                  "/api/admin/content/cleanup-samples",
                                  { method: "POST", body: JSON.stringify({ includeShortText: true }) }
                                );
                                if (res.archivedIds?.length) {
                                  const idSet = new Set(res.archivedIds);
                                  setContent((prev) => ({
                                    ...prev,
                                    books: prev.books.map((bk) =>
                                      idSet.has(bk.id) ? { ...bk, status: "archived" } : bk
                                    ),
                                  }));
                                }
                                inform(
                                  res.archivedCount
                                    ? `🧹 Đã ẩn ${res.archivedCount} cuốn sách mẫu cũ & sách dưới 20 trang!`
                                    : "Thư viện đã sạch — không còn sách mẫu cũ hay sách ngắn nào."
                                );
                              },
                            });
                          }}
                        >
                          <Trash2 size={14} /> Ẩn sách mẫu cũ &amp; sách &lt;20 trang
                        </button>
                      </div>
                    </>
                  )}
                  {tab === "plans" && (
                    <div className={styles.notice}>
                      <CreditCard size={20} />
                      <div>
                        <strong>
                          Chuẩn bị gói của bạn, mở bán khi sẵn sàng.
                        </strong>
                        <p>
                          {commerceEnabled?'VNPAY production đã được cấu hình. Bạn có thể mở gói trả phí sau khi kiểm tra sản phẩm và luồng thanh toán.':'Gói miễn phí có thể mở đăng ký ngay. Gói trả phí cần VNPAY production được cấu hình trước khi mở bán.'} Mỗi lần thanh toán cấp thời hạn tương ứng; không tự trừ tiền gia hạn.
                        </p>
                        <button className={styles.textButton} onClick={()=>nav('payments')}>Mở thiết lập VNPAY <ArrowRight size={13}/></button>
                      </div>
                    </div>
                  )}
                  <div className={styles.listToolbar}>
                    <label className={styles.search}>
                      <Search size={17} />
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Tìm ${labels[tab].single} theo tên…`}
                        aria-label={`Tìm ${labels[tab].single}`}
                      />
                    </label>
                    {tab === "books" && (
                      <select
                        className={styles.categorySelect}
                        value={bookCategory}
                        onChange={(e) => setBookCategory(e.target.value)}
                        aria-label="Lọc theo thể loại sách"
                      >
                        <option value="all">Tất cả thể loại</option>
                        <option value="marketing">Bán hàng &amp; Marketing</option>
                        <option value="kinhte">Kinh tế &amp; Đầu tư</option>
                        <option value="kynang">Phát triển bản thân</option>
                        <option value="tamly">Tâm lý &amp; Tư duy</option>
                        <option value="phapluat">Pháp luật &amp; Chính trị</option>
                        <option value="ngoaingu">Ngoại ngữ &amp; Tiếng Anh</option>
                        <option value="lichsu">Lịch sử &amp; Văn minh</option>
                        <option value="khoahoc">Khoa học &amp; Công nghệ</option>
                        <option value="vanhocvn">Văn học Việt Nam</option>
                        <option value="vanhocqt">Văn học nước ngoài</option>
                        <option value="tieuthuyet">Tiểu thuyết &amp; Kỳ ảo</option>
                        <option value="truyentranh">Truyện tranh &amp; Manga</option>
                        <option value="tamlinh">Tôn giáo &amp; Tâm linh</option>
                        <option value="trinhtham">Trinh thám &amp; Kinh dị</option>
                        <option value="dacbiet">Tuyển chọn Lowf</option>
                      </select>
                    )}
                    <div className={styles.filterTabs}>
                      {[
                        ["all", "Tất cả"],
                        ["published", "Đang hiển thị"],
                        ["needs_review", "Cần rà soát"],
                        ["ready", "Sẵn sàng"],
                        ["draft", "Bản nháp"],
                        ["archived", "Lưu trữ"],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          className={filter === id ? styles.filterActive : ""}
                          onClick={() => setFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ContentList
                    kind={tab}
                    items={content[tab].filter(
                      (item) =>
                        (tab !== "books" ||
                          bookCategory === "all" ||
                          item.category === bookCategory) &&
                        `${titleOf(item)} ${item.author || ""}`
                          .toLocaleLowerCase("vi")
                          .includes(query.toLocaleLowerCase("vi")) &&
                        (filter === "all" ||
                          (item.status === "archived"
                            ? "archived"
                            : tab === "plans"
                              ? item.enabled
                                ? "published"
                                : "draft"
                              : item.status || "draft") === filter),
                    )}
                    onEdit={(item) => openEditor(tab, item)}
                    onArchive={(item) => archive(tab, item)}
                    onAdd={() => openEditor(tab)}
                  />
                </>
              )}
              {tab==='payments'&&<PaymentSettingsPanel onReadinessChange={enabled=>{setCommerceEnabled(enabled);setCommerceChecked(true)}}/>}
              {tab==='orders'&&<OrdersPanel/>}
              {tab === "auth" && (
                <>
                  <div className={styles.pageHeading}>
                    <div>
                      <p className={styles.eyebrow}>AN TOÀN &amp; TIỆN LỢI</p>
                      <h1>Hệ thống Đăng nhập &amp; Bảo mật</h1>
                      <p>
                        Tài khoản quản trị hiện tại: <strong>{user.email}</strong>{" "}
                        (Đã xác minh email).
                      </p>
                    </div>
                    <a
                      href="/?auth=login"
                      target="_blank"
                      rel="noreferrer"
                      className={styles.primary}
                    >
                      Mở màn hình Đăng nhập <ArrowUpRight size={15} />
                    </a>
                  </div>
                  <AuthOverviewPanel />
                  <section className={styles.panel}>
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>3 Phương thức đăng nhập hiện đại trên Lowf</h2>
                        <p>
                          Độc giả và chủ website có thể chọn cách đăng nhập nhanh
                          nhất, đầy đủ báo lỗi tiếng Việt.
                        </p>
                      </div>
                      <ShieldCheck size={20} />
                    </div>
                    <div className={styles.authMethodsGrid}>
                      <div className={styles.quickCard}>
                        <strong>1. Google OAuth 1 chạm</strong>
                        <small>
                          Đăng nhập nhanh bằng tài khoản Google. Đã tích hợp sẵn
                          trao đổi phiên tự động và quay đúng trang quản trị.
                        </small>
                      </div>
                      <div className={styles.quickCard}>
                        <strong>2. Mã Email 6 số (Không mật khẩu)</strong>
                        <small>
                          Không cần nhớ mật khẩu. Nhập Email → nhận mã OTP 6 số →
                          vào thẳng website. Hoạt động sẵn ngay trên Neon Auth.
                        </small>
                      </div>
                      <div className={styles.quickCard}>
                        <strong>3. Email + Mật khẩu chuẩn bảo mật</strong>
                        <small>
                          Có nút mắt hiện/ẩn mật khẩu, tự chuyển sang màn hình
                          xác minh OTP nếu email chưa xác minh và hỗ trợ đặt lại
                          mật khẩu bằng mã.
                        </small>
                      </div>
                    </div>
                  </section>
                  <section className={styles.panel}>
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>Cách bật Google 1 chạm trên tên miền thật (1 phút)</h2>
                        <p>
                          Mã Email 6 số và Email + Mật khẩu đã chạy sẵn. Để bật
                          thêm nút Google OAuth cho mọi độc giả:
                        </p>
                      </div>
                    </div>
                    <ol className={styles.authStepsList}>
                      <li>
                        Mở <strong>Neon Console</strong> → chọn cơ sở dữ liệu
                        của Lowf → vào mục <strong>Auth → Social Providers</strong>.
                      </li>
                      <li>
                        Bật công tắc <strong>Google</strong> (dùng Google
                        Credentials của Neon hoặc điền OAuth Client ID / Secret
                        của bạn).
                      </li>
                      <li>
                        Thêm địa chỉ <code>https://www.lowflibray.com</code> vào{" "}
                        <strong>Trusted Origins / Redirect URLs</strong> là hoàn
                        tất.
                      </li>
                    </ol>
                  </section>
                </>
              )}
              {tab === "design" && (
                <>
                  <div className={styles.pageHeading}>
                    <div>
                      <p className={styles.eyebrow}>
                        THIẾT KẾ THEO CÁCH CỦA BẠN
                      </p>
                      <h1>Một thế giới mang tên Lowf.</h1>
                      <p>
                        Chỉnh từng chi tiết, xem trước và xuất bản khi bạn thấy
                        hài lòng.
                      </p>
                    </div>
                    <div className={styles.headingButtons}>
                      <button
                        className={styles.secondary}
                        disabled={designBusy}
                        onClick={() => void saveDesign("save").catch(() => {})}
                      >
                        {designBusy ? (
                          <LoaderCircle className={styles.spin} size={16} />
                        ) : (
                          <Save size={16} />
                        )}{" "}
                        Lưu bản nháp
                      </button>
                      <button className={styles.secondary} disabled={designBusy} onClick={()=>void openDesignPreview()}><Eye size={16}/> Xem bản nháp trên website</button>
                      <button
                        className={styles.primary}
                        disabled={designBusy}
                        onClick={() =>
                          setConfirm({
                            title: "Xuất bản giao diện này?",
                            body: "Mọi người sẽ thấy phiên bản mới sau khi tải lại website. Bạn có thể khôi phục một phiên bản trước đó bất cứ lúc nào.",
                            action: async () => {
                              await saveDesign("publish");
                            },
                          })
                        }
                      >
                        <ArrowUpRight size={16} /> Xuất bản
                      </button>
                    </div>
                  </div>
                  <div className={styles.panel} style={{ marginBottom: 18 }}>
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>Chủ đề 12 Mùa &amp; Cảnh rơi (1 chạm đổi Màu + Tranh + Hiệu ứng rơi)</h2>
                        <p>Chỉ chủ website có quyền đổi giao diện; sau khi bấm Xuất bản, mọi độc giả sẽ thấy ngay mùa bạn chọn.</p>
                      </div>
                    </div>
                    <div className={styles.presetGrid} aria-label="Chủ đề 4 mùa">
                      {seasonPresets.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          className={styles.presetCard}
                          disabled={designBusy}
                          style={
                            (design.decor?.season || "spring") === sp.id
                              ? { borderColor: "var(--green)", background: "var(--mint)" }
                              : undefined
                          }
                          onClick={() => {
                            changeDesign({
                              ...design,
                              palette: { ...sp.palette },
                              decor: {
                                ...defaultDecor,
                                ...(design.decor || {}),
                                season: sp.id,
                                preset: sp.id,
                                petals: true,
                                fxLevel: "vivid",
                                stars: "bright",
                                aurora: true,
                              },
                            });
                            inform(`Đã áp dụng chủ đề ${sp.icon} ${sp.name} vào bản nháp.`);
                          }}
                        >
                          <span className={styles.presetSwatches}>
                            <span style={{ background: sp.palette.background }} />
                            <span style={{ background: sp.palette.primary }} />
                            <span style={{ background: sp.palette.text }} />
                          </span>
                          <strong>{sp.icon} {sp.name}</strong>
                          <small>{sp.desc}</small>
                          <span>Chọn mùa này <ArrowRight size={13} /></span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className={styles.presetGrid} aria-label="Mẫu giao diện">
                    {designPresets.map(preset=><button key={preset.id} className={styles.presetCard} onClick={()=>applyPreset(preset)} disabled={designBusy}>
                      <span className={styles.presetSwatches}>{Object.values(preset.palette).map((color,i)=><span key={i} style={{background:color}}/>)}</span>
                      <strong>{preset.name}</strong><small>{preset.description}</small><span>Dùng cho bản nháp <ArrowRight size={13}/></span>
                    </button>)}
                  </div>
                  <p className={styles.designScope}>Bạn có thể đổi màu, phông chữ, banner và thứ tự các phần ở đây. Thêm loại trang hoặc tính năng mới cần chỉnh mã nguồn.</p>
                  <div className={styles.designStatus}>
                    <span
                      className={
                        designDirty ? styles.unsavedDot : styles.savedDot
                      }
                    />
                    {designDirty
                      ? "Có thay đổi chưa lưu"
                      : designData.draft
                        ? "Đang chỉnh sửa bản nháp"
                        : "Đang xem giao diện hiện tại"}
                    <button onClick={() => setShowHistory(!showHistory)}>
                      Lịch sử phiên bản <ChevronRight size={12} />
                    </button>
                  </div>
                  {showHistory && (
                    <div className={styles.versionList}>
                      {designData.versions.length ? (
                        designData.versions.map((v) => (
                          <div key={v.id}>
                            <span>
                              <strong>
                                {v.status === "published"
                                  ? "Đã xuất bản"
                                  : "Bản thiết kế"}
                              </strong>
                              <small>{date(v.createdAt)}</small>
                            </span>
                            <button
                              className={styles.smallButton}
                              onClick={() =>
                                setConfirm({
                                  title: "Khôi phục phiên bản này?",
                                  body: `Giao diện được lưu lúc ${date(v.createdAt)} sẽ được xuất bản lại.`,
                                  action: async () => {
                                    const result =
                                      await request<DesignResponse>(
                                        "/api/admin/design",
                                        {
                                          method: "POST",
                                          body: JSON.stringify({
                                            action: "restore",
                                            versionId: v.id,
                                          }),
                                        },
                                      );
                                    setDesignData(result);
                                    setDesign(
                                      result.draft?.settings ||
                                        result.published?.settings ||
                                        initialDesign,
                                    );
                                    setDesignDirty(false);
                                    inform("Đã khôi phục giao diện.");
                                  },
                                })
                              }
                            >
                              Khôi phục
                            </button>
                          </div>
                        ))
                      ) : (
                        <p>
                          Phiên bản đầu tiên sẽ xuất hiện sau khi bạn lưu thiết
                          kế.
                        </p>
                      )}
                    </div>
                  )}
                  <div className={styles.designGrid}>
                    <div className={styles.designControls}>
                      <section className={styles.controlPanel}>
                        <h2>
                          <Leaf size={18} /> Thương hiệu của bạn
                        </h2>
                        <div className={styles.formGrid}>
                          <Field label="Tên thương hiệu">
                            <input
                              maxLength={50}
                              value={design.brand.name}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  brand: {
                                    ...design.brand,
                                    name: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                          <Field label="Dòng giới thiệu">
                            <input
                              maxLength={100}
                              value={design.brand.tagline}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  brand: {
                                    ...design.brand,
                                    tagline: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Mẫu Logo &amp; Favicon có sẵn (6 kiểu)">
                            <select
                              value={design.brand.logoPreset || "sprout"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  brand: {
                                    ...design.brand,
                                    logoPreset: e.target.value as NonNullable<Design["brand"]["logoPreset"]>,
                                    logoAssetId: "",
                                    logoDataUrl: "",
                                  },
                                })
                              }
                            >
                              <option value="sprout">🌿 Mầm Xanh Lowf (Mặc định)</option>
                              <option value="open-book">📖 Trang Sách Mở</option>
                              <option value="monogram">🔤 Chữ L Tạp Chí (Serif)</option>
                              <option value="moon-book">🌙 Trăng &amp; Sách Đêm</option>
                              <option value="feather">🪶 Bút Lông Vũ Văn Học</option>
                              <option value="lotus">🪷 Đóa Sen Tĩnh Tại</option>
                            </select>
                          </Field>
                        </div>
                        <UploadField
                          label="Hoặc tải ảnh Logo thương hiệu riêng (PNG / SVG / WebP)"
                          kind="image"
                          userId={user.id}
                          value={design.brand.logoAssetId}
                          onChange={(id) =>
                            changeDesign({
                              ...design,
                              brand: {
                                ...design.brand,
                                logoAssetId: id,
                                logoDataUrl: "",
                              },
                            })
                          }
                        />
                        {(design.brand.logoAssetId || design.brand.logoDataUrl) && (
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() =>
                              changeDesign({
                                ...design,
                                brand: {
                                  ...design.brand,
                                  logoAssetId: "",
                                  logoDataUrl: "",
                                },
                              })
                            }
                          >
                            Bỏ ảnh Logo riêng (dùng mẫu biểu tượng)
                          </button>
                        )}
                        <UploadField
                          label="Tải ảnh Favicon riêng (biểu tượng tab trình duyệt — bỏ trống sẽ tự dùng theo Logo)"
                          kind="image"
                          userId={user.id}
                          value={design.brand.faviconAssetId}
                          onChange={(id) =>
                            changeDesign({
                              ...design,
                              brand: {
                                ...design.brand,
                                faviconAssetId: id,
                                faviconDataUrl: "",
                              },
                            })
                          }
                        />
                        {(design.brand.faviconAssetId || design.brand.faviconDataUrl) && (
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() =>
                              changeDesign({
                                ...design,
                                brand: {
                                  ...design.brand,
                                  faviconAssetId: "",
                                  faviconDataUrl: "",
                                },
                              })
                            }
                          >
                            Bỏ Favicon riêng (tự đồng bộ theo Logo)
                          </button>
                        )}
                      </section>
                      <section className={styles.controlPanel}>
                        <h2>
                          <Paintbrush size={18} /> Màu sắc & cảm giác
                        </h2>
                        <div className={styles.palettes}>
                          {[
                            {
                              name: "Khu vườn",
                              primary: "#347353",
                              background: "#f6f7f3",
                              surface: "#ffffff",
                              text: "#26382e",
                            },
                            {
                              name: "Trang sách",
                              primary: "#8a6043",
                              background: "#faf5eb",
                              surface: "#ffffff",
                              text: "#493a2e",
                            },
                            {
                              name: "Đêm yên",
                              primary: "#91b88b",
                              background: "#18241f",
                              surface: "#25372c",
                              text: "#ecf0e6",
                            },
                          ].map((p) => (
                            <button
                              key={p.name}
                              onClick={() => {
                                const { name, ...palette } = p;
                                changeDesign({ ...design, palette });
                              }}
                              className={
                                design.palette.primary === p.primary
                                  ? styles.paletteActive
                                  : ""
                              }
                            >
                              <span style={{ background: p.background }}>
                                <b style={{ background: p.primary }} />
                                <i style={{ background: p.text }} />
                              </span>
                              {p.name}
                            </button>
                          ))}
                        </div>
                        <div className={styles.colorGrid}>
                          {(
                            [
                              ["primary", "Màu chủ đạo"],
                              ["background", "Nền website"],
                              ["surface", "Nền thẻ"],
                              ["text", "Màu chữ"],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key}>
                              <input
                                type="color"
                                value={design.palette[key]}
                                onChange={(e) =>
                                  changeDesign({
                                    ...design,
                                    palette: {
                                      ...design.palette,
                                      [key]: e.target.value,
                                    },
                                  })
                                }
                              />
                              <span>
                                {label}
                                <small>
                                  {design.palette[key].toUpperCase()}
                                </small>
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Kiểu chữ tiêu đề">
                            <select
                              value={design.font}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  font: e.target.value as "serif" | "sans",
                                })
                              }
                            >
                              <option value="serif">
                                Có chân · thanh lịch
                              </option>
                              <option value="sans">
                                Không chân · hiện đại
                              </option>
                            </select>
                          </Field>
                          <Field label={`Bo góc · ${design.radius}px`}>
                            <input
                              type="range"
                              min="8"
                              max="32"
                              value={design.radius}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  radius: Number(e.target.value),
                                })
                              }
                            />
                          </Field>
                        </div>
                      </section>
                      <section className={styles.controlPanel}>
                        <h2>
                          <Sparkles size={18} /> Chủ đề 12 Mùa &amp; Cảnh rơi không gian
                        </h2>
                        <p className={styles.controlHint}>
                          Chọn mùa để đổi đồng bộ cả bảng màu, tranh minh họa đầu trang và hiệu ứng rơi (chỉ Chủ website thay đổi; mọi độc giả sẽ thấy sau khi bạn Xuất bản).
                        </p>
                        <div className={styles.presetGrid} aria-label="Chủ đề theo mùa">
                          {seasonPresets.map((sp) => (
                            <button
                              key={sp.id}
                              type="button"
                              className={styles.presetCard}
                              style={
                                (design.decor?.season || "spring") === sp.id
                                  ? { borderColor: "var(--green)", background: "var(--mint)" }
                                  : undefined
                              }
                              onClick={() => {
                                changeDesign({
                                  ...design,
                                  palette: { ...sp.palette },
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    season: sp.id,
                                    preset: sp.id,
                                    petals: true,
                                    fxLevel: "vivid",
                                    stars: "bright",
                                    aurora: true,
                                  },
                                });
                                inform(`Đã chọn chủ đề ${sp.icon} ${sp.name}.`);
                              }}
                            >
                              <span className={styles.presetSwatches}>
                                <span style={{ background: sp.palette.background }} />
                                <span style={{ background: sp.palette.primary }} />
                                <span style={{ background: sp.palette.text }} />
                              </span>
                              <strong>
                                {sp.icon} {sp.name}
                              </strong>
                              <small>{sp.desc}</small>
                            </button>
                          ))}
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Mức độ hiệu ứng rơi theo mùa">
                            <select
                              value={design.decor?.fxLevel || "vivid"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    fxLevel: e.target.value as "off" | "gentle" | "vivid",
                                    petals: e.target.value !== "off",
                                  },
                                })
                              }
                            >
                              <option value="vivid">Rực rỡ rõ nét (Khuyên dùng)</option>
                              <option value="gentle">Dịu nhẹ tinh tế</option>
                              <option value="off">Tắt hiệu ứng rơi</option>
                            </select>
                          </Field>
                          <Field label="Hiệu ứng sao lấp lánh">
                            <select
                              value={design.decor?.stars || "bright"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    stars: e.target.value as "off" | "soft" | "bright",
                                  },
                                })
                              }
                            >
                              <option value="off">Tắt sao</option>
                              <option value="soft">Dịu nhẹ</option>
                              <option value="bright">Lung linh nổi bật</option>
                            </select>
                          </Field>
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Đồng bộ màu thanh công cụ (Khám phá / Đọc / Mua sách)">
                            <select
                              value={design.decor?.navSync === false ? "custom" : "season"}
                              onChange={(e) => {
                                const sync = e.target.value === "season";
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    navSync: sync,
                                    ...(sync ? { navColor: "" } : { navColor: design.decor?.navColor || design.palette.primary }),
                                  },
                                });
                              }}
                            >
                              <option value="season">🔄 Đồng bộ tự động theo mùa &amp; màu web</option>
                              <option value="custom">🎨 Dùng màu thanh công cụ riêng tôi chọn</option>
                            </select>
                          </Field>
                          <Field label="Màu thanh công cụ riêng">
                            <input
                              type="color"
                              value={design.decor?.navColor || design.palette.primary}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    navSync: false,
                                    navColor: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Kiểu thanh công cụ Uiverse (5 mẫu)">
                            <select
                              value={design.decor?.navStyle || "pill-glow"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    navStyle: e.target.value as NonNullable<DesignDecor["navStyle"]>,
                                  },
                                })
                              }
                            >
                              <option value="pill-glow">✨ Viên nang Glow — Nổi sáng theo mùa</option>
                              <option value="glass">🪟 Kính mờ Glass — Trong suốt phản chiếu</option>
                              <option value="floating">🧊 Thẻ nổi 3D — Soft-UI hiện đại</option>
                              <option value="solid-season">🎨 Phủ màu đậm — Thanh bên nổi bật</option>
                              <option value="minimal-line">〰️ Vạch sáng tối giản — Thanh trượt tinh tế</option>
                            </select>
                          </Field>
                          <Field label="Hiệu ứng di chuột thanh công cụ Uiverse (5 kiểu)">
                            <select
                              value={design.decor?.navEffect || "magnetic"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    navEffect: e.target.value as NonNullable<DesignDecor["navEffect"]>,
                                  },
                                })
                              }
                            >
                              <option value="magnetic">⚡ Quét sáng 3D — Vệt sáng lướt + nảy nhẹ</option>
                              <option value="glow-border">🌟 Viền phát sáng — Hào quang quanh nút</option>
                              <option value="ripple-slide">🌊 Trượt sóng màu — Nền trượt ngang + icon nảy</option>
                              <option value="neon-pulse">💫 Nhịp thở Neon — Tỏa sáng nhịp nhàng</option>
                              <option value="clean">🍃 Chuyển mượt nhẹ — Tối giản êm mắt</option>
                            </select>
                          </Field>
                        </div>
                        <div className={styles.formGrid}>
                          <Field label="Kiểu thẻ bìa sách">
                            <select
                              value={design.decor?.cardStyle || "hardcover"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    cardStyle: e.target.value as "hardcover" | "glass" | "minimal",
                                  },
                                })
                              }
                            >
                              <option value="hardcover">Bìa cứng 3D hiện đại</option>
                              <option value="glass">Kính mờ (Glassmorphism)</option>
                              <option value="minimal">Tối giản Editorial</option>
                            </select>
                          </Field>
                          <Field label="Hình nền 3D &amp; Hoa văn Uiverse (24 kiểu)">
                            <select
                              value={design.decor?.bgPattern || "orbs3d"}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    bgPattern: e.target.value as NonNullable<DesignDecor["bgPattern"]>,
                                  },
                                })
                              }
                            >
                              {bgPatternCatalog.map((bp) => (
                                <option key={bp.id} value={bp.id}>
                                  {bp.is3d ? "🧊 " : ""}{bp.name} — {bp.desc}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className={styles.bgGalleryBlock}>
                          <p className={styles.controlHint} style={{ marginBottom: 10 }}>
                            <strong>Ảnh nền toàn trang nghệ thuật ({bgWallpaperCatalog.length} mẫu)</strong> — hoặc tải ảnh nền riêng của bạn bên dưới:
                          </p>
                          <div className={styles.wallpaperGrid}>
                            {bgWallpaperCatalog.map((wp) => {
                              const active = (design.decor?.bgWallpaper || "none") === wp.id && !design.decor?.bgImageAssetId;
                              return (
                                <button
                                  key={wp.id}
                                  type="button"
                                  className={`${styles.wallpaperCard} ${active ? styles.wallpaperActive : ""}`}
                                  onClick={() =>
                                    changeDesign({
                                      ...design,
                                      decor: {
                                        ...defaultDecor,
                                        ...(design.decor || {}),
                                        bgWallpaper: wp.id,
                                        bgImageAssetId: "",
                                      },
                                    })
                                  }
                                >
                                  <span
                                    className={styles.wallpaperThumb}
                                    style={wp.thumb ? { backgroundImage: `url(${wp.thumb})` } : undefined}
                                  />
                                  <strong>{wp.name}</strong>
                                  <small>{wp.desc}</small>
                                </button>
                              );
                            })}
                          </div>
                          <div className={styles.formGrid} style={{ marginTop: 12 }}>
                            <Field label={`Độ nổi bật ảnh nền · ${design.decor?.bgOpacity ?? 24}%`}>
                              <input
                                type="range"
                                min="8"
                                max="60"
                                step="2"
                                value={design.decor?.bgOpacity ?? 24}
                                onChange={(e) =>
                                  changeDesign({
                                    ...design,
                                    decor: {
                                      ...defaultDecor,
                                      ...(design.decor || {}),
                                      bgOpacity: Number(e.target.value),
                                    },
                                  })
                                }
                              />
                            </Field>
                          </div>
                          <UploadField
                            label="Hoặc tải ảnh nền toàn trang riêng từ máy của bạn"
                            kind="image"
                            userId={user.id}
                            value={design.decor?.bgImageAssetId}
                            onChange={(id) =>
                              changeDesign({
                                ...design,
                                decor: {
                                  ...defaultDecor,
                                  ...(design.decor || {}),
                                  bgImageAssetId: id,
                                  bgWallpaper: "custom",
                                },
                              })
                            }
                          />
                          {design.decor?.bgImageAssetId && (
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    bgImageAssetId: "",
                                    bgWallpaper: "none",
                                  },
                                })
                              }
                            >
                              Bỏ ảnh nền tự tải lên
                            </button>
                          )}
                        </div>
                        <div className={styles.decorSwitches}>
                          <label className={styles.decorSwitchRow}>
                            <span>🎄 Mô hình 3D lớn theo mùa (Cây thông Noel 3D, Anh đào, Trăng rằm…)</span>
                            <input
                              type="checkbox"
                              checked={design.decor?.landmark3d !== false}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    landmark3d: e.target.checked,
                                  },
                                })
                              }
                            />
                          </label>
                          <label className={styles.decorSwitchRow}>
                            <span>🍃 Cánh lá / hạt sáng rơi nhẹ trên màn hình</span>
                            <input
                              type="checkbox"
                              checked={design.decor?.petals === true}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    petals: e.target.checked,
                                  },
                                })
                              }
                            />
                          </label>
                          <label className={styles.decorSwitchRow}>
                            <span>✨ Vầng sáng Aurora nhẹ ở đầu trang</span>
                            <input
                              type="checkbox"
                              checked={design.decor?.aurora !== false}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    aurora: e.target.checked,
                                  },
                                })
                              }
                            />
                          </label>
                          <label className={styles.decorSwitchRow}>
                            <span>📄 Vân giấy sách nghệ thuật tinh tế</span>
                            <input
                              type="checkbox"
                              checked={design.decor?.paperGrain !== false}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  decor: {
                                    ...defaultDecor,
                                    ...(design.decor || {}),
                                    paperGrain: e.target.checked,
                                  },
                                })
                              }
                            />
                          </label>
                        </div>
                      </section>
                      <section className={styles.controlPanel}>
                        <h2>
                          <Sparkles size={18} /> Lời chào đầu trang
                        </h2>
                        <Field label="Tiêu đề">
                          <textarea
                            rows={2}
                            maxLength={160}
                            value={design.hero.title}
                            onChange={(e) =>
                              changeDesign({
                                ...design,
                                hero: { ...design.hero, title: e.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label="Mô tả ngắn">
                          <textarea
                            rows={3}
                            maxLength={500}
                            value={design.hero.subtitle}
                            onChange={(e) =>
                              changeDesign({
                                ...design,
                                hero: {
                                  ...design.hero,
                                  subtitle: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                        <div className={styles.formGrid}>
                          <Field label="Nút kêu gọi">
                            <input
                              maxLength={50}
                              value={design.hero.ctaLabel}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  hero: {
                                    ...design.hero,
                                    ctaLabel: e.target.value,
                                  },
                                })
                              }
                            />
                          </Field>
                          <Field label="Dẫn đến">
                            <select
                              value={design.hero.ctaView}
                              onChange={(e) =>
                                changeDesign({
                                  ...design,
                                  hero: {
                                    ...design.hero,
                                    ctaView: e.target.value,
                                  },
                                })
                              }
                            >
                              <option value="library">Thư viện sách</option>
                              <option value="studio">Âm nhạc</option>
                              <option value="store">Cửa hàng</option>
                              <option value="profile">Tài khoản</option>
                            </select>
                          </Field>
                        </div>
                        <UploadField
                          label="Ảnh đầu trang"
                          kind="image"
                          userId={user.id}
                          value={design.hero.imageAssetId}
                          onChange={(id) =>
                            changeDesign({
                              ...design,
                              hero: { ...design.hero, imageAssetId: id },
                            })
                          }
                        />
                        {design.hero.imageAssetId && (
                          <button
                            className={styles.textButton}
                            onClick={() =>
                              changeDesign({
                                ...design,
                                hero: {
                                  ...design.hero,
                                  imageAssetId: undefined,
                                },
                              })
                            }
                          >
                            Bỏ ảnh đầu trang
                          </button>
                        )}
                      </section>
                      <section className={styles.controlPanel}>
                        <h2>
                          <LayoutDashboard size={18} /> Sắp xếp trang chủ
                        </h2>
                        <p className={styles.controlHint}>
                          Bật các phần muốn hiển thị, dùng mũi tên để đổi vị
                          trí.
                        </p>
                        <div className={styles.sectionRows}>
                          {design.sections.map((id, index) => (
                            <div key={id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() =>
                                    changeDesign({
                                      ...design,
                                      sections: design.sections.filter(
                                        (s) => s !== id,
                                      ),
                                    })
                                  }
                                />
                                <span>{sectionLabels[id] || id}</span>
                              </label>
                              <button
                                className={styles.iconButton}
                                disabled={index === 0}
                                onClick={() => moveSection(index, -1)}
                                aria-label={`Đưa ${sectionLabels[id]} lên`}
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                className={styles.iconButton}
                                disabled={index === design.sections.length - 1}
                                onClick={() => moveSection(index, 1)}
                                aria-label={`Đưa ${sectionLabels[id]} xuống`}
                              >
                                <ArrowDown size={15} />
                              </button>
                            </div>
                          ))}
                          {Object.entries(sectionLabels)
                            .filter(([id]) => !design.sections.includes(id))
                            .map(([id, label]) => (
                              <div key={id}>
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={false}
                                    onChange={() =>
                                      changeDesign({
                                        ...design,
                                        sections: [...design.sections, id],
                                      })
                                    }
                                  />
                                  <span>{label}</span>
                                </label>
                              </div>
                            ))}
                        </div>
                      </section>
                      <section className={styles.controlPanel}>
                        <h2>
                          <BookOpen size={18} /> Sách nổi bật
                        </h2>
                        <p className={styles.controlHint}>
                          Chọn các cuốn sách xuất hiện trên trang chủ. Bỏ chọn
                          tất cả để dùng thứ tự thư viện.
                        </p>
                        <div className={styles.featuredList}>
                          {content.books
                            .filter((b) => b.status === "published")
                            .map((b) => (
                              <label key={b.id}>
                                <input
                                  type="checkbox"
                                  checked={design.featuredBookIds.includes(
                                    b.id,
                                  )}
                                  onChange={(e) =>
                                    changeDesign({
                                      ...design,
                                      featuredBookIds: e.target.checked
                                        ? [...design.featuredBookIds, b.id]
                                        : design.featuredBookIds.filter(
                                            (id) => id !== b.id,
                                          ),
                                    })
                                  }
                                />
                                {titleOf(b)}
                              </label>
                            ))}
                        </div>
                      </section>
                    </div>
                    <div className={styles.previewColumn}>
                      <div className={styles.previewToolbar}>
                        <span>
                          <Eye size={15} /> Xem trước bản nháp
                        </span>
                        <div>
                          <button
                            onClick={() => setPreviewMobile(false)}
                            className={
                              !previewMobile ? styles.previewActive : ""
                            }
                            aria-label="Xem trước máy tính"
                          >
                            <Monitor size={16} />
                          </button>
                          <button
                            onClick={() => setPreviewMobile(true)}
                            className={
                              previewMobile ? styles.previewActive : ""
                            }
                            aria-label="Xem trước điện thoại"
                          >
                            <Smartphone size={16} />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`${styles.previewFrame} ${previewMobile ? styles.mobilePreview : ""}`}
                        style={{
                          background: design.palette.background,
                          color: design.palette.text,
                        }}
                      >
                        <div className={styles.previewHeader}>
                          <strong style={{ color: design.palette.primary }}>
                            <Leaf size={19} />
                            {design.brand.name}.
                          </strong>
                          <span>{design.brand.tagline}</span>
                        </div>
                        {design.sections.map((id) => (
                          <div key={id} className={styles.previewSection}>
                            {id === "hero" ? (
                              <div
                                className={styles.previewHero}
                                style={{
                                  background: design.palette.surface,
                                  borderRadius: design.radius,
                                }}
                              >
                                <small
                                  style={{ color: design.palette.primary }}
                                >
                                  MỘT KHOẢNG THỜI GIAN CHO BẠN
                                </small>
                                <h2
                                  style={{
                                    fontFamily:
                                      design.font === "serif"
                                        ? "Georgia,serif"
                                        : "inherit",
                                  }}
                                >
                                  {design.hero.title}
                                </h2>
                                <p>{design.hero.subtitle}</p>
                                <span
                                  style={{
                                    background: design.palette.primary,
                                    color: design.palette.background,
                                    borderRadius: Math.min(12, design.radius),
                                  }}
                                >
                                  {design.hero.ctaLabel}{" "}
                                  <ArrowUpRight size={12} />
                                </span>
                                {design.hero.imageAssetId && (
                                  <img
                                    src={assetUrl(design.hero.imageAssetId)}
                                    alt="Ảnh đầu trang xem trước"
                                  />
                                )}
                              </div>
                            ) : id === "books" ? (
                              <>
                                <h3>Tủ sách dành cho bạn</h3>
                                <div className={styles.previewBooks}>
                                  {(design.featuredBookIds.length
                                    ? (design.featuredBookIds
                                        .map((id) =>
                                          content.books.find(
                                            (b) => b.id === id,
                                          ),
                                        )
                                        .filter(Boolean) as RecordItem[])
                                    : content.books.filter(
                                        (b) => b.status === "published",
                                      )
                                  )
                                    .slice(0, 3)
                                    .map((b) => (
                                      <div key={b.id}>
                                        <div
                                          style={{
                                            background: design.palette.surface,
                                            borderRadius: design.radius,
                                          }}
                                        >
                                          {b.coverAssetId || b.cover ? (
                                            <img
                                              src={
                                                b.coverAssetId
                                                  ? assetUrl(b.coverAssetId)
                                                  : b.cover
                                              }
                                              alt=""
                                            />
                                          ) : (
                                            <BookOpen />
                                          )}
                                        </div>
                                        <strong>{titleOf(b)}</strong>
                                      </div>
                                    ))}
                                </div>
                              </>
                            ) : (
                              <div
                                className={styles.previewPlaceholder}
                                style={{
                                  background: design.palette.surface,
                                  borderRadius: design.radius,
                                }}
                              >
                                {id === "ambient" ? (
                                  <Headphones size={21} />
                                ) : id === "continue" ? (
                                  <BookOpen size={21} />
                                ) : id === "deal" ? (
                                  <Sparkles size={21} />
                                ) : (
                                  <LayoutDashboard size={21} />
                                )}
                                <span>{sectionLabels[id]}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className={styles.previewNote}>
                        Bản xem trước minh họa bố cục và màu sắc. Nội dung cá
                        nhân của độc giả sẽ hiển thị khi họ đăng nhập.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
        <footer className={styles.footer}>
          <span>Lowf Studio</span>
          <p>Chăm chút từng chi tiết. Để mỗi lần ghé thăm đều dễ chịu.</p>
          <a href="/" target="_blank" rel="noreferrer">
            Mở website <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>
      {editor && (
        <Dialog
          title={`${editor.item.id ? "Chỉnh sửa" : "Thêm"} ${labels[editor.kind].single}`}
          subtitle={editor.kind === "books" ? "3 bước đơn giản: thông tin, file sách, rồi xuất bản." : editor.kind === "videos" ? "Tải video của bạn lên hoặc dán liên kết YouTube." : "Thêm nội dung theo từng bước, lưu lại bất cứ khi nào bạn sẵn sàng."}
          onClose={closeEditor}
          wide
        >
          <form noValidate onSubmit={saveItem} className={styles.editorForm}>
            <div className={styles.editorTabs}>
              {[
                ["info", "Thông tin"],
                ["files", editor.kind === "books" ? "File & ảnh bìa" : "Tệp & nội dung"],
                ["publish", "Xuất bản"],
              ]
                .filter(([id]) => editor.kind !== "plans" || id !== "files")
                .map(([id, label], index) => (
                  <button
                    key={id}
                    type="button"
                    className={editorTab === id ? styles.editorTabActive : ""}
                    aria-current={editorTab === id ? "step" : undefined}
                    onClick={() => setEditorTab(id)}
                  >
                    <span className={styles.stepNumber}>{index + 1}</span> {label}
                  </button>
                ))}
            </div>
            <div className={styles.editorBody}>
              <section
                hidden={editorTab !== "info"}
                className={styles.editorSection}
              >
                {editor.kind === "books" && !editor.item.id && (
                  <div className={styles.bookTypeChoices} aria-label="Chọn loại sách">
                    {[
                      { format: "Ebook Free", title: "Sách đọc miễn phí", text: "Thêm PDF hoặc nội dung để mọi người đọc", icon: BookOpen },
                      { format: "Ebook", title: "Ebook trả phí", text: "Đặt giá và quyền đọc khi đã mua", icon: FileText },
                      { format: "Sách giấy", title: "Sách giấy", text: "Đặt giá bán và giao sách cho khách", icon: ShoppingBag },
                    ].map(({ format, title, text, icon: Icon }) => (
                      <button key={format} type="button" aria-pressed={editor.item.format === format} onClick={() => patchItem({ format, access: format === "Ebook" ? "member" : "free", saleEnabled: false, ...(format === "Ebook Free" ? { price: 0 } : {}) })}>
                        <Icon size={20} /><strong>{title}</strong><small>{text}</small>
                      </button>
                    ))}
                  </div>
                )}
                <div className={styles.formGrid}>
                  <Field
                    label={editor.kind === "plans" ? "Tên gói" : editor.kind === "books" ? "Tên sách" : editor.kind === "videos" ? "Tên video" : "Tên bản nhạc"}
                    wide
                  >
                    <input
                      autoFocus
                      required
                      maxLength={editor.kind === "plans" ? 100 : 160}
                      value={
                        editor.kind === "plans"
                          ? editor.item.name || ""
                          : editor.item.title || ""
                      }
                      onChange={(e) =>
                        patchItem(
                          editor.kind === "plans"
                            ? { name: e.target.value }
                            : { title: e.target.value },
                        )
                      }
                      placeholder={
                        editor.kind === "books"
                          ? "Một cuốn sách đang chờ được gọi tên…"
                          : editor.kind === "tracks"
                            ? "Tên bản nhạc"
                            : editor.kind === "videos"
                              ? "Tên video"
                              : "Ví dụ: Lowf Plus"
                      }
                    />
                  </Field>
                  {editor.kind === "books" ? (
                    <>
                      <Field label="Tác giả">
                        <input
                          required
                          maxLength={120}
                          value={editor.item.author || ""}
                          onChange={(e) =>
                            patchItem({ author: e.target.value })
                          }
                          placeholder="Tên tác giả"
                        />
                      </Field>
                      <Field label="Thể loại">
                        <select
                          value={editor.item.category || "vanhocvn"}
                          onChange={(e) =>
                            patchItem({ category: e.target.value })
                          }
                        >
                          <option value="kinhte">Kinh tế &amp; Đầu tư</option>
                          <option value="marketing">Bán hàng &amp; Marketing</option>
                          <option value="kynang">Phát triển bản thân</option>
                          <option value="tamly">Tâm lý &amp; Tư duy</option>
                          <option value="lichsu">Lịch sử &amp; Văn minh</option>
                          <option value="khoahoc">Khoa học &amp; Công nghệ</option>
                          <option value="phapluat">Pháp luật &amp; Chính trị</option>
                          <option value="ngoaingu">Ngoại ngữ &amp; Tiếng Anh</option>
                          <option value="vanhocvn">Văn học Việt Nam</option>
                          <option value="vanhocqt">Văn học nước ngoài</option>
                          <option value="tieuthuyet">Tiểu thuyết &amp; Kỳ ảo</option>
                          <option value="truyentranh">Truyện tranh &amp; Manga</option>
                          <option value="trinhtham">Trinh thám &amp; Kinh dị</option>
                          <option value="tamlinh">Tôn giáo &amp; Tâm linh</option>
                          <option value="dacbiet">Tuyển chọn Lowf</option>
                        </select>
                      </Field>
                      <Field label="Định dạng">
                        <select
                          value={editor.item.format || "Ebook Free"}
                          onChange={(e) =>
                            patchItem({ format: e.target.value, access: ["Ebook", "Combo"].includes(e.target.value) ? "member" : editor.item.access })
                          }
                        >
                          <option>Ebook Free</option>
                          <option>Ebook</option>
                          <option>Sách giấy</option>
                          <option>Combo</option>
                        </select>
                      </Field>
                      <Field
                        label="Giá niêm yết (VNĐ)"
                        hint="Giá cho một sản phẩm. Bật Mở bán ở tab Xuất bản khi sách đã sẵn sàng."
                      >
                        <input
                          type="number"
                          min="0"
                          max="100000000"
                          step="1000"
                          value={editor.item.price || 0}
                          onChange={(e) =>
                            patchItem({ price: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <details className={styles.sourceDetails} open={!!editor.item.id && editor.item.language !== "vi"}>
                        <summary>Ngôn ngữ & nguồn sách <span>Dành cho sách ngoại văn hoặc sách được cấp phép</span></summary>
                        <div className={styles.formGrid}>
                          <Field label="Ngôn ngữ sách" hint="Dùng để chọn giọng đọc và ngôn ngữ dịch.">
                            <select value={editor.item.language || "vi"} onChange={e => patchItem({ language: e.target.value })}>
                              <option value="vi">Tiếng Việt</option><option value="en">English · Tiếng Anh</option><option value="fr">Français · Tiếng Pháp</option><option value="de">Deutsch · Tiếng Đức</option><option value="es">Español · Tiếng Tây Ban Nha</option><option value="it">Italiano · Tiếng Ý</option><option value="pt">Português · Tiếng Bồ Đào Nha</option><option value="ja">日本語 · Tiếng Nhật</option><option value="ko">한국어 · Tiếng Hàn</option><option value="zh">中文 · Tiếng Trung</option>
                              {editor.item.language && !["vi", "en", "fr", "de", "es", "it", "pt", "ja", "ko", "zh"].includes(editor.item.language) && <option value={editor.item.language}>{editor.item.language}</option>}
                            </select>
                          </Field>
                          <Field label="Giấy phép / Quyền phân phối">
                            <input maxLength={300} value={editor.item.licenseLabel || ""} onChange={e => patchItem({ licenseLabel: e.target.value })} placeholder="Ví dụ: Public domain / Tôi sở hữu" />
                          </Field>
                          <Field label="Trạng thái bản quyền">
                            <select
                              value={editor.item.copyrightStatus || "needs_review"}
                              onChange={e => patchItem({ copyrightStatus: e.target.value as RecordItem["copyrightStatus"] })}
                            >
                              <option value="needs_review">Cần rà soát bản quyền</option>
                              <option value="owner_authorized">Tài liệu chủ sở hữu ủy quyền</option>
                              <option value="licensed">Có giấy phép phân phối</option>
                              <option value="public_domain">Phạm vi công cộng (Public Domain)</option>
                            </select>
                          </Field>
                          <Field label="Mã ISBN (không bắt buộc)">
                            <input maxLength={32} value={editor.item.isbn || ""} onChange={e => patchItem({ isbn: e.target.value })} placeholder="978-..." />
                          </Field>
                          <Field label="Nhà xuất bản">
                            <input maxLength={160} value={editor.item.publisher || ""} onChange={e => patchItem({ publisher: e.target.value })} placeholder="Tên nhà xuất bản" />
                          </Field>
                          <Field label="Năm xuất bản">
                            <input
                              type="number"
                              min="1500"
                              max="2100"
                              value={editor.item.publishedYear || ""}
                              onChange={e => patchItem({ publishedYear: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="2024"
                            />
                          </Field>
                          <Field label="Đường dẫn nguồn" wide>
                            <input type="url" maxLength={2000} value={editor.item.sourceUrl || ""} onChange={e => patchItem({ sourceUrl: e.target.value })} placeholder="https://…" />
                          </Field>
                        </div>
                      </details>
                    </>
                  ) : editor.kind === "plans" ? (
                    <>
                      <Field label="Giá gói (VNĐ)">
                        <input
                          type="number"
                          min="0"
                          max="100000000"
                          step="1000"
                          value={editor.item.price || 0}
                          onChange={(e) =>
                            patchItem({
                              price: Number(e.target.value),
                              enabled:
                                Number(e.target.value) > 0 && !commerceEnabled
                                  ? false
                                  : editor.item.enabled,
                            })
                          }
                        />
                      </Field>
                      <Field label="Thời hạn của mỗi lần thanh toán" hint="Gói không tự động trừ tiền gia hạn.">
                        <select
                          value={editor.item.interval || "month"}
                          onChange={(e) =>
                            patchItem({
                              interval: e.target.value as
                                | "month"
                                | "year"
                                | "once",
                            })
                          }
                        >
                          <option value="month">1 tháng</option>
                          <option value="year">1 năm</option>
                          <option value="once">Một lần</option>
                        </select>
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Nghệ sĩ / Người sáng tạo" wide>
                        <input
                          maxLength={120}
                          value={editor.item.artist || ""}
                          onChange={(e) =>
                            patchItem({ artist: e.target.value })
                          }
                          placeholder="Tên hiển thị cùng nội dung"
                        />
                      </Field>
                      <Field label={editor.kind === "videos" ? "Giấy phép (không bắt buộc với YouTube)" : "Giấy phép"}>
                        <input
                          maxLength={120}
                          value={editor.item.license || ""}
                          onChange={(e) =>
                            patchItem({ license: e.target.value })
                          }
                          placeholder="Ví dụ: CC BY 3.0 / Tôi sở hữu"
                        />
                      </Field>
                      <Field label={editor.kind === "videos" ? "Nguồn tham khảo (không bắt buộc)" : "Nguồn (URL)"}>
                        <input
                          type="url"
                          value={editor.item.source || ""}
                          onChange={(e) =>
                            patchItem({ source: e.target.value })
                          }
                          placeholder="https://…"
                        />
                      </Field>
                      <Field label="Ghi công" wide>
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={editor.item.attribution || ""}
                          onChange={(e) =>
                            patchItem({ attribution: e.target.value })
                          }
                          placeholder="Tên tác phẩm, tác giả và thông tin giấy phép"
                        />
                      </Field>
                    </>
                  )}
                  <Field label="Mô tả" wide>
                    <textarea
                      rows={4}
                      maxLength={editor.kind === "plans" ? 2000 : 5000}
                      value={editor.item.description || ""}
                      onChange={(e) =>
                        patchItem({ description: e.target.value })
                      }
                      placeholder="Một vài dòng để người đọc hiểu hơn…"
                    />
                  </Field>
                  {editor.kind === "plans" && (
                    <Field
                      label="Quyền lợi"
                      hint="Mỗi dòng là một quyền lợi hiển thị trên thẻ gói."
                      wide
                    >
                      <textarea
                        rows={4}
                        value={(editor.item.features || []).join("\n")}
                        onChange={(e) =>
                          patchItem({ features: e.target.value.split("\n") })
                        }
                        placeholder={
                          "Đọc thư viện miễn phí\nLưu hành trình đọc\nNghe nhạc tập trung"
                        }
                      />
                    </Field>
                  )}
                </div>
              </section>
              {editor.kind !== "plans" && (
                <section
                  hidden={editorTab !== "files"}
                  className={styles.editorSection}
                >
                  {editor.kind === "videos" && (
                    <div className={styles.youtubeSource}>
                      <div className={styles.sourceChoices} aria-label="Nguồn video">
                        <button type="button" aria-pressed={editor.item.sourceKind !== "youtube"} onClick={() => patchItem({ sourceKind: "upload" })}><CloudUpload size={18} /> Tải file video</button>
                        <button type="button" aria-pressed={editor.item.sourceKind === "youtube"} onClick={() => patchItem({ sourceKind: "youtube" })}><Film size={18} /> Dán link YouTube</button>
                      </div>
                      {editor.item.sourceKind === "youtube" && (
                        <>
                          <Field label="Liên kết video YouTube" hint="Hỗ trợ youtube.com/watch, YouTube Shorts và youtu.be. Không cần tải file video.">
                            <input type="url" maxLength={2000} value={editor.item.youtubeUrl || ""} onChange={e => patchItem({ youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
                          </Field>
                          {youtubeIdFromUrl(editor.item.youtubeUrl) ? (
                            <>
                              <div className={styles.inlineNotice}><CheckCircle2 size={17} /><span>Đã nhận diện video. Ảnh xem trước sẽ được lấy tự động từ YouTube; bạn có thể tải ảnh bìa riêng ở bên dưới.</span></div>
                              {editorTab === "files" && <iframe className={styles.youtubePreview} title="Xem trước video YouTube" src={`https://www.youtube-nocookie.com/embed/${youtubeIdFromUrl(editor.item.youtubeUrl)}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />}
                            </>
                          ) : editor.item.youtubeUrl?.trim() ? <p className={styles.error}>Chưa nhận diện được video. Hãy dùng liên kết YouTube đầy đủ bắt đầu bằng https://.</p> : null}
                        </>
                      )}
                    </div>
                  )}
                  <UploadField
                    label={
                      editor.kind === "books"
                        ? "Ảnh bìa sách"
                        : "Ảnh bìa / Poster (không bắt buộc)"
                    }
                    kind="image"
                    userId={user.id}
                    value={editor.item.coverAssetId}
                    onChange={(id) => patchItem({ coverAssetId: id })}
                  />
                  {editor.item.cover && !editor.item.coverAssetId && (
                    <div className={styles.existingCover}>
                      <img src={editor.item.cover} alt="Ảnh bìa hiện tại" />
                      <span>
                        Ảnh bìa hiện tại được giữ khi bạn chưa thay tệp.
                      </span>
                    </div>
                  )}
                  {editor.kind === "books" && (
                    <OnlineCoverFinder
                      title={editor.item.title || ""}
                      author={editor.item.author || ""}
                      isbn={editor.item.isbn || ""}
                      currentCoverAssetId={editor.item.coverAssetId}
                      currentCover={editor.item.cover}
                      onApply={(assetId, coverSource) => {
                        patchItem({ coverAssetId: assetId, coverSource });
                        inform("✨ Đã lưu ảnh bìa tìm kiếm trực tiếp vào Cloudflare R2!");
                      }}
                      onRestore={(prevAssetId, prevCover) => {
                        patchItem({ coverAssetId: prevAssetId, cover: prevCover });
                        inform("↩️ Đã khôi phục lại ảnh bìa trước đó.");
                      }}
                    />
                  )}
                  {!(editor.kind === "videos" && editor.item.sourceKind === "youtube") && <UploadField
                    label={
                      editor.kind === "books"
                        ? "File sách PDF"
                        : editor.kind === "tracks"
                          ? "File âm thanh"
                          : "File video"
                    }
                    kind={
                      editor.kind === "books"
                        ? "pdf"
                        : editor.kind === "tracks"
                          ? "audio"
                          : "video"
                    }
                    userId={user.id}
                    value={
                      editor.kind === "books"
                        ? editor.item.pdfAssetId
                        : editor.item.assetId
                    }
                    onChange={(id) =>
                      patchItem(
                        editor.kind === "books"
                          ? { pdfAssetId: id }
                          : { assetId: id },
                      )
                    }
                  />}
                  {editor.kind === "books" && (
                    <div className={styles.inlineNotice} style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Sparkles size={17} />
                        <strong>Tự động tối ưu sách Scan PDF &amp; nhập nhanh Ebook (.txt / .md)</strong>
                      </div>
                      <span style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        • <strong>Với file PDF Scan:</strong> Chỉ cần tải file PDF ở ô trên — Lowf sẽ tự động nhận diện trang scan, lọc sạch nền xám, nâng độ nét Retina và hòa màu theo 8 nền giấy đọc (kể cả chế độ Đêm).<br />
                        • <strong>Với file Ebook chữ (.txt / .md):</strong> Chọn tệp bên dưới để tự động chuẩn hóa đoạn văn &amp; tách thành các chương đọc mượt 2 trang:
                      </span>
                      <input
                        type="file"
                        accept=".txt,.md,text/plain,text/markdown"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          const raw = (await file.text()).replace(/\r\n?/g, "\n").trim();
                          if (!raw) return;
                          const cleanParas = (txt: string) =>
                            txt
                              .replace(/-\n(?=[a-zà-ỹ])/gi, "")
                              .split(/\n\s*\n/)
                              .map((p) => p.replace(/\s+/g, " ").trim())
                              .filter((p) => p.length > 1);
                          const headingRe = /^(?:#{1,3}\s+|(?:chương|phần|chapter|part)\s+\d+[^\n]*)/gim;
                          const matches = [...raw.matchAll(headingRe)];
                          let chapters: { title: string; paragraphs: string[] }[] = [];
                          if (matches.length >= 2) {
                            for (let i = 0; i < matches.length; i++) {
                              const start = matches[i].index ?? 0;
                              const end = i + 1 < matches.length ? (matches[i + 1].index ?? raw.length) : raw.length;
                              const lines = raw.slice(start, end).trim().split("\n");
                              const title = (lines.shift() || "").replace(/^#+\s*/, "").trim().slice(0, 140) || `Chương ${i + 1}`;
                              const paragraphs = cleanParas(lines.join("\n"));
                              if (paragraphs.length) chapters.push({ title, paragraphs });
                            }
                          }
                          if (!chapters.length) {
                            const all = cleanParas(raw);
                            const baseTitle = file.name.replace(/\.(?:txt|md)$/i, "").trim() || "Chương 1";
                            for (let i = 0; i < all.length; i += 18) {
                              chapters.push({
                                title: all.length > 18 ? `${baseTitle} · Phần ${Math.floor(i / 18) + 1}` : baseTitle,
                                paragraphs: all.slice(i, i + 18),
                              });
                            }
                          }
                          patchItem({
                            title: editor.item.title || file.name.replace(/\.(?:txt|md)$/i, "").trim(),
                            chapters: chapters.slice(0, 200),
                          });
                          inform(`✨ Đã tự động chuẩn hóa và tách ${chapters.length} chương từ tệp "${file.name}"!`);
                        }}
                      />
                    </div>
                  )}
                  {editor.kind === "books" &&
                    chapterCount(editor.item) > 0 && (
                      <div className={styles.inlineNotice}>
                        <BookOpen size={17} />
                        <span>
                          Cuốn sách hiện có {chapterCount(editor.item)} chương
                          đọc trực tuyến. Nội dung này được giữ lại khi chỉnh
                          sửa thông tin.
                        </span>
                      </div>
                    )}
                  {editor.kind === "tracks" && editor.item.assetId && (
                    <audio
                      className={styles.mediaPreview}
                      src={assetUrl(editor.item.assetId)}
                      controls
                      preload="none"
                    />
                  )}
                  {editor.kind === "videos" && editor.item.sourceKind !== "youtube" && editor.item.assetId && (
                    <video
                      className={styles.videoPreview}
                      src={assetUrl(editor.item.assetId)}
                      poster={assetUrl(editor.item.coverAssetId)}
                      controls
                      playsInline
                      preload="metadata"
                    />
                  )}
                  <p className={styles.filePrivacy}>
                    <ShieldCheck size={14} /> {editor.kind === "videos" && editor.item.sourceKind === "youtube" ? "Video phát trực tiếp từ YouTube. Tác giả video quyết định việc cho phép nhúng; hãy xem thử trước khi xuất bản." : "Tệp được lưu riêng tư. Quyền xem được kiểm tra bởi máy chủ trước khi phát hoặc mở sách."}
                  </p>
                </section>
              )}
              <section
                hidden={editorTab !== "publish"}
                className={styles.editorSection}
              >
                <div className={styles.publishIntro}>
                  <span>
                    <Eye size={23} />
                  </span>
                  <div>
                    <h3>Sẵn sàng chia sẻ?</h3>
                    <p>
                      Bản nháp chỉ dành cho quản trị viên. Xuất bản khi nội dung
                      đã được kiểm tra.
                    </p>
                  </div>
                </div>
                {editor.kind === "books" && (
                  <div className={styles.publishSummary}>
                    <BookOpen size={24} />
                    <div><strong>{editor.item.title || "Sách chưa đặt tên"}</strong><span>{editor.item.author || "Chưa có tác giả"} · {editor.item.format === "Ebook Free" ? "Ebook miễn phí" : editor.item.format}</span>
                      <small>{editor.item.pdfAssetId ? "Đã có file PDF" : chapterCount(editor.item) ? `${chapterCount(editor.item)} chương đọc trực tuyến đã lưu` : editor.item.format === "Sách giấy" ? "Sách giấy không bắt buộc có file PDF" : "Chưa có file đọc — thêm PDF ở bước 2 hoặc lưu bản nháp"}</small>
                    </div>
                  </div>
                )}
                {editor.kind === "plans" ? (
                  <>
                    <label className={styles.toggleRow}>
                      <span>
                        <strong>Mở đăng ký gói</strong>
                        <small>
                          {(editor.item.price || 0) > 0
                            ? commerceEnabled?'Người đọc thanh toán qua VNPAY để nhận quyền truy cập.':'Cần cấu hình VNPAY production trước khi mở gói trả phí.'
                            : "Độc giả có thể đăng ký gói miễn phí này."}
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        disabled={(editor.item.price || 0) > 0 && !commerceEnabled}
                        checked={!!editor.item.enabled}
                        onChange={(e) =>
                          patchItem({
                            enabled: e.target.checked,
                            status: e.target.checked ? "published" : "draft",
                          })
                        }
                      />
                    </label>
                    {(editor.item.price || 0) > 0 && (
                      <div className={styles.inlineNotice}>
                        <CircleAlert size={18} />
                        <span>
                          {commerceEnabled?'Quyền truy cập chỉ được cấp khi máy chủ xác nhận giao dịch thành công từ VNPAY.':'Gói trả phí sẽ được lưu nháp cho đến khi thanh toán thật được cấu hình.'} Lưu gói không thực hiện giao dịch.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {editor.kind==='books'&&<label className={styles.toggleRow}>
                      <span><strong>Mở bán sách này</strong><small>{editor.item.saleEnabled?'Sách xuất bản sẽ có thể được đặt mua khi VNPAY production hoạt động.':'Bật khi bạn đã kiểm tra giá, nội dung và quyền phân phối. Sách mẫu được tắt bán mặc định.'}</small></span>
                      <input type="checkbox" checked={!!editor.item.saleEnabled} onChange={e=>patchItem({saleEnabled:e.target.checked})}/>
                    </label>}
                    {editor.item.id && <label className={styles.toggleRow}>
                      <span><strong>Chuyển vào kho lưu trữ</strong><small>Ẩn nội dung khỏi website khi lưu. File và thông tin vẫn được giữ để bạn chỉnh sửa sau.</small></span>
                      <input type="checkbox" checked={editor.item.status === "archived"} onChange={e => patchItem({ status: e.target.checked ? "archived" : "draft" })} />
                    </label>}
                    {editor.kind === "books" && (
                      <Field label="Trạng thái duyệt nội dung (Workflow 7 bước)" hint="Sách chỉ hiển thị công khai với độc giả khi ở trạng thái Đã xuất bản.">
                        <select
                          value={editor.item.status || "draft"}
                          onChange={(e) => patchItem({ status: e.target.value as ItemStatus })}
                        >
                          <option value="draft">Bản nháp (draft)</option>
                          <option value="processing">Đang xử lý (processing)</option>
                          <option value="needs_review">Cần chủ trang rà soát (needs_review)</option>
                          <option value="ready">Sẵn sàng xuất bản (ready)</option>
                          <option value="published">Đã xuất bản công khai (published)</option>
                          <option value="archived">Đã lưu trữ / ẩn (archived)</option>
                          <option value="failed">Lỗi xử lý (failed)</option>
                        </select>
                      </Field>
                    )}
                    <Field label="Quyền truy cập">
                      <select
                        value={editor.item.access || "free"}
                        onChange={(e) =>
                          patchItem({
                            access: e.target.value as "free" | "member",
                          })
                        }
                      >
                        <option value="free">
                          Miễn phí · mọi người có thể xem
                        </option>
                        <option value="member">
                          {editor.kind==='books'?'Người đã mua / hội viên có quyền đọc':'Dành cho thành viên có quyền truy cập'}
                        </option>
                      </select>
                    </Field>
                    <div className={styles.inlineNotice}>
                      <ShieldCheck size={18} />
                      <span>
                        Quyền đọc được kiểm tra trên máy chủ. Đổi trạng thái
                        hoặc quyền truy cập không xóa file gốc.
                      </span>
                    </div>
                  </>
                )}
              </section>
            </div>
            {formError && (
              <div className={styles.formError} role="alert">
                <CircleAlert size={16} />
                {formError}
              </div>
            )}
            <footer className={styles.editorFooter}>
              <span>
                {editorTab !== "publish" ? `Bước ${editorTab === "info" ? "1" : "2"}/${editor.kind === "plans" ? "2" : "3"} · Chưa hiển thị thay đổi trên website` : editor.kind === "plans" ? money(editor.item.price) : "Lưu nháp để làm tiếp, hoặc xuất bản để độc giả xem."}
              </span>
              {editorTab !== "info" && <button type="button" className={styles.secondary} onClick={() => { setEditorTab(editorTab === "files" || editor.kind === "plans" ? "info" : "files"); setFormError(""); }} disabled={saving}><ArrowLeft size={16} /> Trước</button>}
              {editor.kind !== "plans" && <button type="submit" value="draft" className={styles.secondary} disabled={saving}><Save size={15} /> Lưu nháp</button>}
              {editorTab !== "publish" ? (
                <button key="next-step" type="button" className={styles.primary} disabled={saving} onClick={event => { event.preventDefault(); nextEditorStep(); }}>Tiếp tục <ArrowRight size={17} /></button>
              ) : (
                <button
                  key="publish-content"
                  className={styles.primary}
                  type="submit"
                  value={
                    editor.kind === "plans"
                      ? "plan"
                      : editor.item.status && ["archived", "needs_review", "ready", "processing", "failed"].includes(editor.item.status)
                        ? editor.item.status
                        : "published"
                  }
                  disabled={saving}
                >
                  {saving ? <LoaderCircle className={styles.spin} size={16} /> : <Check size={17} />}
                  {saving
                    ? "Đang lưu…"
                    : editor.kind === "plans"
                      ? "Lưu gói"
                      : editor.item.status === "archived"
                        ? "Lưu trữ nội dung"
                        : editor.item.status === "needs_review"
                          ? "Lưu (Cần rà soát)"
                          : editor.item.status === "ready"
                            ? "Lưu (Sẵn sàng duyệt)"
                            : editor.item.status === "processing"
                              ? "Lưu (Đang xử lý)"
                              : editor.item.status === "failed"
                                ? "Lưu (Lỗi xử lý)"
                                : editor.kind === "books"
                                  ? "Xuất bản sách"
                                  : "Xuất bản"}
                </button>
              )}
            </footer>
          </form>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={confirm.title}
          onClose={() => {
            if (!saving) {
              setConfirm(null);
              setConfirmError("");
            }
          }}
        >
          <div className={styles.confirmBody}>
            <p>{confirm.body}</p>
            {confirmError && (
              <p className={styles.error} role="alert">
                {confirmError}
              </p>
            )}
            <div>
              <button
                className={styles.secondary}
                disabled={saving}
                onClick={() => {
                  setConfirm(null);
                  setConfirmError("");
                }}
              >
                Để sau
              </button>
              <button
                className={styles.primary}
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setConfirmError("");
                  try {
                    await confirm.action();
                    setConfirm(null);
                  } catch (e) {
                    setConfirmError((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? (
                  <LoaderCircle size={16} className={styles.spin} />
                ) : (
                  <Check size={16} />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className={styles.toast} role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Đóng thông báo">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function ContentList({
  kind,
  items,
  onEdit,
  onArchive,
  onAdd,
}: {
  kind: Kind;
  items: RecordItem[];
  onEdit: (item: RecordItem) => void;
  onArchive: (item: RecordItem) => void;
  onAdd: () => void;
}) {
  const Icon = labels[kind].icon;
  if (!items.length)
    return (
      <div className={styles.empty}>
        <Icon size={34} />
        <h3>Chưa có {labels[kind].single} trong mục này</h3>
        <p>Thêm nội dung đầu tiên hoặc thử một bộ lọc khác.</p>
        <button className={styles.primary} onClick={onAdd}>
          <Plus size={16} /> Thêm {labels[kind].single}
        </button>
      </div>
    );
  if (kind === "plans")
    return (
      <div className={styles.planGrid}>
        {items.map((item) => (
          <article className={styles.planCard} key={item.id}>
            <div className={styles.planTop}>
              <span>
                <Sparkles size={21} />
              </span>
              <StateBadge item={item} />
            </div>
            <h2>{item.name}</h2>
            <p>
              {item.description ||
                "Một hành trình đọc dành riêng cho thành viên."}
            </p>
            <div className={styles.planPrice}>
              {money(item.price)}
              <span>
                /
                {item.interval === "year"
                  ? "năm"
                  : item.interval === "once"
                    ? "lần"
                    : "tháng"}
              </span>
            </div>
            <ul>
              {(item.features || []).filter(Boolean).map((feature, i) => (
                <li key={i}>
                  <Check size={14} />
                  {feature}
                </li>
              ))}
            </ul>
            <div className={styles.planActions}>
              <button className={styles.secondary} onClick={() => onEdit(item)}>
                <Pencil size={15} /> Chỉnh sửa
              </button>
              <button
                className={styles.iconButton}
                onClick={() => onArchive(item)}
                disabled={item.status === "archived"}
                aria-label={`Ngừng hiển thị gói ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  return (
    <div className={styles.contentTable}>
      <div className={styles.tableHead}>
        <span>NỘI DUNG</span>
        <span>TRẠNG THÁI</span>
        <span>QUYỀN XEM</span>
        <span />
      </div>
      {items.map((item) => (
        <article className={styles.contentRow} key={item.id}>
          <button
            className={styles.contentIdentity}
            onClick={() => onEdit(item)}
          >
            <span
              className={`${styles.contentCover} ${kind === "books" ? styles.bookCover : ""}`}
            >
              {item.coverAssetId || item.cover || (kind === "videos" && youtubeIdFromUrl(item.youtubeUrl)) ? (
                <img
                  src={
                    item.coverAssetId ? assetUrl(item.coverAssetId) : item.cover || `https://i.ytimg.com/vi/${youtubeIdFromUrl(item.youtubeUrl)}/hqdefault.jpg`
                  }
                  alt=""
                />
              ) : (
                <Icon size={24} />
              )}
            </span>
            <span>
              <strong>{titleOf(item)}</strong>
              <small>
                {kind === "books"
                  ? item.author || "Chưa có tác giả"
                  : item.artist || labels[kind].plural}
              </small>
              <em>
                {kind === "books"
                  ? item.format
                  : item.license || "Chưa thêm giấy phép"}
              </em>
            </span>
          </button>
          <div>
            <StateBadge item={item} />
          </div>
          <span className={styles.accessLabel}>
            {item.access === "member" ? (
              <ShieldCheck size={13} />
            ) : (
              <Eye size={13} />
            )}{" "}
            {item.access === "member" ? "Thành viên" : "Miễn phí"}
          </span>
          <div className={styles.rowActions}>
            <button
              className={styles.iconButton}
              onClick={() => onEdit(item)}
              aria-label={`Chỉnh sửa ${titleOf(item)}`}
            >
              <Pencil size={17} />
            </button>
            <button
              className={styles.iconButton}
              onClick={() => onArchive(item)}
              disabled={item.status === "archived"}
              aria-label={`Lưu trữ ${titleOf(item)}`}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

type AuthOverviewPayload = {
  status: {
    neonAuthConfigured: boolean;
    authHost: string;
    ownerEmail: string;
    sessionTtlSeconds: number;
    environment: string;
    methods: string[];
  };
  stats: { totalProfiles: number };
  recentUsers: Array<{ id: string; name: string; avatarUrl: string; updatedAt: string }>;
};

function AuthOverviewPanel() {
  const [data, setData] = useState<AuthOverviewPayload | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/auth", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Chưa tải được trạng thái đăng nhập."))))
      .then((d: AuthOverviewPayload) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e instanceof Error ? e.message : "Lỗi kết nối."); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  return (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>
        <div>
          <h2>Trạng thái kết nối &amp; Tài khoản độc giả thực tế</h2>
          <p>Dữ liệu trực tiếp từ Neon Auth và cơ sở dữ liệu tài khoản Lowf.</p>
        </div>
        <ShieldCheck size={20} />
      </div>
      {loading && <p className={styles.muted}>Đang kiểm tra trạng thái hệ thống đăng nhập…</p>}
      {err && <p className={styles.error}>{err}</p>}
      {data && (
        <>
          <div className={styles.authMethodsGrid}>
            <div className={styles.quickCard}>
              <strong>{data.status.neonAuthConfigured ? "🟢 Đang hoạt động ổn định" : "🟠 Chưa đủ biến môi trường"}</strong>
              <small>
                Máy chủ xác thực: <code>{data.status.authHost || "Neon Auth"}</code> · Cache phiên {data.status.sessionTtlSeconds}s (tối ưu 5× tốc độ).
              </small>
            </div>
            <div className={styles.quickCard}>
              <strong>👥 {data.stats.totalProfiles} độc giả đã tạo hồ sơ</strong>
              <small>Đồng bộ tiến độ đọc, kệ sách lưu, ảnh đại diện và bảng xếp hạng cộng đồng.</small>
            </div>
            <div className={styles.quickCard}>
              <strong>👑 Quyền chủ website</strong>
              <small>
                Email chủ trang: <code>{data.status.ownerEmail}</code> · Môi trường: <code>{data.status.environment}</code>.
              </small>
            </div>
          </div>
          {data.recentUsers.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <strong style={{ display: "block", fontSize: 13, marginBottom: 10 }}>
                Độc giả hoạt động gần đây ({data.recentUsers.length})
              </strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {data.recentUsers.map((u) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 11px",
                      borderRadius: 10,
                      border: "1px solid var(--studio-line, #e2e8dc)",
                      background: "var(--studio-bg, #f8f9f5)",
                    }}
                  >
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt={u.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "#eaf1e2", color: "#376d4c", fontWeight: 700, fontSize: 11 }}>
                        {u.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                      <div style={{ fontSize: 10, opacity: 0.65 }}>
                        {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString("vi-VN") : "Hoạt động"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function makeBulkCoverSvg(title: string, author: string, idx: number): string {
  const palettes: Array<[string, string, string]> = [
    ["#18362a", "#f7f3e8", "#d9b45c"],
    ["#1b2845", "#f5f7fb", "#e6b95c"],
    ["#2d2236", "#faf4f8", "#e5a672"],
    ["#33221d", "#fbf5ee", "#e2b262"],
    ["#1a343b", "#f2f8f9", "#7fd1b9"],
    ["#2c3325", "#f6f7f0", "#c9b36b"],
  ];
  const [bg, fg, accent] = palettes[idx % palettes.length];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + w.length + 1 > 20) { lines.push(cur); cur = w; }
    else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 4);
  const y0 = 192 - (shown.length - 1) * 14;
  const titleSvg = shown.map((l, i) => `<text x="150" y="${y0 + i * 28}" text-anchor="middle" fill="${fg}" font-family="Georgia,serif" font-size="19" font-weight="600">${esc(l)}</text>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><rect width="300" height="420" rx="12" fill="${bg}"/><rect x="16" y="16" width="268" height="388" rx="6" fill="none" stroke="${accent}" stroke-opacity=".42"/><text x="150" y="64" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="9.5" font-weight="700" letter-spacing="2.4">LOWF LIBRARY</text><line x1="115" y1="80" x2="185" y2="80" stroke="${accent}" stroke-opacity=".45"/>${titleSvg}<text x="150" y="366" text-anchor="middle" fill="${fg}" fill-opacity=".78" font-family="sans-serif" font-size="11.5">${esc(author.slice(0, 30))}</text></svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function cleanBulkTitle(filename: string): { title: string; author: string } {
  const stem = filename.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").replace(/\s*√?PDF\s*PDFDrive\s*com/gi, "").replace(/\s+/g, " ").trim();
  const dash = stem.split(/\s+-\s+/);
  if (dash.length === 2 && dash[1].length >= 3 && dash[1].length <= 42) {
    return { title: dash[0].trim().slice(0, 150), author: dash[1].trim().slice(0, 110) };
  }
  return { title: (stem.replace(/-/g, " ").replace(/\s+/g, " ").trim() || "Sách PDF mới").slice(0, 150), author: "Lowf Tuyển Chọn" };
}

function BulkPdfImporter({ userId, onDone }: { userId: string; onDone: (items: RecordItem[]) => void }) {
  const [category, setCategory] = useState<"marketing" | "kinhte" | "kynang" | "tamly" | "phapluat" | "ngoaingu" | "lichsu" | "khoahoc" | "vanhocvn" | "vanhocqt" | "tieuthuyet" | "truyentranh" | "tamlinh" | "trinhtham" | "dacbiet">("kinhte");
  const [status, setStatus] = useState<"needs_review" | "draft" | "published">("needs_review");
  const [access, setAccess] = useState<"free" | "member">("free");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf");
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setErrors([]);
    const created: RecordItem[] = [];
    const failed: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Đang tải & tối ưu (${i + 1}/${files.length}): ${file.name}`);
      if (file.size > 50 * 1024 * 1024) {
        failed.push(`${file.name}: vượt quá 50 MB`);
        continue;
      }
      try {
        const pdfAssetId = await uploadLargeAsset({
          file,
          userId,
          kind: "pdf",
          title: file.name,
        });
        const { title, author } = cleanBulkTitle(file.name);
        const bookRes = await request<{ item: RecordItem }>("/api/admin/content/books", {
          method: "POST",
          body: JSON.stringify({
            title,
            author,
            category,
            format: "Ebook Free",
            price: 0,
            saleEnabled: false,
            description: `Ấn phẩm PDF tuyển chọn (${(file.size / 1048576).toFixed(1)} MB) — tự động tối ưu đọc vừa 1 trang, 2 trang và lọc nền scan trên Lowf.`,
            cover: makeBulkCoverSvg(title, author, i),
            pdfAssetId,
            access,
            status,
            language: "vi",
          }),
        });
        if (bookRes.item) created.push(bookRes.item);
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "Lỗi tải lên"}`);
      }
    }
    setBusy(false);
    setProgress(created.length ? `Hoàn tất nhập ${created.length}/${files.length} sách PDF!` : "");
    setErrors(failed);
    if (created.length) onDone(created);
  }

  return (
    <div className={styles.notice} style={{ alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
      <BookOpen size={20} />
      <div style={{ flex: 1, minWidth: 240 }}>
        <strong>📚 Nhập hàng loạt nhiều sách PDF cùng lúc (tối đa 50 MB / file)</strong>
        <p style={{ marginTop: 4 }}>
          Chọn cùng lúc 10–50 file PDF từ máy tính — Lowf Studio tự đặt tên sách gọn đẹp, lưu an toàn lên kho Cloudflare R2 (10 GB miễn phí · $0 egress) và mặc định đặt trạng thái <b>Cần rà soát</b> để bạn duyệt bìa &amp; thông tin trước khi xuất bản.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <select className={styles.categorySelect} value={category} onChange={(e) => setCategory(e.target.value as typeof category)} disabled={busy}>
            <option value="marketing">Bán hàng &amp; Marketing</option>
            <option value="kinhte">Kinh tế &amp; Đầu tư</option>
            <option value="kynang">Phát triển bản thân</option>
            <option value="tamly">Tâm lý &amp; Tư duy</option>
            <option value="phapluat">Pháp luật &amp; Chính trị</option>
            <option value="ngoaingu">Ngoại ngữ &amp; Tiếng Anh</option>
            <option value="lichsu">Lịch sử &amp; Văn minh</option>
            <option value="khoahoc">Khoa học &amp; Công nghệ</option>
            <option value="vanhocvn">Văn học Việt Nam</option>
            <option value="vanhocqt">Văn học nước ngoài</option>
            <option value="tieuthuyet">Tiểu thuyết &amp; Kỳ ảo</option>
            <option value="truyentranh">Truyện tranh &amp; Manga</option>
            <option value="tamlinh">Tôn giáo &amp; Tâm linh</option>
            <option value="trinhtham">Trinh thám &amp; Kinh dị</option>
            <option value="dacbiet">Tuyển chọn Lowf</option>
          </select>
          <select className={styles.categorySelect} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} disabled={busy}>
            <option value="needs_review">Cần rà soát trước khi đăng (Khuyên dùng)</option>
            <option value="draft">Lưu bản nháp</option>
            <option value="published">Xuất bản ngay</option>
          </select>
          <select className={styles.categorySelect} value={access} onChange={(e) => setAccess(e.target.value as typeof access)} disabled={busy}>
            <option value="free">Miễn phí</option>
            <option value="member">Dành cho thành viên</option>
          </select>
          <label className={styles.primary} style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.65 : 1 }}>
            <CloudUpload size={15} /> {busy ? "Đang nhập hàng loạt…" : "Chọn nhiều file PDF"}
            <input type="file" accept="application/pdf,.pdf" multiple hidden disabled={busy} onChange={handleFiles} />
          </label>
        </div>
        {progress && <p style={{ marginTop: 8, fontWeight: 600, fontSize: 12 }}>{progress}</p>}
        {errors.length > 0 && (
          <p className={styles.error} style={{ marginTop: 6, fontSize: 11.5 }}>
            Một số tệp chưa tải được ({errors.length}): {errors.slice(0, 3).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

type SyncMode = "free-tier" | "epubs-only" | "all-under-50mb";
type SyncPlanItem = {
  id: string;
  title: string;
  author: string;
  category: string;
  format: string;
  price: number;
  description: string;
  language?: string;
  kind: "epub" | "pdf";
  pdfBytes: number;
  hasPhotoCover: boolean;
  coverSvg?: string;
  sortOrder?: number;
  status?: "published" | "draft";
};
type SyncPlanResponse = {
  mode: string;
  totalCount: number;
  epubCount: number;
  pdfCount: number;
  estimatedBlobMb: number;
  skippedHeavyCount: number;
  skippedHeavyMb: number;
  items: SyncPlanItem[];
};

function LocalLibrarySyncPanel({
  userId,
  existingIds,
  existingCoverMap,
  onSynced,
}: {
  userId: string;
  existingIds: string[];
  existingCoverMap: Record<string, string>;
  onSynced: (items: RecordItem[]) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState("http://127.0.0.1:4321");
  const [mode, setMode] = useState<SyncMode>("free-tier");
  const [resyncPdfs, setResyncPdfs] = useState(false);
  const [plan, setPlan] = useState<SyncPlanResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "running" | "paused" | "done">("idle");
  const [progress, setProgress] = useState("");
  const [stats, setStats] = useState({ done: 0, total: 0, skipped: 0, failed: 0, blobMb: 0 });
  const [errors, setErrors] = useState<string[]>([]);
  const stopRef = useRef(false);

  async function checkSource(targetMode: SyncMode = mode) {
    setStatus("checking");
    setErrors([]);
    setProgress("Đang kết nối máy chủ xem trước trên máy của bạn…");
    try {
      const base = sourceUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/sync/plan?mode=${encodeURIComponent(targetMode)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SyncPlanResponse;
      setPlan(data);
      const alreadySet = new Set(existingIds);
      const pending = data.items.filter((it) => !alreadySet.has(it.id)).length;
      setProgress(
        `Đã kết nối! Sẵn sàng đồng bộ ${pending}/${data.totalCount} cuốn (${data.epubCount} EPUB + ${data.pdfCount} PDF · ước tính ~${data.estimatedBlobMb} MB Blob${data.skippedHeavyCount ? ` · tạm giữ lại ${data.skippedHeavyCount} PDF scan nặng ${data.skippedHeavyMb} MB để không vượt hạn mức 1 GB` : ""}).`
      );
      setStatus("idle");
      return data;
    } catch (e) {
      setStatus("idle");
      setProgress("");
      setErrors([`Chưa kết nối được ${sourceUrl} (${e instanceof Error ? e.message : "lỗi mạng"}). Hãy đảm bảo máy chủ xem trước cục bộ đang chạy.`]);
      return null;
    }
  }

  async function uploadDirectFile(file: Blob, kind: "image" | "pdf", filename: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", new File([file], filename, { type: file.type || (kind === "pdf" ? "application/pdf" : "image/jpeg") }));
    fd.append("kind", kind);
    fd.append("originalName", filename);
    const res = await fetch("/api/uploads/direct", { method: "POST", credentials: "same-origin", body: fd });
    const data = (await res.json().catch(() => ({}))) as { asset?: { id: string }; error?: string };
    if (!res.ok || !data.asset?.id) throw new Error(data.error || `Upload lỗi (${res.status})`);
    return data.asset.id;
  }

  async function startSync() {
    const activePlan = plan && plan.mode === mode ? plan : await checkSource(mode);
    if (!activePlan) return;
    stopRef.current = false;
    setStatus("running");
    setErrors([]);

    const base = sourceUrl.replace(/\/+$/, "");
    let existingSet = new Set(existingIds);
    let existingEpubSet = new Set<string>();
    let r2CoverMap: Record<string, string> = {};
    let r2PdfMap: Record<string, string> = {};
    let r2Backend = false;
    // Fast metadata + R2 migration state check
    try {
      setProgress("Đang kiểm tra trạng thái Cloudflare R2 & lập danh sách tệp cần chuyển…");
      const keepIds = activePlan.items.map((it) => it.id);
      const orderPayload = activePlan.items.map((it, i) => ({
        id: it.id,
        sortOrder: typeof it.sortOrder === "number" ? it.sortOrder : i + 1,
        category: it.category,
        status: it.status === "draft" ? "draft" : "published",
      }));
      const syncRes = await request<{
        storageBackend?: "r2" | "vercel-blob";
        updatedCount: number;
        updatedIds?: string[];
        existingEpubIds?: string[];
        r2CoverMap?: Record<string, string>;
        r2PdfMap?: Record<string, string>;
        archivedCount: number;
        freedMb?: number;
      }>(
        "/api/admin/content/books/sync-order",
        {
          method: "POST",
          body: JSON.stringify({ order: orderPayload, archiveOthers: true, keepIds }),
        }
      );
      if (syncRes.storageBackend === "r2") {
        r2Backend = true;
        existingSet = new Set(syncRes.updatedIds || []);
        existingEpubSet = new Set(syncRes.existingEpubIds || []);
        r2CoverMap = syncRes.r2CoverMap || {};
        r2PdfMap = syncRes.r2PdfMap || {};
      } else {
        for (const uid of syncRes.updatedIds || []) existingSet.add(uid);
      }
    } catch (err) {
      setStatus("idle");
      setErrors([`Không thể kiểm tra danh sách R2 từ sync-order: ${err instanceof Error ? err.message : "lỗi kết nối"}`]);
      setProgress("");
      return;
    }

    const queue = activePlan.items.filter((it) => !existingSet.has(it.id) || (resyncPdfs && it.kind === "pdf"));
    const skippedCount = activePlan.items.length - queue.length;

    let doneCount = 0;
    let failCount = 0;
    let blobBytes = 0;
    const syncedBuffer: RecordItem[] = [];
    const failedList: string[] = [];
    setStats({ done: 0, total: queue.length, skipped: skippedCount, failed: 0, blobMb: 0 });

    if (!queue.length) {
      setStatus("done");
      setProgress(`✨ Toàn bộ ${activePlan.totalCount} cuốn trong gói này đã nằm hoàn toàn trên Cloudflare R2!`);
      return;
    }

    let cursor = 0;
    const workerCount = r2Backend ? 5 : 3;
    const workers = Array.from({ length: workerCount }, async () => {
      while (!stopRef.current) {
        const idx = cursor++;
        if (idx >= queue.length) break;
        const item = queue[idx];
        try {
          let coverAssetId = r2Backend ? (r2CoverMap[item.id] || "") : (existingCoverMap[item.id] || "");
          let cover = "";
          if (!coverAssetId && item.hasPhotoCover) {
            const covRes = await fetch(`${base}/api/sync/cover/${encodeURIComponent(item.id)}`);
            if (covRes.ok) {
              const covBlob = await covRes.blob();
              if (covBlob.size > 0) {
                coverAssetId = await uploadDirectFile(covBlob, "image", `${item.id}.jpg`);
                blobBytes += covBlob.size;
              }
            }
          }
          if (!coverAssetId) {
            cover = item.coverSvg || makeBulkCoverSvg(item.title, item.author, idx);
          }

          let pdfAssetId = r2Backend && !resyncPdfs ? (r2PdfMap[item.id] || "") : "";
          let chapters: { title: string; paragraphs: string[] }[] | undefined;
          let preserveChapters = false;

          if (item.kind === "pdf") {
            if (!pdfAssetId) {
              const pdfRes = await fetch(`${base}/api/sync/pdf/${encodeURIComponent(item.id)}`);
              if (!pdfRes.ok) throw new Error(`Không đọc được PDF (${pdfRes.status})`);
              const pdfBlob = await pdfRes.blob();
              if (pdfBlob.size <= 3.5 * 1024 * 1024) {
                pdfAssetId = await uploadDirectFile(pdfBlob, "pdf", `${item.id}.pdf`);
              } else {
                const pdfFile = new File([pdfBlob], `${item.id}.pdf`, { type: "application/pdf" });
                pdfAssetId = await uploadLargeAsset({
                  file: pdfFile,
                  userId,
                  kind: "pdf",
                  title: `${item.id}.pdf`,
                });
              }
              blobBytes += pdfBlob.size;
            }
          } else if (r2Backend && existingEpubSet.has(item.id)) {
            // Existing EPUB already has chapters in Neon DB — only patch its R2 coverAssetId without resending MBs of JSON!
            preserveChapters = true;
          } else {
            const bookRes = await fetch(`${base}/api/books/${encodeURIComponent(item.id)}`);
            if (!bookRes.ok) throw new Error(`Không đọc được chương EPUB (${bookRes.status})`);
            const bookJson = (await bookRes.json()) as { book?: { chapters?: { title: string; paragraphs: string[] }[] } };
            const rawChapters = bookJson.book?.chapters || [];
            // Keep serialized chapters JSON strictly under 2.8 MB so serverless body limit (4.5 MB) is never exceeded (HTTP 413)
            const MAX_CHAPTER_BYTES = 2_800_000;
            let accBytes = 0;
            chapters = [];
            for (let cIdx = 0; cIdx < Math.min(rawChapters.length, 600); cIdx++) {
              const ch = rawChapters[cIdx];
              const titleStr = String(ch.title || `Chương ${cIdx + 1}`).trim().slice(0, 155) || `Chương ${cIdx + 1}`;
              const paras = (Array.isArray(ch.paragraphs) ? ch.paragraphs : [])
                .map((p) => String(p || "").trim().slice(0, 11800))
                .filter(Boolean)
                .slice(0, 600);
              if (!paras.length) continue;
              const estBytes = titleStr.length * 2 + paras.reduce((s, p) => s + p.length * 2 + 8, 64);
              if (accBytes + estBytes > MAX_CHAPTER_BYTES && chapters.length > 0) break;
              accBytes += estBytes;
              chapters.push({ title: titleStr, paragraphs: paras });
            }
            if (!chapters.length) {
              chapters = [{ title: item.title.slice(0, 150), paragraphs: [item.description || item.title] }];
            }
          }

          const payload: Record<string, unknown> = {
            id: item.id,
            title: item.title.slice(0, 158),
            author: (item.author || "Lowf Tuyển Chọn").slice(0, 118),
            category: item.category,
            format: item.format === "Ebook" || item.format === "Sách giấy" || item.format === "Combo" ? item.format : "Ebook Free",
            price: Math.max(0, Math.round(item.price || 0)),
            saleEnabled: false,
            description: (item.description || `${item.title} — ${item.author}`).slice(0, 4900),
            access: "free",
            status: item.status === "draft" ? "draft" : "published",
            language: item.language || "vi",
            sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : idx + 1,
          };
          if (preserveChapters) payload.preserveChapters = true;
          if (coverAssetId) payload.coverAssetId = coverAssetId;
          else payload.cover = cover;
          if (pdfAssetId) payload.pdfAssetId = pdfAssetId;
          if (chapters) payload.chapters = chapters;

          const saved = await request<{ saved: RecordItem[]; failed: { id: string; error: string }[] }>(
            "/api/admin/content/books/batch",
            { method: "POST", body: JSON.stringify({ books: [payload] }) }
          );
          if (saved.saved?.length) {
            doneCount += 1;
            syncedBuffer.push(...saved.saved);
          } else {
            throw new Error(saved.failed?.[0]?.error || "Không lưu được sách");
          }
        } catch (e) {
          failCount += 1;
          failedList.push(`${item.id} (${item.title.slice(0, 32)}): ${e instanceof Error ? e.message : "lỗi"}`);
        }

        setStats({
          done: doneCount,
          total: queue.length,
          skipped: skippedCount,
          failed: failCount,
          blobMb: Math.round((blobBytes / 1048576) * 10) / 10,
        });
        setProgress(
          `Đang đồng bộ ${doneCount + failCount}/${queue.length} cuốn · Thành công: ${doneCount} · Lỗi: ${failCount} · Blob đợt này: ${(blobBytes / 1048576).toFixed(1)} MB (${item.title.slice(0, 42)})`
        );
        if (syncedBuffer.length >= 25) {
          onSynced(syncedBuffer.splice(0, syncedBuffer.length));
        }
      }
    });

    await Promise.all(workers);
    if (syncedBuffer.length) onSynced(syncedBuffer.splice(0, syncedBuffer.length));
    setErrors(failedList);
    if (stopRef.current) {
      setStatus("paused");
      setProgress(`Đã tạm dừng tại ${doneCount}/${queue.length} cuốn. Bấm "Bắt đầu đồng bộ" lại để tiếp tục phần còn lại.`);
    } else {
      setStatus("done");
      setProgress(`✨ Hoàn tất đồng bộ ${doneCount}/${queue.length} cuốn mới (đã bỏ qua ${skippedCount} cuốn sẵn có · tổng Blob đợt này: ${(blobBytes / 1048576).toFixed(1)} MB${failCount ? ` · ${failCount} lỗi` : ""}).`);
    }
  }

  return (
    <div
      className={styles.notice}
      data-sync-status={status}
      style={{ alignItems: "flex-start", gap: 14, flexWrap: "wrap", marginBottom: 12 }}
    >
      <RefreshCw size={20} />
      <div style={{ flex: 1, minWidth: 260 }}>
        <strong>🔄 Đồng bộ kho sách sạch &amp; ảnh bìa lên Cloudflare R2 + Neon PostgreSQL</strong>
        <p style={{ marginTop: 4 }}>
          Đẩy trực tiếp toàn bộ sách hợp lệ đã lọc rác, khử trùng lặp SHA-256 và chuẩn hóa ảnh bìa lên Cloudflare R2 (10 GB miễn phí · $0 băng thông đọc) &amp; Neon PostgreSQL. Hỗ trợ tạm dừng và tiếp tục bất cứ lúc nào.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, alignItems: "center" }}>
          <select
            className={styles.categorySelect}
            value={mode}
            disabled={status === "running"}
            onChange={(e) => {
              const nextMode = e.target.value as SyncMode;
              setMode(nextMode);
              setPlan(null);
            }}
          >
            <option value="free-tier">Gói tinh tuyển · ~550 cuốn nổi bật (~534 MB · 5.3% R2 Free)</option>
            <option value="all-under-50mb">Toàn bộ kho sách sạch ≤ 50 MB (~4.8 GB · vừa gói R2 Free 10 GB)</option>
            <option value="epubs-only">Nhanh · Chỉ sách chữ EPUB + bìa thật (~15 MB R2)</option>
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={resyncPdfs}
              disabled={status === "running"}
              onChange={(e) => setResyncPdfs(e.target.checked)}
            />
            <span>Tải lại file PDF sau khi dọn Blob (giữ nguyên bìa &amp; EPUB)</span>
          </label>
          <input
            type="text"
            value={sourceUrl}
            disabled={status === "running"}
            onChange={(e) => setSourceUrl(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.14)", fontSize: 12.5, width: 190 }}
            aria-label="Địa chỉ máy chủ cục bộ"
          />
          <button
            type="button"
            className={styles.secondary}
            disabled={status === "running" || status === "checking"}
            onClick={() => void checkSource(mode)}
          >
            Kiểm tra kết nối
          </button>
          {status !== "running" ? (
            <button type="button" className={styles.primary} onClick={() => void startSync()}>
              <CloudUpload size={15} /> {status === "paused" ? "Tiếp tục đồng bộ" : "Đồng bộ ngay"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                stopRef.current = true;
              }}
            >
              Tạm dừng
            </button>
          )}
        </div>
        {stats.total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 8, borderRadius: 99, background: "rgba(0,0,0,.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.round(((stats.done + stats.failed) / Math.max(1, stats.total)) * 100))}%`,
                  background: "var(--accent, #b84568)",
                  transition: "width .25s ease",
                }}
              />
            </div>
            <p style={{ marginTop: 6, fontSize: 12, fontWeight: 600 }}>
              Tiến độ: {stats.done}/{stats.total} thành công · Đã có sẵn: {stats.skipped} · Lỗi: {stats.failed} · Blob: {stats.blobMb} MB
            </p>
          </div>
        )}
        {progress && <p style={{ marginTop: 6, fontSize: 12.5 }}>{progress}</p>}
        {errors.length > 0 && (
          <p className={styles.error} style={{ marginTop: 6, fontSize: 11.5 }}>
            Chi tiết lỗi ({errors.length}): {errors.slice(0, 4).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

type StorageTelemetry = {
  activeBackend: "r2" | "vercel-blob";
  books: {
    total: number;
    active: number;
    byStatus: Record<string, number>;
    pdfBooks: number;
    epubBooks: number;
    missingCover: number;
    svgFallbackCover: number;
    copyrightReview: number;
    missingPdfAssets: number;
    missingCoverAssets: number;
    legacyBlobPublishedBooks: number;
    duplicateTitleGroups: number;
  };
  storage: {
    r2: {
      objects: number;
      mb: number;
      freeQuotaGb: number;
      usagePercentOfFree: number;
      estimatedMonthlyUsd: number;
    };
    vercelBlob: {
      objects: number;
      mb: number;
    };
  };
  users: { profiles: number };
};

function OperationsHealthPanel({ onNavigateBooks }: { onNavigateBooks: () => void }) {
  const [stats, setStats] = useState<StorageTelemetry | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(true);

  const loadStats = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      const data = await request<StorageTelemetry>("/api/admin/storage/stats");
      setStats(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chưa tải được dữ liệu hạ tầng.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return (
    <section className={styles.panel} aria-label="Trung tâm giám sát lưu trữ và chất lượng thư viện">
      <div className={styles.panelTitle}>
        <div>
          <h2>Trung tâm vận hành · Cloudflare R2 &amp; Sức khỏe kho sách</h2>
          <p>
            Giám sát dung lượng R2, chi phí ước tính, tỷ lệ ảnh bìa, bản quyền và tệp cần đồng bộ theo thời gian thực.
          </p>
        </div>
        <button type="button" className={styles.secondary} onClick={() => void loadStats()} disabled={busy}>
          <RefreshCw size={14} className={busy ? styles.spin : ""} /> Làm mới
        </button>
      </div>
      {err && <p className={styles.error}>{err}</p>}
      {stats && (
        <>
          <div className={styles.quickGrid4}>
            <div className={styles.quickCard}>
              <strong>☁️ Backend: {stats.activeBackend === "r2" ? "Cloudflare R2" : "Vercel Blob"}</strong>
              <small>
                R2: <b>{stats.storage.r2.mb} MB</b> ({stats.storage.r2.objects} tệp) · {stats.storage.r2.usagePercentOfFree}% gói Free 10 GB · Ước tính <b>${stats.storage.r2.estimatedMonthlyUsd}/tháng</b>.
              </small>
            </div>
            <div className={styles.quickCard}>
              <strong>🎨 Chất lượng bìa sách</strong>
              <small>
                Thiếu bìa: <b>{stats.books.missingCover}</b> · Bìa SVG dự phòng: <b>{stats.books.svgFallbackCover}</b> · Ảnh hỏng: <b>{stats.books.missingCoverAssets}</b>.
              </small>
            </div>
            <div className={styles.quickCard}>
              <strong>⚖️ Kiểm duyệt &amp; Trùng lặp</strong>
              <small>
                Cần rà soát bản quyền: <b>{stats.books.copyrightReview}</b> · Nhóm trùng tên: <b>{stats.books.duplicateTitleGroups}</b> · Sách chờ duyệt: <b>{(stats.books.byStatus.needs_review || 0) + (stats.books.byStatus.draft || 0)}</b>.
              </small>
            </div>
            <div className={styles.quickCard}>
              <strong>🔄 Trạng thái chuyển đổi Blob → R2</strong>
              <small>
                Blob cũ còn <b>{stats.storage.vercelBlob.objects}</b> tệp ({stats.storage.vercelBlob.mb} MB) · Sách đang trỏ Blob cũ: <b>{stats.books.legacyBlobPublishedBooks}</b> · PDF thiếu tệp: <b>{stats.books.missingPdfAssets}</b>.
              </small>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div className={styles.authMethodPills}>
              <span>Đang hiển thị: {stats.books.byStatus.published || 0}</span>
              <span>Sẵn sàng: {stats.books.byStatus.ready || 0}</span>
              <span>Cần rà soát: {stats.books.byStatus.needs_review || 0}</span>
              <span>Bản nháp: {stats.books.byStatus.draft || 0}</span>
              <span>Lưu trữ: {stats.books.byStatus.archived || 0}</span>
              <span>PDF: {stats.books.pdfBooks} · EPUB: {stats.books.epubBooks}</span>
            </div>
            <button type="button" className={styles.secondary} onClick={onNavigateBooks}>
              Mở trình quản lý sách <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

type OnlineCoverCandidate = {
  id: string;
  provider: "openlibrary" | "google-books";
  title: string;
  author: string;
  isbn?: string;
  publishedYear?: string;
  thumbnailUrl: string;
  imageUrl: string;
  licenseNote: string;
};

function OnlineCoverFinder({
  title,
  author,
  isbn,
  currentCoverAssetId,
  currentCover,
  onApply,
  onRestore,
}: {
  title: string;
  author: string;
  isbn?: string;
  currentCoverAssetId?: string;
  currentCover?: string;
  onApply: (assetId: string, coverSource: string) => void;
  onRestore: (prevAssetId?: string, prevCover?: string) => void;
}) {
  const [searchTitle, setSearchTitle] = useState(title);
  const [searchAuthor, setSearchAuthor] = useState(author);
  const [candidates, setCandidates] = useState<OnlineCoverCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState("");
  const [err, setErr] = useState("");
  const [previousCover, setPreviousCover] = useState<{ assetId?: string; cover?: string } | null>(null);

  useEffect(() => {
    setSearchTitle(title);
    setSearchAuthor(author);
  }, [title, author]);

  async function doSearch() {
    if (!searchTitle.trim() && !isbn?.trim()) {
      setErr("Nhập tên sách hoặc ISBN trước khi tìm kiếm bìa.");
      return;
    }
    setSearching(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (searchTitle.trim()) qs.set("title", searchTitle.trim());
      if (searchAuthor.trim()) qs.set("author", searchAuthor.trim());
      if (isbn?.trim()) qs.set("isbn", isbn.trim());
      const res = await request<{ candidates: OnlineCoverCandidate[] }>(`/api/admin/covers/search?${qs.toString()}`);
      setCandidates(res.candidates || []);
      if (!res.candidates?.length) {
        setErr("Không tìm thấy bìa khớp chính xác trên Open Library / Google Books. Bạn vẫn có thể giữ bìa cũ hoặc tải ảnh bìa riêng.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chưa tìm được bìa trực tuyến.");
    } finally {
      setSearching(false);
    }
  }

  async function importCover(cand: OnlineCoverCandidate) {
    setImportingId(cand.id);
    setErr("");
    try {
      if (!previousCover) {
        setPreviousCover({ assetId: currentCoverAssetId, cover: currentCover });
      }
      const res = await request<{ asset: { id: string }; coverSource: string }>("/api/admin/covers/search", {
        method: "POST",
        body: JSON.stringify({
          imageUrl: cand.imageUrl,
          bookTitle: searchTitle || title,
          provider: cand.provider,
        }),
      });
      onApply(res.asset.id, `${cand.provider}:${cand.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không tải được ảnh bìa này vào R2.");
    } finally {
      setImportingId("");
    }
  }

  return (
    <div className={styles.inlineNotice} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} />
          <strong>Tìm kiếm &amp; bổ sung ảnh bìa sách trực tuyến (Open Library / Google Books)</strong>
        </div>
        {previousCover && (
          <button
            type="button"
            className={styles.smallButton}
            onClick={() => {
              onRestore(previousCover.assetId, previousCover.cover);
              setPreviousCover(null);
            }}
          >
            ↩️ Hoàn tác · Giữ bìa cũ
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          type="text"
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          placeholder="Tên sách cần tìm bìa…"
          style={{ flex: "1 1 180px", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)", fontSize: 13 }}
        />
        <input
          type="text"
          value={searchAuthor}
          onChange={(e) => setSearchAuthor(e.target.value)}
          placeholder="Tác giả (tùy chọn)"
          style={{ flex: "1 1 140px", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,.15)", fontSize: 13 }}
        />
        <button type="button" className={styles.secondary} onClick={() => void doSearch()} disabled={searching}>
          {searching ? <LoaderCircle size={14} className={styles.spin} /> : <Search size={14} />}
          {searching ? "Đang tìm…" : "Tìm bìa online"}
        </button>
      </div>
      {err && <p className={styles.error} style={{ margin: 0, fontSize: 12 }}>{err}</p>}
      {candidates.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginTop: 4 }}>
          {candidates.map((cand) => (
            <div
              key={cand.id}
              style={{
                border: "1px solid rgba(0,0,0,.1)",
                borderRadius: 10,
                padding: 8,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <img
                src={cand.thumbnailUrl}
                alt={cand.title}
                style={{ width: "100%", aspectRatio: "2 / 3", objectFit: "cover", borderRadius: 6, background: "#f2f1ec" }}
                loading="lazy"
              />
              <small style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cand.title}>
                {cand.title}
              </small>
              <small style={{ fontSize: 10, opacity: 0.65 }}>
                {cand.provider === "openlibrary" ? "Open Library" : "Google Books"}
                {cand.publishedYear ? ` · ${cand.publishedYear}` : ""}
              </small>
              <button
                type="button"
                className={styles.smallButton}
                disabled={importingId !== ""}
                onClick={() => void importCover(cand)}
              >
                {importingId === cand.id ? "Đang lưu…" : "Dùng bìa này"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
