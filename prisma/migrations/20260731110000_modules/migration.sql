-- CreateTable
CREATE TABLE IF NOT EXISTS "Module" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Module_slug_key" ON "Module"("slug");

-- Seed modules
INSERT INTO "Module" ("slug", "name", "description", "sortOrder")
VALUES
  ('genel', 'Genel Kelimeler', 'Mevcut kelime bankası', 0),
  ('en-sik-cikan', 'En Sık Çıkan Kelimeler', 'YDS’de sık çıkan kelimeler', 1)
ON CONFLICT ("slug") DO NOTHING;

-- Add moduleId column (nullable first)
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "moduleId" INTEGER;

-- Assign existing words to Genel Kelimeler
UPDATE "Word" w
SET "moduleId" = m.id
FROM "Module" m
WHERE m.slug = 'genel' AND w."moduleId" IS NULL;

-- Default any remaining nulls
UPDATE "Word"
SET "moduleId" = (SELECT id FROM "Module" WHERE slug = 'genel' LIMIT 1)
WHERE "moduleId" IS NULL;

-- Drop week if exists
ALTER TABLE "Word" DROP COLUMN IF EXISTS "week";

-- Make moduleId required
ALTER TABLE "Word" ALTER COLUMN "moduleId" SET NOT NULL;

-- FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Word_moduleId_fkey'
  ) THEN
    ALTER TABLE "Word"
      ADD CONSTRAINT "Word_moduleId_fkey"
      FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Unique per module + english
CREATE UNIQUE INDEX IF NOT EXISTS "Word_moduleId_english_key" ON "Word"("moduleId", "english");
