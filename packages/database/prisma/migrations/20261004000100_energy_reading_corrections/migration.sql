ALTER TABLE "energy_readings"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "correction_reason" TEXT;

DROP INDEX "energy_readings_utility_unit_id_reference_month_key";
DROP INDEX "energy_readings_utility_unit_id_idx";

CREATE UNIQUE INDEX "energy_readings_utility_unit_id_reference_month_version_key"
  ON "energy_readings"("utility_unit_id", "reference_month", "version");

CREATE UNIQUE INDEX "energy_readings_one_active_month_key"
  ON "energy_readings"("utility_unit_id", "reference_month")
  WHERE "status" = 'ACTIVE';

CREATE INDEX "energy_readings_utility_unit_id_status_reference_month_idx"
  ON "energy_readings"("utility_unit_id", "status", "reference_month");
