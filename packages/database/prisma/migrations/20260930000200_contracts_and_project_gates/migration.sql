-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "accepted_proposal_version_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "active_version_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "party_snapshot" JSONB NOT NULL,
    "technical_snapshot" JSONB NOT NULL,
    "commercial_snapshot" JSONB NOT NULL,
    "scope_snapshot" JSONB NOT NULL,
    "clauses_snapshot" JSONB NOT NULL,
    "observations" TEXT,
    "content_hash" TEXT NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_version_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PDF_CONTRACT',
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL DEFAULT 'application/pdf',
    "s3_bucket" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "generation_status" TEXT NOT NULL DEFAULT 'READY',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_deliveries" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sent_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signed_contract_reviews" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "contract_document_id" UUID,
    "parties_match" BOOLEAN NOT NULL DEFAULT false,
    "all_pages_present" BOOLEAN NOT NULL DEFAULT false,
    "version_matches" BOOLEAN NOT NULL DEFAULT false,
    "signatures_legible" BOOLEAN NOT NULL DEFAULT false,
    "decision" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "reviewed_by_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signed_contract_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_gates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "contract_id" UUID,
    "gate_type" TEXT NOT NULL DEFAULT 'CONTRACT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "satisfied_by_id" UUID,
    "satisfied_at" TIMESTAMP(3),
    "evidence_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_gates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_organization_id_code_key" ON "contracts"("organization_id", "code");
CREATE INDEX "contracts_opportunity_id_idx" ON "contracts"("opportunity_id");
CREATE INDEX "contracts_accepted_proposal_version_id_idx" ON "contracts"("accepted_proposal_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "contract_versions_contract_id_version_number_key" ON "contract_versions"("contract_id", "version_number");
CREATE INDEX "contract_versions_contract_id_status_idx" ON "contract_versions"("contract_id", "status");

-- CreateIndex
CREATE INDEX "contract_documents_contract_version_id_idx" ON "contract_documents"("contract_version_id");

-- CreateIndex
CREATE INDEX "contract_deliveries_contract_id_idx" ON "contract_deliveries"("contract_id");

-- CreateIndex
CREATE INDEX "signed_contract_reviews_contract_id_idx" ON "signed_contract_reviews"("contract_id");

-- CreateIndex
CREATE INDEX "project_gates_opportunity_id_gate_type_idx" ON "project_gates"("opportunity_id", "gate_type");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_accepted_proposal_version_id_fkey" FOREIGN KEY ("accepted_proposal_version_id") REFERENCES "proposal_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_deliveries" ADD CONSTRAINT "contract_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_deliveries" ADD CONSTRAINT "contract_deliveries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_deliveries" ADD CONSTRAINT "contract_deliveries_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signed_contract_reviews" ADD CONSTRAINT "signed_contract_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signed_contract_reviews" ADD CONSTRAINT "signed_contract_reviews_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signed_contract_reviews" ADD CONSTRAINT "signed_contract_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_gates" ADD CONSTRAINT "project_gates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_gates" ADD CONSTRAINT "project_gates_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_gates" ADD CONSTRAINT "project_gates_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_gates" ADD CONSTRAINT "project_gates_satisfied_by_id_fkey" FOREIGN KEY ("satisfied_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
