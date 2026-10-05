-- CreateTable
CREATE TABLE "energy_import_transitions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_import_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "energy_import_transitions_organization_id_created_at_idx" ON "energy_import_transitions"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "energy_import_transitions_import_id_version_key" ON "energy_import_transitions"("import_id", "version");

-- AddForeignKey
ALTER TABLE "energy_import_transitions" ADD CONSTRAINT "energy_import_transitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_import_transitions" ADD CONSTRAINT "energy_import_transitions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "energy_bill_imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_import_transitions" ADD CONSTRAINT "energy_import_transitions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

