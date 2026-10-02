# Entrega, revisão independente e validações

**Status:** Proposta para revisão

**Data:** 02/10/2026

## Base e resultado

Base analisada: `a197c80b2c6f36cf238d9b1101088b87413307d9`, main local e remota confirmadas. Branch documental: `docs/evolucao-ux-documentos-contas`. Árvore inicial limpa. Entrega: 30 arquivos Markdown, 26 criados e 4 atualizados, com 41 requisitos e 36 cenários de teste propostos. Nenhum commit, push, PR ou merge realizado nesta tarefa.

- SPEC-003 0.3.0: direção institucional clara, Material Symbols Outlined, componentes, sete viewports, navegação/rotas e aprovação dos três pilotos. Versão escura 0.2.0 permanece como histórico superado no Git.
- SPEC-013 0.1.0: dossiê com vínculos tipados, referências a M4/M5, versões, autorização, upload verificável, reconciliação, backup e retenção revisável.
- SPEC-014 0.1.0: extração assistida, revisão obrigatória, confirmação atômica/idempotente na fonte EnergyReading, adapter durável e PoC com fontes oficiais.
- SPEC-015 0.1.0: orientação operacional derivada dos estados reais, frentes paralelas e próximas ações contextuais, sem redefinir gates.
- ADR-003/004: decisões arquiteturais propostas de persistência documental e processamento/confirmacão da importação.

## Reaproveitamento

Preservados como base de projeto: monólito NestJS, PostgreSQL/Prisma, cliente OpenAPI, cookies e refresh coordenado, React Query, entidades de cliente/UC/consumo/oportunidade/projeto/OS, documentos próprios M4/M5, auditoria/transações e testes existentes. Outbox/consumidores de OCR ainda são trabalho futuro; não presumir que o worker atual os implementa.

## Revisão independente

Subagente `revisao_documental` realizou revisão somente leitura, confrontando documentos com schema/controllers/services pertinentes. Reportou seis achados; todos foram verificados diretamente e corrigidos:

| Achado                                                | Correção documental                                                                                                         | Evidência de aceite futuro |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Reuso de URL poderia alterar bytes após scanner       | Staging, snapshot fixado e promoção para chave final não gravável pelo cliente                                              | T-DOC-05/T-DOC-10          |
| Replay de confirmação tinha semântica 200/409 ambígua | Mesmo reviewId/digest retorna recibo 200, inclusive chave diferente; incompatível retorna 409; GET expõe applicationReceipt | T-IMP-05                   |
| UPLOADING conflitava com criação apenas após READY    | Estado pertence à UX documental anterior; EnergyBillImport nasce QUEUED                                                     | T-IMP-01                   |
| Troca de original não tinha contrato                  | Versão imutável por importação; novo original exige nova versão e nova importação                                           | T-IMP-08                   |
| UC criada podia não filtrar o original no dossiê      | DocumentUtilityUnitLink inserido na mesma transação de aplicação                                                            | T-IMP-01                   |
| Crash após submit podia duplicar custo externo        | Correlação/idempotência do fornecedor ou tentativa incerta com decisão explícita, sem reenvio cego                          | T-IMP-07                   |

Releitura independente confirmou os seis pontos resolvidos e não encontrou contradições prioritárias remanescentes nos trechos revisados. Isso é revisão de coerência documental, não aprovação humana, teste de implementação ou garantia de produção.

## Validações efetivamente executadas

| Verificação                                                             | Resultado                                                                                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Branch/status/HEAD/origin/main e ls-remote                              | Base e branch confirmadas; sem trabalho local inicial                                                                                    |
| Histórico SPEC-003 e diff fcb91f4..a197c80                              | 0.2.0 escura localizada em f03e1fa/7c63ee7; base atual tem 0.1.0; diff entre referências só em três arquivos de configuração Docker/pnpm |
| Prettier --check README.md docs specs antes das alterações              | Passou                                                                                                                                   |
| Prettier --check . na base                                              | Falhou somente em apps/api/src/contract/contract-generator.service.ts; arquivo não alterado                                              |
| Prettier --check explicitamente nos 30 arquivos do manifesto final      | Passou; escrita de formatação limitada aos documentos da entrega                                                                         |
| Links Markdown locais, complementos, status, IDs e referências de teste | Passou: 30 documentos, 41 requisitos únicos, 36 testes propostos; nenhum destino local ausente ou teste indefinido                       |
| git diff --check final                                                  | Passou; quebras Markdown com espaços finais foram substituídas por parágrafos                                                            |
| Manifesto versus git diff e arquivos novos                              | Somente os 30 Markdown previstos; nenhuma alteração na aplicação                                                                         |
| Fontes oficiais Google/Azure, Material Symbols, WCAG e Next.js          | Consultadas; URLs e limites registrados nas specs                                                                                        |
| Consulta de workflow pelo conector GitHub                               | Lista de runs de PR vazia para o SHA; ferramenta não comprova o último CI de push                                                        |

Não executados: pnpm check completo, lint/typecheck/build, migrations, integração, E2E, scanners, restauração, PoC externa, geração de PDFs ou validação visual da aplicação. A tarefa é documental; a falha de formatação de código preexistente fica para lote 0. Não há alegação de CI verde, precisão de OCR, conformidade visual medida ou funcionalidade nova entregue. O script auxiliar de validação ficou em /tmp; nenhum teste executável foi adicionado ao repositório.

## Decisões e sequência

