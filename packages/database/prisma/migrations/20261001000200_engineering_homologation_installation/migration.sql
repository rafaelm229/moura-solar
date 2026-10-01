-- CreateTable
CREATE TABLE "operational_projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARATION',
    "engineer_user_id" UUID,
    "nominal_power_kw" DECIMAL(10,2),
    "estimated_monthly_generation_kwh" DECIMAL(10,2),
    "art_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "executive_designs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "strings_count" INTEGER NOT NULL DEFAULT 1,
    "modules_per_string" INTEGER NOT NULL DEFAULT 10,
    "mppt_count" INTEGER NOT NULL DEFAULT 1,
    "tilt_degrees" DECIMAL(5,2),
    "azimuth_degrees" DECIMAL(5,2),
    "cable_gauge_mm" DECIMAL(5,2),
    "diagram_url" TEXT,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executive_designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_processes" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "distributor" TEXT NOT NULL,
    "protocol_number" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PREPARING',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "meter_exchanged_at" TIMESTAMP(3),
    "deadline_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homologation_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduled_date" DATE,
    "scheduled_end_date" DATE,
    "assigned_leader_id" UUID,
    "assigned_team_id" UUID,
    "vehicle_plate" TEXT,
    "pause_reason" TEXT,
    "pause_notes" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_order_checklist_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "response_type" TEXT NOT NULL DEFAULT 'CHECK',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "measurement_value" DECIMAL(10,2),
    "notes" TEXT,
    "photo_url" TEXT,
    "checked_by_id" UUID,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_handovers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_document" TEXT,
    "generation_verified_kw" DECIMAL(10,2),
    "satisfaction_rating" INTEGER,
    "signature_data" TEXT,
    "handed_over_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operational_projects_opportunity_id_key" ON "operational_projects"("opportunity_id");

-- CreateIndex
CREATE INDEX "operational_projects_organization_id_state_idx" ON "operational_projects"("organization_id", "state");

-- CreateIndex
CREATE INDEX "operational_projects_engineer_user_id_idx" ON "operational_projects"("engineer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "operational_projects_organization_id_code_key" ON "operational_projects"("organization_id", "code");

-- CreateIndex
CREATE INDEX "executive_designs_project_id_status_idx" ON "executive_designs"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "executive_designs_project_id_version_number_key" ON "executive_designs"("project_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "homologation_processes_project_id_key" ON "homologation_processes"("project_id");

-- CreateIndex
CREATE INDEX "homologation_processes_organization_id_stage_idx" ON "homologation_processes"("organization_id", "stage");

-- CreateIndex
CREATE INDEX "work_orders_organization_id_state_idx" ON "work_orders"("organization_id", "state");

-- CreateIndex
CREATE INDEX "work_orders_project_id_idx" ON "work_orders"("project_id");

-- CreateIndex
CREATE INDEX "work_orders_assigned_leader_id_idx" ON "work_orders"("assigned_leader_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_orders_organization_id_code_key" ON "work_orders"("organization_id", "code");

-- CreateIndex
CREATE INDEX "work_order_checklist_items_work_order_id_section_idx" ON "work_order_checklist_items"("work_order_id", "section");

-- CreateIndex
CREATE UNIQUE INDEX "customer_handovers_project_id_key" ON "customer_handovers"("project_id");

-- AddForeignKey
ALTER TABLE "operational_projects" ADD CONSTRAINT "operational_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_projects" ADD CONSTRAINT "operational_projects_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_projects" ADD CONSTRAINT "operational_projects_engineer_user_id_fkey" FOREIGN KEY ("engineer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executive_designs" ADD CONSTRAINT "executive_designs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executive_designs" ADD CONSTRAINT "executive_designs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executive_designs" ADD CONSTRAINT "executive_designs_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_processes" ADD CONSTRAINT "homologation_processes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_processes" ADD CONSTRAINT "homologation_processes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_leader_id_fkey" FOREIGN KEY ("assigned_leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_team_id_fkey" FOREIGN KEY ("assigned_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_checklist_items" ADD CONSTRAINT "work_order_checklist_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_checklist_items" ADD CONSTRAINT "work_order_checklist_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_order_checklist_items" ADD CONSTRAINT "work_order_checklist_items_checked_by_id_fkey" FOREIGN KEY ("checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_handovers" ADD CONSTRAINT "customer_handovers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_handovers" ADD CONSTRAINT "customer_handovers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_handovers" ADD CONSTRAINT "customer_handovers_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

