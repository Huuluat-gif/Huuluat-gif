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

type Tab = "overview" | "books" | "tracks" | "videos" | "design" | "plans" | "payments" | "orders";
type Kind = "books" | "tracks" | "videos" | "plans";
type AssetKind = "image" | "pdf" | "audio" | "video";
type ItemStatus = "draft" | "published" | "archived";
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
  season?: "classic" | "spring" | "summer" | "autumn" | "winter" | "festive";
  fxLevel?: "off" | "gentle" | "vivid";
  stars?: "off" | "soft" | "bright";
  petals?: boolean;
  aurora?: boolean;
  paperGrain?: boolean;
  cardStyle?: "hardcover" | "glass" | "minimal";
};
type Design = {
  brand: { name: string; tagline: string };
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
  { id: "design", label: "Giao diện", icon: Paintbrush },
  { id: "plans", label: "Gói thành viên", icon: CreditCard },
  { id: "orders", label: "Đơn hàng", icon: ShoppingBag },
  { id: "payments", label: "Thanh toán VNPAY", icon: ShieldCheck },
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
const defaultDecor: Required<DesignDecor> = {
  preset: "blush",
  season: "spring",
  fxLevel: "vivid",
  stars: "bright",
  petals: true,
  aurora: true,
  paperGrain: true,
  cardStyle: "hardcover",
};
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
  {id:'botanical',name:'Giấy Ấm & Rừng Thông',description:'Êm mắt, thanh lịch — bản sắc Lowf hiện đại.',palette:{primary:'#2c6546',background:'#f6f5f0',surface:'#fdfcf9',text:'#1d2b22'},font:'serif',radius:18},
  {id:'espresso',name:'Cà Phê & Giấy Kraft',description:'Ấm áp, cổ điển như hiệu sách gỗ.',palette:{primary:'#8a5436',background:'#f7f1e8',surface:'#fffcf7',text:'#2c211a'},font:'serif',radius:20},
  {id:'nordic',name:'Sương Sớm Bắc Âu',description:'Tươi sáng, gọn gàng và nhiều khoảng thở.',palette:{primary:'#2b5b78',background:'#f2f6f8',surface:'#fcfdfe',text:'#1b2a34'},font:'sans',radius:14},
  {id:'blush',name:'Lụa Ngà & Hoa Đào',description:'Dịu dàng, tinh tế và giàu chất thơ.',palette:{primary:'#9a4a61',background:'#faf4f3',surface:'#fffcfc',text:'#2e1f24'},font:'serif',radius:20},
  {id:'twilight',name:'Tím Khói & Mực Cổ',description:'Sáng tạo, sâu lắng cho buổi đọc tối.',palette:{primary:'#5b4785',background:'#f5f3f9',surface:'#fdfcff',text:'#231d30'},font:'serif',radius:18},
  {id:'collector',name:'Vàng Kim & Sách Quý',description:'Sang trọng, tinh tuyển ấn bản sưu tầm.',palette:{primary:'#92692c',background:'#faf7ee',surface:'#fffef9',text:'#292218'},font:'serif',radius:16},
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
  const state =
    item.status === "archived"
      ? "archived"
      : item.enabled !== undefined
        ? item.enabled
          ? "published"
          : "draft"
        : item.status || "draft";
  return (
    <span
      className={`${styles.badge} ${state === "published" ? styles.greenBadge : state === "archived" ? styles.grayBadge : styles.goldBadge}`}
    >
      <span />
      {state === "published"
        ? "Đang hiển thị"
        : state === "archived"
          ? "Đã lưu trữ"
          : "Bản nháp"}
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
      const ext =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "bin";
      const blob = await upload(
        `lowf/${userId}/${kind}/${crypto.randomUUID()}.${ext}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/uploads",
          clientPayload: JSON.stringify({ kind, title: file.name }),
          contentType: file.type || undefined,
          multipart: file.size > 10 * 1024 * 1024,
          abortSignal: controller.signal,
          onUploadProgress: ({ percentage }) =>
            setProgress(Math.round(percentage)),
        },
      );
      const result = await request<{ asset: { id: string } }>(
        "/api/uploads/finalize",
        {
          method: "POST",
          body: JSON.stringify({
            url: blob.url,
            kind,
            originalName: file.name,
          }),
        },
      );
      onChange(result.asset.id);
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
    const item: RecordItem = action === "draft" || action === "published" || action === "archived" ? { ...editor.item, status: action } : editor.item;
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
          {tabs.filter(t => ["design", "plans", "orders", "payments"].includes(t.id)).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? styles.navActive : ""}
              onClick={() => nav(id)}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon size={18} />
              {label}
              {id === "design" && <span className={styles.navNew}>Studio</span>}
              {tab === id && <ChevronRight size={15} className={styles.navArrow} />}
            </button>
          ))}
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.sidebarNote}>
            <Sparkles size={21} />
            <strong>
              Một chút chăm chút,
              <br />
              một thế giới riêng.
            </strong>
            <p>Mọi thay đổi lớn đều bắt đầu từ một ý tưởng nhỏ.</p>
            <a href="/" target="_blank" rel="noreferrer">
              Mở website <ArrowUpRight size={15} />
            </a>
          </div>
          <a
            className={styles.wordpressLink}
            href="/huong-dan.html"
            target="_blank"
            rel="noreferrer"
          >
            <FileText size={17} /> Hướng dẫn quản trị <ExternalLink size={12} />
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
            <div><strong>{environment==='preview'?'Preview · Môi trường thử nghiệm':'Website chính · Production'}</strong><span>{environment==='preview'?'Dữ liệu và tệp thử nghiệm được lưu riêng. Xuất bản tại đây chỉ thay đổi bản Preview.':'Lưu nháp để xem riêng; chỉ bấm Xuất bản khi muốn khách thấy thay đổi.'}</span></div>
            <a href={environment==='preview'?'https://lowf-library.vercel.app/admin':'https://lowf-library-preview.vercel.app/admin'} target="_blank" rel="noopener noreferrer">{environment==='preview'?'Mở quản trị website chính':'Mở môi trường Preview'} <ArrowUpRight size={15}/></a>
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
                      <p className={styles.eyebrow}>
                        CHÀO NGƯỜI CHĂM SÓC NHỮNG TRANG SÁCH
                      </p>
                      <h1>Hôm nay, bạn muốn tạo điều gì?</h1>
                      <p>Mọi thứ bạn cần để chăm chút cho thế giới Lowf.</p>
                      <a
                        href="/huong-dan.html"
                        target="_blank"
                        rel="noreferrer"
                        className={styles.textButton}
                      >
                        <BookOpen size={14} /> Hướng dẫn quản trị{" "}
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                    <span className={styles.date}>
                      {new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        dateStyle: "long",
                      }).format(new Date())}
                    </span>
                  </div>
                  <section className={styles.welcome}>
                    <div>
                      <span className={styles.welcomePill}>
                        <Leaf size={13} /> YOUR LITTLE CREATIVE CORNER
                      </span>
                      <h2>
                        Một thư viện.
                        <br />
                        <em>Dấu ấn của riêng bạn.</em>
                      </h2>
                      <p>
                        Thêm một cuốn sách hay, một bản nhạc dịu,
                        <br />
                        hoặc khoác cho Lowf một diện mạo mới.
                      </p>
                      <button
                        className={styles.primary}
                        onClick={() => openEditor("books")}
                      >
                        <Plus size={17} /> Thêm một cuốn sách
                      </button>
                    </div>
                    <div className={styles.welcomeArt} aria-hidden="true">
                      <span className={styles.artCircle} />
                      <span className={styles.artSpark}>✳</span>
                      <div className={styles.artBook1}>
                        <span>
                          LOWF
                          <br />
                          ORIGINALS
                        </span>
                        <BookOpen size={43} />
                        <b>
                          every page,
                          <br />a new beginning.
                        </b>
                      </div>
                      <div className={styles.artBook2}>
                        <Leaf size={38} />
                        <b>
                          a little
                          <br />
                          quiet.
                        </b>
                      </div>
                      <div className={styles.artNote}>made with care.</div>
                    </div>
                  </section>
                  <section className={styles.managementGuide} aria-label="Quản lý và phát triển website">
                    <div><span className={styles.eyebrow}>BẠN MUỐN CHỈNH SỬA LOWF?</span><h2>Nội dung, diện mạo và tính năng.</h2><p>Thêm sách và media ngay tại Studio. Đổi màu, banner hoặc sắp xếp trang chủ trong Giao diện. Những tính năng mới hoặc bố cục tùy ý cần cập nhật mã nguồn và triển khai lên Vercel.</p></div>
                    <div className={styles.managementButtons}>
                      <button className={styles.primary} onClick={()=>openEditor('books')}><Plus size={16}/>Thêm sách</button>
                      <button className={styles.secondary} onClick={()=>nav('design')}><Paintbrush size={16}/>Đổi giao diện</button>
                      <button className={styles.secondary} onClick={()=>nav('payments')}><CreditCard size={16}/>Thiết lập VNPAY</button>
                      <a className={styles.secondary} href="/api/admin/source"><CloudUpload size={16}/>Tải mã nguồn</a>
                    </div>
                    <p className={styles.commerceStatus}><span className={commerceEnabled?styles.savedDot:styles.unsavedDot}/>{commerceChecked?(commerceEnabled?'VNPAY production đã được cấu hình. Hãy kiểm tra giao dịch thật trước khi mở bán rộng rãi.':'Thanh toán thật chưa mở. Bạn có thể thiết lập và thử VNPAY Sandbox trong mục Thanh toán.'):'Chưa xác định được trạng thái thanh toán. Mở mục Thanh toán để kiểm tra.'}</p>
                    <div className={styles.authSecurityBox}>
                      <div>
                        <strong><ShieldCheck size={15}/> Hệ thống Đăng nhập &amp; Bảo mật tài khoản</strong>
                        <p>Chủ website đang đăng nhập: <b>{user.email}</b> (Đã xác minh email). Hỗ trợ 3 phương thức hiện đại: <b>Mã Email 6 số không mật khẩu</b>, <b>Đăng nhập Google 1 chạm</b> và <b>Email + Mật khẩu</b> (có xác minh OTP &amp; khôi phục mật khẩu).</p>
                      </div>
                      <div className={styles.authMethodPills}>
                        <span>✓ Mã Email OTP (Không mật khẩu)</span>
                        <span>✓ Google OAuth 1 chạm</span>
                        <span>✓ Bảo vệ quyền chủ web theo phiên</span>
                      </div>
                    </div>
                  </section>
                  <div className={styles.stats}>
                    {(["books", "tracks", "videos"] as Kind[]).map((kind) => {
                      const Icon = labels[kind].icon;
                      return (
                        <button
                          key={kind}
                          onClick={() => nav(kind)}
                          className={styles.stat}
                        >
                          <span>
                            <Icon size={22} />
                          </span>
                          <div>
                            <small>{labels[kind].plural}</small>
                            <strong>
                              {
                                content[kind].filter(
                                  (x) => x.status !== "archived",
                                ).length
                              }
                            </strong>
                            <p>
                              {
                                content[kind].filter(
                                  (x) => x.status === "published",
                                ).length
                              }{" "}
                              đang hiển thị trên website
                            </p>
                          </div>
                          <ArrowUpRight size={17} />
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.overviewColumns}>
                    <section className={styles.panel}>
                      <div className={styles.panelTitle}>
                        <div>
                          <h2>Một ý tưởng mới</h2>
                          <p>Bắt đầu từ một việc nhỏ.</p>
                        </div>
                        <Sparkles size={19} />
                      </div>
                      <div className={styles.quickActions}>
                        {(
                          [
                            {
                              kind: "books",
                              title: "Thêm một cuốn sách",
                              text: "Ảnh bìa, thông tin & file PDF",
                              icon: BookOpen,
                            },
                            {
                              kind: "tracks",
                              title: "Gửi một chút âm nhạc",
                              text: "Tải bản nhạc và tạo không gian đọc",
                              icon: Headphones,
                            },
                            {
                              kind: "videos",
                              title: "Kể bằng hình ảnh",
                              text: "Thêm video vào thư viện",
                              icon: Film,
                            },
                          ] as const
                        ).map((a) => (
                          <button
                            key={a.kind}
                            onClick={() => openEditor(a.kind)}
                          >
                            <span>
                              <a.icon size={21} />
                            </span>
                            <div>
                              <strong>{a.title}</strong>
                              <small>{a.text}</small>
                            </div>
                            <ArrowRight size={16} />
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className={styles.designCallout}>
                      <span className={styles.eyebrow}>
                        YOUR BRAND, YOUR WORLD
                      </span>
                      <Paintbrush className={styles.calloutBrush} size={52} />
                      <h2>
                        Một diện mạo mới.
                        <br />
                        Vẫn rất là bạn.
                      </h2>
                      <p>
                        Chọn màu, sửa lời chào và sắp xếp trang chủ. Xem trước
                        rồi mới xuất bản.
                      </p>
                      <button
                        className={styles.secondary}
                        onClick={() => nav("design")}
                      >
                        Thiết kế website <ArrowUpRight size={15} />
                      </button>
                    </section>
                  </div>
                  <section className={styles.panel}>
                    <div className={styles.panelTitle}>
                      <div>
                        <h2>Đang được chăm chút</h2>
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
                        className={styles.textButton}
                        onClick={() => nav("books")}
                      >
                        Đến thư viện <ArrowRight size={14} />
                      </button>
                    </div>
                    {content.books.slice(0, 4).length ? (
                      <div className={styles.recentBooks}>
                        {content.books.slice(0, 4).map((b) => (
                          <button
                            key={b.id}
                            onClick={() => openEditor("books", b)}
                          >
                            <span className={styles.recentCover}>
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
                            </span>
                            <span>
                              <strong>{titleOf(b)}</strong>
                              <small>{b.author || "Chưa có tác giả"}</small>
                              <StateBadge item={b} />
                            </span>
                          </button>
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
                        <option value="vanhocvn">Văn học Việt Nam</option>
                        <option value="vanhocqt">Văn học nước ngoài</option>
                        <option value="kinhte">Kinh tế &amp; Đầu tư</option>
                        <option value="dacbiet">Tuyển chọn</option>
                      </select>
                    )}
                    <div className={styles.filterTabs}>
                      {[
                        ["all", "Tất cả"],
                        ["published", "Đang hiển thị"],
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
                          <Sparkles size={18} /> Chủ đề 4 Mùa &amp; Trang trí không gian
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
                        </div>
                        <div className={styles.decorSwitches}>
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
                          <option value="vanhocvn">Văn học Việt Nam</option>
                          <option value="vanhocqt">Văn học nước ngoài</option>
                          <option value="kinhte">Kinh tế & Đầu tư</option>
                          <option value="dacbiet">Đặc biệt</option>
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
                <button key="publish-content" className={styles.primary} type="submit" value={editor.kind === "plans" ? "plan" : editor.item.status === "archived" ? "archived" : "published"} disabled={saving}>
                  {saving ? <LoaderCircle className={styles.spin} size={16} /> : <Check size={17} />}
                  {saving ? "Đang lưu…" : editor.kind === "plans" ? "Lưu gói" : editor.item.status === "archived" ? "Lưu trữ nội dung" : editor.kind === "books" ? "Xuất bản sách" : "Xuất bản"}
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
