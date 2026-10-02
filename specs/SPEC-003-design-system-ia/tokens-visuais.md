# Tokens visuais — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Requisito UX-01. Valores iniciais revisáveis pelos pilotos, não aparência aprovada.

| Token               | Valor proposto | Uso                                               |
| ------------------- | -------------- | ------------------------------------------------- |
| brand.primary       | #087443        | Ação principal com texto branco                   |
| brand.primaryStrong | #045C34        | Hover/ênfase                                      |
| brand.primarySoft   | #E2F3E9        | Seleção com texto escuro                          |
| brand.accent        | #F59E0B        | Destaque solar com texto escuro; não texto branco |
| surface.canvas      | #F4F7F5        | Fundo                                             |
| surface.default     | #FFFFFF        | Superfície                                        |
| text.primary        | #102A23        | Texto                                             |
| text.secondary      | #52645C        | Texto secundário                                  |
| border.default      | #D9E2DE        | Divisão decorativa; não limite único de controle  |
| border.control      | #64736E        | Controles identificáveis                          |
| status.info         | #1D4ED8        | Informação                                        |
| status.success      | #15803D        | Confirmação                                       |
| status.warning      | #92400E        | Atenção textual                                   |
| status.danger       | #B91C1C        | Erro/destrutivo                                   |
| focus.ring          | #1D4ED8        | Foco com afastamento claro                        |

Medir combinações reais, inclusive hover, selecionado, erro e sobreposição. A tabela não declara contraste já testado. Cor acompanha texto/ícone; solar não representa sucesso financeiro.

Fonte proposta: Inter local quando disponível e licenciada, fallback system-ui. Campos 16 px; corpo 14–16 px; auxiliar 12–14 px sem informação essencial diminuta; títulos 20–30 px; line-height 1.5 em corpo. Valores usam numerais tabulares e unidade. Não exigir download externo de fonte para operar.

Espaçamento: 4, 8, 12, 16, 20, 24, 32, 40, 48 px. Raios 8–10 px, borda 1 px, sombras discretas somente para hierarquia. Formulários limitam largura de leitura; painéis usam espaço disponível. Alvos 44 px, campo 48 px. Documentar aliases do CSS atual antes de mapear para packages/design-tokens; não substituir styles.css de uma vez.
