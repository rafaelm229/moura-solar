# SPEC-015 — UX da jornada operacional

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

## Objetivo e autoridade

Orientar a próxima ação sem substituir SPEC-001, estados ou gates de M2–M10. SPEC-003 governa aparência e componentes. Não criar status de funil independente ou endpoint visual que avance processo.

| ID     | Requisito                                                                                       | Aceite verificável                                                                                |
| ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| JOR-01 | Mostrar etapa real, responsável, prazo, bloqueios, requisitos faltantes, documentos e histórico | Oportunidade/projeto exibe valores da API e identifica ausência de responsável/prazo              |
| JOR-02 | Financeiro, homologação e suprimentos como frentes paralelas                                    | Pagar entrada não marca materiais/homologação concluídos; estados independentes visíveis          |
| JOR-03 | Separar editar, salvar rascunho e avançar processo                                              | Salvar dados não muda etapa; comando autorizado muda somente efeitos definidos no módulo          |
| JOR-04 | Linguagem operacional e links contextuais autorizados                                           | “Conferir contrato assinado” abre versão/contexto corretos; Gate C nunca é única explicação       |
| JOR-05 | Revalidar após mutação e mostrar dados desatualizados/falha parcial                             | Duas telas/aparelhos convergem; falha de frente não aparece como liberada                         |
| JOR-06 | Web completa e preservação M1–M10                                                               | Fluxo de venda à instalação/suporte mantém capacidades, histórico e autorização em sete viewports |

Fora: redefinir alçadas, prazos/gates ainda pendentes, alterar cálculos, forçar sequência onde há paralelismo, criar automação de avanço ou aprovar documentos por upload.

## Complementos

- [Modelo de dados](modelo-dados.md).
- [API](api.md).
- [Fluxos UX](fluxos-ux.md).
- [Testes de aceite](testes-aceite.md).
- [Navegação](../SPEC-003-design-system-ia/mapa-navegacao.md).
