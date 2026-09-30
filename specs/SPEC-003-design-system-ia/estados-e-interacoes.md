# Estados e interações

## 1. Estados de página

| Estado | Requisito |
|---|---|
| carregando | skeleton proporcional, sem layout jump excessivo |
| atualizando | conteúdo anterior permanece com indicador discreto |
| vazio | explica o estado e oferece próxima ação autorizada |
| vazio por filtro | mostra filtros ativos e ação para limpar |
| erro recuperável | mensagem, trace ID quando útil e tentar novamente |
| validação | resumo e foco no primeiro campo inválido |
| sem permissão | não revela dados e oferece destino seguro |
| sessão expirada | preserva destino e diferencia falha de rede |
| conflito | mostra que o registro mudou e permite recarregar/comparar |
| sucesso | confirma o efeito e apresenta próximo passo |
| arquivado | estado inequívoco e ações compatíveis |
| degradado/offline | diferencia local, pendente e sincronizado |

## 2. Comandos de negócio

Aplicável a enviar proposta, aceitar, gerar contrato, conferir assinatura, reservar
materiais, iniciar instalação e concluir etapas.

1. exibir alvo e estado atual;
2. listar pré-condições e bloqueios;
3. solicitar dados adicionais necessários;
4. confirmar impacto quando relevante;
5. impedir envio repetido;
6. indicar processamento;
7. usar idempotência na API;
8. revalidar as visões dependentes;
9. mostrar resultado e próxima ação;
10. registrar histórico/auditoria.

## 3. Feedback

- toast para confirmação não crítica;
- alert inline para problema persistente;
- dialog para decisão curta e relevante;
- página/estado dedicado para bloqueio complexo;
- não usar toast como único lugar para erro de formulário.

## 4. Modais, drawers e sheets

- foco inicial deliberado;
- focus trap;
- fechar por Escape quando seguro;
- retorno de foco ao acionador;
- título acessível;
- confirmação ao perder alterações;
- overlay não é o único mecanismo de fechamento em tarefas críticas.

## 5. Movimento

Movimento explica transição e hierarquia, não serve como decoração excessiva.
Reduzir ou remover animação quando o sistema indicar preferência reduzida.

