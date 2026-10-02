-- CreateTable
CREATE TABLE "automation_rule_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "trigger_event" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_to" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "rule_version_id" UUID NOT NULL,
    "event_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "input_reference" TEXT,
    "result_summary" TEXT,
    "error_code" TEXT,
    "trace_id" TEXT,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attention_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "due_at" TIMESTAMP(3),
    "assignee_id" UUID,
    "team_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" UUID,
    "resolution_reason" TEXT,
    "deduplication_key" TEXT NOT NULL,
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "last_occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attention_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'UNREAD',
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT 'ORGANIZATION',
    "scope_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "target_value" DECIMAL(14,2) NOT NULL,
    "current_value" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'BRL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_projections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "metric_key" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "value" DECIMAL(14,2) NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "metric_projections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automation_rule_versions_organization_id_rule_key_version_key" ON "automation_rule_versions"("organization_id", "rule_key", "version");
CREATE INDEX "automation_rule_versions_organization_id_status_idx" ON "automation_rule_versions"("organization_id", "status");
CREATE INDEX "automation_rule_versions_trigger_event_idx" ON "automation_rule_versions"("trigger_event");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_organization_id_idempotency_key_key" ON "automation_executions"("organization_id", "idempotency_key");
CREATE INDEX "automation_executions_organization_id_status_idx" ON "automation_executions"("organization_id", "status");
CREATE INDEX "automation_executions_rule_version_id_idx" ON "automation_executions"("rule_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "attention_items_organization_id_deduplication_key_key" ON "attention_items"("organization_id", "deduplication_key");
CREATE INDEX "attention_items_organization_id_status_idx" ON "attention_items"("organization_id", "status");
CREATE INDEX "attention_items_assignee_id_status_idx" ON "attention_items"("assignee_id", "status");
CREATE INDEX "attention_items_team_id_status_idx" ON "attention_items"("team_id", "status");
CREATE INDEX "attention_items_severity_status_idx" ON "attention_items"("severity", "status");

-- CreateIndex
CREATE INDEX "notifications_organization_id_recipient_id_status_idx" ON "notifications"("organization_id", "recipient_id", "status");
CREATE INDEX "notifications_scheduled_at_idx" ON "notifications"("scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_organization_id_user_id_category_channel_key" ON "notification_preferences"("organization_id", "user_id", "category", "channel");

-- CreateIndex
CREATE INDEX "goal_versions_organization_id_metric_key_status_idx" ON "goal_versions"("organization_id", "metric_key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "metric_projections_organization_id_metric_key_period_key" ON "metric_projections"("organization_id", "metric_key", "period");
CREATE INDEX "metric_projections_period_idx" ON "metric_projections"("period");

-- AddForeignKey
ALTER TABLE "automation_rule_versions" ADD CONSTRAINT "automation_rule_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_rule_version_id_fkey" FOREIGN KEY ("rule_version_id") REFERENCES "automation_rule_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_versions" ADD CONSTRAINT "goal_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_projections" ADD CONSTRAINT "metric_projections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
