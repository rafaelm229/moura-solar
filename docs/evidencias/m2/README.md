# Evidências do M2 — Clientes, Unidades Consumidoras, Oportunidades e Atividades

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação             | Resultado                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `pnpm check`            | Formatação, lint (0 warnings), TypeScript, testes e builds (Next.js/NestJS) aprovados   |
| Unitários               | 1.130 testes de API/política/comercial e 5 testes web                                   |
| `pnpm test:integration` | 20 cenários HTTP/PostgreSQL aprovados (15 de identidade + 5 comerciais)                 |
| `pnpm test:migrations`  | Upgrade contínuo M0 → M1 → M2 preserva integridade; reaplicação idempotente aprovada    |
| `pnpm test:e2e`         | 8 jornadas E2E aprovadas (6 de identidade + 2 comerciais em 360px e 1440px)             |
| Concorrência otimista   | Prevenção de sobrescrita acidental via `expectedVersion` com HTTP 409 em clientes e UCs |
| Anti-duplicidade        | Detecção em dois níveis (forte: CPF/CNPJ, email, cód. UC; moderada: telefone, nome)     |
| Atomicidade comercial   | Criação obrigatória da primeira atividade vinculada à oportunidade em transação única   |
| Gate A (Qualificação)   | Bloqueio automático com HTTP 422 quando cliente não possui canal de contato cadastrado  |
| Armazenamento local     | PostgreSQL como fonte única da verdade; regras de negócio e transições 100% na API      |

## Jornadas e Cenários Validados

1. **Anti-duplicidade e Sobrescrita:**
   - Detecção de correspondência por CPF/CNPJ duplicado ou telefone idêntico (aviso em tela com opção de confirmação explícita).
   - Bloqueio de código de UC duplicado dentro da mesma distribuidora.
   - Concorrência otimista via `expectedVersion` retornando 409 em tentativas simultâneas desatualizadas.

2. **Jornada Comercial do Vendedor (Playwright E2E):**
   - Vendedor aceita convite e autentica-se com sucesso.
   - Cadastro de cliente com canal de contato e endereço.
   - Criação de oportunidade com código sequencial estável (`OPT-XXXX`) e primeira atividade obrigatória de contato agendada na mesma transação.
   - Avanço no Gate A (Qualificação) com validação de necessidade confirmada e presença de contato.
   - Conclusão da atividade comercial com código de resultado e histórico auditável.
   - Verificação de ausência de overflow horizontal em 360px (mobile) e 1440px (desktop).

## Capturas representativas

- [Jornada Comercial — 360 px (Mobile)](comercial-360.png)
- [Jornada Comercial — 1440 px (Desktop)](comercial-1440.png)
