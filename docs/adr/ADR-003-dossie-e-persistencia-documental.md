# ADR-003 — Dossiê integrado e persistência documental verificável

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

## Contexto

A base possui ProposalDocument e ContractDocument com metadados/hash, mas StorageService retorna bucket/key também após fallback local. Falta dossiê geral e photoUrl não assegura persistência. PostgreSQL e S3 não têm transação ACID compartilhada.

## Decisão proposta

Manter autoridade de M4/M5, projetando referências tipadas no dossiê; novos anexos usam documento/versionamento e vínculos com FKs. Centralizar a identificação de objeto/backend e exigir verificação antes de READY. Intenção persistida, scanner, outbox, reconciliação e limpeza diferida tratam falhas distribuídas. Downloads revalidam contexto/categoria; nada de bucket público ou base64 grande no banco.

## Alternativas e consequências

Duplicar propostas/contratos simplificaria listagem, mas criaria duas fontes e risco de versão errada: rejeitado. entityType/entityId genérico facilita extensão, mas não impõe FK: rejeitado como vínculo persistido. Fallback automático para disco mascara durabilidade: substituído por erro explícito; armazenamento local legado exige inventário/migração verificável. URLs públicas permanentes não permitem controle contextual: rejeitadas.

Custo: estados intermediários, scanner, jobs e operação de backup/reconciliação. Migração aditiva e leitura compatível permitem rollback de UI sem apagar objetos. Retenção/finalidade e RPO/RTO são decisões de governança pendentes; não inferidos da palavra permanente.

Contrato detalhado: [SPEC-013](../../specs/SPEC-013-dossie-documental/spec.md).
