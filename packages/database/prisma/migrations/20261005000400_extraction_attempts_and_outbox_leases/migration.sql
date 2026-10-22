-- AlterTable
ALTER TABLE "import_outbox" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "heartbeat_at" TIMESTAMP(3),
ADD COLUMN     "last_error_code" TEXT,
ADD COLUMN     "lease_owner" TEXT;

-- AlterTable
ALTER TABLE "extraction_candidates" ADD COLUMN     "attempt_id" UUID;

-- CreateTable
CREATE TABLE "extraction_attempts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "adapter_name" TEXT,
    "model_name" TEXT,
    "model_version" TEXT,
    "external_operation_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CLAIMED',
    "lease_owner" TEXT,
    "lease_until" TIMESTAMP(3),
    "heartbeat_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "page_count" INTEGER,
    "charged_pages" INTEGER,
    "estimated_cost" DECIMAL(12,6),
    "actual_cost" DECIMAL(12,6),
    "currency" TEXT,
    "error_code" TEXT,
    "retryable" BOOLEAN,
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extraction_attempts_correlation_id_key" ON "extraction_attempts"("correlation_id");

-- CreateIndex
CREATE INDEX "extraction_attempts_organization_id_started_at_idx" ON "extraction_attempts"("organization_id", "started_at");

-- CreateIndex
CREATE INDEX "extraction_attempts_status_lease_until_idx" ON "extraction_attempts"("status", "lease_until");

-- CreateIndex
CREATE UNIQUE INDEX "extraction_attempts_import_id_attempt_number_key" ON "extraction_attempts"("import_id", "attempt_number");

-- AddForeignKey
ALTER TABLE "extraction_attempts" ADD CONSTRAINT "extraction_attempts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_attempts" ADD CONSTRAINT "extraction_attempts_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extraction_candidates" ADD CONSTRAINT "extraction_candidates_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "extraction_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

