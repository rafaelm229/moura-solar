-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL DEFAULT 'CHECKING',
    "bank_code" TEXT,
    "agency" TEXT,
    "account_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "contract_id" UUID,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "down_payment_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "payment_method" TEXT NOT NULL DEFAULT 'PIX',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "payment_plan_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'PIX',
    "payer_name" TEXT,
    "payer_tax_id" TEXT,
    "receipt_document_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_allocations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "receivable_id" UUID NOT NULL,
    "allocated_principal" DECIMAL(12,2) NOT NULL,
    "interest_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipient_tax_id" TEXT,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'PIX',
    "document_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "payable_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "payable_id" UUID,
    "beneficiary_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES_REP',
    "percentage" DECIMAL(5,2) NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "trigger_gate" TEXT NOT NULL DEFAULT 'CONTRACT',
    "status" TEXT NOT NULL DEFAULT 'ESTIMATED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_id" UUID,
    "payment_id" UUID,
    "reversed_movement_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_accounts_organization_id_status_idx" ON "financial_accounts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "payment_plans_opportunity_id_status_idx" ON "payment_plans"("opportunity_id", "status");

-- CreateIndex
CREATE INDEX "receivables_opportunity_id_status_idx" ON "receivables"("opportunity_id", "status");

-- CreateIndex
CREATE INDEX "receivables_due_date_status_idx" ON "receivables"("due_date", "status");

-- CreateIndex
CREATE INDEX "receipts_opportunity_id_idx" ON "receipts"("opportunity_id");

-- CreateIndex
CREATE INDEX "receipts_account_id_idx" ON "receipts"("account_id");

-- CreateIndex
CREATE INDEX "receipt_allocations_receipt_id_idx" ON "receipt_allocations"("receipt_id");

-- CreateIndex
CREATE INDEX "receipt_allocations_receivable_id_idx" ON "receipt_allocations"("receivable_id");

-- CreateIndex
CREATE INDEX "payables_opportunity_id_status_idx" ON "payables"("opportunity_id", "status");

-- CreateIndex
CREATE INDEX "payables_due_date_status_idx" ON "payables"("due_date", "status");

-- CreateIndex
CREATE INDEX "payments_account_id_idx" ON "payments"("account_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_payable_id_idx" ON "payment_allocations"("payable_id");

-- CreateIndex
CREATE INDEX "commissions_opportunity_id_idx" ON "commissions"("opportunity_id");

-- CreateIndex
CREATE INDEX "cash_movements_account_id_effective_at_idx" ON "cash_movements"("account_id", "effective_at");

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_plans" ADD CONSTRAINT "payment_plans_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_payment_plan_id_fkey" FOREIGN KEY ("payment_plan_id") REFERENCES "payment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
