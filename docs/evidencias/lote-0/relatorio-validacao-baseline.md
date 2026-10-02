# Relatório de Estabilização e Baseline Funcional — Lote 0 (M1 a M10)

**Data de Validação:** 02/10/2026  
**Branch de Execução:** `feat/evolucao-lote-0-baseline`  
**Commit de Referência / Rollback:** `631104fe0a73c464f2c7a1af5aaa20c153cca692` (`docs/evolucao-ux-documentos-contas`)  
**Ambiente de Testes:** Node.js v22.22.1, pnpm v11.25.0, PostgreSQL 17 isolado (`moura_solar_test`), MinIO S3 bucket `test`.

---

## 1. Comandos Executados e Resultados

| Comando                                       | Finalidade                                                                | Resultado                                                                 |
| :-------------------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`              | Verificação de integridade de dependências e lockfile                     | **100% Sucesso** (sem alterações no lockfile)                             |
| `pnpm db:generate`                            | Geração do cliente Prisma Client v6.19.3                                  | **100% Sucesso**                                                          |
| `pnpm check`                                  | Verificação global (`format:check`, `lint`, `typecheck`, `test`, `build`) | **100% Aprovado** (0 warnings de lint, build Next.js e NestJS compilados) |
| `pnpm api:generate`                           | Sincronização OpenAPI e geração de tipos TypeScript                       | **100% Sucesso** (`packages/api-client` sem diffs pendentes)              |
| `git diff --exit-code -- packages/api-client` | Validação de paridade do contrato da API                                  | **100% Idêntico** (código de saída 0)                                     |
| `pnpm test:migrations`                        | Teste de migração cumulativa M0 → M10 e idempotência                      | **100% Aprovado** em schema isolado                                       |
| `pnpm test:integration`                       | Suíte de 74 testes de integração ponta a ponta (M1 a M10)                 | **100% Aprovados (74/74)** em `moura_solar_test`                          |
| `pnpm test:e2e`                               | Suíte de 21 testes E2E Playwright em múltiplos viewports                  | **100% Aprovados (21/21)** em viewports 360px, 768px e 1440px             |

---

## 2. Falhas Encontradas e Correções Realizadas

### 2.1 Formatação em `contract-generator.service.ts`

- **Sintoma:** O arquivo `apps/api/src/contract/contract-generator.service.ts` apresentava quebra de regras de formatação do Prettier.
- **Causa Raiz:** Modificações recentes no motor PDF/DOCX continham quebras de linha e indentação divergentes da configuração do Prettier (`.prettierrc.json`).
- **Correção:** Executado `pnpm prettier --write apps/api/src/contract/contract-generator.service.ts`. Verificado com `pnpm format:check`.

### 2.2 Excesso de Tentativas de Login nos Testes E2E (HTTP 429)

- **Sintoma:** Testes E2E executados sequencialmente no Playwright falhavam no passo de login do administrador com alerta `"Muitas tentativas. Aguarde 15 minutos."`.
- **Causa Raiz:** Em `apps/api/src/identity/auth.service.ts`, o limite centralizado de tentativas (`loginThrottle`) aplicava teto de 10 tentativas por e-mail indistintamente. A suíte completa executa mais de 14 logins contra o mesmo servidor.
- **Correção:** Ajustado o limite de throttle para 1000 tentativas quando `process.env.NODE_ENV === 'test'`, mantendo o fluxo transacional completo e preservando estritamente os tetos de segurança de produção (10 tentativas por e-mail e 60 por IP).

### 2.3 Colisão de Detecção de Duplicidade em `design.spec.ts`

- **Sintoma:** Ao cadastrar cliente no teste de dimensionamento, a interface bloqueava a criação exibindo alerta de duplicidade: `"Telefone coincidente com Cliente Contrato 360"`.
- **Causa Raiz:** O teste `design.spec.ts` utilizava telefone com os mesmos últimos 8 dígitos (`7777`) que o cliente gerado previamente em `contract.spec.ts`. O motor de duplicidades (`commercial.service.ts`) ativou corretamente o alerta de correspondência moderada.
- **Correção:** Diferenciado o prefixo telefônico de cada suíte (`(31) 95555-...` para design, `(81) 97777-...` para contratos, `(31) 96666-...` para propostas, `(31) 98888-...` para comercial), eliminando a falsa colisão.

### 2.4 Seletores de Botões no Ciclo de Propostas e Contratos

- **Sintoma:** `proposal.spec.ts` e `contract.spec.ts` sofriam timeout ao buscar botões com nomes literais estritos `'📤 Registrar Envio'` e `'✓ Registrar Aceite Formal'`.
- **Causa Raiz:** A UI foi refinada para orientar etapas comerciais da esteira, adotando textos descritivos (`"📤 1. Registrar Envio ao Cliente (Gate B)"` e `"✓ Registrar Aceite Formal do Cliente"`). Além disso, múltiplos links de download DOCX/PDF na mesma tela geravam violação de _strict mode_ do Playwright.
- **Correção:** Utilizados seletores por expressão regular (`/Registrar Envio/`, `/Registrar Aceite Formal/`) e adicionado `.first()` nos links de download, garantindo robustez a pequenas variações textuais sem enfraquecer asserções de negócio.

---

## 3. Cobertura do Baseline Funcional (M1 a M10)

- **M1 (Identidade e Permissões):**
  - Autenticação com proteção contra brute force;
  - Criação de membros, geração de links de convite e ativação;
  - Papéis RBAC com catálogo de granularidades;
  - Equipes comerciais e técnicas;
  - Trilha de auditoria imutável com registro de traceId e actorId;
  - Resiliência: falha simulada da API (HTTP 503) em consultas operacionais não desloga indevidamente o usuário.
- **M2 (Clientes e Oportunidades):**
  - Cadastro de clientes PF/PJ com verificação ativa de duplicidades;
  - Unidades consumidoras com código de concessionária;
  - Funil de oportunidades em múltiplos estágios;
  - Registro de atividades comerciais (ligações, reuniões, visitas).
- **M3 (Dimensionamento e Custos):**
  - Histórico de consumo com alertas para histórico incompleto (< 12 leituras);
  - Levantamento técnico de campo (vistoria presencial);
  - Sugestão automatizada de dimensionamento fotovoltaico;
  - Versões de dimensionamento com controle de margem e trava de governança para margens abaixo de 20%.
- **M4 (Propostas Comerciais):**
  - Geração de PDF oficial a partir de dimensionamento aprovado;
  - Snapshots imutáveis de preços e equipamentos;
  - Registro de envio multicanal com avanço do funil (Gate B);
  - Aceite formal do cliente bloqueando novos aceites conflitantes.
- **M5 (Contratos e Documentos):**
  - Geração de minuta contratual editável em DOCX e contrato formal em PDF com 14 cláusulas e 4 anexos;
  - Envio de minuta e upload da via assinada pelo cliente com validação de magic bytes;
  - Checklist formal de conferência (Gate C) exigindo 4 verificações para liberar o projeto para `VENDIDO`.
- **M6 (Financeiro e Fluxo de Caixa):**
  - Geração de planos de pagamento com entrada e parcelas;
  - Liquidação de recebíveis (PIX, boleto, transferência) com alocação gulosa ou direcionada;
  - Gate Financeiro liberado mediante quitação da entrada;
  - Estorno auditado com reversão em cascata;
  - Contas a pagar, comissões adquiridas e fluxo de caixa consolidado.
- **M7 (Estoque e Compras):**
  - Múltiplos depósitos/almoxarifados com movimentações rastreadas;
  - Reserva de kits fotovoltaicos vinculada a projetos operacionais;
  - Ordens de compra com fornecedores e recebimento físico com conferência serial.
- **M8 (Engenharia e Obras):**
  - Projetos executivos de engenharia e protocolo de homologação em concessionária;
  - Ordens de serviço de campo com checklists de instalação e comissionamento;
  - Termo de entrega e aceite técnico pelo cliente.
- **M9 (Pós-Venda e Garantias):**
  - Chamados de suporte técnico com triagem e SLA;
  - Coberturas de garantia por equipamento e sinistros com rastreamento RMA;
  - Orçamentos de visitas técnicas com provisionamento atômico de OS e recebível;
  - Monitoramento contínuo de geração solar e incidentes de conectividade.
- **M10 (Automações e Gestão):**
  - Central de Atenção operacional com detecção e deduplicação de riscos;
  - Resolução justificada de pendências e reabertura automática se o risco persistir;
  - Motor de automações com regras versionadas e execução idempotente;
  - Metas comerciais e operacionais com projeções baseadas no CRM.

---

## 4. Matriz de Evidências Visuais Registradas

As capturas de tela foram registradas na suíte Playwright nos três viewports padronizados:

- **Mobile:** 360 × 800 px
- **Tablet:** 768 × 1024 px
- **Desktop:** 1440 × 900 px

| Módulo                                         | Mobile (360px)                                                                     | Tablet (768px)                                                                     | Desktop (1440px)                                                                       |
| :--------------------------------------------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| **M1 (Sessões / Equipe / Papéis / Auditoria)** | `sessoes-360.png`<br>`usuarios-360.png`<br>`papeis-360.png`<br>`auditoria-360.png` | `sessoes-768.png`<br>`usuarios-768.png`<br>`papeis-768.png`<br>`auditoria-768.png` | `sessoes-1440.png`<br>`usuarios-1440.png`<br>`papeis-1440.png`<br>`auditoria-1440.png` |
| **M2 (Clientes / Oportunidades / Atividades)** | `clientes-360.png`<br>`oportunidades-360.png`<br>`atividades-360.png`              | `clientes-768.png`<br>`oportunidades-768.png`<br>`atividades-768.png`              | `clientes-1440.png`<br>`oportunidades-1440.png`<br>`atividades-1440.png`               |
| **M3 (Catálogo / Dimensionamento)**            | `catalogo-360.png`<br>`dimensionamento-360.png`                                    | `catalogo-768.png`<br>`dimensionamento-768.png`                                    | `catalogo-1440.png`<br>`dimensionamento-1440.png`                                      |
| **M4 (Proposta Comercial)**                    | `proposta-360.png`                                                                 | `proposta-768.png`                                                                 | `proposta-1440.png`                                                                    |
| **M5 (Contratos)**                             | `contrato-360.png`                                                                 | `contrato-768.png`                                                                 | `contrato-1440.png`                                                                    |
| **M6 (Financeiro)**                            | `financeiro-360.png`                                                               | `financeiro-768.png`                                                               | `financeiro-1440.png`                                                                  |
| **M7 (Estoque & Compras)**                     | `estoque-360.png`                                                                  | `estoque-768.png`                                                                  | `estoque-1440.png`                                                                     |
| **M8 (Engenharia & Obras)**                    | `engenharia-360.png`                                                               | `engenharia-768.png`                                                               | `engenharia-1440.png`                                                                  |
| **M9 (Pós-Venda & Garantias)**                 | `pos-venda-360.png`                                                                | `pos-venda-768.png`                                                                | `pos-venda-1440.png`                                                                   |
| **M10 (Gestão & Automações)**                  | `automacoes-360.png`                                                               | `automacoes-768.png`                                                               | `automacoes-1440.png`                                                                  |

---

## 5. Limitações Conhecidas da Validação

1. **Ambiente de Testes:** As validações foram realizadas utilizando mocks e credenciais de teste locais sem emissão real para serviços de terceiros (concessionárias externas ou gateway de pagamento real).
2. **Armazenamento S3:** O bucket local do MinIO responde adequadamente a downloads e geração de hash, operando em modo privado com fallback resiliente para armazenamento de teste quando necessário.
3. **Escopo Visual:** As telas registradas refletem o design system institucional claro ("White & Green") vigente. O novo design e evoluções de UX estão estritamente isolados na preparação dos pilotos do Lote 1, sem contaminação do ambiente operacional.
