#!/usr/bin/env python3
"""
manifest.json + out/{id}.jpg → public/word-images/ + Word.imageUrl güncelle.

Prisma Accelerate kullanıyorsan bunun yerine:
  npm run apply-word-images

zsh (doğrudan Postgres):
  export DATABASE_URL_DIRECT="postgresql://..."
  python apply_to_db.py
  python apply_to_db.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
OUT_DIR = ROOT / "out"
MANIFEST_PATH = OUT_DIR / "manifest.json"
PUBLIC_DIR = REPO_ROOT / "public" / "word-images"


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
        "Kullan: npm run apply-word-images\n"
        "veya: export DATABASE_URL_DIRECT='postgresql://...'"
    )


def connect():
    import psycopg

    return psycopg.connect(db_url())


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Toplanan görselleri DB + public’e uygula")
    p.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help="manifest.json yolu",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=OUT_DIR,
        help="jpg klasörü",
    )
    p.add_argument(
        "--status",
        type=str,
        default="ok",
        help="Hangi status’ler uygulansın (virgülle: ok,skipped_exists)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Kopyalama / UPDATE yapma",
    )
    p.add_argument(
        "--force",
        action="store_true",
        help="DB’de imageUrl dolu olsa da üzerine yaz",
    )
    return p.parse_args()


def main() -> None:
    load_env()
    args = parse_args()
    if not args.manifest.exists():
        raise SystemExit(f"Manifest yok: {args.manifest}")

    data = json.loads(args.manifest.read_text(encoding="utf-8"))
    items = data.get("items") or []
    allowed = {s.strip() for s in args.status.split(",") if s.strip()}

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    candidates = []
    for it in items:
        if it.get("status") not in allowed:
            continue
        wid = it.get("id")
        fname = it.get("file") or f"{wid}.jpg"
        src = args.out / fname
        if not src.exists():
            print(f"skip #{wid}: dosya yok ({src.name})", file=sys.stderr)
            continue
        candidates.append((it, src, fname))

    print(f"{len(candidates)} görsel uygulanacak → {PUBLIC_DIR}")
    if args.dry_run:
        for it, src, fname in candidates[:20]:
            print(f"  dry #{it['id']} {it.get('english')} → /word-images/{fname}")
        if len(candidates) > 20:
            print(f"  ... +{len(candidates) - 20} daha")
        return

    updated = 0
    copied = 0
    with connect() as conn:
        with conn.cursor() as cur:
            for it, src, fname in candidates:
                wid = int(it["id"])
                dest = PUBLIC_DIR / fname
                shutil.copy2(src, dest)
                copied += 1
                image_url = f"/word-images/{fname}"
                # imagePrompt alanına kısa atıf (yeniden üretim notu)
                note_parts = [
                    it.get("source") or "",
                    it.get("license") or "",
                    it.get("attribution") or "",
                    it.get("source_url") or "",
                ]
                note = " | ".join(p for p in note_parts if p)[:500]

                if args.force:
                    cur.execute(
                        """
                        UPDATE \"Word\"
                        SET \"imageUrl\" = %s, \"imagePrompt\" = %s
                        WHERE id = %s
                        """,
                        (image_url, note or None, wid),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE \"Word\"
                        SET \"imageUrl\" = %s, \"imagePrompt\" = %s
                        WHERE id = %s
                          AND (\"imageUrl\" IS NULL OR \"imageUrl\" = '')
                        """,
                        (image_url, note or None, wid),
                    )
                updated += cur.rowcount
        conn.commit()

    print(f"Bitti. kopyalanan={copied} db_guncellenen={updated}")


if __name__ == "__main__":
    main()
