# Testes de aceite — SPEC-015

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Cenários futuros, com integração API e E2E em dados fictícios.

| Teste    | Requisitos     | Cenário e resultado                                                                                                                                                            |
| -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-JOR-01 | JOR-01, JOR-02 | Contrato atendido, financeiro pendente, material faltante e homologação em análise: mostrar frentes verdadeiras e responsáveis; pagar entrada só altera frente pertinente      |
| T-JOR-02 | JOR-03         | Editar contato/salvar rascunho não avança etapa; executar comando com gate bloqueado mantém estado e informa requisito                                                         |
| T-JOR-03 | JOR-04         | Abrir próxima ação de duas oportunidades/versões diferentes e usuário negado; destino correto, sem cruzar contexto ou expor dados                                              |
| T-JOR-04 | JOR-05         | Estorno/reserva em outro dispositivo e resposta de consulta atrasada; revalidar fontes, sem sobrescrever novo estado com resposta antiga                                       |
| T-JOR-05 | JOR-05         | Fonte financeira indisponível; mostrar indisponível, não zero/liberado; retomar sem logout por erro de rede                                                                    |
| T-JOR-06 | JOR-06         | Percorrer M1–M10, incluindo contrato/PDF, recebimento/estorno, estoque/seriais, instalação/entrega, suporte/visita, automação/notificação; mesma autorização em sete viewports |
| T-JOR-07 | JOR-01, JOR-04 | Dado sem prazo/responsável ou código Gate C ambíguo: “Não definido”, rótulo operacional e nenhuma inferência de gate                                                           |

Reutilizar os cinco E2E existentes de M1–M5 e as dez integrações M1–M10, ampliando E2E dedicados para M6–M10. Presença de arquivo não significa testes executados/passing. Testes de máquina de estados e cálculos permanecem em seus módulos; regressão visual não os substitui.
