-- CreateTable
CREATE TABLE "energy_readings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "utility_unit_id" UUID NOT NULL,
    "reference_month" TEXT NOT NULL,
    "consumption_kwh" DECIMAL(10,2) NOT NULL,
    "injected_kwh" DECIMAL(10,2),
    "billed_amount" DECIMAL(12,2),
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "energy_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "utility_unit_id" UUID,
    "type" TEXT NOT NULL DEFAULT 'REMOTE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "tariff_per_kwh" DECIMAL(10,4) NOT NULL DEFAULT 0.95,
    "connection_type" TEXT NOT NULL DEFAULT 'BIPHASIC',
    "voltage" TEXT NOT NULL DEFAULT '220V',
    "roof_type" TEXT,
    "shading_known" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assumptions" JSONB,
    "completed_by_id" UUID,
    "completed_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'UN',
    "power_rating_wp" DECIMAL(10,2),
    "power_rating_kw" DECIMAL(10,2),
    "technical_attributes" JSONB,
    "reference_cost" DECIMAL(12,2) NOT NULL,
    "reference_price" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Dimensionamento Padrão',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "design_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "based_on_version_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "system_type" TEXT NOT NULL DEFAULT 'ON_GRID',
    "target_monthly_generation_kwh" DECIMAL(12,2) NOT NULL,
    "target_consumption_kwh" DECIMAL(12,2) NOT NULL,
    "dc_power_kwp" DECIMAL(10,3) NOT NULL,
    "ac_power_kw" DECIMAL(10,3) NOT NULL,
    "estimated_monthly_generation_kwh" DECIMAL(12,2) NOT NULL,
    "estimated_annual_generation_kwh" DECIMAL(12,2) NOT NULL,
    "specific_yield" DECIMAL(10,2) NOT NULL DEFAULT 135.00,
    "calculation_version" TEXT NOT NULL DEFAULT 'v1.0-simplified',
    "assumptions_snapshot" JSONB NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "design_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "design_version_id" UUID NOT NULL,
    "catalog_item_id" UUID,
    "kind" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit_of_measure" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "cost_source" TEXT NOT NULL DEFAULT 'CATALOG',
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "additional_costs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "design_version_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "commercial_treatment" TEXT NOT NULL DEFAULT 'INCLUDED_IN_PRICE',
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "additional_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_calculations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "design_version_id" UUID NOT NULL,
    "direct_material_cost" DECIMAL(12,2) NOT NULL,
    "direct_service_cost" DECIMAL(12,2) NOT NULL,
    "additional_cost" DECIMAL(12,2) NOT NULL,
    "contingency_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_estimated_cost" DECIMAL(12,2) NOT NULL,
    "markup_percent" DECIMAL(6,2) NOT NULL,
    "price_before_discount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL,
    "gross_margin_amount" DECIMAL(12,2) NOT NULL,
    "gross_margin_percent" DECIMAL(6,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "energy_readings_utility_unit_id_reference_month_key" ON "energy_readings"("utility_unit_id", "reference_month");

-- CreateIndex
CREATE INDEX "energy_readings_utility_unit_id_idx" ON "energy_readings"("utility_unit_id");

-- CreateIndex
CREATE INDEX "surveys_opportunity_id_idx" ON "surveys"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_organization_id_sku_key" ON "catalog_items"("organization_id", "sku");

-- CreateIndex
CREATE INDEX "catalog_items_organization_id_category_status_idx" ON "catalog_items"("organization_id", "category", "status");

-- CreateIndex
CREATE INDEX "designs_opportunity_id_idx" ON "designs"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "design_versions_design_id_version_number_key" ON "design_versions"("design_id", "version_number");

-- CreateIndex
CREATE INDEX "design_versions_design_id_status_idx" ON "design_versions"("design_id", "status");

-- CreateIndex
CREATE INDEX "design_items_design_version_id_idx" ON "design_items"("design_version_id");

-- CreateIndex
CREATE INDEX "additional_costs_design_version_id_idx" ON "additional_costs"("design_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_calculations_design_version_id_key" ON "pricing_calculations"("design_version_id");

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_readings" ADD CONSTRAINT "energy_readings_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "designs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_versions" ADD CONSTRAINT "design_versions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_items" ADD CONSTRAINT "design_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_items" ADD CONSTRAINT "design_items_design_version_id_fkey" FOREIGN KEY ("design_version_id") REFERENCES "design_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_items" ADD CONSTRAINT "design_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_costs" ADD CONSTRAINT "additional_costs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "additional_costs" ADD CONSTRAINT "additional_costs_design_version_id_fkey" FOREIGN KEY ("design_version_id") REFERENCES "design_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_calculations" ADD CONSTRAINT "pricing_calculations_design_version_id_fkey" FOREIGN KEY ("design_version_id") REFERENCES "design_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
