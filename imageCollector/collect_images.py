#!/usr/bin/env python3
"""
Açık kaynak görsel toplayıcı (Wikimedia → Openverse).

Kelimeleri PostgreSQL'den alır, başlık/etikette kelime geçen ve
CC0 / CC-BY (ve CC-BY-SA) lisanslı görselleri {id}.jpg olarak kaydeder.
manifest.json üretir. DB güncellemesi için: apply_to_db.py

zsh örnekleri (Prisma Accelerate kullanıyorsan önce JSON export):
  cd /Volumes/Harici/kelimeApp
  npm run export-image-words -- --limit=50 --force
  cd imageCollector && source .venv/bin/activate
  python collect_images.py --from-json words.json --limit 50

  # Doğrudan Postgres URL varsa:
  export DATABASE_URL_DIRECT="postgresql://..."
  python collect_images.py --limit 50
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
OUT_DIR = ROOT / "out"
MANIFEST_PATH = OUT_DIR / "manifest.json"

USER_AGENT = (
    "YDSMonsterImageCollector/1.0 "
    "(educational vocabulary app; https://github.com/VeyselCerav/kelime)"
)
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})

# 4B: CC0 / CC-BY ailesi (NC/ND yok)
ALLOWED_LICENSE_TOKENS = (
    "cc0",
    "cc-zero",
    "public domain",
    "pdm",
    "cc-by",
    "cc by",
    "creativecommons.org/publicdomain",
    "creativecommons.org/licenses/by/",
    "creativecommons.org/licenses/by-sa/",
)
BLOCKED_LICENSE_TOKENS = (
    "nc",
    "nd",
    "cc-by-nc",
    "cc-by-nd",
    "all rights reserved",
    "fair use",
)


@dataclass
class Hit:
    source: str
    source_url: str
    image_url: str
    license: str
    title: str
    attribution: str
    width: int | None = None
    height: int | None = None


@dataclass
class ManifestItem:
    id: int
    english: str
    turkish: str
    module_id: int | None
    file: str | None
    status: str
    source: str | None = None
    source_url: str | None = None
    license: str | None = None
    title: str | None = None
    attribution: str | None = None
    error: str | None = None


def load_env() -> None:
    load_dotenv(REPO_ROOT / ".env")
    load_dotenv(ROOT / ".env")


def db_url() -> str:
    direct = os.getenv("DATABASE_URL_DIRECT") or os.getenv("POSTGRES_URL")
    if direct and "accelerate" not in direct.lower() and "prisma+" not in direct:
        return direct

    url = os.getenv("DATABASE_URL_Three") or os.getenv("DATABASE_URL") or ""
    if url and "accelerate" not in url.lower() and "prisma+" not in url:
        return url

    raise SystemExit(
        "Prisma Accelerate URL psycopg ile açılamaz.\n"
        "Seçenekler:\n"
        "  1) npm run export-image-words -- --limit=50 --force\n"
        "     python collect_images.py --from-json words.json\n"
        "  2) export DATABASE_URL_DIRECT='postgresql://USER:PASS@HOST:5432/DB'"
    )


def connect():
    import psycopg

    return psycopg.connect(db_url())


def load_words_json(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict) and isinstance(raw.get("words"), list):
        return raw["words"]
    raise SystemExit(f"Geçersiz JSON (words dizisi yok): {path}")


def fetch_words(
    conn,
    *,
    limit: int | None,
    offset: int,
    module_slug: str | None,
    category: str | None,
    only_missing: bool,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    if module_slug:
        clauses.append("m.slug = %s")
        params.append(module_slug)
    if category:
        clauses.append("w.category = %s")
        params.append(category)
    if only_missing:
        clauses.append('(w."imageUrl" IS NULL OR w."imageUrl" = \'\')')

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    sql = f"""
        SELECT w.id, w.english, w.turkish, w."moduleId" AS module_id,
               w."imageUrl" AS image_url, w.category, m.slug AS module_slug
        FROM "Word" w
        JOIN "Module" m ON m.id = w."moduleId"
        {where}
        ORDER BY w.id ASC
    """
    if limit is not None:
        sql += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
    elif offset:
        sql += " OFFSET %s"
        params.append(offset)

    with conn.cursor() as cur:
        cur.execute(sql, params)
        cols = [d.name for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]


def word_in_text(word: str, text: str | None) -> bool:
    if not text:
        return False
    # Kelime sınırı: apple ≠ pineapple
    pattern = rf"(?<![a-z0-9]){re.escape(word.lower())}(?![a-z0-9])"
    return re.search(pattern, text.lower()) is not None


def license_ok(raw: str | None) -> bool:
    if not raw:
        return False
    s = raw.lower().strip()
    if any(b in s for b in ("by-nc", "by-nd", "cc-by-nc", "cc-by-nd")):
        return False
    # "nc"/"nd" tek başına yanlış pozitif üretebilir; yukarıdakiler yeterli
    if any(tok in s for tok in ALLOWED_LICENSE_TOKENS):
        # NC/ND alt string yakala (cc by-nc)
        if re.search(r"\bnc\b", s) or "noncommercial" in s or "non-commercial" in s:
            return False
        if re.search(r"\bnd\b", s) or "noderiv" in s or "no derivatives" in s:
            return False
        return True
    return False


def confirm_hit(word: str, title: str | None, tags: list[str] | str | None) -> bool:
    if word_in_text(word, title):
        return True
    if isinstance(tags, list):
        blob = " ".join(str(t) for t in tags)
    else:
        blob = tags or ""
    return word_in_text(word, blob)


def download_image(url: str, dest: Path, timeout: int = 45) -> None:
    r = SESSION.get(url, timeout=timeout, stream=True)
    r.raise_for_status()
    tmp = dest.with_suffix(dest.suffix + ".part")
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(64 * 1024):
            if chunk:
                f.write(chunk)
    # JPEG'e normalize et
    try:
        with Image.open(tmp) as im:
            im = im.convert("RGB")
            # Çok büyük görselleri küçült
            max_side = 1600
            w, h = im.size
            if max(w, h) > max_side:
                im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            im.save(dest, "JPEG", quality=85, optimize=True)
        tmp.unlink(missing_ok=True)
    except Exception:
        # Pillow açamazsa ham dosyayı jpg diye taşıma; sil
        tmp.unlink(missing_ok=True)
        raise


# ---------- Wikimedia Commons ----------


def wikimedia_search(word: str, limit: int = 12) -> list[Hit]:
    # File namespace (6)
    api = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {word}",
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "iiurlwidth": 1280,
    }
    r = SESSION.get(api, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    pages = (data.get("query") or {}).get("pages") or {}
    hits: list[Hit] = []

    for page in pages.values():
        title = page.get("title") or ""
        infos = page.get("imageinfo") or []
        if not infos:
            continue
        info = infos[0]
        mime = (info.get("mime") or "").lower()
        if not mime.startswith("image/"):
            continue
        if mime in ("image/svg+xml", "image/gif"):
            continue
        meta = info.get("extmetadata") or {}
        license_raw = (
            (meta.get("LicenseShortName") or {}).get("value")
            or (meta.get("License") or {}).get("value")
            or (meta.get("UsageTerms") or {}).get("value")
            or ""
        )
        if not license_ok(license_raw):
            continue
        artist = (meta.get("Artist") or {}).get("value") or ""
        artist_clean = re.sub(r"<[^>]+>", "", artist).strip()
        desc = (meta.get("ImageDescription") or {}).get("value") or ""
        desc_clean = re.sub(r"<[^>]+>", "", desc).strip()
        tags_blob = f"{title} {desc_clean}"
        if not confirm_hit(word, title, tags_blob):
            continue
        image_url = info.get("thumburl") or info.get("url")
        if not image_url:
            continue
        page_url = f"https://commons.wikimedia.org/wiki/{quote(title.replace(' ', '_'))}"
        hits.append(
            Hit(
                source="wikimedia",
                source_url=page_url,
                image_url=image_url,
                license=str(license_raw),
                title=title.replace("File:", ""),
                attribution=artist_clean or "Wikimedia Commons",
                width=info.get("thumbwidth") or info.get("width"),
                height=info.get("thumbheight") or info.get("height"),
            )
        )
    return hits


# ---------- Openverse ----------


def openverse_search(word: str, limit: int = 12) -> list[Hit]:
    api = "https://api.openverse.org/v1/images/"
    params = {
        "q": word,
        "page_size": min(limit, 20),
        "license": "cc0,pdm,by,by-sa",
        "license_type": "commercial,modification",
        "format": "json",
    }
    r = SESSION.get(api, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    hits: list[Hit] = []
    for row in data.get("results") or []:
        title = row.get("title") or ""
        tags = [t.get("name") if isinstance(t, dict) else str(t) for t in (row.get("tags") or [])]
        license_raw = row.get("license") or row.get("license_version") or ""
        # Openverse license alanı genelde "by-sa" / "cc0"
        license_full = f"cc-{license_raw}" if license_raw and not str(license_raw).startswith("cc") else str(license_raw)
        if license_raw in ("cc0", "pdm", "by", "by-sa"):
            license_full = {
                "cc0": "CC0",
                "pdm": "Public Domain Mark",
                "by": "CC BY",
                "by-sa": "CC BY-SA",
            }.get(license_raw, license_full)
        elif not license_ok(license_full):
            continue
        if not confirm_hit(word, title, tags):
            continue
        image_url = row.get("url") or row.get("thumbnail")
        if not image_url:
            continue
        hits.append(
            Hit(
                source="openverse",
                source_url=row.get("foreign_landing_url") or row.get("detail_url") or image_url,
                image_url=image_url,
                license=str(license_full),
                title=title,
                attribution=(row.get("creator") or "Openverse")[:200],
                width=row.get("width"),
                height=row.get("height"),
            )
        )
    return hits


def find_image(word: str, sleep_s: float) -> Hit | None:
    errors: list[str] = []
    for fn, name in ((wikimedia_search, "wikimedia"), (openverse_search, "openverse")):
        try:
            hits = fn(word)
            time.sleep(sleep_s)
            if hits:
                return hits[0]
        except Exception as e:
            errors.append(f"{name}: {e}")
            time.sleep(sleep_s)
    if errors:
        print(f"  arama hataları: {'; '.join(errors)}", file=sys.stderr)
    return None


def load_manifest() -> dict[str, Any]:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {"generated_at": None, "items": []}


def save_manifest(manifest: dict[str, Any]) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest["generated_at"] = datetime.now(timezone.utc).isoformat()
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def upsert_manifest_item(manifest: dict[str, Any], item: ManifestItem) -> None:
    items: list[dict] = manifest.setdefault("items", [])
    for i, old in enumerate(items):
        if old.get("id") == item.id:
            items[i] = asdict(item)
            return
    items.append(asdict(item))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Açık kaynak kelime görseli topla")
    p.add_argument("--limit", type=int, default=None, help="Maks. kelime sayısı")
    p.add_argument("--offset", type=int, default=0)
    p.add_argument("--module", type=str, default=None, help="Modül slug (örn. seviye-seviye)")
    p.add_argument("--category", type=str, default=None, help="Alt grup (örn. A1)")
    p.add_argument(
        "--only-missing",
        action="store_true",
        help="Sadece DB'de imageUrl boş olanlar (varsayılan: tümü, 2B)",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help="out/{id}.jpg varsa yeniden indir",
    )
    p.add_argument("--sleep", type=float, default=0.35, help="İstekler arası bekleme (sn)")
    p.add_argument(
        "--from-json",
        type=str,
        default=None,
        help="Prisma export JSON (words.json) — Accelerate için önerilen yol",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="İndirme; sadece arama sonucu yaz",
    )
    return p.parse_args()


def main() -> None:
    load_env()
    args = parse_args()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()

    if args.from_json:
        json_path = Path(args.from_json)
        if not json_path.is_absolute():
            json_path = (ROOT / json_path).resolve()
        words = load_words_json(json_path)
        if args.offset:
            words = words[args.offset :]
        if args.limit is not None:
            words = words[: args.limit]
        if args.only_missing:
            words = [
                w
                for w in words
                if not (w.get("image_url") or w.get("imageUrl"))
            ]
    else:
        with connect() as conn:
            words = fetch_words(
                conn,
                limit=args.limit,
                offset=args.offset,
                module_slug=args.module,
                category=args.category,
                only_missing=args.only_missing,
            )

    print(f"{len(words)} kelime işlenecek → {OUT_DIR}")
    ok = skip = fail = 0

    for i, w in enumerate(words, 1):
        wid = int(w["id"])
        english = (w["english"] or "").strip()
        dest = OUT_DIR / f"{wid}.jpg"
        print(f"[{i}/{len(words)}] #{wid} {english}")

        if dest.exists() and not args.force:
            print("  skip (dosya var, --force yok)")
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=dest.name,
                    status="skipped_exists",
                ),
            )
            skip += 1
            continue

        if not english:
            fail += 1
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=None,
                    status="failed",
                    error="empty english",
                ),
            )
            continue

        hit = find_image(english, args.sleep)
        if not hit:
            print("  bulunamadı")
            fail += 1
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=None,
                    status="not_found",
                    error="no confirmed open-license hit",
                ),
            )
            save_manifest(manifest)
            continue

        print(f"  hit {hit.source} | {hit.license} | {hit.title[:60]}")
        if args.dry_run:
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=None,
                    status="dry_run",
                    source=hit.source,
                    source_url=hit.source_url,
                    license=hit.license,
                    title=hit.title,
                    attribution=hit.attribution,
                ),
            )
            ok += 1
            save_manifest(manifest)
            continue

        try:
            download_image(hit.image_url, dest)
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=dest.name,
                    status="ok",
                    source=hit.source,
                    source_url=hit.source_url,
                    license=hit.license,
                    title=hit.title,
                    attribution=hit.attribution,
                ),
            )
            ok += 1
            print(f"  kaydedildi {dest.name}")
        except Exception as e:
            print(f"  indirme hatası: {e}", file=sys.stderr)
            fail += 1
            upsert_manifest_item(
                manifest,
                ManifestItem(
                    id=wid,
                    english=english,
                    turkish=w.get("turkish") or "",
                    module_id=w.get("module_id"),
                    file=None,
                    status="failed",
                    source=hit.source,
                    source_url=hit.source_url,
                    license=hit.license,
                    title=hit.title,
                    attribution=hit.attribution,
                    error=str(e),
                ),
            )

        save_manifest(manifest)

    save_manifest(manifest)
    print(f"Bitti. ok={ok} skip={skip} fail={fail} manifest={MANIFEST_PATH}")
    print("DB’ye yazmak için (Accelerate): npm run apply-word-images")
    print("veya doğrudan Postgres: python apply_to_db.py")


if __name__ == "__main__":
    main()
