-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'in',
    "language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_overviews" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "ai_overview_present" BOOLEAN NOT NULL DEFAULT false,
    "overview_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_overviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "citation_url" TEXT NOT NULL,
    "citation_domain" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organic_rankings" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organic_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "keywords_created_at_idx" ON "keywords"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_keyword_country_language_key" ON "keywords"("keyword", "country", "language");

-- CreateIndex
CREATE INDEX "ai_overviews_keyword_id_idx" ON "ai_overviews"("keyword_id");

-- CreateIndex
CREATE INDEX "ai_overviews_created_at_idx" ON "ai_overviews"("created_at");

-- CreateIndex
CREATE INDEX "citations_keyword_id_idx" ON "citations"("keyword_id");

-- CreateIndex
CREATE INDEX "citations_citation_domain_idx" ON "citations"("citation_domain");

-- CreateIndex
CREATE INDEX "citations_created_at_idx" ON "citations"("created_at");

-- CreateIndex
CREATE INDEX "organic_rankings_keyword_id_idx" ON "organic_rankings"("keyword_id");

-- CreateIndex
CREATE INDEX "organic_rankings_domain_idx" ON "organic_rankings"("domain");

-- CreateIndex
CREATE INDEX "organic_rankings_created_at_idx" ON "organic_rankings"("created_at");

-- CreateIndex
CREATE INDEX "jobs_keyword_id_idx" ON "jobs"("keyword_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- AddForeignKey
ALTER TABLE "ai_overviews" ADD CONSTRAINT "ai_overviews_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organic_rankings" ADD CONSTRAINT "organic_rankings_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
