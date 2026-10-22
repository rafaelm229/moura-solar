# R1-47 — Contrato mínimo dos eventos de importação manual

**Data:** 10/10/2026

**Fase:** R1 — fundação de integração

**Estado:** Consolidado no PR #100, merge `f002335`; CI run `38021146046` verde.

**SPEC:** [SPEC-019](../specs/SPEC-019-eventos-dados/spec.md), EVT-01.

**Decisões:** [ADR-008](adr/ADR-008-importacao-manual-sem-ocr.md) mantém o fluxo
manual; [R1-44](r1-44-auditoria-contratos-eventos.md) mantém os eventos de
importação no formato legado, sem consumidor justificado.

## Protocolo do incremento

- **Antes:** `parseEnergyBillImportEventV1` exigia os identificadores conhecidos,
  mas aceitava campos adicionais na raiz e no payload.
- **Depois:** o parser rejeita campos fora do contrato mínimo de cada evento
  `QUEUED` e `APPLIED`, preservando todos os campos já emitidos.
- **Contratos:** nomes, versão 1 e payloads válidos não mudam. A rejeição de
  campos desconhecidos torna explícita a minimização de dados; extensão futura
  exige revisão/versionamento do contrato.
- **Compatibilidade e migração:** nenhuma migration ou mudança no produtor. A
  API constrói os payloads com os identificadores declarados. Fixtures de
  migrations preservam as formas legadas mínimas conhecidas. Linhas históricas
  com campos extras não foram verificadas em banco de produção.
- **Execução:** parser e teste unitário; sem publicar eventos, ativar worker,
  consumidor, polling, OCR ou serviço externo.
- **Aceite:** ambos os eventos aceitam o contrato válido sem alteração e rejeitam
  campo extra na raiz ou no payload.
- **Rollback:** reverter o allowlist do parser e o teste associado; sem alteração
  de banco, runtime da API ou fluxo de importação manual.

## Validação

- `pnpm --filter @moura-solar/contracts test` — passou (9 arquivos de teste).
- Prettier, `git diff --check` e links locais — passaram.
- `pnpm check` — passou quando executado fora do sandbox; no sandbox, dois testes
  DOCX existentes falharam ao chamar `unzip` (`EPERM`).
- CI do PR #100 — passou no run `38021146046` (`pnpm check`, migrações,
  integração e E2E); PR consolidado por squash em
  `f002335e2099e7bc77eb1b4f71303a87533d0f63`.

## Limites

O parser estrito reduz expansão acidental do contrato, mas não prova segurança,
retenção ou processamento de eventos por consumidor. O worker segue inativo e a
importação continua manual.
