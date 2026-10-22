# ADR-008 — Importação manual de contas, sem OCR

**Data:** 09/10/2026

**Status:** Decisão vigente

**Escopo:** SPEC-014, R5 e integração documental da V1

## Contexto

A leitura automática de contas exigiria preparar e manter um provedor, corpus,
tratamento de privacidade, operação de worker e critérios de extração. Mesmo
assim, a aplicação precisaria de conferência humana e correção dos valores. O
usuário decidiu manter o processo manual como padrão e retirar a PoC de OCR.

## Decisão

- A entrada de contas e a transcrição de consumo permanecem manuais, com o
  documento original disponível para consulta.
- A pessoa confere distribuidora, UC, mês, consumo, injeção, tarifas e valor,
  revisa conflitos e confirma explicitamente antes de alterar leituras.
- Não executar a PoC POC-01, não chamar Azure ou outro serviço de leitura e não
  ativar consumidor, polling, OCR ou extração automática.
- O dossiê, o intake, a revisão humana, a confirmação transacional, a
  proveniência, as validações e o tratamento de duplicidade existentes continuam
  sendo reaproveitados conforme a SPEC-014.
- Pesquisas, decisões e scaffolding de OCR já documentados permanecem como
  histórico. Não apagar dados, IDs, contratos, migrations, testes ou código
  existentes nesta decisão documental.

## Consequências

O processo continua dependente de digitação e conferência humana. Não há custo de
serviço de OCR, envio de contas a terceiros, operação de extração ou gate de
fornecedor para o fluxo manual. Uma eventual reconsideração exige nova decisão
explícita com evidência de economia de tempo/custo que compense a conferência e a
operação adicionais.

## Protocolo documental

- **Antes/depois:** POC-01 escolhia Azure para avaliação; a decisão vigente passa
  a encerrar a PoC antes de qualquer envio e mantém o fluxo manual.
- **Contratos/migração:** nenhum endpoint, schema, migration, configuração ou
  dependência muda.
- **Aceite:** roadmap e registro de features deixam de planejar OCR; SPEC-014
  mantém upload, revisão e confirmação manual; histórico de pesquisa fica
  identificado como supersedido.
- **Verificação:** links locais, Prettier e `git diff --check`; `pnpm check`
  conforme AGENTS.md antes do commit documental.
- **Rollback:** somente uma nova decisão explícita pode reabrir o tema; reverter
  esta ADR exige corrigir suas referências para não reativar o plano antigo.
