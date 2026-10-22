-- AlterTable
ALTER TABLE "energy_readings" ADD COLUMN     "source_import_id" UUID,
ADD COLUMN     "source_review_id" UUID;

-- CreateTable
CREATE TABLE "extraction_candidates" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "field" TEXT NOT NULL,
    "raw_value" TEXT,
    "normalized_value" TEXT,
    "unit" TEXT,
    "page" INTEGER,
    "region" JSONB,
    "provider_confidence" JSONB,
    "quality_signals" JSONB NOT NULL,
    "system_validation" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extraction_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_reviews" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "reviewed_by_id" UUID NOT NULL,
    "digest" TEXT NOT NULL,
    "decisions" JSONB NOT NULL,
    "base_versions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_applications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "receipt" JSONB NOT NULL,
    "committed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_reading_revisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "utility_unit_id" UUID NOT NULL,
    "reading_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "source_import_id" UUID,
    "source_review_id" UUID,
    "document_version_id" UUID,
    "author_id" UUID NOT NULL,
    "previous_values" JSONB,
    "current_values" JSONB NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_reading_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extraction_candidates_import_id_field_created_at_idx" ON "extraction_candidates"("import_id", "field", "created_at");

-- CreateIndex
CREATE INDEX "import_reviews_organization_id_created_at_idx" ON "import_reviews"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "import_reviews_import_id_revision_key" ON "import_reviews"("import_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "import_applications_import_id_key" ON "import_applications"("import_id");

-- CreateIndex
CREATE UNIQUE INDEX "import_applications_review_id_key" ON "import_applications"("review_id");

-- CreateIndex
CREATE INDEX "import_applications_organization_id_committed_at_idx" ON "import_applications"("organization_id", "committed_at");

-- CreateIndex
CREATE INDEX "energy_reading_revisions_reading_id_version_idx" ON "energy_reading_revisions"("reading_id", "version");

-- CreateIndex
CREATE INDEX "energy_reading_revisions_utility_unit_id_created_at_idx" ON "energy_reading_revisions"("utility_unit_id", "created_at");

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_source_import_id_fkey" FOREIGN KEY ("source_import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_source_review_id_fkey" FOREIGN KEY ("source_review_id") REFERENCES "import_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_reviews" ADD CONSTRAINT "import_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_reviews" ADD CONSTRAINT "import_reviews_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_applications" ADD CONSTRAINT "import_applications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_applications" ADD CONSTRAINT "import_applications_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_applications" ADD CONSTRAINT "import_applications_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "import_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "energy_readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_source_import_id_fkey" FOREIGN KEY ("source_import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_source_review_id_fkey" FOREIGN KEY ("source_review_id") REFERENCES "import_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_reading_revisions" ADD CONSTRAINT "energy_reading_revisions_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "dossier_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

