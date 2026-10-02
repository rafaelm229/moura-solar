# Validação visual e aceite — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Todos os testes abaixo são futuros. Nesta entrega houve revisão documental, não renderização da aplicação nem aprovação visual.

| Teste   | Requisitos          | Procedimento e resultado esperado                                                                                                                    |
| ------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-UX-01 | UX-01, UX-02, UX-03 | Inspecionar pilotos e catálogo: hierarquia clara, tokens consistentes, sem emojis, SVGs locais com licença; todos os estados                         |
| T-UX-02 | UX-04, UX-05        | Executar três pilotos nas sete dimensões; teclado, leitor de tela, contraste, zoom, movimento reduzido; nenhum conteúdo encoberto                    |
| T-UX-03 | UX-06, UX-07, UX-08 | Percorrer inventário M1–M10 em perfis autorizado/negado e menu Mais; nenhuma função perdida                                                          |
| T-UX-04 | UX-09, UX-10        | Colar deep link sem sessão, login/retorno, refresh, voltar/avançar, duas abas, troca de usuário e formulário sujo; contexto e isolamento preservados |
| T-UX-05 | UX-11               | Comparar previews aprovados e screenshots por versão; rollback do lote mantém domínio e documentos                                                   |
| T-UX-06 | UX-12               | Mudar filtros/período; gráfico e tabela concordam, unidade/fonte/data presentes, ausência distinta de zero                                           |
| T-UX-07 | UX-11               | Gerar PDF/DOCX de proposta e contrato com fixture estável antes/depois; conteúdo, paginação e hash dos documentos históricos preservados             |

## Pilotos obrigatórios

1. Ficha do cliente: resumo, várias UCs e oportunidades, documentos autorizados, vazio, erro e conta de energia pendente.
2. Detalhe da oportunidade: consumo incompleto, proposta/contrato, bloqueios financeiros/técnicos simultâneos, próxima ação e conflito.
3. Execução da instalação: checklist longo, câmera, fotos pendentes, rede lenta, pausa, materiais e conclusão bloqueada.

Implementação futura entrega previews navegáveis mobile (360/390), tablet (768/1024) e desktop (1366/1440/1920), com fixtures fictícias e referências de commit. Produto e representantes comercial/engenharia/instalação registram aprovação, rejeição ou ajustes por tela e viewport. Capturas, achados e decisão ficam anexados à evidência do lote. Não expandir aparência para M1–M10 antes dessa aprovação humana. Testes automatizados e snapshots não a substituem.

Comparar PDFs existentes sem migrar templates junto ao CSS. Mudança visual web não aprova revisão jurídica, cálculos ou novo motor documental.
