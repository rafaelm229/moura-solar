# Matriz completa de permissões — proposta para decisão

**Status:** aprovada pelo usuário em 29/09/2026; implementação em andamento. Derivada das SPECs 002 e 004–012.
Esta matriz não autoriza implementar os módulos posteriores ao M1.

## Escopos propostos

- `ORG`: registros da organização do vínculo ativo; nunca acesso entre organizações.
- `PRÓPRIO`: usuário responsável pelo registro. Em sessões, notificações e comissões,
  significa o titular; em auditoria, o ator. Criar atribui o registro ao próprio usuário.
- `EQUIPE`: registros dos membros das equipes explicitamente vinculadas ao usuário.
  Não inferir equipe apenas pelo papel. Falta de vínculo nega acesso.
- `DESIGNADO`: ordem/projeto atribuído explicitamente ao usuário ou à sua equipe.
- `VINCULADO`: apenas dados mínimos de clientes/documentos relacionados a uma tarefa
  financeira ou logística autorizada; não libera o cadastro completo.
- `DOMÍNIO`: auditoria das ações do domínio financeiro, estoque ou técnico do papel,
  na mesma organização. Não inclui credenciais nem eventos administrativos.
- `—`: negado por padrão. Delegação posterior exige administrador autorizado.

Escopo limita linhas; permissões de custos e margens também limitam campos e PDFs.
Documentos herdam o escopo da entidade e exigem permissão própria. Listas, contagens,
busca, exportações e acesso por ID aplicam a mesma política na API.
Administrador recebe capacidades explícitas; não se usa bypass por nome do papel.
Permissões não substituem gates, limites de alçada ou habilitação técnica.

## Decisões já recebidas

- Convite por link entregue pelo administrador.
- Recuperação também mediada pelo administrador: emitir link de uso único;
  administrador não escolhe nem consulta a senha do usuário.
- Definir a matriz completa antes de implementar permissões no M1.

## Proposta de atribuição

Cada linha é uma permissão independente; os escopos abaixo foram aprovados para
o catálogo inicial. Gates e alçadas dos domínios continuam nas respectivas SPECs.
`Proposta` na origem identifica nomes novos que precisam ser incorporados à SPEC.

