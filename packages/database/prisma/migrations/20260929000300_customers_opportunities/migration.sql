-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PERSON',
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "tax_id" TEXT,
    "state_registration" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalized_value" TEXT NOT NULL,
    "label" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "postal_code" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utility_units" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "address_id" UUID,
    "distributor_name" TEXT NOT NULL,
    "external_code" TEXT,
    "consumer_class" TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    "tariff_mode" TEXT NOT NULL DEFAULT 'CONVENTIONAL',
    "connection_type" TEXT NOT NULL DEFAULT 'BIPHASIC',
    "voltage" TEXT NOT NULL DEFAULT '220V',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utility_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "utility_unit_id" UUID,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'INBOUND',
    "project_type" TEXT NOT NULL DEFAULT 'ON_GRID',
    "need_summary" TEXT NOT NULL,
    "estimated_consumption" DECIMAL(10,2),
    "priority" TEXT NOT NULL DEFAULT 'WARM',
    "state" TEXT NOT NULL DEFAULT 'NOVO',
    "expected_close_date" DATE,
    "loss_reason" TEXT,
    "loss_notes" TEXT,
    "lost_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_transitions" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "from_state" TEXT NOT NULL,
    "to_state" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "customer_id" UUID,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "assignee_user_id" UUID NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "result_code" TEXT,
    "result_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "previous_activity_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_organization_id_status_idx" ON "customers"("organization_id", "status");

-- CreateIndex
CREATE INDEX "customers_organization_id_tax_id_idx" ON "customers"("organization_id", "tax_id");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_type_idx" ON "customer_contacts"("customer_id", "type");

-- CreateIndex
CREATE INDEX "customer_contacts_normalized_value_idx" ON "customer_contacts"("normalized_value");

-- CreateIndex
CREATE INDEX "addresses_customer_id_idx" ON "addresses"("customer_id");

-- CreateIndex
CREATE INDEX "utility_units_organization_id_external_code_idx" ON "utility_units"("organization_id", "external_code");

-- CreateIndex
CREATE INDEX "utility_units_customer_id_idx" ON "utility_units"("customer_id");

-- CreateIndex
CREATE INDEX "opportunities_organization_id_state_idx" ON "opportunities"("organization_id", "state");

-- CreateIndex
CREATE INDEX "opportunities_organization_id_owner_user_id_idx" ON "opportunities"("organization_id", "owner_user_id");

-- CreateIndex
CREATE INDEX "opportunities_customer_id_idx" ON "opportunities"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_organization_id_code_key" ON "opportunities"("organization_id", "code");

-- CreateIndex
CREATE INDEX "opportunity_transitions_opportunity_id_created_at_idx" ON "opportunity_transitions"("opportunity_id", "created_at");

-- CreateIndex
CREATE INDEX "activities_organization_id_assignee_user_id_status_due_at_idx" ON "activities"("organization_id", "assignee_user_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "activities_opportunity_id_idx" ON "activities"("opportunity_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_units" ADD CONSTRAINT "utility_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_units" ADD CONSTRAINT "utility_units_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utility_units" ADD CONSTRAINT "utility_units_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_transitions" ADD CONSTRAINT "opportunity_transitions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

