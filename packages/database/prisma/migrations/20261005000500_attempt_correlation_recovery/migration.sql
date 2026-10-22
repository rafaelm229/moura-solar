-- AlterTable
ALTER TABLE "extraction_attempts" ADD COLUMN     "outbox_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "extraction_attempts_outbox_id_key" ON "extraction_attempts"("outbox_id");

-- AddForeignKey
ALTER TABLE "extraction_attempts" ADD CONSTRAINT "extraction_attempts_outbox_id_fkey" FOREIGN KEY ("outbox_id") REFERENCES "import_outbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

