# Evidências do M1 — 29/09/2026

Validação local em Node 22.22.1, pnpm 11.25.0 e PostgreSQL 17 isolado.

| Verificação             | Resultado                                                                        |
| ----------------------- | -------------------------------------------------------------------------------- |
| `pnpm check`            | Formatação, lint, TypeScript, testes e builds aprovados                          |
| Unitários               | 1.121 testes de API/política e 5 testes web                                      |
| `pnpm test:integration` | 15 cenários HTTP/PostgreSQL aprovados                                            |
| `pnpm test:migrations`  | Upgrade desde M0 preserva organização existente; reaplicação segura              |
| `pnpm test:e2e`         | 6 jornadas aprovadas, em 360, 390, 768, 1024, 1366 e 1440 px                     |
| Compose                 | Build e inicialização completos; PostgreSQL/API saudáveis; web e MinIO respondem |
| Proxy web → API         | Health e login aprovados pelo endereço da web                                    |
| Seed/reinício           | Sete perfis fictícios preservados após reiniciar PostgreSQL, API e web           |
| Armazenamento local     | Nenhum uso de Local Storage, Session Storage ou IndexedDB em apps/pacotes        |

Os cenários incluem: convite, aceite em outro aparelho, vendedor sem acesso
administrativo, edição de papéis, criação de equipes, auditoria com erro de rede,
controle de sessão, teclado e ausência de rolagem horizontal. Capturas revisadas
visualmente confirmam campos legíveis e navegação sem encobrir conteúdo.

A suíte de integração cobre CSRF, bootstrap único, idempotência, autorização
negativa, logout por aparelho, refresh/reuso, recuperação, bloqueio, concorrência,
último administrador, isolamento organizacional, auditoria imutável, revogação
administrativa, reinício da API e limite compartilhado de tentativas de login.

## Capturas representativas

- [Papéis — 360 px](papeis-360.png)
- [Equipes — 768 px](equipes-768.png)
- [Sessões — 1024 px](sessoes-1024.png)
- [Papéis — 1440 px](papeis-1440.png)

São dados fictícios de testes; as capturas não contêm senhas nem links de acesso.
Os relatórios completos são gerados em `playwright-report/` e `test-results/`.
O CI publica esses diretórios como artefato `playwright-results`.

A validação local não é declaração de execução remota do CI; o resultado do
workflow no PR deve ser consultado separadamente. Não houve migração nem remoção
de dados dos projetos anteriores.
