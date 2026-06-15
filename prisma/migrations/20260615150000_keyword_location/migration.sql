-- Replace country/language with a single `location` field.

-- DropIndex
DROP INDEX "keywords_keyword_country_language_key";

-- AlterTable
ALTER TABLE "keywords" DROP COLUMN "country",
DROP COLUMN "language",
ADD COLUMN "location" TEXT NOT NULL DEFAULT 'India';

-- CreateIndex
CREATE UNIQUE INDEX "keywords_keyword_location_key" ON "keywords"("keyword", "location");
