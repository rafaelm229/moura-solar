-- CreateTable
CREATE TABLE "proposals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "accepted_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "design_version_id" UUID NOT NULL,
    "based_on_version_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customer_snapshot" JSONB NOT NULL,
    "utility_unit_snapshot" JSONB NOT NULL,
    "technical_snapshot" JSONB NOT NULL,
    "commercial_snapshot" JSONB NOT NULL,
    "validity_days" INTEGER NOT NULL DEFAULT 10,
    "valid_until" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "final_price" DECIMAL(12,2) NOT NULL,
    "payment_conditions" JSONB,
    "observations" TEXT,
    "content_hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposal_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "proposal_version_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PDF_PROPOSAL',
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "s3_bucket" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "generation_status" TEXT NOT NULL DEFAULT 'READY',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_deliveries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "proposal_version_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sent_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_acceptances" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "proposal_version_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "accepted_by_name" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proposals_organization_id_code_key" ON "proposals"("organization_id", "code");
CREATE INDEX "proposals_opportunity_id_idx" ON "proposals"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_versions_proposal_id_version_number_key" ON "proposal_versions"("proposal_id", "version_number");
CREATE INDEX "proposal_versions_proposal_id_status_idx" ON "proposal_versions"("proposal_id", "status");

-- CreateIndex
CREATE INDEX "proposal_documents_proposal_version_id_idx" ON "proposal_documents"("proposal_version_id");

-- CreateIndex
CREATE INDEX "proposal_deliveries_proposal_version_id_idx" ON "proposal_deliveries"("proposal_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_acceptances_proposal_version_id_key" ON "proposal_acceptances"("proposal_version_id");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_design_version_id_fkey" FOREIGN KEY ("design_version_id") REFERENCES "design_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_versions" ADD CONSTRAINT "proposal_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_documents" ADD CONSTRAINT "proposal_documents_proposal_version_id_fkey" FOREIGN KEY ("proposal_version_id") REFERENCES "proposal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_deliveries" ADD CONSTRAINT "proposal_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_deliveries" ADD CONSTRAINT "proposal_deliveries_proposal_version_id_fkey" FOREIGN KEY ("proposal_version_id") REFERENCES "proposal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_deliveries" ADD CONSTRAINT "proposal_deliveries_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_acceptances" ADD CONSTRAINT "proposal_acceptances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "proposal_acceptances" ADD CONSTRAINT "proposal_acceptances_proposal_version_id_fkey" FOREIGN KEY ("proposal_version_id") REFERENCES "proposal_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "proposal_acceptances" ADD CONSTRAINT "proposal_acceptances_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
