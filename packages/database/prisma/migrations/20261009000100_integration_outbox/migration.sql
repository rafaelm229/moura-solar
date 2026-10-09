CREATE TABLE "integration_outbox" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "schema_version" INTEGER NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "producer" TEXT NOT NULL,
  "correlation_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integration_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integration_outbox_organization_id_dedupe_key_key"
  ON "integration_outbox"("organization_id", "dedupe_key");

CREATE INDEX "integration_outbox_organization_id_published_at_created_at_idx"
  ON "integration_outbox"("organization_id", "published_at", "created_at");

CREATE INDEX "integration_outbox_aggregate_type_aggregate_id_created_at_idx"
  ON "integration_outbox"("aggregate_type", "aggregate_id", "created_at");

ALTER TABLE "integration_outbox"
  ADD CONSTRAINT "integration_outbox_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
