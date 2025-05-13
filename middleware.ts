import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function middleware(request: NextRequest) {
  if (process.env.VERCEL) {
    // Vercel'de /tmp dizinine veritabanı dosyasını kopyala
    const dbPath = '/tmp/dev.db';
    if (!fs.existsSync(dbPath)) {
      const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      if (fs.existsSync(sourceDbPath)) {
        fs.copyFileSync(sourceDbPath, dbPath);
      }
    }
  }
  return NextResponse.next();
} 