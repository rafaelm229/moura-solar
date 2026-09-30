# Evidências do M5 — Contratos Comerciais, Minutas DOCX/PDF, Conferência de Assinatura e Gate C (FV1.8 / SPEC-007)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                      | Resultado                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                     | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) aprovados                        |
| Unitários API                    | 6 testes no motor de DOCX/PDF, integridade de hash e regras de conferência (`contract.spec.ts`)              |
| `tests/contract.integration.mjs` | 7 cenários HTTP/PostgreSQL completos de emissão, downloads, envios, upload, rejeição e Gate C                |
| `pnpm test:migrations`           | Upgrade sequencial M0 → M1 → M2 → M3 → M4 → M5 preserva integridade; reaplicação idempotente aprovada        |
| `tests/e2e/contract.spec.ts`     | 2 jornadas E2E completas aprovadas no Playwright (viewports 360px e 1440px) com evidências capturadas        |
| Minuta DOCX Oficial              | Preenchimento automático do modelo Moura Solar com placeholders de partes, BOM, prazos, escopo e assinaturas |
| Contrato PDF Institucional       | Geração com layout executivo, logotipo oficial da marca, memorial descritivo, cronograma financeiro e anexos |
| Upload Não-Ativante              | Anexar documento assinado altera status para `SIGNED_UPLOADED` sem liberar execução prematura (SPEC-007)     |
| Conferência Formal (Gate C)      | Checklist de 4 critérios obrigatórios (partes, páginas completas, versão e legibilidade)                     |
| Transição para VENDIDO           | Aprovação formal da conferência satisfaz o `ProjectGate`, avança oportunidade para `VENDIDO` e agenda obras  |
| Responsividade Total             | Zero overflow horizontal em 360px (mobile) e 1440px (desktop), cards e modais adaptáveis                     |

## Jornadas e Cenários Validados

1. **Geração de Minuta Contratual a partir da Proposta Aceita (FV1.8 / SPEC-007):**
   - Criação do contrato vinculada à oportunidade comercial que já possua versão de proposta aceita formalmente (`acceptedProposalVersionId`).
   - Bloqueio estrito de oportunidades sem aceite prévio (HTTP 422 Unprocessable Entity).
   - Congelamento de snapshots imutáveis das partes (`partySnapshot`), memorial técnico e BOM (`technicalSnapshot`), condições comerciais e parcelamento (`commercialSnapshot`), escopo de fornecimento (`scopeSnapshot`) e cláusulas contratuais (`clausesSnapshot`).
   - Numeração sequencial padronizada por organização (`CTR-2026-0001`).

2. **Motor Duplo de Documentos: DOCX Oficial e PDF Institucional:**
   - **Minuta Editável (DOCX):** Utiliza o template oficial da Moura Solar (`template-padrao-moura-solar.docx`) preservando formatação, estilos e preenchendo todos os placeholders (`{{COMPANY_*}}`, `{{CLIENT_*}}`, `{{SYSTEM_POWER_KWP}}`, Anexo I `{{MODULE_*}}`, `{{INVERTER_*}}`, Anexo II `{{GEN_*}}`, Anexo III `{{SCOPE_*}}` e Anexo IV).
   - **Contrato Formal (PDF):** Renderizado com motor institucional, logotipo oficial da Moura Solar, diagramação profissional, tabelas de cronograma físico-financeiro, anexo técnico e campos de assinatura das partes e testemunhas.
   - Armazenamento em serviço de arquivos de alta confiabilidade com hash SHA-256 criptográfico para auditoria e prevenção contra adulterações.

3. **Governança de Envios e Rastreamento Multicanal:**
   - Registro de entregas/envios (WhatsApp, E-mail, Presencial) com registro de destinatário, operador e timestamp.
   - Atualização do status do contrato para `SENT` e criação automática de atividade de acompanhamento para coleta de assinaturas.

4. **Upload de Via Assinada e Regra de Não-Ativação Prematura (SPEC-007 Itens 4 e 9):**
   - Upload de documento digitalizado ou assinado eletronicamente pelo cliente.
   - O contrato avança estritamente para `SIGNED_UPLOADED` e **não ativa a execução nem o Gate C automaticamente**.
   - Criação de tarefa interna para a equipe jurídica/administrativa realizar a conferência formal do documento.

5. **Conferência Formal de Assinatura e Liberação do Gate C (SPEC-007 Itens 10 e 11):**
   - Interface com checklist de 4 critérios essenciais de validação:
     1. Correspondência dos dados das partes com o cadastro.
     2. Presença de todas as páginas, cláusulas e anexos I a IV.
     3. Correspondência exata do texto e valores com a versão emitida.
     4. Legibilidade e integridade das assinaturas e testemunhas.
   - Suporte a rejeição formal com justificativa obrigatória, retornando o contrato para `READY` para nova coleta de via corrigida.
   - Na aprovação (`VERIFIED`):
     - Contrato avança para o estado `ACTIVE`.
     - `ProjectGate` (tipo `CONTRACT`) é marcado como `SATISFIED`.
     - A oportunidade comercial atinge o marco **Gate C** e transiciona automaticamente para o estágio `VENDIDO` (Closed/Won).
     - Atividade da fase executiva de engenharia é agendada para início do projeto executivo e solicitação de acesso junto à concessionária de energia.

6. **Jornada Ponta a Ponta Playwright (360px e 1440px):**
   - Execução do fluxo completo de ponta a ponta: login, criação de cliente e oportunidade, consumo, dimensionamento aprovado, proposta aceita, navegação para a aba "Contratos & Documentos", geração de contrato DOCX/PDF, registro de envio, upload de via assinada, conferência formal com aprovação do checklist e constatação do avanço para `VENDIDO`.
   - Validação de responsividade mobile estrita sem nenhum transbordamento horizontal.

## Capturas representativas

- [Contrato Comercial, Minutas DOCX/PDF, Assinatura e Gate C — 360 px (Mobile)](contrato-360.png)
- [Contrato Comercial, Minutas DOCX/PDF, Assinatura e Gate C — 1440 px (Desktop)](contrato-1440.png)
