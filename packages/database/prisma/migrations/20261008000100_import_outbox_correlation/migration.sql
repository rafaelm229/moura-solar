-- Preserve historical rows without inventing an originating request ID.
ALTER TABLE "import_outbox" ADD COLUMN "correlation_id" TEXT;