| Permissão                          | Admin   | Gerente | Vendedor | Financeiro | Estoquista | Instalador | Engenharia | Origem   |
| ---------------------------------- | ------- | ------- | -------- | ---------- | ---------- | ---------- | ---------- | -------- |
| `activities:manage`                | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `after_sales:approve_courtesy`     | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `after_sales:classify_coverage`    | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `after_sales:close_warranty`       | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `after_sales:issue_charge`         | ORG     | —       | —        | ORG        | —          | —          | —          | Proposta |
| `after_sales:read`                 | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | —          | DESIGNADO  | DESIGNADO  | Proposta |
| `after_sales:request_charge`       | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `after_sales:visit`                | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | Proposta |
| `art:manage`                       | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `audit:read`                       | ORG     | EQUIPE  | PRÓPRIO  | DOMÍNIO    | DOMÍNIO    | PRÓPRIO    | DOMÍNIO    | SPEC-002 |
| `automations:configure`            | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `automations:reprocess`            | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `cashflow:manage_accounts`         | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `cashflow:read`                    | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `catalog:manage`                   | ORG     | —       | —        | —          | —          | —          | —          | SPEC-005 |
| `catalog:read`                     | ORG     | ORG     | PRÓPRIO  | —          | ORG        | —          | DESIGNADO  | SPEC-005 |
| `commissions:approve`              | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `commissions:configure`            | ORG     | —       | —        | —          | —          | —          | —          | SPEC-008 |
| `commissions:pay`                  | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `commissions:read_all`             | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `commissions:read_own`             | PRÓPRIO | PRÓPRIO | PRÓPRIO  | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | SPEC-008 |
| `consumer_units:manage`            | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `consumer_units:read`              | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | VINCULADO  | DESIGNADO  | DESIGNADO  | Proposta |
| `contract_clauses:manage`          | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `contract_templates:manage`        | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:activate`               | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:approve`                | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:cancel`                 | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:create`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:create_amendment`       | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:download`               | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | —          | —          | —          | SPEC-007 |
| `contracts:generate`               | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:read`                   | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | —          | —          | DESIGNADO  | SPEC-007 |
| `contracts:reject_signed`          | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:request_review`         | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:send`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:terminate`              | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-007 |
| `contracts:update_draft`           | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:upload_signed`          | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-007 |
| `contracts:verify_signed`          | ORG     | —       | —        | —          | —          | —          | —          | SPEC-007 |
| `costs:read`                       | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-005 |
| `costs:update`                     | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-005 |
| `costs:view_margin`                | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-005 |
| `customers:archive`                | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `customers:create`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-002 |
| `customers:read`                   | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | VINCULADO  | DESIGNADO  | DESIGNADO  | SPEC-002 |
| `customers:resolve_duplicate`      | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `customers:restore`                | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `customers:update`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-002 |
| `delivery_reports:generate`        | ORG     | EQUIPE  | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `designs:approve`                  | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `designs:create`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `designs:read`                     | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `designs:review`                   | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `designs:update`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `documents:read`                   | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | VINCULADO  | DESIGNADO  | DESIGNADO  | Proposta |
| `documents:upload`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | DESIGNADO  | DESIGNADO  | Proposta |
| `engineering:approve`              | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `engineering:create`               | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `engineering:read`                 | ORG     | EQUIPE  | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `engineering:review`               | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `engineering:update`               | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `finance:read`                     | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `finance:view_project_summary`     | ORG     | EQUIPE  | PRÓPRIO  | ORG        | —          | —          | —          | SPEC-008 |
| `financial_gates:waive`            | ORG     | —       | —        | —          | —          | —          | —          | SPEC-008 |
| `financial_periods:close`          | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `financial_periods:reopen`         | ORG     | —       | —        | —          | —          | —          | —          | SPEC-008 |
| `goals:manage`                     | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `homologation:manage`              | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `indicators:read`                  | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `installations:approve`            | ORG     | —       | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `installations:collect_acceptance` | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `installations:commission`         | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `installations:complete`           | ORG     | —       | —        | —          | —          | —          | —          | SPEC-002 |
| `installations:record_materials`   | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `installations:record_serials`     | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `installations:review`             | ORG     | EQUIPE  | —        | —          | —          | —          | DESIGNADO  | SPEC-010 |
| `installations:upload_photos`      | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `inventory:adjust`                 | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-009 |
| `inventory:approve_count`          | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-009 |
| `inventory:confirm_transfer`       | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:consume`                | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-002 |
| `inventory:count`                  | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:dispose`                | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-009 |
| `inventory:manage_serials`         | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:pick`                   | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:quarantine`             | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:read`                   | ORG     | ORG     | —        | —          | ORG        | —          | DESIGNADO  | SPEC-009 |
| `inventory:receive`                | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:release_reservation`    | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:reserve`                | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-002 |
| `inventory:return`                 | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:transfer`               | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `inventory:view_cost`              | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `invitations:manage`               | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `notifications:read_own`           | PRÓPRIO | PRÓPRIO | PRÓPRIO  | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | Proposta |
| `opportunities:create`             | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `opportunities:lose`               | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `opportunities:qualify`            | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `opportunities:read`               | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `opportunities:reopen`             | ORG     | EQUIPE  | —        | —          | —          | —          | —          | Proposta |
| `opportunities:update`             | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | Proposta |
| `payables:create`                  | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `payables:read`                    | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `payments:create`                  | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `payments:reverse`                 | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `pricing:apply_discount`           | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-005 |
| `pricing:apply_markup`             | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-005 |
| `pricing:approve_exception`        | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-005 |
| `proposals:accept`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:approve_exception`      | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-002 |
| `proposals:cancel`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:create`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:download`               | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:extend_validity`        | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:generate`               | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:read`                   | ORG     | EQUIPE  | PRÓPRIO  | VINCULADO  | —          | —          | DESIGNADO  | SPEC-006 |
| `proposals:record_view`            | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:reject`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:request_approval`       | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:send`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-002 |
| `proposals:update_draft`           | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:view_costs`             | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `proposals:view_margin`            | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | —          | SPEC-006 |
| `purchases:approve`                | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-009 |
| `purchases:cancel`                 | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-009 |
| `purchases:order`                  | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `purchases:receive`                | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `purchases:request`                | ORG     | ORG     | —        | —          | ORG        | —          | DESIGNADO  | SPEC-009 |
| `receipts:allocate`                | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receipts:create`                  | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receipts:reverse`                 | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receivables:create`               | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receivables:read`                 | ORG     | EQUIPE  | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receivables:renegotiate`          | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receivables:update_draft`         | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `receivables:write_off`            | ORG     | —       | —        | ORG        | —          | —          | —          | SPEC-008 |
| `roles:manage`                     | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `schedules:create`                 | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-010 |
| `schedules:override_conflict`      | ORG     | —       | —        | —          | —          | —          | —          | SPEC-010 |
| `schedules:read`                   | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `schedules:update`                 | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-010 |
| `sessions:read_own`                | PRÓPRIO | PRÓPRIO | PRÓPRIO  | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | Proposta |
| `sessions:revoke_any`              | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `sessions:revoke_own`              | PRÓPRIO | PRÓPRIO | PRÓPRIO  | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | PRÓPRIO    | Proposta |
| `suppliers:manage`                 | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `surveys:complete`                 | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `surveys:create`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `surveys:read`                     | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `surveys:update`                   | ORG     | EQUIPE  | PRÓPRIO  | —          | —          | —          | DESIGNADO  | SPEC-005 |
| `teams:manage`                     | ORG     | ORG     | —        | —          | —          | —          | —          | SPEC-010 |
| `templates:manage`                 | ORG     | —       | —        | —          | —          | —          | —          | SPEC-005 |
| `users:issue_recovery`             | ORG     | —       | —        | —          | —          | —          | —          | Proposta |
| `users:manage`                     | ORG     | —       | —        | —          | —          | —          | —          | SPEC-002 |
| `warranties:manage`                | ORG     | ORG     | —        | —          | ORG        | —          | —          | SPEC-009 |
| `work_orders:assign`               | ORG     | EQUIPE  | —        | —          | —          | —          | —          | SPEC-010 |
| `work_orders:complete`             | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `work_orders:pause`                | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `work_orders:read`                 | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |
| `work_orders:start`                | ORG     | EQUIPE  | —        | —          | —          | DESIGNADO  | DESIGNADO  | SPEC-010 |

## Decisões de negócio aprovadas

1. **Comercial:** vendedor vê apenas registros próprios (proposto), ou todos da
   equipe? Pode visualizar custo e margem das próprias propostas (proposto)?
2. **Gestão:** gerente limitado à equipe no comercial/financeiro, com operação de
   estoque organizacional (proposto), ou acesso organizacional em todos os domínios?
3. **Engenharia e campo:** engenharia atua somente em projetos designados
   (proposto), ou em toda a fila técnica? Instalador declara consumo; a baixa é
   comando transacional da operação, não acesso irrestrito ao estoque.
4. **Poderes sensíveis:** proposta mantém gestão de identidade, recuperação,
   aprovação contratual, dispensa financeira, reabertura de período e reprocessamento
   técnico apenas com administrador. Financeiro registra e estorna pagamentos;
   gerente aprova compras/ajustes. Confirmar ou indicar delegações diferentes.
5. **Suporte e auditor:** SPEC-011 cita Suporte e SPEC-012 cita Auditor, ausentes dos
   sete papéis iniciais. Proposta mantém sete papéis e delega suporte ao gerente;
   novos papéis podem ser cadastrados pelo administrador.

Limites numéricos de desconto, cortesia e dispensa continuam pendentes nos respectivos
módulos. Ter permissão não permite ignorar limite ainda não definido.

## Critérios para a implementação

- Catálogo versionado e papéis editáveis com versão para detectar concorrência.
- Associações explícitas de equipes, responsáveis e atribuições persistidas no banco.
- Alterações de permissão revogam sessões afetadas e geram auditoria atômica.
- Proteção contra remover/bloquear o último administrador operacional.
- Convites e recuperação com token armazenado somente como hash, validade e uso único;
  consumo e troca de senha atômicos; recuperação revoga todas as sessões do usuário.
- Testes positivos e negativos de cada permissão e escopo; isolamento organizacional.
- Nenhuma permissão futura significa rota de negócio já implementada.

As cinco decisões acima foram aprovadas na conversa de implementação em 29/09/2026.
