-- AlterTable
ALTER TABLE "Word" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Word_moduleId_category_idx" ON "Word"("moduleId", "category");
