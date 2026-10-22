# ADR-004 — Extração desacoplada e confirmação transacional

**Status:** Proposta histórica, supersedida pela [ADR-008](ADR-008-importacao-manual-sem-ocr.md)

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Esta proposta não está vigente e não autoriza implementação, PoC, contratação de
provedor ou planejamento de extração. O fluxo padrão de importação é manual,
conforme ADR-008. O conteúdo abaixo é mantido para rastreabilidade histórica.

## Contexto

Histórico atual usa EnergyReading e upsert por UC/mês. Extração externa é falível, custosa e pode ser repetida; worker atual não tem consumidores. Texto documental é entrada não confiável.

## Decisão proposta

Persistir original e job/outbox, executar adapter substituível em worker com lease/retry/quota e manter candidatos separados da leitura operacional. API exige revisão humana e confirma uma única aplicação em transação PostgreSQL com versões, idempotência, auditoria e proveniência. BullMQ/Redis será transporte, não fonte única de jobs. Reutilizar EnergyReading e casos de uso de UC/consumo, estendendo concorrência também ao fluxo manual.

## Alternativas e consequências

OCR síncrono no request prende interação e torna timeout ambíguo: rejeitado. Aplicar candidatos automaticamente remove revisão essencial: rejeitado. Nova tabela de consumo operacional duplicaria fonte: rejeitada. Fornecedor fixo dificulta comparar idioma/privacidade/custo: adapter escolhido após PoC.

Aumenta complexidade de estados e tratamento de resultado tardio; permite reinício, cancelamento, substituição de provedor e entrada manual contínua. Confirmar não chama fornecedor nem S3 dentro da transação. Documento READY permanece independente de sucesso da extração. Reversão usa revisão compensatória auditada, nunca exclusão silenciosa das leituras confirmadas.

Contrato e experimento: [SPEC-014](../../specs/SPEC-014-importacao-contas-energia/spec.md).
