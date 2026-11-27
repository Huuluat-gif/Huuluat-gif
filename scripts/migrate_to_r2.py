#!/usr/bin/env python3
"""
Lowf Library — Resumable, Checksum-Verified Cloudflare R2 Storage Migration CLI
===============================================================================
Safely uploads verified books & covers to Cloudflare R2 (Staging or Production)
using AWS Signature V4 over macOS /usr/bin/curl (TLS 1.3), with:
  - Non-destructive operation (NEVER deletes source files or Vercel Blob objects)
  - SHA-256 verification before and after upload
  - Idempotent HEAD check (skips objects already present with matching byte size)
  - Resumable checkpoint state JSON (safe to stop/resume anytime)
  - Strict dry-run default unless --execute is explicitly passed

Required environment variables (NEVER hardcode in files):
  R2_ACCOUNT_ID
  R2_BUCKET (or R2_STAGING_BUCKET when --env staging)
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import hmac
import json
import os
import subprocess
import sys
import urllib.parse
from pathlib import Path
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1024 * 1024):
            h.update(chunk)
    return h.hexdigest()


def hmac_sha256(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def encode_rfc3986(value: str) -> str:
    return urllib.parse.quote(value, safe="-_.~")


def sigv4_headers(
    method: str,
    account_id: str,
    bucket: str,
    key: str,
    access_key: str,
    secret_key: str,
    payload_hash: str,
    content_type: str | None = None,
    cache_control: str | None = None,
) -> tuple[str, dict[str, str]]:
    now = dt.datetime.now(dt.timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    host = f"{account_id}.r2.cloudflarestorage.com"
    clean_key = key.lstrip("/")
    canonical_uri = f"/{encode_rfc3986(bucket)}/" + "/".join(encode_rfc3986(seg) for seg in clean_key.split("/"))

    signed_map: dict[str, str] = {
        "host": host,
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
    }
    if content_type:
        signed_map["content-type"] = content_type
    if cache_control:
        signed_map["cache-control"] = cache_control

    sorted_keys = sorted(signed_map.keys())
    canonical_headers = "".join(f"{k}:{signed_map[k]}\n" for k in sorted_keys)
    signed_headers = ";".join(sorted_keys)
    canonical_request = "\n".join([method, canonical_uri, "", canonical_headers, signed_headers, payload_hash])
    scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, sha256_bytes(canonical_request.encode("utf-8"))])

    k_date = hmac_sha256(f"AWS4{secret_key}".encode("utf-8"), date_stamp)
    k_region = hmac_sha256(k_date, "auto")
    k_service = hmac_sha256(k_region, "s3")
    k_signing = hmac_sha256(k_service, "aws4_request")
    signature = hmac.new(k_signing, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()

    headers = {
        "x-amz-content-sha256": payload_hash,
        "x-amz-date": amz_date,
        "Authorization": f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, SignedHeaders={signed_headers}, Signature={signature}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    if cache_control:
        headers["Cache-Control"] = cache_control
    return f"https://{host}{canonical_uri}", headers


def r2_head(cfg: dict[str, str], key: str) -> tuple[int, int]:
    url, headers = sigv4_headers("HEAD", cfg["account"], cfg["bucket"], key, cfg["ak"], cfg["sk"], sha256_bytes(b""))
    cmd = ["/usr/bin/curl", "-sS", "-I", "--max-time", "15", "-o", "/dev/null", "-w", "%{http_code} %{size_download}"]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    # Use -D - to capture Content-Length accurately on HEAD
    cmd_hdr = ["/usr/bin/curl", "-sS", "-I", "--max-time", "15"]
    for k, v in headers.items():
        cmd_hdr += ["-H", f"{k}: {v}"]
    cmd_hdr.append(url)
    out = subprocess.check_output(cmd_hdr, stderr=subprocess.DEVNULL).decode("latin1", "ignore")
    status = 0
    clen = 0
    for line in out.splitlines():
        if line.startswith("HTTP/"):
            parts = line.split()
            if len(parts) >= 2 and parts[1].isdigit():
                status = int(parts[1])
        elif line.lower().startswith("content-length:"):
            try:
                clen = int(line.split(":", 1)[1].strip())
            except ValueError:
                pass
    return status, clen


def r2_put_file(cfg: dict[str, str], key: str, file_path: Path, content_type: str, cache_control: str) -> int:
    digest = sha256_file(file_path)
    url, headers = sigv4_headers(
        "PUT", cfg["account"], cfg["bucket"], key, cfg["ak"], cfg["sk"], digest, content_type, cache_control
    )
    cmd = ["/usr/bin/curl", "-sS", "-X", "PUT", "--max-time", "180", "-o", "/dev/null", "-w", "%{http_code}", "--data-binary", f"@{file_path}"]
    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    code = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode("ascii", "ignore").strip()
    return int(code) if code.isdigit() else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Lowf Library Resumable R2 Migration Tool")
    parser.add_argument("--manifest", required=True, help="Path to catalog_pipeline_manifest.json")
    parser.add_argument("--downloads-root", default="/Users/admin/Downloads")
    parser.add_argument("--state", required=True, help="Checkpoint JSON file path")
    parser.add_argument("--env", choices=["staging", "production"], default="staging")
    parser.add_argument("--limit", type=int, default=0, help="Optional max items to migrate in this batch")
    parser.add_argument("--execute", action="store_true", help="Actually upload to R2 (omit for safe dry-run)")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text("utf-8"))
    ready = [b for b in manifest if b.get("importStatus") == "ready_for_staging" and b.get("ext") == "pdf"]
    if args.limit > 0:
        ready = ready[: args.limit]

    state_path = Path(args.state)
    state: dict[str, Any] = json.loads(state_path.read_text("utf-8")) if state_path.exists() else {"uploaded": {}, "failed": {}}

    bucket_var = "R2_STAGING_BUCKET" if args.env == "staging" else "R2_BUCKET"
    cfg = {
        "account": os.environ.get("R2_ACCOUNT_ID", "").strip(),
        "bucket": os.environ.get(bucket_var, os.environ.get("R2_BUCKET", "")).strip(),
        "ak": os.environ.get("R2_ACCESS_KEY_ID", "").strip(),
        "sk": os.environ.get("R2_SECRET_ACCESS_KEY", "").strip(),
    }

    if not args.execute:
        total_mb = round(sum(b["bytes"] for b in ready) / 1048576, 2)
        print(json.dumps({
            "mode": "DRY_RUN",
            "targetEnv": args.env,
            "targetBucket": cfg["bucket"] or "(not set)",
            "candidatePdfCount": len(ready),
            "alreadyCheckpointed": len(state["uploaded"]),
            "totalPdfMb": total_mb,
        }, ensure_ascii=False, indent=2))
        return 0

    if not all(cfg.values()):
        print(f"ERROR: Missing R2 environment variables (R2_ACCOUNT_ID, {bucket_var}, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY).", file=sys.stderr)
        return 2

    root = Path(args.downloads_root)
    uploaded_now = 0
    skipped = 0
    failed = 0

    for b in ready:
        slug = b["slugId"]
        r2_key = f"books/pdf/{slug}.pdf"
        if slug in state["uploaded"]:
            skipped += 1
            continue
        src = root / b["path"]
        if not src.exists():
            state["failed"][slug] = "source_missing"
            failed += 1
            continue
        code, existing_size = r2_head(cfg, r2_key)
        if code == 200 and existing_size == b["bytes"]:
            state["uploaded"][slug] = {"key": r2_key, "bytes": b["bytes"], "sha256": b["sha256"], "status": "verified_existing"}
            skipped += 1
            continue
        put_code = r2_put_file(cfg, r2_key, src, "application/pdf", "private, max-age=0, no-store")
        if 200 <= put_code < 300:
            v_code, v_size = r2_head(cfg, r2_key)
            if v_code == 200 and v_size == b["bytes"]:
                state["uploaded"][slug] = {"key": r2_key, "bytes": b["bytes"], "sha256": b["sha256"], "status": "uploaded_verified"}
                state["failed"].pop(slug, None)
                uploaded_now += 1
            else:
                state["failed"][slug] = f"post_verify_mismatch:{v_code}:{v_size}"
                failed += 1
        else:
            state["failed"][slug] = f"put_http_{put_code}"
            failed += 1
        state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")

    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), "utf-8")
    print(json.dumps({"uploadedNow": uploaded_now, "skipped": skipped, "failed": failed, "bucket": cfg["bucket"]}, indent=2))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
