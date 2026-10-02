# Fluxos UX — SPEC-015

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Cabeçalho de oportunidade: cliente/UC, código, etapa real e responsável comercial. Faixa seguinte: próxima atividade/prazo e comando principal permitido, com requisitos faltantes. Abas de consumo, levantamento, dimensionamento, proposta, contrato e histórico mantêm domínio existente.

Projeto: identidade e vínculo à oportunidade, responsável técnico, agenda/OS e frentes Contrato, Financeiro, Engenharia/Homologação, Materiais e Instalação/Entrega. Cada frente mostra situação, responsável, prazo, bloqueio explicável, documento relevante e próxima ação autorizada. Não transformar todas em uma barra linear nem calcular percentual de conclusão sem definição aprovada.

Exemplo: “Entrada ainda não recebida — Financeiro” e “Materiais aguardando reserva — Estoque” aparecem simultaneamente; financeiro satisfeito não esconde material faltante. Homologação incompleta permanece visível após conclusão física quando o domínio assim determinar.

“Editar dados” abre formulário; “Salvar rascunho” preserva trabalho sem liberar etapa; “Conferir assinado”, “Reservar materiais” e “Concluir instalação” são comandos distintos, com consequência e validação da API. Gate C/FINANCIAL pode aparecer em detalhe técnico; textos operacionais são suficientes para agir.

Sem permissão de executar, mostrar responsável e próxima ação de acompanhamento permitida, sem botão habilitado ou documento sensível. Link abre contexto/versão corretos e retorno preserva aba/filtros. Em conflito, manter rascunho e mostrar mudança observada; não repetir comando automaticamente com estado novo.

No mobile, resumo e bloqueios primeiro, frentes em cartões expansíveis, menu completo e ação sem cobrir checklist. Tablet pode combinar resumo/detalhe; desktop pode comparar frentes e documentos. Histórico ordena eventos reais, diferencia horário de ocorrência e atualização quando necessário. Erro parcial sinaliza frente indisponível e retentativa, sem apagar dados confirmados restantes.
