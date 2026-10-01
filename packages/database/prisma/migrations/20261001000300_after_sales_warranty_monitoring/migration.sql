-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "project_id" UUID,
    "type" TEXT NOT NULL DEFAULT 'ORIENTATION',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "probable_coverage" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmed_coverage" TEXT,
    "root_cause" TEXT,
    "assigned_to_id" UUID,
    "assigned_team_id" UUID,
    "sla_due_at" TIMESTAMP(3),
    "first_response_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "resolution_summary" TEXT,
    "satisfaction_rating" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_interactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'NOTE',
    "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
    "body" TEXT NOT NULL,
    "author_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachment_url" TEXT,

    CONSTRAINT "support_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_coverages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'INSTALLATION',
    "provider_type" TEXT NOT NULL DEFAULT 'INSTALLER',
    "provider_name" TEXT NOT NULL,
    "item_model" TEXT,
    "serial_number" TEXT,
    "starts_at" DATE NOT NULL,
    "ends_at" DATE NOT NULL,
    "terms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "coverage_id" UUID NOT NULL,
    "supplier_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "protocol_number" TEXT,
    "failure_description" TEXT NOT NULL,
    "rma_code" TEXT,
    "replacement_serial" TEXT,
    "costs_reimbursed" DECIMAL(12,2),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_visit_quotes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "labor_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "displacement_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "materials_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "valid_until" DATE NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by" TEXT,
    "acceptance_evidence" TEXT,
    "work_order_id" UUID,
    "receivable_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_visit_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_systems" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "external_plant_id" TEXT,
    "connection_type" TEXT NOT NULL DEFAULT 'WIFI',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_telemetry_at" TIMESTAMP(3),
    "inverter_model" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_readings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "monitoring_system_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "expected_generation_kwh" DECIMAL(10,2) NOT NULL,
    "realized_generation_kwh" DECIMAL(10,2),
    "performance_ratio" DECIMAL(5,2),
    "source" TEXT NOT NULL DEFAULT 'INFORMADA',
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectivity_incidents" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "monitoring_system_id" UUID NOT NULL,
    "ticket_id" UUID,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restored_at" TIMESTAMP(3),
    "detection_source" TEXT NOT NULL DEFAULT 'MANUAL',
    "reason" TEXT,
    "customer_network_changed" BOOLEAN NOT NULL DEFAULT false,
    "resolution_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_organization_id_status_idx" ON "support_tickets"("organization_id", "status");

-- CreateIndex
CREATE INDEX "support_tickets_organization_id_priority_idx" ON "support_tickets"("organization_id", "priority");

-- CreateIndex
CREATE INDEX "support_tickets_customer_id_idx" ON "support_tickets"("customer_id");

-- CreateIndex
CREATE INDEX "support_tickets_project_id_idx" ON "support_tickets"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_organization_id_ticket_number_key" ON "support_tickets"("organization_id", "ticket_number");

-- CreateIndex
CREATE INDEX "support_interactions_ticket_id_occurred_at_idx" ON "support_interactions"("ticket_id", "occurred_at");

-- CreateIndex
CREATE INDEX "warranty_coverages_project_id_kind_idx" ON "warranty_coverages"("project_id", "kind");

-- CreateIndex
CREATE INDEX "warranty_coverages_organization_id_status_idx" ON "warranty_coverages"("organization_id", "status");

-- CreateIndex
CREATE INDEX "warranty_claims_ticket_id_idx" ON "warranty_claims"("ticket_id");

-- CreateIndex
CREATE INDEX "warranty_claims_coverage_id_idx" ON "warranty_claims"("coverage_id");

-- CreateIndex
CREATE INDEX "service_visit_quotes_ticket_id_idx" ON "service_visit_quotes"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_visit_quotes_organization_id_quote_number_key" ON "service_visit_quotes"("organization_id", "quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_systems_project_id_key" ON "monitoring_systems"("project_id");

-- CreateIndex
CREATE INDEX "monitoring_systems_organization_id_status_idx" ON "monitoring_systems"("organization_id", "status");

-- CreateIndex
CREATE INDEX "monitoring_readings_period_idx" ON "monitoring_readings"("period");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_readings_monitoring_system_id_period_key" ON "monitoring_readings"("monitoring_system_id", "period");

-- CreateIndex
CREATE INDEX "connectivity_incidents_monitoring_system_id_detected_at_idx" ON "connectivity_incidents"("monitoring_system_id", "detected_at");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_interactions" ADD CONSTRAINT "support_interactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_interactions" ADD CONSTRAINT "support_interactions_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_interactions" ADD CONSTRAINT "support_interactions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_coverages" ADD CONSTRAINT "warranty_coverages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_coverages" ADD CONSTRAINT "warranty_coverages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_coverage_id_fkey" FOREIGN KEY ("coverage_id") REFERENCES "warranty_coverages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visit_quotes" ADD CONSTRAINT "service_visit_quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visit_quotes" ADD CONSTRAINT "service_visit_quotes_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visit_quotes" ADD CONSTRAINT "service_visit_quotes_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_visit_quotes" ADD CONSTRAINT "service_visit_quotes_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_systems" ADD CONSTRAINT "monitoring_systems_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_systems" ADD CONSTRAINT "monitoring_systems_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_readings" ADD CONSTRAINT "monitoring_readings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_readings" ADD CONSTRAINT "monitoring_readings_monitoring_system_id_fkey" FOREIGN KEY ("monitoring_system_id") REFERENCES "monitoring_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_readings" ADD CONSTRAINT "monitoring_readings_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity_incidents" ADD CONSTRAINT "connectivity_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity_incidents" ADD CONSTRAINT "connectivity_incidents_monitoring_system_id_fkey" FOREIGN KEY ("monitoring_system_id") REFERENCES "monitoring_systems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectivity_incidents" ADD CONSTRAINT "connectivity_incidents_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

