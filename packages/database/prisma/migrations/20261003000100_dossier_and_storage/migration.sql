-- SPEC-013: Dossiê Documental Permanente e Armazenamento Durável

-- CreateTable
CREATE TABLE "dossier_documents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purpose" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dossier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossier_document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "declared_mime" TEXT NOT NULL,
    "verified_mime" TEXT,
    "sha256" TEXT NOT NULL,
    "persistence_state" TEXT NOT NULL DEFAULT 'PENDING_UPLOAD',
    "stored_object_id" UUID,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dossier_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_objects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "backend" TEXT NOT NULL DEFAULT 'MINIO',
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "scan_result" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_representatives" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document_number" TEXT,
    "role" TEXT NOT NULL DEFAULT 'LEGAL_REPRESENTATIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_representatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_representative_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "representative_id" UUID NOT NULL,

    CONSTRAINT "document_representative_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_utility_unit_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "utility_unit_id" UUID NOT NULL,

    CONSTRAINT "document_utility_unit_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_opportunity_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,

    CONSTRAINT "document_opportunity_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_project_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,

    CONSTRAINT "document_project_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_work_order_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "phase" TEXT,

    CONSTRAINT "document_work_order_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_contract_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,

    CONSTRAINT "document_contract_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_access_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "version_id" TEXT,
    "purpose" TEXT NOT NULL DEFAULT 'VIEW',
    "outcome" TEXT NOT NULL DEFAULT 'SUCCESS',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dossier_documents_organization_id_customer_id_idx" ON "dossier_documents"("organization_id", "customer_id");
CREATE INDEX "dossier_documents_category_status_idx" ON "dossier_documents"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "dossier_document_versions_document_id_version_number_key" ON "dossier_document_versions"("document_id", "version_number");
CREATE INDEX "dossier_document_versions_sha256_idx" ON "dossier_document_versions"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "stored_objects_bucket_key_key" ON "stored_objects"("bucket", "key");
CREATE INDEX "stored_objects_organization_id_sha256_idx" ON "stored_objects"("organization_id", "sha256");

-- CreateIndex
CREATE INDEX "customer_representatives_organization_id_customer_id_idx" ON "customer_representatives"("organization_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_representative_links_document_id_representative_id_key" ON "document_representative_links"("document_id", "representative_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_utility_unit_links_document_id_utility_unit_id_key" ON "document_utility_unit_links"("document_id", "utility_unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_opportunity_links_document_id_opportunity_id_key" ON "document_opportunity_links"("document_id", "opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_project_links_document_id_project_id_key" ON "document_project_links"("document_id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_work_order_links_document_id_work_order_id_key" ON "document_work_order_links"("document_id", "work_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_contract_links_document_id_contract_id_key" ON "document_contract_links"("document_id", "contract_id");

-- CreateIndex
CREATE INDEX "document_access_events_organization_id_target_id_idx" ON "document_access_events"("organization_id", "target_id");
CREATE INDEX "document_access_events_actor_id_occurred_at_idx" ON "document_access_events"("actor_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dossier_documents" ADD CONSTRAINT "dossier_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossier_document_versions" ADD CONSTRAINT "dossier_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dossier_document_versions" ADD CONSTRAINT "dossier_document_versions_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_objects" ADD CONSTRAINT "stored_objects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_representatives" ADD CONSTRAINT "customer_representatives_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_representatives" ADD CONSTRAINT "customer_representatives_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_representative_links" ADD CONSTRAINT "document_representative_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_representative_links" ADD CONSTRAINT "document_representative_links_representative_id_fkey" FOREIGN KEY ("representative_id") REFERENCES "customer_representatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_utility_unit_links" ADD CONSTRAINT "document_utility_unit_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_utility_unit_links" ADD CONSTRAINT "document_utility_unit_links_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_opportunity_links" ADD CONSTRAINT "document_opportunity_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_opportunity_links" ADD CONSTRAINT "document_opportunity_links_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_project_links" ADD CONSTRAINT "document_project_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_project_links" ADD CONSTRAINT "document_project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_work_order_links" ADD CONSTRAINT "document_work_order_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_work_order_links" ADD CONSTRAINT "document_work_order_links_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_contract_links" ADD CONSTRAINT "document_contract_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_contract_links" ADD CONSTRAINT "document_contract_links_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_access_events" ADD CONSTRAINT "document_access_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
