export const permissionCatalog = [
  'activities:manage',
  'after_sales:approve_courtesy',
  'after_sales:classify_coverage',
  'after_sales:close_warranty',
  'after_sales:issue_charge',
  'after_sales:read',
  'after_sales:request_charge',
  'after_sales:visit',
  'art:manage',
  'audit:read',
  'automations:configure',
  'automations:reprocess',
  'cashflow:manage_accounts',
  'cashflow:read',
  'catalog:manage',
  'catalog:read',
  'commissions:approve',
  'commissions:configure',
  'commissions:pay',
  'commissions:read_all',
  'commissions:read_own',
  'consumer_units:manage',
  'consumer_units:read',
  'contract_clauses:manage',
  'contract_templates:manage',
  'contracts:activate',
  'contracts:approve',
  'contracts:cancel',
  'contracts:create',
  'contracts:create_amendment',
  'contracts:download',
  'contracts:generate',
  'contracts:read',
  'contracts:reject_signed',
  'contracts:request_review',
  'contracts:send',
  'contracts:terminate',
  'contracts:update_draft',
  'contracts:upload_signed',
  'contracts:verify_signed',
  'costs:read',
  'costs:update',
  'costs:view_margin',
  'customers:archive',
  'customers:create',
  'customers:read',
  'customers:resolve_duplicate',
  'customers:restore',
  'customers:update',
  'delivery_reports:generate',
  'designs:approve',
  'designs:create',
  'designs:read',
  'designs:review',
  'designs:update',
  'documents:identity_read',
  'documents:read',
  'documents:upload',
  'engineering:approve',
  'engineering:create',
  'engineering:read',
  'engineering:review',
  'engineering:update',
  'energy_imports:create',
  'energy_imports:read',
  'energy_imports:review',
  'energy_imports:confirm',
  'energy_imports:cancel',
  'energy_imports:retry',
  'finance:read',
  'finance:view_project_summary',
  'financial_gates:waive',
  'financial_periods:close',
  'financial_periods:reopen',
  'goals:manage',
  'homologation:manage',
  'indicators:read',
  'installations:approve',
  'installations:collect_acceptance',
  'installations:commission',
  'installations:complete',
  'installations:record_materials',
  'installations:record_serials',
  'installations:review',
  'installations:upload_photos',
  'inventory:adjust',
  'inventory:approve_count',
  'inventory:confirm_transfer',
  'inventory:consume',
  'inventory:count',
  'inventory:dispose',
  'inventory:manage_serials',
  'inventory:pick',
  'inventory:quarantine',
  'inventory:read',
  'inventory:receive',
  'inventory:release_reservation',
  'inventory:reserve',
  'inventory:return',
  'inventory:transfer',
  'inventory:view_cost',
  'invitations:manage',
  'notifications:read_own',
  'opportunities:create',
  'opportunities:lose',
  'opportunities:qualify',
  'opportunities:read',
  'opportunities:reopen',
  'opportunities:update',
  'payables:create',
  'payables:read',
  'payments:create',
  'payments:reverse',
  'pricing:apply_discount',
  'pricing:apply_markup',
  'pricing:approve_exception',
  'proposals:accept',
  'proposals:approve_exception',
  'proposals:cancel',
  'proposals:create',
  'proposals:download',
  'proposals:extend_validity',
  'proposals:generate',
  'proposals:read',
  'proposals:record_view',
  'proposals:reject',
  'proposals:request_approval',
  'proposals:send',
  'proposals:update_draft',
  'proposals:view_costs',
  'proposals:view_margin',
  'purchases:approve',
  'purchases:cancel',
  'purchases:order',
  'purchases:receive',
  'purchases:request',
  'receipts:allocate',
  'receipts:create',
  'receipts:reverse',
  'receivables:create',
  'receivables:read',
  'receivables:renegotiate',
  'receivables:update_draft',
  'receivables:write_off',
  'roles:manage',
  'schedules:create',
  'schedules:override_conflict',
  'schedules:read',
  'schedules:update',
  'sessions:read_own',
  'sessions:revoke_any',
  'sessions:revoke_own',
  'suppliers:manage',
  'surveys:complete',
  'surveys:create',
  'surveys:read',
  'surveys:update',
  'teams:manage',
  'templates:manage',
  'users:issue_recovery',
  'users:manage',
  'warranties:manage',
  'work_orders:assign',
  'work_orders:complete',
  'work_orders:pause',
  'work_orders:read',
  'work_orders:start',
] as const;
export const initialRoles: Record<string, { permission: string; scope: string }[]> = {
  Administrador: [
    { permission: 'documents:identity_read', scope: 'organization' },
    { permission: 'energy_imports:create', scope: 'organization' },
    { permission: 'energy_imports:read', scope: 'organization' },
    { permission: 'energy_imports:review', scope: 'organization' },
    { permission: 'energy_imports:confirm', scope: 'organization' },
    { permission: 'energy_imports:cancel', scope: 'organization' },
    { permission: 'energy_imports:retry', scope: 'organization' },
    {
      permission: 'activities:manage',
      scope: 'organization',
    },
    {
      permission: 'after_sales:approve_courtesy',
      scope: 'organization',
    },
    {
      permission: 'after_sales:classify_coverage',
      scope: 'organization',
    },
    {
      permission: 'after_sales:close_warranty',
      scope: 'organization',
    },
    {
      permission: 'after_sales:issue_charge',
      scope: 'organization',
    },
    {
      permission: 'after_sales:read',
      scope: 'organization',
    },
    {
      permission: 'after_sales:request_charge',
      scope: 'organization',
    },
    {
      permission: 'after_sales:visit',
      scope: 'organization',
    },
    {
      permission: 'art:manage',
      scope: 'organization',
    },
    {
      permission: 'audit:read',
      scope: 'organization',
    },
    {
      permission: 'automations:configure',
      scope: 'organization',
    },
    {
      permission: 'automations:reprocess',
      scope: 'organization',
    },
    {
      permission: 'cashflow:manage_accounts',
      scope: 'organization',
    },
    {
      permission: 'cashflow:read',
      scope: 'organization',
    },
    {
      permission: 'catalog:manage',
      scope: 'organization',
    },
    {
      permission: 'catalog:read',
      scope: 'organization',
    },
    {
      permission: 'commissions:approve',
      scope: 'organization',
    },
    {
      permission: 'commissions:configure',
      scope: 'organization',
    },
    {
      permission: 'commissions:pay',
      scope: 'organization',
    },
    {
      permission: 'commissions:read_all',
      scope: 'organization',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:manage',
      scope: 'organization',
    },
    {
      permission: 'consumer_units:read',
      scope: 'organization',
    },
    {
      permission: 'contract_clauses:manage',
      scope: 'organization',
    },
    {
      permission: 'contract_templates:manage',
      scope: 'organization',
    },
    {
      permission: 'contracts:activate',
      scope: 'organization',
    },
    {
      permission: 'contracts:approve',
      scope: 'organization',
    },
    {
      permission: 'contracts:cancel',
      scope: 'organization',
    },
    {
      permission: 'contracts:create',
      scope: 'organization',
    },
    {
      permission: 'contracts:create_amendment',
      scope: 'organization',
    },
    {
      permission: 'contracts:download',
      scope: 'organization',
    },
    {
      permission: 'contracts:generate',
      scope: 'organization',
    },
    {
      permission: 'contracts:read',
      scope: 'organization',
    },
    {
      permission: 'contracts:reject_signed',
      scope: 'organization',
    },
    {
      permission: 'contracts:request_review',
      scope: 'organization',
    },
    {
      permission: 'contracts:send',
      scope: 'organization',
    },
    {
      permission: 'contracts:terminate',
      scope: 'organization',
    },
    {
      permission: 'contracts:update_draft',
      scope: 'organization',
    },
    {
      permission: 'contracts:upload_signed',
      scope: 'organization',
    },
    {
      permission: 'contracts:verify_signed',
      scope: 'organization',
    },
    {
      permission: 'costs:read',
      scope: 'organization',
    },
    {
      permission: 'costs:update',
      scope: 'organization',
    },
    {
      permission: 'costs:view_margin',
      scope: 'organization',
    },
    {
      permission: 'customers:archive',
      scope: 'organization',
    },
    {
      permission: 'customers:create',
      scope: 'organization',
    },
    {
      permission: 'customers:read',
      scope: 'organization',
    },
    {
      permission: 'customers:resolve_duplicate',
      scope: 'organization',
    },
    {
      permission: 'customers:restore',
      scope: 'organization',
    },
    {
      permission: 'customers:update',
      scope: 'organization',
    },
    {
      permission: 'delivery_reports:generate',
      scope: 'organization',
    },
    {
      permission: 'designs:approve',
      scope: 'organization',
    },
    {
      permission: 'designs:create',
      scope: 'organization',
    },
    {
      permission: 'designs:read',
      scope: 'organization',
    },
    {
      permission: 'designs:review',
      scope: 'organization',
    },
    {
      permission: 'designs:update',
      scope: 'organization',
    },
    {
      permission: 'documents:read',
      scope: 'organization',
    },
    {
      permission: 'documents:upload',
      scope: 'organization',
    },
    {
      permission: 'engineering:approve',
      scope: 'organization',
    },
    {
      permission: 'engineering:create',
      scope: 'organization',
    },
    {
      permission: 'engineering:read',
      scope: 'organization',
    },
    {
      permission: 'engineering:review',
      scope: 'organization',
    },
    {
      permission: 'engineering:update',
      scope: 'organization',
    },
    {
      permission: 'finance:read',
      scope: 'organization',
    },
    {
      permission: 'finance:view_project_summary',
      scope: 'organization',
    },
    {
      permission: 'financial_gates:waive',
      scope: 'organization',
    },
    {
      permission: 'financial_periods:close',
      scope: 'organization',
    },
    {
      permission: 'financial_periods:reopen',
      scope: 'organization',
    },
    {
      permission: 'goals:manage',
      scope: 'organization',
    },
    {
      permission: 'homologation:manage',
      scope: 'organization',
    },
    {
      permission: 'indicators:read',
      scope: 'organization',
    },
    {
      permission: 'installations:approve',
      scope: 'organization',
    },
    {
      permission: 'installations:collect_acceptance',
      scope: 'organization',
    },
    {
      permission: 'installations:commission',
      scope: 'organization',
    },
    {
      permission: 'installations:complete',
      scope: 'organization',
    },
    {
      permission: 'installations:record_materials',
      scope: 'organization',
    },
    {
      permission: 'installations:record_serials',
      scope: 'organization',
    },
    {
      permission: 'installations:review',
      scope: 'organization',
    },
    {
      permission: 'installations:upload_photos',
      scope: 'organization',
    },
    {
      permission: 'inventory:adjust',
      scope: 'organization',
    },
    {
      permission: 'inventory:approve_count',
      scope: 'organization',
    },
    {
      permission: 'inventory:confirm_transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:consume',
      scope: 'organization',
    },
    {
      permission: 'inventory:count',
      scope: 'organization',
    },
    {
      permission: 'inventory:dispose',
      scope: 'organization',
    },
    {
      permission: 'inventory:manage_serials',
      scope: 'organization',
    },
    {
      permission: 'inventory:pick',
      scope: 'organization',
    },
    {
      permission: 'inventory:quarantine',
      scope: 'organization',
    },
    {
      permission: 'inventory:read',
      scope: 'organization',
    },
    {
      permission: 'inventory:receive',
      scope: 'organization',
    },
    {
      permission: 'inventory:release_reservation',
      scope: 'organization',
    },
    {
      permission: 'inventory:reserve',
      scope: 'organization',
    },
    {
      permission: 'inventory:return',
      scope: 'organization',
    },
    {
      permission: 'inventory:transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:view_cost',
      scope: 'organization',
    },
    {
      permission: 'invitations:manage',
      scope: 'organization',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'opportunities:create',
      scope: 'organization',
    },
    {
      permission: 'opportunities:lose',
      scope: 'organization',
    },
    {
      permission: 'opportunities:qualify',
      scope: 'organization',
    },
    {
      permission: 'opportunities:read',
      scope: 'organization',
    },
    {
      permission: 'opportunities:reopen',
      scope: 'organization',
    },
    {
      permission: 'opportunities:update',
      scope: 'organization',
    },
    {
      permission: 'payables:create',
      scope: 'organization',
    },
    {
      permission: 'payables:read',
      scope: 'organization',
    },
    {
      permission: 'payments:create',
      scope: 'organization',
    },
    {
      permission: 'payments:reverse',
      scope: 'organization',
    },
    {
      permission: 'pricing:apply_discount',
      scope: 'organization',
    },
    {
      permission: 'pricing:apply_markup',
      scope: 'organization',
    },
    {
      permission: 'pricing:approve_exception',
      scope: 'organization',
    },
    {
      permission: 'proposals:accept',
      scope: 'organization',
    },
    {
      permission: 'proposals:approve_exception',
      scope: 'organization',
    },
    {
      permission: 'proposals:cancel',
      scope: 'organization',
    },
    {
      permission: 'proposals:create',
      scope: 'organization',
    },
    {
      permission: 'proposals:download',
      scope: 'organization',
    },
    {
      permission: 'proposals:extend_validity',
      scope: 'organization',
    },
    {
      permission: 'proposals:generate',
      scope: 'organization',
    },
    {
      permission: 'proposals:read',
      scope: 'organization',
    },
    {
      permission: 'proposals:record_view',
      scope: 'organization',
    },
    {
      permission: 'proposals:reject',
      scope: 'organization',
    },
    {
      permission: 'proposals:request_approval',
      scope: 'organization',
    },
    {
      permission: 'proposals:send',
      scope: 'organization',
    },
    {
      permission: 'proposals:update_draft',
      scope: 'organization',
    },
    {
      permission: 'proposals:view_costs',
      scope: 'organization',
    },
    {
      permission: 'proposals:view_margin',
      scope: 'organization',
    },
    {
      permission: 'purchases:approve',
      scope: 'organization',
    },
    {
      permission: 'purchases:cancel',
      scope: 'organization',
    },
    {
      permission: 'purchases:order',
      scope: 'organization',
    },
    {
      permission: 'purchases:receive',
      scope: 'organization',
    },
    {
      permission: 'purchases:request',
      scope: 'organization',
    },
    {
      permission: 'receipts:allocate',
      scope: 'organization',
    },
    {
      permission: 'receipts:create',
      scope: 'organization',
    },
    {
      permission: 'receipts:reverse',
      scope: 'organization',
    },
    {
      permission: 'receivables:create',
      scope: 'organization',
    },
    {
      permission: 'receivables:read',
      scope: 'organization',
    },
    {
      permission: 'receivables:renegotiate',
      scope: 'organization',
    },
    {
      permission: 'receivables:update_draft',
      scope: 'organization',
    },
    {
      permission: 'receivables:write_off',
      scope: 'organization',
    },
    {
      permission: 'roles:manage',
      scope: 'organization',
    },
    {
      permission: 'schedules:create',
      scope: 'organization',
    },
    {
      permission: 'schedules:override_conflict',
      scope: 'organization',
    },
    {
      permission: 'schedules:read',
      scope: 'organization',
    },
    {
      permission: 'schedules:update',
      scope: 'organization',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_any',
      scope: 'organization',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'suppliers:manage',
      scope: 'organization',
    },
    {
      permission: 'surveys:complete',
      scope: 'organization',
    },
    {
      permission: 'surveys:create',
      scope: 'organization',
    },
    {
      permission: 'surveys:read',
      scope: 'organization',
    },
    {
      permission: 'surveys:update',
      scope: 'organization',
    },
    {
      permission: 'teams:manage',
      scope: 'organization',
    },
    {
      permission: 'templates:manage',
      scope: 'organization',
    },
    {
      permission: 'users:issue_recovery',
      scope: 'organization',
    },
    {
      permission: 'users:manage',
      scope: 'organization',
    },
    {
      permission: 'warranties:manage',
      scope: 'organization',
    },
    {
      permission: 'work_orders:assign',
      scope: 'organization',
    },
    {
      permission: 'work_orders:complete',
      scope: 'organization',
    },
    {
      permission: 'work_orders:pause',
      scope: 'organization',
    },
    {
      permission: 'work_orders:read',
      scope: 'organization',
    },
    {
      permission: 'work_orders:start',
      scope: 'organization',
    },
  ],
  Gerente: [
    {
      permission: 'activities:manage',
      scope: 'team',
    },
    {
      permission: 'after_sales:classify_coverage',
      scope: 'team',
    },
    {
      permission: 'after_sales:close_warranty',
      scope: 'team',
    },
    {
      permission: 'after_sales:read',
      scope: 'team',
    },
    {
      permission: 'after_sales:request_charge',
      scope: 'team',
    },
    {
      permission: 'after_sales:visit',
      scope: 'team',
    },
    {
      permission: 'audit:read',
      scope: 'team',
    },
    {
      permission: 'automations:configure',
      scope: 'team',
    },
    {
      permission: 'cashflow:read',
      scope: 'team',
    },
    {
      permission: 'catalog:read',
      scope: 'organization',
    },
    {
      permission: 'commissions:approve',
      scope: 'team',
    },
    {
      permission: 'commissions:read_all',
      scope: 'team',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:manage',
      scope: 'team',
    },
    {
      permission: 'consumer_units:read',
      scope: 'team',
    },
    {
      permission: 'contracts:cancel',
      scope: 'team',
    },
    {
      permission: 'contracts:create',
      scope: 'team',
    },
    {
      permission: 'contracts:create_amendment',
      scope: 'team',
    },
    {
      permission: 'contracts:download',
      scope: 'team',
    },
    {
      permission: 'contracts:generate',
      scope: 'team',
    },
    {
      permission: 'contracts:read',
      scope: 'team',
    },
    {
      permission: 'contracts:request_review',
      scope: 'team',
    },
    {
      permission: 'contracts:send',
      scope: 'team',
    },
    {
      permission: 'contracts:terminate',
      scope: 'team',
    },
    {
      permission: 'contracts:update_draft',
      scope: 'team',
    },
    {
      permission: 'contracts:upload_signed',
      scope: 'team',
    },
    {
      permission: 'costs:read',
      scope: 'team',
    },
    {
      permission: 'costs:update',
      scope: 'team',
    },
    {
      permission: 'costs:view_margin',
      scope: 'team',
    },
    {
      permission: 'customers:archive',
      scope: 'team',
    },
    {
      permission: 'customers:create',
      scope: 'team',
    },
    {
      permission: 'customers:read',
      scope: 'team',
    },
    {
      permission: 'customers:resolve_duplicate',
      scope: 'team',
    },
    {
      permission: 'customers:restore',
      scope: 'team',
    },
    {
      permission: 'customers:update',
      scope: 'team',
    },
    {
      permission: 'delivery_reports:generate',
      scope: 'team',
    },
    {
      permission: 'designs:create',
      scope: 'team',
    },
    {
      permission: 'designs:read',
      scope: 'team',
    },
    {
      permission: 'designs:update',
      scope: 'team',
    },
    {
      permission: 'documents:read',
      scope: 'team',
    },
    {
      permission: 'documents:upload',
      scope: 'team',
    },
    {
      permission: 'engineering:read',
      scope: 'team',
    },
    {
      permission: 'finance:read',
      scope: 'team',
    },
    {
      permission: 'finance:view_project_summary',
      scope: 'team',
    },
    {
      permission: 'goals:manage',
      scope: 'team',
    },
    {
      permission: 'indicators:read',
      scope: 'team',
    },
    {
      permission: 'installations:collect_acceptance',
      scope: 'team',
    },
    {
      permission: 'installations:commission',
      scope: 'team',
    },
    {
      permission: 'installations:record_materials',
      scope: 'team',
    },
    {
      permission: 'installations:record_serials',
      scope: 'team',
    },
    {
      permission: 'installations:review',
      scope: 'team',
    },
    {
      permission: 'installations:upload_photos',
      scope: 'team',
    },
    {
      permission: 'inventory:adjust',
      scope: 'organization',
    },
    {
      permission: 'inventory:approve_count',
      scope: 'organization',
    },
    {
      permission: 'inventory:confirm_transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:consume',
      scope: 'organization',
    },
    {
      permission: 'inventory:count',
      scope: 'organization',
    },
    {
      permission: 'inventory:dispose',
      scope: 'organization',
    },
    {
      permission: 'inventory:manage_serials',
      scope: 'organization',
    },
    {
      permission: 'inventory:pick',
      scope: 'organization',
    },
    {
      permission: 'inventory:quarantine',
      scope: 'organization',
    },
    {
      permission: 'inventory:read',
      scope: 'organization',
    },
    {
      permission: 'inventory:receive',
      scope: 'organization',
    },
    {
      permission: 'inventory:release_reservation',
      scope: 'organization',
    },
    {
      permission: 'inventory:reserve',
      scope: 'organization',
    },
    {
      permission: 'inventory:return',
      scope: 'organization',
    },
    {
      permission: 'inventory:transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:view_cost',
      scope: 'organization',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'opportunities:create',
      scope: 'team',
    },
    {
      permission: 'opportunities:lose',
      scope: 'team',
    },
    {
      permission: 'opportunities:qualify',
      scope: 'team',
    },
    {
      permission: 'opportunities:read',
      scope: 'team',
    },
    {
      permission: 'opportunities:reopen',
      scope: 'team',
    },
    {
      permission: 'opportunities:update',
      scope: 'team',
    },
    {
      permission: 'payables:read',
      scope: 'team',
    },
    {
      permission: 'pricing:apply_discount',
      scope: 'team',
    },
    {
      permission: 'pricing:apply_markup',
      scope: 'team',
    },
    {
      permission: 'pricing:approve_exception',
      scope: 'team',
    },
    {
      permission: 'proposals:accept',
      scope: 'team',
    },
    {
      permission: 'proposals:approve_exception',
      scope: 'team',
    },
    {
      permission: 'proposals:cancel',
      scope: 'team',
    },
    {
      permission: 'proposals:create',
      scope: 'team',
    },
    {
      permission: 'proposals:download',
      scope: 'team',
    },
    {
      permission: 'proposals:extend_validity',
      scope: 'team',
    },
    {
      permission: 'proposals:generate',
      scope: 'team',
    },
    {
      permission: 'proposals:read',
      scope: 'team',
    },
    {
      permission: 'proposals:record_view',
      scope: 'team',
    },
    {
      permission: 'proposals:reject',
      scope: 'team',
    },
    {
      permission: 'proposals:request_approval',
      scope: 'team',
    },
    {
      permission: 'proposals:send',
      scope: 'team',
    },
    {
      permission: 'proposals:update_draft',
      scope: 'team',
    },
    {
      permission: 'proposals:view_costs',
      scope: 'team',
    },
    {
      permission: 'proposals:view_margin',
      scope: 'team',
    },
    {
      permission: 'purchases:approve',
      scope: 'organization',
    },
    {
      permission: 'purchases:cancel',
      scope: 'organization',
    },
    {
      permission: 'purchases:order',
      scope: 'organization',
    },
    {
      permission: 'purchases:receive',
      scope: 'organization',
    },
    {
      permission: 'purchases:request',
      scope: 'organization',
    },
    {
      permission: 'receivables:read',
      scope: 'team',
    },
    {
      permission: 'schedules:create',
      scope: 'team',
    },
    {
      permission: 'schedules:read',
      scope: 'team',
    },
    {
      permission: 'schedules:update',
      scope: 'team',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'suppliers:manage',
      scope: 'organization',
    },
    {
      permission: 'surveys:complete',
      scope: 'team',
    },
    {
      permission: 'surveys:create',
      scope: 'team',
    },
    {
      permission: 'surveys:read',
      scope: 'team',
    },
    {
      permission: 'surveys:update',
      scope: 'team',
    },
    {
      permission: 'teams:manage',
      scope: 'organization',
    },
    {
      permission: 'warranties:manage',
      scope: 'organization',
    },
    {
      permission: 'work_orders:assign',
      scope: 'team',
    },
    {
      permission: 'work_orders:complete',
      scope: 'team',
    },
    {
      permission: 'work_orders:pause',
      scope: 'team',
    },
    {
      permission: 'work_orders:read',
      scope: 'team',
    },
    {
      permission: 'work_orders:start',
      scope: 'team',
    },
  ],
  Vendedor: [
    {
      permission: 'activities:manage',
      scope: 'own',
    },
    {
      permission: 'after_sales:read',
      scope: 'own',
    },
    {
      permission: 'audit:read',
      scope: 'own',
    },
    {
      permission: 'catalog:read',
      scope: 'own',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:manage',
      scope: 'own',
    },
    {
      permission: 'consumer_units:read',
      scope: 'own',
    },
    {
      permission: 'contracts:create',
      scope: 'own',
    },
    {
      permission: 'contracts:download',
      scope: 'own',
    },
    {
      permission: 'contracts:generate',
      scope: 'own',
    },
    {
      permission: 'contracts:read',
      scope: 'own',
    },
    {
      permission: 'contracts:request_review',
      scope: 'own',
    },
    {
      permission: 'contracts:send',
      scope: 'own',
    },
    {
      permission: 'contracts:update_draft',
      scope: 'own',
    },
    {
      permission: 'contracts:upload_signed',
      scope: 'own',
    },
    {
      permission: 'costs:read',
      scope: 'own',
    },
    {
      permission: 'costs:update',
      scope: 'own',
    },
    {
      permission: 'costs:view_margin',
      scope: 'own',
    },
    {
      permission: 'customers:create',
      scope: 'own',
    },
    {
      permission: 'customers:read',
      scope: 'own',
    },
    {
      permission: 'customers:update',
      scope: 'own',
    },
    {
      permission: 'designs:create',
      scope: 'own',
    },
    {
      permission: 'designs:read',
      scope: 'own',
    },
    {
      permission: 'designs:update',
      scope: 'own',
    },
    {
      permission: 'documents:read',
      scope: 'own',
    },
    {
      permission: 'documents:upload',
      scope: 'own',
    },
    {
      permission: 'finance:view_project_summary',
      scope: 'own',
    },
    {
      permission: 'indicators:read',
      scope: 'own',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'opportunities:create',
      scope: 'own',
    },
    {
      permission: 'opportunities:lose',
      scope: 'own',
    },
    {
      permission: 'opportunities:qualify',
      scope: 'own',
    },
    {
      permission: 'opportunities:read',
      scope: 'own',
    },
    {
      permission: 'opportunities:update',
      scope: 'own',
    },
    {
      permission: 'pricing:apply_discount',
      scope: 'own',
    },
    {
      permission: 'pricing:apply_markup',
      scope: 'own',
    },
    {
      permission: 'proposals:accept',
      scope: 'own',
    },
    {
      permission: 'proposals:cancel',
      scope: 'own',
    },
    {
      permission: 'proposals:create',
      scope: 'own',
    },
    {
      permission: 'proposals:download',
      scope: 'own',
    },
    {
      permission: 'proposals:extend_validity',
      scope: 'own',
    },
    {
      permission: 'proposals:generate',
      scope: 'own',
    },
    {
      permission: 'proposals:read',
      scope: 'own',
    },
    {
      permission: 'proposals:record_view',
      scope: 'own',
    },
    {
      permission: 'proposals:reject',
      scope: 'own',
    },
    {
      permission: 'proposals:request_approval',
      scope: 'own',
    },
    {
      permission: 'proposals:send',
      scope: 'own',
    },
    {
      permission: 'proposals:update_draft',
      scope: 'own',
    },
    {
      permission: 'proposals:view_costs',
      scope: 'own',
    },
    {
      permission: 'proposals:view_margin',
      scope: 'own',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'surveys:complete',
      scope: 'own',
    },
    {
      permission: 'surveys:create',
      scope: 'own',
    },
    {
      permission: 'surveys:read',
      scope: 'own',
    },
    {
      permission: 'surveys:update',
      scope: 'own',
    },
  ],
  Financeiro: [
    {
      permission: 'after_sales:issue_charge',
      scope: 'organization',
    },
    {
      permission: 'after_sales:read',
      scope: 'linked',
    },
    {
      permission: 'audit:read',
      scope: 'domain',
    },
    {
      permission: 'cashflow:manage_accounts',
      scope: 'organization',
    },
    {
      permission: 'cashflow:read',
      scope: 'organization',
    },
    {
      permission: 'commissions:approve',
      scope: 'organization',
    },
    {
      permission: 'commissions:pay',
      scope: 'organization',
    },
    {
      permission: 'commissions:read_all',
      scope: 'organization',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:read',
      scope: 'linked',
    },
    {
      permission: 'contracts:download',
      scope: 'linked',
    },
    {
      permission: 'contracts:read',
      scope: 'linked',
    },
    {
      permission: 'customers:read',
      scope: 'linked',
    },
    {
      permission: 'documents:read',
      scope: 'linked',
    },
    {
      permission: 'finance:read',
      scope: 'organization',
    },
    {
      permission: 'finance:view_project_summary',
      scope: 'organization',
    },
    {
      permission: 'financial_periods:close',
      scope: 'organization',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'payables:create',
      scope: 'organization',
    },
    {
      permission: 'payables:read',
      scope: 'organization',
    },
    {
      permission: 'payments:create',
      scope: 'organization',
    },
    {
      permission: 'payments:reverse',
      scope: 'organization',
    },
    {
      permission: 'proposals:read',
      scope: 'linked',
    },
    {
      permission: 'receipts:allocate',
      scope: 'organization',
    },
    {
      permission: 'receipts:create',
      scope: 'organization',
    },
    {
      permission: 'receipts:reverse',
      scope: 'organization',
    },
    {
      permission: 'receivables:create',
      scope: 'organization',
    },
    {
      permission: 'receivables:read',
      scope: 'organization',
    },
    {
      permission: 'receivables:renegotiate',
      scope: 'organization',
    },
    {
      permission: 'receivables:update_draft',
      scope: 'organization',
    },
    {
      permission: 'receivables:write_off',
      scope: 'organization',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
  ],
  Estoquista: [
    {
      permission: 'audit:read',
      scope: 'domain',
    },
    {
      permission: 'catalog:read',
      scope: 'organization',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:read',
      scope: 'linked',
    },
    {
      permission: 'customers:read',
      scope: 'linked',
    },
    {
      permission: 'documents:read',
      scope: 'linked',
    },
    {
      permission: 'inventory:confirm_transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:consume',
      scope: 'organization',
    },
    {
      permission: 'inventory:count',
      scope: 'organization',
    },
    {
      permission: 'inventory:manage_serials',
      scope: 'organization',
    },
    {
      permission: 'inventory:pick',
      scope: 'organization',
    },
    {
      permission: 'inventory:quarantine',
      scope: 'organization',
    },
    {
      permission: 'inventory:read',
      scope: 'organization',
    },
    {
      permission: 'inventory:receive',
      scope: 'organization',
    },
    {
      permission: 'inventory:release_reservation',
      scope: 'organization',
    },
    {
      permission: 'inventory:reserve',
      scope: 'organization',
    },
    {
      permission: 'inventory:return',
      scope: 'organization',
    },
    {
      permission: 'inventory:transfer',
      scope: 'organization',
    },
    {
      permission: 'inventory:view_cost',
      scope: 'organization',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'purchases:order',
      scope: 'organization',
    },
    {
      permission: 'purchases:receive',
      scope: 'organization',
    },
    {
      permission: 'purchases:request',
      scope: 'organization',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'suppliers:manage',
      scope: 'organization',
    },
    {
      permission: 'warranties:manage',
      scope: 'organization',
    },
  ],
  Instalador: [
    {
      permission: 'after_sales:read',
      scope: 'assigned',
    },
    {
      permission: 'after_sales:visit',
      scope: 'assigned',
    },
    {
      permission: 'audit:read',
      scope: 'own',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:read',
      scope: 'assigned',
    },
    {
      permission: 'customers:read',
      scope: 'assigned',
    },
    {
      permission: 'documents:read',
      scope: 'assigned',
    },
    {
      permission: 'documents:upload',
      scope: 'assigned',
    },
    {
      permission: 'installations:collect_acceptance',
      scope: 'assigned',
    },
    {
      permission: 'installations:commission',
      scope: 'assigned',
    },
    {
      permission: 'installations:record_materials',
      scope: 'assigned',
    },
    {
      permission: 'installations:record_serials',
      scope: 'assigned',
    },
    {
      permission: 'installations:upload_photos',
      scope: 'assigned',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'schedules:read',
      scope: 'assigned',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'work_orders:complete',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:pause',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:read',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:start',
      scope: 'assigned',
    },
  ],
  Engenharia: [
    {
      permission: 'after_sales:read',
      scope: 'assigned',
    },
    {
      permission: 'after_sales:visit',
      scope: 'assigned',
    },
    {
      permission: 'art:manage',
      scope: 'assigned',
    },
    {
      permission: 'audit:read',
      scope: 'domain',
    },
    {
      permission: 'catalog:read',
      scope: 'assigned',
    },
    {
      permission: 'commissions:read_own',
      scope: 'own',
    },
    {
      permission: 'consumer_units:read',
      scope: 'assigned',
    },
    {
      permission: 'contracts:read',
      scope: 'assigned',
    },
    {
      permission: 'customers:read',
      scope: 'assigned',
    },
    {
      permission: 'delivery_reports:generate',
      scope: 'assigned',
    },
    {
      permission: 'designs:approve',
      scope: 'assigned',
    },
    {
      permission: 'designs:create',
      scope: 'assigned',
    },
    {
      permission: 'designs:read',
      scope: 'assigned',
    },
    {
      permission: 'designs:review',
      scope: 'assigned',
    },
    {
      permission: 'designs:update',
      scope: 'assigned',
    },
    {
      permission: 'documents:read',
      scope: 'assigned',
    },
    {
      permission: 'documents:upload',
      scope: 'assigned',
    },
    {
      permission: 'engineering:approve',
      scope: 'assigned',
    },
    {
      permission: 'engineering:create',
      scope: 'assigned',
    },
    {
      permission: 'engineering:read',
      scope: 'assigned',
    },
    {
      permission: 'engineering:review',
      scope: 'assigned',
    },
    {
      permission: 'engineering:update',
      scope: 'assigned',
    },
    {
      permission: 'homologation:manage',
      scope: 'assigned',
    },
    {
      permission: 'installations:approve',
      scope: 'assigned',
    },
    {
      permission: 'installations:collect_acceptance',
      scope: 'assigned',
    },
    {
      permission: 'installations:commission',
      scope: 'assigned',
    },
    {
      permission: 'installations:record_materials',
      scope: 'assigned',
    },
    {
      permission: 'installations:record_serials',
      scope: 'assigned',
    },
    {
      permission: 'installations:review',
      scope: 'assigned',
    },
    {
      permission: 'installations:upload_photos',
      scope: 'assigned',
    },
    {
      permission: 'inventory:read',
      scope: 'assigned',
    },
    {
      permission: 'notifications:read_own',
      scope: 'own',
    },
    {
      permission: 'proposals:read',
      scope: 'assigned',
    },
    {
      permission: 'purchases:request',
      scope: 'assigned',
    },
    {
      permission: 'schedules:read',
      scope: 'assigned',
    },
    {
      permission: 'sessions:read_own',
      scope: 'own',
    },
    {
      permission: 'sessions:revoke_own',
      scope: 'own',
    },
    {
      permission: 'surveys:complete',
      scope: 'assigned',
    },
    {
      permission: 'surveys:create',
      scope: 'assigned',
    },
    {
      permission: 'surveys:read',
      scope: 'assigned',
    },
    {
      permission: 'surveys:update',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:complete',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:pause',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:read',
      scope: 'assigned',
    },
    {
      permission: 'work_orders:start',
      scope: 'assigned',
    },
  ],
};
