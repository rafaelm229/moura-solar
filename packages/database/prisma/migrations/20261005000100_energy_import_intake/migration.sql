-- CreateTable
CREATE TABLE "energy_bill_imports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "utility_unit_id" UUID,
    "opportunity_id" UUID,
    "document_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" UUID NOT NULL,
    "cancellation_requested_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_bill_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_outbox" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lease_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "energy_bill_imports_document_version_id_key" ON "energy_bill_imports"("document_version_id");

-- CreateIndex
CREATE INDEX "energy_bill_imports_organization_id_customer_id_created_at_idx" ON "energy_bill_imports"("organization_id", "customer_id", "created_at");

-- CreateIndex
CREATE INDEX "energy_bill_imports_status_updated_at_idx" ON "energy_bill_imports"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "import_outbox_dedupe_key_key" ON "import_outbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "import_outbox_status_available_at_idx" ON "import_outbox"("status", "available_at");

-- CreateIndex
CREATE INDEX "import_outbox_import_id_idx" ON "import_outbox"("import_id");

-- AddForeignKey
ALTER TABLE "energy_bill_imports" ADD CONSTRAINT "energy_bill_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_bill_imports" ADD CONSTRAINT "energy_bill_imports_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_bill_imports" ADD CONSTRAINT "energy_bill_imports_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_bill_imports" ADD CONSTRAINT "energy_bill_imports_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_bill_imports" ADD CONSTRAINT "energy_bill_imports_document_version_id_fkey" FOREIGN KEY ("document_version_id") REFERENCES "dossier_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_outbox" ADD CONSTRAINT "import_outbox_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_outbox" ADD CONSTRAINT "import_outbox_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "permissions" ("key") VALUES
    ('energy_imports:create'),
    ('energy_imports:read'),
    ('energy_imports:review'),
    ('energy_imports:confirm'),
    ('energy_imports:cancel'),
    ('energy_imports:retry')
ON CONFLICT DO NOTHING;
