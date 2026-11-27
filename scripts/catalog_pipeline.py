#!/usr/bin/env python3
"""
Lowf Library — Smart All-Books Ingestion, Deduplication & 5-Tier Cover Pipeline
==============================================================================
Features:
  1. Scans all authorized book folders (never scans system/unrelated folders).
  2. Strictly filters out non-book junk (description.txt, metadata.json, .docx,
     .DS_Store, __MACOSX, ._*, empty/corrupt files without valid PDF/ZIP magic).
  3. Exact SHA-256 deduplication + normalized Vietnamese/ASCII title deduplication:
     - When exact SHA-256 matches, drops redundant duplicate copies.
     - When the same book exists as both crisp EPUB and heavy scanned PDF, keeps
       the crisp EPUB as primary (10-40x smaller, better reflow + TTS + IPA) while
       recording the alternate PDF in `alternates`.
  4. 5-Tier Cover Priority Pipeline:
     - Tier 1: Matching folder cover image (cover.jpg / .webp / .png)
     - Tier 2: Embedded EPUB cover image (OPF meta cover / manifest image)
     - Tier 3: First page render of PDF (via macOS sips/QuickLook when run locally)
     - Tier 4: Verified Open Library / Google Books bibliographic cover lookup
               (using /usr/bin/curl TLS 1.3; strict title match guard; preserves old
               cover if no verified match is found!)
     - Tier 5: High-contrast Lowf Library designer editorial SVG fallback
  5. Outputs reproducible JSON manifests & reports without mutating source files
     or committing binary books to Git.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

AUTHORIZED_FOLDERS = [
    "1000+ SÁCH BÁN HÀNG-MARKTING",
    "40+ EBOOK ĐẦU TƯ HOT TRỊ GIÁ 10 Triệu",
    "BIG IDEAS SIMPLY EXPLAINED",
    "Cafe Books",
    "Harry Potter full 7 tập",
    "LIBROS HARRY POTTER",
    "LUAT",
    "Lịch sử văn minh thế giới - Will Durant Ariel Durant",
    "Peter Pan",
    "Tiếng anh bản sao ",
    "Truyện Tranh",
    "books",
    "tải sách về đây",
    "Đọc sách 📖",
]

JUNK_EXTENSIONS = {
    ".txt", ".json", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".csv",
    ".html", ".htm", ".xml", ".url", ".lnk", ".zip", ".rar", ".7z",
    ".exe", ".dmg", ".pkg", ".tmp", ".log", ".bak", ".ini", ".db",
}
COVER_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
BOOK_EXTENSIONS = {".epub", ".pdf"}
MAX_UPLOAD_PDF_BYTES = 50 * 1024 * 1024  # 50 MB R2 direct single-file target

FOLDER_CATEGORY_MAP = {
    "1000+ SÁCH BÁN HÀNG-MARKTING": "marketing",
    "40+ EBOOK ĐẦU TƯ HOT TRỊ GIÁ 10 Triệu": "kinhte",
    "BIG IDEAS SIMPLY EXPLAINED": "khoahoc",
    "Cafe Books": "kynang",
    "Harry Potter full 7 tập": "tieuthuyet",
    "LIBROS HARRY POTTER": "tieuthuyet",
    "LUAT": "phapluat",
    "Lịch sử văn minh thế giới - Will Durant Ariel Durant": "lichsu",
    "Peter Pan": "tieuthuyet",
    "Tiếng anh bản sao ": "ngoaingu",
    "Truyện Tranh": "truyentranh",
    "books": "vanhocqt",
    "tải sách về đây": "dacbiet",
    "Đọc sách 📖": "dacbiet",
}

CATEGORY_KEYWORDS = [
    ("phapluat", ["luật", "pháp luật", "hiến pháp", "tòa án", "chính trị", "nhà nước", "hình sự", "dân sự", "tố tụng"]),
    ("ngoaingu", ["ielts", "toeic", "english", "oxford", "cambridge", "grammar", "vocabulary", "tiếng anh", "tiếng nhật", "tiếng trung", "tiếng hàn", "hack não", "ngữ pháp"]),
    ("marketing", ["marketing", "bán hàng", "sales", "thương hiệu", "branding", "content", "quảng cáo", "copywriting", "khách hàng", "chốt sale", "seo"]),
    ("kinhte", ["chứng khoán", "đầu tư", "tài chính", "kinh tế", "doanh nghiệp", "khởi nghiệp", "startup", "quản trị", "lãnh đạo", "tiền bạc", "giàu", "bitcoin", "forex", "bất động sản", "kế toán", "buffett", "peter lynch", "trading"]),
    ("tamly", ["tâm lý", "tư duy", "não bộ", "thao túng", "cảm xúc", "trầm cảm", "chữa lành", "nlp", "thấu hiểu", "freud", "jung", "kahneman", "hành vi"]),
    ("lichsu", ["lịch sử", "chiến tranh", "văn minh", "đế chế", "triều đại", "sử ký", "việt nam sử", "thế chiến", "sapiens", "đại việt", "tiểu sử", "hồi ký"]),
    ("khoahoc", ["khoa học", "vũ trụ", "vật lý", "toán học", "sinh học", "lập trình", "python", "ai", "trí tuệ nhân tạo", "công nghệ", "y học", "dinh dưỡng", "sức khỏe", "giải phẫu"]),
    ("trinhtham", ["trinh thám", "án mạng", "sherlock", "agatha", "higashino", "kinh dị", "bí ẩn", "sát nhân", "pháp y", "tội phạm"]),
    ("tamlinh", ["phật", "thiền", "đạo", "tâm linh", "kinh dịch", "phong thủy", "nhân quả", "tôn giáo", "triết học", "khắc kỷ", "stoic", "lão tử", "trang tử"]),
    ("truyentranh", ["manga", "comic", "truyện tranh", "doraemon", "conan", "one piece", "naruto", "dragon ball", "shin"]),
    ("vanhocvn", ["nguyễn nhật ánh", "nam cao", "vũ trọng phụng", "ngô tất tố", "tô hoài", "xuân diệu", "hồ biểu chánh", "nguyễn huy thiệp", "nguyễn ngọc tư", "dế mèn", "tắt đèn", "số đỏ", "chí phèo", "truyện kiều"]),
    ("tieuthuyet", ["tiểu thuyết", "harry potter", "chúa tể những chiếc nhẫn", "kiếm hiệp", "kim dung", "cổ long", "tiên hiệp", "ngôn tình", "fantasy", "sci-fi"]),
    ("kynang", ["thói quen", "kỹ năng", "giao tiếp", "thành công", "hiệu quả", "tập trung", "quản lý thời gian", "đắc nhân tâm", "atomic habits", "tự tin", "thuyết trình", "kỷ luật"]),
]


def strip_accents(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    nfd = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def normalize_title_key(raw: str) -> str:
    s = strip_accents(raw.lower())
    s = re.sub(r"\b(ebook|pdf|epub|full|prc|mobi|azw3|ban dep|scan|tai ban|pdfdrive|com|vnthuquan|dtv)\b", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return re.sub(r"\s+", " ", s)


def clean_display_title_and_author(stem: str) -> tuple[str, str]:
    s = stem.replace("_", " ")
    s = re.sub(r"\s*[\(\[]?(?:PDFDrive(?:\.com)?|dtv-ebook|vnthuquan|sachvui|tve-4u|full|scan|ebook)[\)\]]?\s*", " ", s, flags=re.I)
    s = re.sub(r"^\d{1,4}[\.\-\s_]+(?=[A-Za-zÀ-ỹ])", "", s)
    s = re.sub(r"\s+", " ", s).strip(" -–—·")
    author = "Lowf Tuyển Chọn"
    parts = re.split(r"\s+[-–—]\s+", s, maxsplit=1)
    if len(parts) == 2 and 3 <= len(parts[1].strip()) <= 50 and len(parts[0].strip()) >= 3:
        s, author = parts[0].strip(), parts[1].strip()
    return (s[:155] or "Sách thư viện Lowf"), (author[:115] or "Lowf Tuyển Chọn")


def classify_category(title: str, folder: str, relpath: str) -> str:
    hay = f"{title} {relpath}".lower()
    for cat, kws in CATEGORY_KEYWORDS:
        if any(kw in hay for kw in kws):
            return cat
    return FOLDER_CATEGORY_MAP.get(folder, "dacbiet")


def detect_language(title: str, folder: str) -> str:
    if folder.strip().lower().startswith("tiếng anh"):
        return "en"
    t = title.lower()
    has_vn = bool(re.search(r"[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", t))
    if not has_vn and len(re.findall(r"[a-z]{3,}", t)) >= 2:
        return "en"
    return "vi"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def inspect_book_magic(path: Path, ext: str) -> tuple[bool, str, bool]:
    """Returns (is_valid, reason, has_embedded_cover)."""
    try:
        size = path.stat().st_size
        if size < 1024:
            return False, f"empty_or_tiny ({size}B)", False
        with path.open("rb") as f:
            head = f.read(1024)
        if ext == ".pdf":
            if b"%PDF-" not in head:
                return False, "invalid_pdf_magic", False
            return True, "ok", False
        if ext == ".epub":
            if not head.startswith(b"PK\x03\x04"):
                return False, "invalid_zip_magic", False
            with zipfile.ZipFile(path, "r") as zf:
                names = zf.namelist()
                has_html = any(n.lower().endswith((".xhtml", ".html", ".htm")) for n in names)
                if not has_html:
                    return False, "epub_no_html", False
                has_img = any(
                    ("cover" in n.lower() or "bia" in n.lower() or n.lower().startswith(("images/", "oebps/images/")))
                    and Path(n).suffix.lower() in COVER_EXTENSIONS
                    for n in names
                )
                return True, "ok", has_img
    except Exception as exc:
        return False, f"read_error:{type(exc).__name__}", False
    return False, "unsupported_ext", False


def lookup_online_cover_curl(title: str, author: str) -> dict[str, Any] | None:
    """
    Uses macOS /usr/bin/curl (SecureTransport TLS 1.3) to query Open Library first,
    then Google Books as fallback. Never returns unverified or unrelated covers.
    """
    q_title = urllib.parse.quote(title[:100])
    q_author = urllib.parse.quote(author[:60]) if author and author != "Lowf Tuyển Chọn" else ""
    ol_url = f"https://openlibrary.org/search.json?title={q_title}" + (f"&author={q_author}" if q_author else "") + "&limit=3&fields=title,author_name,cover_i,isbn,first_publish_year"
    try:
        out = subprocess.check_output(
            ["/usr/bin/curl", "-sS", "--max-time", "8", "-A", "LowfLibrary/2.0", ol_url],
            stderr=subprocess.DEVNULL,
        )
        data = json.loads(out.decode("utf-8", "ignore"))
        target_norm = normalize_title_key(title)
        for doc in data.get("docs", [])[:3]:
            cid = doc.get("cover_i")
            if not cid:
                continue
            cand_norm = normalize_title_key(str(doc.get("title", "")))
            if not cand_norm:
                continue
            # Require meaningful word overlap to prevent wrong-book covers
            t_words = set(target_norm.split())
            c_words = set(cand_norm.split())
            overlap = len(t_words & c_words) / max(1, min(len(t_words), len(c_words)))
            if overlap >= 0.5:
                return {
                    "provider": "openlibrary",
                    "coverUrl": f"https://covers.openlibrary.org/b/id/{cid}-L.jpg",
                    "matchedTitle": doc.get("title"),
                    "isbn": (doc.get("isbn") or [None])[0],
                    "publishedYear": doc.get("first_publish_year"),
                    "overlap": round(overlap, 2),
                }
    except Exception:
        pass

    gb_q = urllib.parse.quote(f"{title[:90]} {author[:50] if author != 'Lowf Tuyển Chọn' else ''}".strip())
    gb_url = f"https://www.googleapis.com/books/v1/volumes?q={gb_q}&maxResults=3&printType=books"
    try:
        out = subprocess.check_output(
            ["/usr/bin/curl", "-sS", "--max-time", "8", "-A", "LowfLibrary/2.0", gb_url],
            stderr=subprocess.DEVNULL,
        )
        data = json.loads(out.decode("utf-8", "ignore"))
        target_norm = normalize_title_key(title)
        t_words = set(target_norm.split())
        for item in data.get("items", [])[:3]:
            vi = item.get("volumeInfo", {})
            thumb = (vi.get("imageLinks") or {}).get("thumbnail") or ""
            if not thumb:
                continue
            cand_norm = normalize_title_key(str(vi.get("title", "")))
            c_words = set(cand_norm.split())
            overlap = len(t_words & c_words) / max(1, min(len(t_words), len(c_words)))
            if overlap >= 0.5:
                https_thumb = re.sub(r"^http://", "https://", thumb).replace("&edge=curl", "")
                return {
                    "provider": "google-books",
                    "coverUrl": https_thumb,
                    "matchedTitle": vi.get("title"),
                    "isbn": ((vi.get("industryIdentifiers") or [{}])[0]).get("identifier"),
                    "publishedYear": str(vi.get("publishedDate", ""))[:4] or None,
                    "overlap": round(overlap, 2),
                }
    except Exception:
        pass
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Lowf Library All-Books Ingestion, Dedupe & Cover Audit Pipeline")
    parser.add_argument("--downloads-root", default="/Users/admin/Downloads", help="Root folder containing authorized book directories")
    parser.add_argument("--out-dir", required=True, help="Output directory for manifest & report JSON (outside Git!)")
    parser.add_argument("--enrich-covers-limit", type=int, default=0, help="Verify online cover lookup for up to N coverless books (0 = skip network)")
    args = parser.parse_args()

    root = Path(args.downloads_root)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    raw_files = 0
    raw_bytes = 0
    excluded_junk: list[dict[str, Any]] = []
    excluded_corrupt: list[dict[str, Any]] = []
    standalone_covers: dict[str, Path] = {}
    valid_candidates: list[dict[str, Any]] = []

    # Pass 1: Collect folder covers & inspect all files (NFC/NFD-safe for macOS APFS)
    authorized_nfc = {unicodedata.normalize("NFC", n).strip().lower(): n for n in AUTHORIZED_FOLDERS}
    matched_folders: list[tuple[str, Path]] = []
    if root.exists():
        for entry in sorted(root.iterdir(), key=lambda p: p.name):
            if not entry.is_dir():
                continue
            norm_name = unicodedata.normalize("NFC", entry.name).strip().lower()
            if norm_name in authorized_nfc:
                matched_folders.append((authorized_nfc[norm_name], entry))

    for folder_name, folder_path in matched_folders:
        for dirpath, dirnames, filenames in os.walk(folder_path):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "__MACOSX"]
            dp = Path(dirpath)
            for fname in filenames:
                fpath = dp / fname
                try:
                    st = fpath.stat()
                except OSError:
                    continue
                raw_files += 1
                raw_bytes += st.st_size
                ext = fpath.suffix.lower()
                rel = str(fpath.relative_to(root))

                if fname.startswith(".") or fname.startswith("._"):
                    excluded_junk.append({"path": rel, "reason": "hidden_or_appledouble", "bytes": st.st_size})
                    continue

                if ext in COVER_EXTENSIONS:
                    standalone_covers[str(dp)] = fpath
                    standalone_covers[normalize_title_key(fpath.stem)] = fpath
                    continue

                if ext not in BOOK_EXTENSIONS:
                    excluded_junk.append({"path": rel, "reason": f"non_book_ext:{ext or 'none'}", "bytes": st.st_size})
                    continue

                ok, reason, has_embedded_cover = inspect_book_magic(fpath, ext)
                if not ok:
                    excluded_corrupt.append({"path": rel, "reason": reason, "bytes": st.st_size})
                    continue

                digest = sha256_file(fpath)
                title, author = clean_display_title_and_author(fpath.stem)
                norm_title = normalize_title_key(title)
                # Also look for sibling metadata.json (for folder-based ebook bundles)
                sibling_meta = dp / "metadata.json"
                if sibling_meta.exists():
                    try:
                        m = json.loads(sibling_meta.read_text("utf-8", errors="ignore"))
                        if isinstance(m, dict):
                            if m.get("title"):
                                title = str(m["title"]).strip()[:155]
                                norm_title = normalize_title_key(title)
                            if m.get("author"):
                                author = str(m["author"]).strip()[:115]
                    except Exception:
                        pass

                folder_cover = None
                if str(dp) in standalone_covers:
                    folder_cover = str(standalone_covers[str(dp)].relative_to(root))
                elif norm_title in standalone_covers:
                    folder_cover = str(standalone_covers[norm_title].relative_to(root))

                valid_candidates.append({
                    "path": rel,
                    "folder": folder_name,
                    "ext": ext.lstrip("."),
                    "bytes": st.st_size,
                    "sha256": digest,
                    "title": title,
                    "author": author,
                    "normTitle": norm_title,
                    "category": classify_category(title, folder_name, rel),
                    "language": detect_language(title, folder_name),
                    "folderCover": folder_cover,
                    "hasEmbeddedCover": has_embedded_cover,
                    "oversizePdf": ext == ".pdf" and st.st_size > MAX_UPLOAD_PDF_BYTES,
                })

    # Pass 2: Exact SHA-256 deduplication
    seen_sha: dict[str, dict[str, Any]] = {}
    exact_duplicates: list[dict[str, Any]] = []
    unique_by_sha: list[dict[str, Any]] = []
    for item in valid_candidates:
        sha = item["sha256"]
        if sha in seen_sha:
            # Prefer record that has folderCover
            if item["folderCover"] and not seen_sha[sha]["folderCover"]:
                seen_sha[sha]["folderCover"] = item["folderCover"]
            exact_duplicates.append({"duplicate": item["path"], "kept": seen_sha[sha]["path"], "sha256": sha, "bytes": item["bytes"]})
        else:
            seen_sha[sha] = item
            unique_by_sha.append(item)

    # Pass 3: Normalized title deduplication (keep best edition: EPUB > <=50MB PDF > >50MB PDF)
    def edition_rank(it: dict[str, Any]) -> tuple[int, int, int, int]:
        is_epub = 1 if it["ext"] == "epub" else 0
        under_limit = 1 if not it["oversizePdf"] else 0
        has_cov = 1 if (it["folderCover"] or it["hasEmbeddedCover"]) else 0
        # For PDFs prefer crisp mid-size; for EPUB prefer larger text/cover completeness
        size_score = it["bytes"] if is_epub else -abs(it["bytes"] - 6_000_000)
        return (is_epub, under_limit, has_cov, size_score)

    title_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for it in unique_by_sha:
        key = it["normTitle"] or it["sha256"][:16]
        title_groups[key].append(it)

    canonical_books: list[dict[str, Any]] = []
    title_deduped: list[dict[str, Any]] = []
    for key, grp in title_groups.items():
        grp_sorted = sorted(grp, key=edition_rank, reverse=True)
        winner = dict(grp_sorted[0])
        alts = grp_sorted[1:]
        if alts:
            # Inherit cover if an alternate had a real folder cover
            if not winner["folderCover"]:
                for alt in alts:
                    if alt["folderCover"]:
                        winner["folderCover"] = alt["folderCover"]
                        break
            winner["alternateEditions"] = [
                {"path": a["path"], "ext": a["ext"], "bytes": a["bytes"], "sha256": a["sha256"]}
                for a in alts
            ]
            for a in alts:
                title_deduped.append({
                    "mergedPath": a["path"],
                    "keptPath": winner["path"],
                    "title": winner["title"],
                    "bytesSaved": a["bytes"],
                })
        else:
            winner["alternateEditions"] = []

        # Assign 5-tier cover tier
        if winner["folderCover"]:
            winner["coverTier"] = "tier1_folder_cover"
        elif winner["hasEmbeddedCover"]:
            winner["coverTier"] = "tier2_epub_embedded"
        elif winner["ext"] == "pdf":
            winner["coverTier"] = "tier3_pdf_page1"
        else:
            winner["coverTier"] = "tier5_svg_pending_online"

        winner["slugId"] = "bk-" + winner["sha256"][:12]
        winner["importStatus"] = "oversize_needs_compression" if winner["oversizePdf"] else "ready_for_staging"
        winner["copyrightStatus"] = "needs_review"
        canonical_books.append(winner)

    # Pass 4: Optional verified online cover enrichment (only for books lacking Tier 1/2/3 photo cover!)
    online_enriched: list[dict[str, Any]] = []
    if args.enrich_covers_limit > 0:
        targets = [b for b in canonical_books if b["coverTier"] == "tier5_svg_pending_online"][: args.enrich_covers_limit]
        for b in targets:
            found = lookup_online_cover_curl(b["title"], b["author"])
            if found:
                b["coverTier"] = f"tier4_online_{found['provider']}"
                b["onlineCover"] = found
                if found.get("isbn"):
                    b["isbn"] = found["isbn"]
                if found.get("publishedYear"):
                    b["publishedYear"] = found["publishedYear"]
                online_enriched.append({"id": b["slugId"], "title": b["title"], **found})

    # Compute exact metrics
    ready_books = [b for b in canonical_books if b["importStatus"] == "ready_for_staging"]
    oversize_books = [b for b in canonical_books if b["importStatus"] == "oversize_needs_compression"]
    ready_epub = [b for b in ready_books if b["ext"] == "epub"]
    ready_pdf = [b for b in ready_books if b["ext"] == "pdf"]

    # Estimate R2 storage footprint:
    # - EPUB chapters stored in Neon JSONB; only cover (~35 KB) stored in R2!
    # - PDF books store original PDF + ~35 KB cover in R2!
    est_r2_pdf_bytes = sum(b["bytes"] for b in ready_pdf)
    est_r2_cover_bytes = len(ready_books) * 35 * 1024
    est_r2_total_bytes = est_r2_pdf_bytes + est_r2_cover_bytes
    est_r2_gb = est_r2_total_bytes / (1024 ** 3)

    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "rawScan": {
            "foldersScanned": len(matched_folders),
            "folderNames": [name for name, _ in matched_folders],
            "totalFiles": raw_files,
            "totalMb": round(raw_bytes / 1048576, 2),
            "standaloneCoverImages": len({str(p) for p in standalone_covers.values()}),
        },
        "exclusions": {
            "nonBookJunkFiles": len(excluded_junk),
            "nonBookJunkMb": round(sum(x["bytes"] for x in excluded_junk) / 1048576, 2),
            "nonBookByReason": dict(Counter(x["reason"] for x in excluded_junk)),
            "corruptFiles": len(excluded_corrupt),
            "corruptList": excluded_corrupt,
            "exactSha256Duplicates": len(exact_duplicates),
            "exactDuplicatesSavedMb": round(sum(x["bytes"] for x in exact_duplicates) / 1048576, 2),
            "titleMergedAlternateEditions": len(title_deduped),
            "titleMergedSavedMb": round(sum(x["bytesSaved"] for x in title_deduped) / 1048576, 2),
        },
        "canonicalCatalog": {
            "totalUniqueBooks": len(canonical_books),
            "readyUnder50Mb": len(ready_books),
            "readyEpubCount": len(ready_epub),
            "readyPdfCount": len(ready_pdf),
            "oversizePdfOver50Mb": len(oversize_books),
            "oversizePdfTotalMb": round(sum(b["bytes"] for b in oversize_books) / 1048576, 2),
            "byCategory": dict(Counter(b["category"] for b in ready_books).most_common()),
            "byLanguage": dict(Counter(b["language"] for b in ready_books).most_common()),
            "byCoverTier": dict(Counter(b["coverTier"] for b in ready_books)),
            "onlineEnrichedCount": len(online_enriched),
            "copyrightNeedsReview": sum(1 for b in ready_books if b["copyrightStatus"] == "needs_review"),
        },
        "r2StorageProjection": {
            "readyPdfMb": round(est_r2_pdf_bytes / 1048576, 2),
            "estimatedCoversMb": round(est_r2_cover_bytes / 1048576, 2),
            "totalProjectedMb": round(est_r2_total_bytes / 1048576, 2),
            "totalProjectedGb": round(est_r2_gb, 3),
            "fitsCloudflareR2FreeTier10Gb": est_r2_gb <= 10.0,
            "percentOf10GbFreeTier": round((est_r2_gb / 10.0) * 100, 2),
            "estimatedMonthlyStorageUsd": round(max(0.0, est_r2_gb - 10.0) * 0.015, 2),
            "estimatedMonthlyEgressUsd": 0.0,
        },
    }

    (out_dir / "catalog_pipeline_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), "utf-8")
    (out_dir / "catalog_pipeline_manifest.json").write_text(json.dumps(canonical_books, ensure_ascii=False, indent=2), "utf-8")
    (out_dir / "catalog_online_covers.json").write_text(json.dumps(online_enriched, ensure_ascii=False, indent=2), "utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
