# ADR-007 — Transporte do primeiro piloto de integração (proposta)

**Data:** 08/10/2026

**Status:** Proposta de transporte pendente; domínio do piloto escolhido
condicionalmente pelo usuário em 08/10/2026

**Fase:** R1 — integração gradual

**Relacionamento:** SPEC-016, SPEC-019 e R1-05

## Contexto observado

O inventário R1-05 encontrou `ImportOutbox`, específico de `EnergyBillImport`,
com `schemaVersion`, `correlationId`, deduplicação, leases e tentativas. O worker
tem claim PostgreSQL com `FOR UPDATE SKIP LOCKED`, mas sua inicialização informa
que não há consumidores habilitados. O parser de payloads de importação v1 ainda
não é chamado por processamento operacional. Não foi localizado inbox genérico
nesta revisão.

A pesquisa da PoC da SPEC-014 não enviou documentos nem executou benchmark. O
[POC-01](../decisao-poc-01-importacao-energia-2026-10-09.md) registra Azure
Document Intelligence Layout como provedor escolhido para a PoC e fixa escopo,
teto experimental e critérios, mas não autoriza contratação ou envio. Ainda não existe corpus
operacional aprovado, cotação concreta, revisão de privacidade da conta ou
política de execução liberada. O domínio de importação/OCR foi escolhido para o
piloto futuro, condicionado à aprovação desses gates e de um consumidor durável;
essa escolha não autoriza ativação agora.

## Opções consideradas

| Opção                                  | Vantagem                                                                   | Custo/risco neste estágio                                                                                                              |
| -------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Polling PostgreSQL do outbox existente | Reaproveita transação local, estado e lease já presentes; sem serviço novo | Acopla o primeiro piloto ao banco; exige inbox/idempotência, limites de polling, retenção e política de falha definidos por consumidor |
| Redis/BullMQ como transporte geral     | Runtime de jobs já existe no repositório                                   | Não fornece por si só a semântica durável/outbox-inbox requerida; promover agora criaria uma escolha de barramento antes do piloto     |
| Broker externo/gerenciado              | Pode servir cargas distribuídas com mais consumidores                      | Custo, operação, segurança, residência de dados e necessidade ainda não avaliados; prematuro sem volume/consumidor demonstrado         |

## Decisão proposta — não aprovada

O domínio do **primeiro** piloto foi escolhido: consumidor durável da importação
de contas de energia, com OCR somente após os gates da SPEC-014. O evento exato,
o efeito do consumidor e o contrato com o dono do domínio ainda serão definidos.
Para transporte, preferir polling do outbox em PostgreSQL com transações e
leases, sem instalar ou promover um broker geral. Essa parte permanece uma
recomendação para validação, não um contrato aceito nem autorização para iniciar
polling operacional.

Antes de implementação, responsáveis devem definir: (1) semântica do evento e
efeito durável do consumidor com o dono da importação, (2) transporte e
inbox/dedupe, (3) retenção e exclusão — o vínculo existente de `ImportOutbox` tem
`onDelete: Cascade` — e (4) política de retry, quarentena, replay autorizado e
reconciliação. Também devem cumprir os gates de corpus, privacidade, cotação/quota
e critérios de qualidade definidos pela SPEC-014 e detalhados no POC-01. Até a
aprovação do contrato de transporte/consumidor e a conclusão dos gates
experimentais, worker, OCR e publicação permanecem desativados.

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

Este arquivo **não** registra decisão final de transporte. A intenção de pilotar
importação/OCR após os gates foi escolhida, mas o contrato do consumidor e os
requisitos operacionais continuam pendentes. Aprovar ou alterar a recomendação
PostgreSQL antes do incremento de transporte. Nenhuma operação automática fica
autorizada pelo status deste ADR.
