# Estados e transições — versão inicial

**Status:** hipótese para validação

## Máquina de estados da oportunidade

| Estado          | Entrada válida              | Comando de saída          | Próximo estado  |
| --------------- | --------------------------- | ------------------------- | --------------- |
| Novo            | lead criado                 | qualificar                | Qualificado     |
| Novo            | lead criado                 | descartar                 | Descartado      |
| Qualificado     | dados mínimos e responsável | iniciar levantamento      | Levantamento    |
| Levantamento    | coleta iniciada             | concluir levantamento     | Dimensionamento |
| Dimensionamento | dados suficientes           | aprovar dimensionamento   | Proposta        |
| Proposta        | versão preparada            | enviar proposta           | Negociação      |
| Negociação      | proposta enviada            | aceitar proposta          | Contratação     |
| Negociação      | proposta enviada            | registrar perda           | Perdido         |
| Negociação      | proposta expirada           | renovar/revisar           | Proposta        |
| Contratação     | proposta aceita             | confirmar contratação     | Vendido         |
| Contratação     | impedimento/recusa          | cancelar contratação      | Cancelado       |
| Vendido         | contrato e regras atendidas | criar projeto operacional | Concluído       |

`Vendido` representa o fechamento comercial. A execução continua em uma entidade
Projeto, evitando transformar o funil comercial em controle improvisado da obra.

## Estado do projeto operacional

| Estado              | Condição de entrada                 | Próxima decisão                   |
| ------------------- | ----------------------------------- | --------------------------------- |
| Preparação          | venda confirmada                    | liberar engenharia/financeiro     |
| Engenharia          | documentação liberada               | aprovar lista técnica/homologação |
| Suprimentos         | lista técnica aprovada              | reservar, comprar e separar       |
| Pronto para agendar | bloqueios atendidos                 | agendar equipe                    |
| Agendado            | data e equipe definidas             | iniciar instalação                |
| Em instalação       | ordem iniciada                      | concluir, pausar ou reagendar     |
| Comissionamento     | instalação física concluída         | validar testes e entrega          |
| Entrega             | documentação e assinatura pendentes | aceitar entrega                   |
| Pós-venda           | entrega aceita                      | acompanhar garantia/chamados      |
| Encerrado           | critérios finais atendidos          | somente reabrir com justificativa |
| Suspenso            | bloqueio registrado                 | resolver ou cancelar              |
| Cancelado           | cancelamento autorizado             | estado terminal auditado          |

## Regras de transição

1. Usuário não edita o estado diretamente.
2. Todo comando valida permissão, estado atual e pré-condições.
3. Transição grava ator, data, estado anterior, novo estado e justificativa.
4. Retorno de etapa não apaga histórico nem documentos.
5. Transições repetidas usam idempotência.
6. Efeitos obrigatórios são transacionais.
7. Atividades paralelas não devem ser representadas por um único status artificial.

## Exemplo executável

```gherkin
Cenário: proposta aceita inicia contratação
  Dado que a oportunidade está em negociação
  E existe uma proposta enviada e dentro da validade
  Quando um usuário autorizado registrar o aceite dessa proposta
  Então essa versão deve ser marcada como aceita
  E as demais versões não podem ser aceitas para a mesma oportunidade
  E a oportunidade deve avançar para contratação
  E deve ser criada a atividade de elaboração do contrato
  E todos os efeitos devem pertencer à mesma transação
  E a operação deve constar na auditoria
```
