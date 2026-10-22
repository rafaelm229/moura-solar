INSERT INTO "permissions" ("key")
VALUES ('inventory:availability:read')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_grants" ("role_id", "permission", "scope")
SELECT
  role."id",
  'inventory:availability:read',
  CASE WHEN role."name" = 'Vendedor' THEN 'organization' ELSE inventory_read."scope" END
FROM "roles" AS role
LEFT JOIN "role_grants" AS inventory_read
  ON inventory_read."role_id" = role."id"
  AND inventory_read."permission" = 'inventory:read'
WHERE role."name" = 'Vendedor'
   OR inventory_read."scope" = 'organization'
ON CONFLICT ("role_id", "permission")
DO UPDATE SET "scope" = EXCLUDED."scope";
