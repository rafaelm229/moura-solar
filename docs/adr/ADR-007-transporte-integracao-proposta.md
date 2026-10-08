# ADR-007 — Transporte do primeiro piloto de integração (proposta)

**Data:** 08/10/2026

**Status:** Proposto; aprovação do transporte e do piloto pendente

**Fase:** R1 — integração gradual

**Relacionamento:** SPEC-016, SPEC-019 e R1-05

## Contexto observado

O inventário R1-05 encontrou `ImportOutbox`, específico de `EnergyBillImport`,
com `schemaVersion`, `correlationId`, deduplicação, leases e tentativas. O worker
tem claim PostgreSQL com `FOR UPDATE SKIP LOCKED`, mas sua inicialização informa
que não há consumidores habilitados. O parser de payloads de importação v1 ainda
não é chamado por processamento operacional. Não foi localizado inbox genérico
nesta revisão.

A pesquisa da PoC da SPEC-014 não enviou documentos nem executou benchmark. Não
há fornecedor, corpus operacional, limite de custo/quota ou política de dados
aprovados. Portanto, importação/OCR não pode ser ativada como piloto consumidor
até que esses gates e um consumidor durável estejam aprovados.

## Opções consideradas

| Opção                                  | Vantagem                                                                   | Custo/risco neste estágio                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Polling PostgreSQL do outbox existente | Reaproveita transação local, estado e lease já presentes; sem serviço novo | Acopla o primeiro piloto ao banco; exige inbox/idempotência, limites de polling, retenção e política de falha definidos por consumidor |
| Redis/BullMQ como transporte geral     | Runtime de jobs já existe no repositório                                   | Não fornece por si só a semântica durável/outbox-inbox requerida; promover agora criaria uma escolha de barramento antes do piloto     |
| Broker externo/gerenciado              | Pode servir cargas distribuídas com mais consumidores                      | Custo, operação, segurança, residência de dados e necessidade ainda não avaliados; prematuro sem volume/consumidor demonstrado         |

## Decisão proposta — não aprovada

Para o **primeiro** consumidor de integração, preferir polling do outbox em
PostgreSQL com transações e leases, sem instalar ou promover um broker geral.
Isto é uma recomendação para validação, não um contrato aceito nem autorização
para iniciar polling operacional.

Antes de implementação, responsáveis devem aprovar: (1) evento e domínio piloto,
(2) proprietário do fato e consumidor, (3) transporte e inbox/dedupe, (4) retenção
e exclusão — o vínculo existente de `ImportOutbox` tem `onDelete: Cascade` — e
(5) política de retry, quarentena, replay autorizado e reconciliação. Se o piloto
for OCR, também cumprir os gates de corpus, privacidade, fornecedor, limites de
custo/quota e critérios de qualidade definidos pela SPEC-014. Até essas decisões,
worker, OCR e publicação permanecem desativados.

Não assumir exactly-once global. A futura implementação deve provar efeito e
inbox idempotentes em transação local, correlation/causation, retries limitados,
crash/restart, evento duplicado/atrasado, replay autorizado e compensação ou
reconciliação. Sagas registram o progresso; não inventam aprovação comercial,
contratual, financeira ou técnica.

## Consequências e critérios para reavaliar

O caminho proposto evita infraestrutura antecipada e usa a persistência já
transacional. Polling e retenção passam a ter impacto mensurável na carga do
PostgreSQL; isso deve ser observado antes de aumentar volume ou número de
consumidores. Reavaliar broker somente com necessidade demonstrada, métricas de
carga/latência/falha, custo total e plano de migração sem perda ou duplicidade.

## Protocolo do incremento R1-06

- **Tipo:** proposta documental; sem implementação ou alteração de contratos.
- **Antes/depois:** SPEC-019 registrava escolha de transporte/piloto pendente;
  passa a apontar uma recomendação e listar aprovações ainda necessárias.
- **Compatibilidade/migração:** nenhuma mudança de API, schema, migration,
  configuração ou dependência; nenhum dado é lido/escrito pelo documento.
- **Aceite:** opções e trade-offs expostos, recomendação identificada como não
  aprovada, gates de OCR respeitados e worker inativo registrado sem ambiguidade.
- **Verificação:** formatação, links locais e `git diff --check`; `pnpm check`
  antes do commit conforme AGENTS.md.
- **Rollback:** reverter o ADR e suas referências; sem efeito runtime.

## Aprovação requerida

Este arquivo **não** registra decisão final. Aprovar ou alterar a recomendação
PostgreSQL, escolher o piloto e autorizar seu incremento em separado. Nenhuma
operação automática fica autorizada pelo status deste ADR.