Pendentes: aprovação de contratos/aparência, grants por categoria, retenção/finalidade, RPO/RTO, limites/quotas, distribuidoras/corpus, metas/custo e versão/região do fornecedor. Não bloquearam a elaboração; bloqueiam as liberações correspondentes. O último CI remoto de push permanece não comprovado, e a falha local de formatação foi registrada.

Ordem: 0 estabilização/baseline → 1 aprovação documental/pilotos → 2 ícones/componentes → 3 navegação/rotas → 4 armazenamento/dossiê → 5 PoC → 6 importação integrada → 7 expansão visual por módulo. Alterações visuais ficam separadas de banco/cálculos/gates. Detalhes, dependências, evidências e rollback estão no [plano](plano-evolucao-ux-documentos-contas.md).

## Inventário completo

| Arquivo                                                                                                                     | Ação       |
| --------------------------------------------------------------------------------------------------------------------------- | ---------- |
| [README.md](../README.md)                                                                                                   | Atualizado |
| [docs/adr/ADR-003-dossie-e-persistencia-documental.md](adr/ADR-003-dossie-e-persistencia-documental.md)                     | Criado     |
| [docs/adr/ADR-004-importacao-assistida-duravel.md](adr/ADR-004-importacao-assistida-duravel.md)                             | Criado     |
| [docs/matriz-rastreabilidade-evolucao.md](matriz-rastreabilidade-evolucao.md)                                               | Criado     |
| [docs/plano-evolucao-ux-documentos-contas.md](plano-evolucao-ux-documentos-contas.md)                                       | Criado     |
| [docs/plano-implementacao.md](plano-implementacao.md)                                                                       | Atualizado |
| [docs/revisao-evolucao-ux-documentos-contas.md](revisao-evolucao-ux-documentos-contas.md)                                   | Criado     |
| [specs/SPEC-003-design-system-ia/componentes.md](../specs/SPEC-003-design-system-ia/componentes.md)                         | Criado     |
| [specs/SPEC-003-design-system-ia/icones.md](../specs/SPEC-003-design-system-ia/icones.md)                                   | Criado     |
| [specs/SPEC-003-design-system-ia/mapa-navegacao.md](../specs/SPEC-003-design-system-ia/mapa-navegacao.md)                   | Atualizado |
| [specs/SPEC-003-design-system-ia/responsividade.md](../specs/SPEC-003-design-system-ia/responsividade.md)                   | Criado     |
| [specs/SPEC-003-design-system-ia/spec.md](../specs/SPEC-003-design-system-ia/spec.md)                                       | Atualizado |
| [specs/SPEC-003-design-system-ia/tokens-visuais.md](../specs/SPEC-003-design-system-ia/tokens-visuais.md)                   | Criado     |
| [specs/SPEC-003-design-system-ia/validacao-visual.md](../specs/SPEC-003-design-system-ia/validacao-visual.md)               | Criado     |
| [specs/SPEC-013-dossie-documental/api.md](../specs/SPEC-013-dossie-documental/api.md)                                       | Criado     |
| [specs/SPEC-013-dossie-documental/fluxos-ux.md](../specs/SPEC-013-dossie-documental/fluxos-ux.md)                           | Criado     |
| [specs/SPEC-013-dossie-documental/modelo-dados.md](../specs/SPEC-013-dossie-documental/modelo-dados.md)                     | Criado     |
| [specs/SPEC-013-dossie-documental/spec.md](../specs/SPEC-013-dossie-documental/spec.md)                                     | Criado     |
| [specs/SPEC-013-dossie-documental/testes-aceite.md](../specs/SPEC-013-dossie-documental/testes-aceite.md)                   | Criado     |
| [specs/SPEC-014-importacao-contas-energia/api.md](../specs/SPEC-014-importacao-contas-energia/api.md)                       | Criado     |
| [specs/SPEC-014-importacao-contas-energia/fluxos-ux.md](../specs/SPEC-014-importacao-contas-energia/fluxos-ux.md)           | Criado     |
| [specs/SPEC-014-importacao-contas-energia/modelo-dados.md](../specs/SPEC-014-importacao-contas-energia/modelo-dados.md)     | Criado     |
| [specs/SPEC-014-importacao-contas-energia/prova-conceito.md](../specs/SPEC-014-importacao-contas-energia/prova-conceito.md) | Criado     |
| [specs/SPEC-014-importacao-contas-energia/spec.md](../specs/SPEC-014-importacao-contas-energia/spec.md)                     | Criado     |
| [specs/SPEC-014-importacao-contas-energia/testes-aceite.md](../specs/SPEC-014-importacao-contas-energia/testes-aceite.md)   | Criado     |
| [specs/SPEC-015-ux-jornada-operacional/api.md](../specs/SPEC-015-ux-jornada-operacional/api.md)                             | Criado     |
| [specs/SPEC-015-ux-jornada-operacional/fluxos-ux.md](../specs/SPEC-015-ux-jornada-operacional/fluxos-ux.md)                 | Criado     |
| [specs/SPEC-015-ux-jornada-operacional/modelo-dados.md](../specs/SPEC-015-ux-jornada-operacional/modelo-dados.md)           | Criado     |
| [specs/SPEC-015-ux-jornada-operacional/spec.md](../specs/SPEC-015-ux-jornada-operacional/spec.md)                           | Criado     |
| [specs/SPEC-015-ux-jornada-operacional/testes-aceite.md](../specs/SPEC-015-ux-jornada-operacional/testes-aceite.md)         | Criado     |

## Encerramento

Código de produção, schema/migrations, lockfiles, dependências, infraestrutura e testes executáveis não foram alterados. Documentação concluída para revisão humana; nenhuma implementação iniciada.
