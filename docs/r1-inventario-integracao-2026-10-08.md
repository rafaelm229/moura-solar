# R1-05 — Inventário da integração existente

**Data:** 08/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Inventário documental em branch; não habilita produtor, consumidor,
transporte ou processamento.

**SPECs:** [SPEC-016](../specs/SPEC-016-refatoracao-evolutiva/spec.md),
[SPEC-019](../specs/SPEC-019-eventos-dados/spec.md); família F-34.

**Dependências:** R1-01 (envelope), R1-02 (correlação), R1-03 (versão) e
R1-04 (parser dos eventos conhecidos), todos presentes na branch de referência.

## Protocolo do incremento

- **ID/fase:** R1-05, R1 — inventário factual, sem implementação funcional.
- **Antes:** SPEC-019 mantinha pendente o inventário de auditoria, outbox e
  projeções; a extensão a um contrato de integração geral ainda não tinha
  evidência reunida nesta trilha.
- **Depois:** o estado encontrado está registrado abaixo; o aceite documental
  cobre apenas o inventário, não completa R1 nem aprova arquitetura de transporte.
- **Contratos:** nenhum contrato de runtime/API é alterado. O envelope comum e o
  parser v1 permanecem não invocados pelo processamento operacional.
- **Migração compatível:** nenhuma migration, alteração de banco, dependência,
  dado ou configuração.
- **Aceite:** inventariar os modelos e caminhos localizados, distinguir auditoria,
  outbox e projeções, indicar lacunas sem afirmar completude global e apontar a
  decisão operacional ainda necessária.
- **Testes:** revisão dos arquivos citados, links locais, formatação Markdown e
  `git diff --check`. `pnpm check` é registrado no PR se executado como gate; este
  recorte não altera código.
- **Rollback:** reverter somente este documento e suas referências; não há efeito
  persistido nem consumidor a drenar.

## Evidência observada no checkout

### Auditoria

`AuditEvent` (`audit_events`) guarda organização e ator opcionais, ação, entidade,
`traceId` e instante. Há escritores na API e no worker. Esse registro auxilia
auditoria e correlação, mas não contém envelope de integração com versão,
consumidor, entrega ou confirmação; não deve ser reinterpretado como outbox ou
inbox.

### Outbox de importação

`ImportOutbox` é ligado a `EnergyBillImport` e contém organização, importação,
tipo, versão nullable, correlação nullable, chave de deduplicação única, payload,
estado, tentativas, disponibilidade, lease/heartbeat, conclusão e código de erro.
O vínculo atual usa `onDelete: Cascade`; retenção do evento após exclusão da
importação precisa de decisão explícita antes de generalizar o padrão.

`EnergyImportService` grava `ENERGY_BILL_IMPORT_QUEUED` e
`ENERGY_BILL_IMPORT_APPLIED` junto às operações existentes. R1-02 persiste a
correlação para novas linhas e R1-03 marca versão 1 nos novos eventos; linhas
legadas continuam com `schemaVersion = NULL`. R1-04 valida os dois payloads v1
conhecidos em `packages/contracts`, mas não transforma a linha em envelope comum
nem é chamado pelo caminho operacional.

O claim encontrado em `apps/worker/src/import-outbox.ts` seleciona somente
`ENERGY_BILL_IMPORT_QUEUED` pendente ou em processamento com lease expirado. A
rotina atualiza tentativa e lease com `FOR UPDATE SKIP LOCKED`. Não reivindica
`ENERGY_BILL_IMPORT_APPLIED`. A inicialização do worker declara explicitamente
que nenhum consumidor está habilitado. Portanto, não há evidência aqui de
consumidor ativo, OCR automático, publicação geral, replay operacional ou inbox
genérica. A busca desta revisão não localizou um modelo/serviço geral
`IntegrationInbox`; isso é limite do inventário, não prova de inexistência em
todo contexto.

### Projeções operacionais

`MetricProjection` guarda organização, chave, período `YYYY-MM`, dimensões,
valor, instante de cálculo e revisão. A rotina localizada em
`AutomationsService.recalculateProjections` calcula `SALES_MONTHLY_TOTAL` a
partir de propostas aceitas e `REVENUE_MONTHLY_TOTAL` de recebíveis pagos, e faz
upsert da projeção mensal. São projeções derivadas dos registros de domínio; não
são Bronze/Silver/Gold, não substituem os donos operacionais e não autorizam
alteração de gates.

## Resultado e limites

O item “Inventariar audit events, ImportOutbox e projeções existentes” da
SPEC-019 foi atendido para os caminhos citados e está marcado como concluído.
Permanecem pendentes: fechar inventário completo por domínio, escolher fato/piloto
e consumidor, ADR de transporte, política de inbox/quarentena/replay e evidência
de crash, duplicidade, atraso e compensação. R1 permanece **Em implementação**.

Nenhuma tecnologia de broker foi escolhida. Redis/BullMQ não é promovido a
barramento geral. Não se ativam worker, OCR, integração de dados ou camada
analítica por este documento. O próximo passo técnico depende de uma decisão
explícita sobre consumidor/piloto compatível com a PoC e as decisões operacionais
de OCR; até lá, manter o estado em especificação.
