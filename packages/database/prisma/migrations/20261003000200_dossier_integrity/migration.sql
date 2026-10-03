INSERT INTO "permissions" ("key") VALUES ('documents:identity_read') ON CONFLICT DO NOTHING;
-- Additive hardening; preserve all historical objects and versions.
ALTER TABLE "dossier_documents" ADD COLUMN "metadata_version" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "archive_reason" TEXT;
ALTER TABLE "stored_objects" ADD COLUMN "scanner_version" TEXT;
CREATE TABLE "dossier_commands" (
 "key" TEXT PRIMARY KEY, "organization_id" UUID NOT NULL, "actor_id" UUID NOT NULL,
 "fingerprint" TEXT NOT NULL, "result" JSONB NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Former CLEAN values were not backed by a scanner. Never keep them downloadable.
UPDATE "dossier_document_versions" SET "persistence_state" = 'QUARANTINED'
 WHERE "persistence_state" = 'READY';
UPDATE "stored_objects" SET "verified" = false, "scan_result" = 'UNCHECKED';

-- Evidence must not disappear when an operational parent is removed.
ALTER TABLE "dossier_documents" DROP CONSTRAINT "dossier_documents_customer_id_fkey",
 ADD CONSTRAINT "dossier_documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dossier_document_versions" DROP CONSTRAINT "dossier_document_versions_document_id_fkey",
 ADD CONSTRAINT "dossier_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_representative_links" DROP CONSTRAINT "document_representative_links_document_id_fkey", ADD CONSTRAINT "document_representative_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_representative_links" DROP CONSTRAINT "document_representative_links_representative_id_fkey", ADD CONSTRAINT "document_representative_links_representative_id_fkey" FOREIGN KEY ("representative_id") REFERENCES "customer_representatives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_utility_unit_links" DROP CONSTRAINT "document_utility_unit_links_document_id_fkey", ADD CONSTRAINT "document_utility_unit_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_utility_unit_links" DROP CONSTRAINT "document_utility_unit_links_utility_unit_id_fkey", ADD CONSTRAINT "document_utility_unit_links_utility_unit_id_fkey" FOREIGN KEY ("utility_unit_id") REFERENCES "utility_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_opportunity_links" DROP CONSTRAINT "document_opportunity_links_document_id_fkey", ADD CONSTRAINT "document_opportunity_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_opportunity_links" DROP CONSTRAINT "document_opportunity_links_opportunity_id_fkey", ADD CONSTRAINT "document_opportunity_links_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_project_links" DROP CONSTRAINT "document_project_links_document_id_fkey", ADD CONSTRAINT "document_project_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_project_links" DROP CONSTRAINT "document_project_links_project_id_fkey", ADD CONSTRAINT "document_project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "operational_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_work_order_links" DROP CONSTRAINT "document_work_order_links_document_id_fkey", ADD CONSTRAINT "document_work_order_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_work_order_links" DROP CONSTRAINT "document_work_order_links_work_order_id_fkey", ADD CONSTRAINT "document_work_order_links_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_contract_links" DROP CONSTRAINT "document_contract_links_document_id_fkey", ADD CONSTRAINT "document_contract_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "dossier_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_contract_links" DROP CONSTRAINT "document_contract_links_contract_id_fkey", ADD CONSTRAINT "document_contract_links_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION enforce_document_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE customer UUID; organization UUID;
BEGIN
 SELECT customer_id, organization_id INTO customer, organization FROM dossier_documents WHERE id = NEW.document_id FOR SHARE;
 IF TG_TABLE_NAME = 'document_utility_unit_links' THEN
   PERFORM 1 FROM utility_units WHERE id = NEW.utility_unit_id AND customer_id = customer AND organization_id = organization FOR SHARE;
 ELSIF TG_TABLE_NAME = 'document_representative_links' THEN
   PERFORM 1 FROM customer_representatives WHERE id = NEW.representative_id AND customer_id = customer AND organization_id = organization FOR SHARE;
 ELSIF TG_TABLE_NAME = 'document_opportunity_links' THEN
   PERFORM 1 FROM opportunities WHERE id = NEW.opportunity_id AND customer_id = customer AND organization_id = organization FOR SHARE;
 ELSIF TG_TABLE_NAME = 'document_project_links' THEN
   PERFORM 1 FROM operational_projects p JOIN opportunities o ON o.id = p.opportunity_id
    WHERE p.id = NEW.project_id AND p.organization_id = organization AND o.organization_id = organization AND o.customer_id = customer FOR SHARE OF p, o;
 ELSIF TG_TABLE_NAME = 'document_contract_links' THEN
   PERFORM 1 FROM contracts c JOIN opportunities o ON o.id = c.opportunity_id
    WHERE c.id = NEW.contract_id AND c.organization_id = organization AND o.organization_id = organization AND o.customer_id = customer FOR SHARE OF c, o;
 ELSIF TG_TABLE_NAME = 'document_work_order_links' THEN
   PERFORM 1 FROM work_orders w JOIN operational_projects p ON p.id = w.project_id JOIN opportunities o ON o.id = p.opportunity_id
    WHERE w.id = NEW.work_order_id AND w.organization_id = organization AND p.organization_id = organization AND o.organization_id = organization AND o.customer_id = customer FOR SHARE OF w, p, o;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_INVALID' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_representative_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_utility_unit_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_opportunity_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_project_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_work_order_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();
CREATE TRIGGER document_owner BEFORE INSERT OR UPDATE ON "document_contract_links" FOR EACH ROW EXECUTE FUNCTION enforce_document_owner();

CREATE FUNCTION protect_document_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.persistence_state = 'READY' AND
   (NEW.document_id, NEW.version_number, NEW.sha256, NEW.file_size, NEW.declared_mime, NEW.verified_mime, NEW.stored_object_id, NEW.original_name)
   IS DISTINCT FROM
   (OLD.document_id, OLD.version_number, OLD.sha256, OLD.file_size, OLD.declared_mime, OLD.verified_mime, OLD.stored_object_id, OLD.original_name)
 THEN RAISE EXCEPTION 'DOCUMENT_VERSION_IMMUTABLE' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_document_version BEFORE UPDATE ON dossier_document_versions FOR EACH ROW EXECUTE FUNCTION protect_document_version();

CREATE FUNCTION protect_document_context() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME = 'opportunities' THEN
   IF (NEW.customer_id, NEW.organization_id) IS DISTINCT FROM (OLD.customer_id, OLD.organization_id)
     AND (EXISTS (SELECT 1 FROM document_opportunity_links WHERE opportunity_id = OLD.id)
       OR EXISTS (SELECT 1 FROM document_project_links l JOIN operational_projects p ON p.id = l.project_id WHERE p.opportunity_id = OLD.id)
       OR EXISTS (SELECT 1 FROM document_contract_links l JOIN contracts c ON c.id = l.contract_id WHERE c.opportunity_id = OLD.id)
       OR EXISTS (SELECT 1 FROM document_work_order_links l JOIN work_orders w ON w.id = l.work_order_id JOIN operational_projects p ON p.id = w.project_id WHERE p.opportunity_id = OLD.id))
   THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_IN_USE' USING ERRCODE = '23514'; END IF;
 ELSIF TG_TABLE_NAME = 'operational_projects' THEN
   IF (NEW.opportunity_id, NEW.organization_id) IS DISTINCT FROM (OLD.opportunity_id, OLD.organization_id)
     AND (EXISTS (SELECT 1 FROM document_project_links WHERE project_id = OLD.id) OR EXISTS (SELECT 1 FROM document_work_order_links l JOIN work_orders w ON w.id = l.work_order_id WHERE w.project_id = OLD.id))
   THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_IN_USE' USING ERRCODE = '23514'; END IF;
 ELSIF TG_TABLE_NAME = 'contracts' THEN
   IF (NEW.opportunity_id, NEW.organization_id) IS DISTINCT FROM (OLD.opportunity_id, OLD.organization_id) AND EXISTS (SELECT 1 FROM document_contract_links WHERE contract_id = OLD.id)
   THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_IN_USE' USING ERRCODE = '23514'; END IF;
 ELSIF TG_TABLE_NAME = 'work_orders' THEN
   IF (NEW.project_id, NEW.organization_id) IS DISTINCT FROM (OLD.project_id, OLD.organization_id) AND EXISTS (SELECT 1 FROM document_work_order_links WHERE work_order_id = OLD.id)
   THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_IN_USE' USING ERRCODE = '23514'; END IF;
 ELSE
   IF (NEW.customer_id, NEW.organization_id) IS DISTINCT FROM (OLD.customer_id, OLD.organization_id)
     AND ((TG_TABLE_NAME = 'utility_units' AND EXISTS (SELECT 1 FROM document_utility_unit_links WHERE utility_unit_id = OLD.id))
       OR (TG_TABLE_NAME = 'customer_representatives' AND EXISTS (SELECT 1 FROM document_representative_links WHERE representative_id = OLD.id)))
   THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_IN_USE' USING ERRCODE = '23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_document_context BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION protect_document_context();
CREATE TRIGGER protect_document_context BEFORE UPDATE ON utility_units FOR EACH ROW EXECUTE FUNCTION protect_document_context();
CREATE TRIGGER protect_document_context BEFORE UPDATE ON customer_representatives FOR EACH ROW EXECUTE FUNCTION protect_document_context();
CREATE TRIGGER protect_document_context BEFORE UPDATE ON operational_projects FOR EACH ROW EXECUTE FUNCTION protect_document_context();
CREATE TRIGGER protect_document_context BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION protect_document_context();
CREATE TRIGGER protect_document_context BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION protect_document_context();

CREATE FUNCTION enforce_dossier_customer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND (NEW.customer_id, NEW.organization_id) IS DISTINCT FROM (OLD.customer_id, OLD.organization_id)
 THEN RAISE EXCEPTION 'DOCUMENT_OWNER_IMMUTABLE' USING ERRCODE = '23514'; END IF;
 PERFORM 1 FROM customers WHERE id = NEW.customer_id AND organization_id = NEW.organization_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_CONTEXT_INVALID' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER dossier_customer BEFORE INSERT OR UPDATE ON dossier_documents FOR EACH ROW EXECUTE FUNCTION enforce_dossier_customer();
CREATE TRIGGER dossier_customer BEFORE INSERT OR UPDATE ON customer_representatives FOR EACH ROW EXECUTE FUNCTION enforce_dossier_customer();
ALTER TABLE "customer_representatives" DROP CONSTRAINT "customer_representatives_customer_id_fkey",
 ADD CONSTRAINT "customer_representatives_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION protect_verified_object() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.verified AND (NEW.organization_id, NEW.backend, NEW.bucket, NEW.key, NEW.sha256, NEW.byte_size)
   IS DISTINCT FROM (OLD.organization_id, OLD.backend, OLD.bucket, OLD.key, OLD.sha256, OLD.byte_size)
 THEN RAISE EXCEPTION 'VERIFIED_OBJECT_IMMUTABLE' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER verified_object_immutable BEFORE UPDATE ON stored_objects FOR EACH ROW EXECUTE FUNCTION protect_verified_object();
