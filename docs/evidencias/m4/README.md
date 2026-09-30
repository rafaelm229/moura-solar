# Evidências do M4 — Propostas Comerciais, Motor de PDF, Rastreamento de Envios e Aceite Formal (FV1.7 / SPEC-006)

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação                      | Resultado                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm check`                     | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) aprovados                    |
| Unitários API                    | 8 testes no motor de PDF e governança de ciclo de vida (`proposal.spec.ts`)                              |
| `tests/proposal.integration.mjs` | 5 cenários HTTP/PostgreSQL completos de ciclo de vida, integridade de PDF e transições de esteira        |
| `pnpm test:migrations`           | Upgrade sequencial M0 → M1 → M2 → M3 → M4 preserva integridade; reaplicação idempotente aprovada         |
| `tests/e2e/proposal.spec.ts`     | 2 jornadas E2E completas aprovadas no Playwright (viewports 360px e 1440px)                              |
| Sigilo de Custos                 | Proibição estrita: custos internos, markup e margem bruta omitidos do PDF do cliente (SPEC-006 item 3)   |
| Preservação de Dados             | Mascaramento de CPF/CNPJ de acordo com a LGPD nos documentos públicos                                    |
| Gate B & Follow-up               | Transição automática para `PROPOSTA_APRESENTADA` no envio com agendamento de follow-up em 48h            |
| Aceite & Contratação             | Transição automática para `CONTRATACAO` no aceite formal; bloqueio estrito contra novo aceite (HTTP 409) |
| Responsividade Total             | Zero overflow horizontal em 360px (mobile) e 1440px (desktop), cards e ações responsivas                 |

## Jornadas e Cenários Validados

1. **Geração de Proposta Comercial a partir de Dimensionamento Aprovado (FV1.7 / SPEC-006):**
   - Criação da proposta comercial vinculada à oportunidade comercial e a uma versão aprovada de dimensionamento técnico (`DesignVersion` com status `APPROVED`).
   - Bloqueio estrito de dimensionamentos com status `DRAFT` ou `REJECTED` (HTTP 422 Unprocessable Entity).
   - Congelamento de snapshots cadastrais do cliente, unidade consumidora e parâmetros técnicos/financeiros no momento da emissão.
   - Numeração sequencial humana padronizada por organização (`PROP-0001`, `PROP-0002`).

2. **Motor de Renderização de PDF Comercial e Armazenamento em Objetos:**
   - Layout executivo A4 vertical com tipografia hierárquica, cores institucionais Moura Solar e seções estruturadas:
     - Cabeçalho institucional e identificação do cliente com dados mascarados (LGPD).
     - Resumo executivo da solução fotovoltaica (potência pico kWp, módulos, inversores, geração mensal estimada).
     - Análise financeira com investimento total, opções de parcelamento e condições de validade.
   - **Regra Fundamental de Sigilo Comercial (SPEC-006 item 3):** Custos internos de equipamentos, serviços diretos, markup e margem bruta são estritamente omitidos do documento gerado para o cliente.
   - Armazenamento em serviço de objetos S3/MinIO com fallback local de alta confiabilidade.
   - Endpoint de streaming de PDF (`GET /api/v1/proposal-versions/:id/pdf`) com Content-Disposition inline/download e integridade garantida via cabeçalho ETag.

3. **Governança de Envios e Transição do Gate B:**
   - Registro de entregas/envios multicanal (WhatsApp, E-mail, Presencial) com registro de destinatário, ator e data/hora.
   - Validade padrão de 10 dias corridos calculada automaticamente a partir do envio.
   - Avanço automático do estágio da esteira da oportunidade comercial para `PROPOSTA_APRESENTADA` (Gate B).
   - Criação automática de tarefa de acompanhamento (`Activity` de tipo `FOLLOW_UP`) agendada para 48h após o envio, atribuída ao responsável da oportunidade.

4. **Aceite Formal do Cliente e Bloqueio de Unicidade:**
   - Registro formal de aceite com método (mensagem escrita, documento físico assinado, assinatura eletrônica), nome do signatário/decisor e justificativa.
   - Atualização do status da versão da proposta para `ACCEPTED` e vinculação de `acceptedVersionId` na proposta.
   - Avanço automático da oportunidade para o estágio `CONTRATACAO`, gerando atividade de formalização contratual.
   - **Regra de Unicidade de Aceite (SPEC-006 item 19):** Tentativa subsequente de registrar aceite na mesma oportunidade é rejeitada com HTTP 409 Conflict.

5. **Jornada Ponta a Ponta Playwright (360px e 1440px):**
   - Execução do fluxo completo: autenticação do operador comercial, criação de cliente e oportunidade, unidade consumidora, vistoria técnica, sugestão automatizada de dimensionamento, aprovação da versão técnica, geração da proposta comercial com PDF, envio via WhatsApp, verificação de avanço para `PROPOSTA_APRESENTADA` e registro de aceite formal com avanço para `CONTRATACAO`.
   - Validação de adaptabilidade visual e ausência de scroll horizontal nos dois viewports oficiais do projeto.

## Capturas representativas

- [Proposta Comercial, PDF, Envio e Aceite Formal — 360 px (Mobile)](proposta-360.png)
- [Proposta Comercial, PDF, Envio e Aceite Formal — 1440 px (Desktop)](proposta-1440.png)
