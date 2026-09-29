# Responsabilidades e gates — recomendação inicial

**Status:** Proposto para validação operacional  
**Versão:** 0.1.0

## 1. Princípio

Papéis indicam a responsabilidade usual, mas permissões granulares determinam
quem pode executar cada comando. Um gerente pode delegar trabalho sem transferir
automaticamente poder de aprovação.

## 2. Responsabilidade por etapa

| Etapa                | Responsável primário   | Aprovador padrão        | Evidência de conclusão             |
| -------------------- | ---------------------- | ----------------------- | ---------------------------------- |
| Entrada do lead      | Vendedor               | —                       | contato e origem registrados       |
| Qualificação         | Vendedor               | Gerente em exceções     | necessidade, UC e próxima ação     |
| Levantamento         | Vendedor/Engenharia    | Engenharia              | consumo e dados técnicos mínimos   |
| Dimensionamento      | Engenharia             | Engenharia/Gerente      | versão técnica aprovada            |
| Composição comercial | Vendedor               | Gerente fora da alçada  | custo, preço e margem calculados   |
| Envio da proposta    | Vendedor               | —                       | versão, canal e data registrados   |
| Aceite               | Vendedor               | Gerente em exceções     | evidência de aceite vinculada      |
| Contrato             | Administrativo/Gerente | Administrador           | documento gerado e assinado        |
| Condição financeira  | Financeiro             | Financeiro/Gerente      | regra mínima atendida              |
| Lista técnica        | Engenharia             | Engenharia              | BOM aprovada e congelada           |
| Reserva/separação    | Estoquista             | Gerente em divergências | movimentos e conferência           |
| Agendamento          | Operação/Gerente       | —                       | data, equipe e recursos definidos  |
| Instalação           | Instalador líder       | Operação/Engenharia     | checklist, fotos, seriais e testes |
| Entrega              | Operação               | Cliente/Gerente         | aceite e relatório de entrega      |
| Pós-venda            | Suporte/Gerente        | —                       | chamado e SLA registrados          |

## 3. Gates recomendados

### Gate A — Qualificação concluída

Obrigatório:

- cliente identificado sem duplicidade não resolvida;
- telefone ou canal de contato válido;
- unidade consumidora ou local preliminar;
- consumo aproximado ou conta de energia pendente identificada;
- responsável comercial;
- próxima atividade com data.

Efeito: libera levantamento.

### Gate B — Levantamento concluído

Obrigatório:

- 12 meses de consumo quando disponíveis, com justificativa se incompletos;
- tarifa e concessionária;
- tipo de ligação;
- endereço de instalação;
- conta de energia anexada ou dispensa justificada;
- informações do local suficientes para dimensionamento;
- pendências técnicas explicitadas.

Efeito: libera criação da versão de dimensionamento.

### Gate C — Proposta pronta para envio

Obrigatório:

- dimensionamento aprovado;
- potência, geração estimada e equipamentos principais;
- lista e custo previsto dos materiais;
- serviços incluídos e exclusões;
- preço, margem e forma de pagamento;
- alçada de desconto atendida;
- validade e responsável.

Efeito: permite gerar PDF e enviar uma versão imutável.

### Gate D — Venda confirmada

Recomendação inicial:

- proposta válida selecionada;
- evidência de aceite;
- dados cadastrais mínimos completos;
- exceções comerciais aprovadas.

Contrato assinado e pagamento não são necessários para reconhecer a venda no
funil, mas permanecem bloqueadores independentes da execução.

Efeito: encerra o ciclo comercial e cria contratação/projeto em preparação.

### Gate E — Engenharia liberada

Recomendação inicial:

- contrato assinado ou exceção formal aprovada;
- condição financeira mínima definida pelo contrato atendida;
- documentos do cliente e da UC disponíveis.

Efeito: permite iniciar projeto executivo e homologação.

### Gate F — Materiais liberados

Obrigatório:

- lista técnica aprovada;
- projeto sem alteração de escopo pendente;
- autorização operacional;
- depósito de origem definido.

Efeito: permite reservar e separar materiais. A reserva não baixa estoque físico.

### Gate G — Instalação pronta para agendar

Obrigatório:

- Gate financeiro atendido;
- liberação técnica conforme tipo do projeto;
- materiais essenciais disponíveis e separados;
- equipe e duração estimadas;
- cliente apto a receber a equipe;
- impedimentos do local resolvidos ou aceitos formalmente.

Efeito: permite confirmar agenda e emitir ordem de serviço.

### Gate H — Instalação concluída

Obrigatório:

- checklist técnico e de segurança concluído;
- equipamentos e números de série registrados;
- materiais consumidos, adicionais e devolvidos conciliados;
- fotos obrigatórias;
- testes de comissionamento;
- pendências registradas;
- assinatura do cliente ou justificativa formal.

Efeito: envia para conferência/entrega, sem encerrar automaticamente homologação.

## 4. Política recomendada de alterações

- Vendedor pode corrigir cadastro sem impacto técnico ou financeiro.
- Alteração de equipamento, potência, preço ou escopo após envio gera nova versão.
- Após aceite, alteração relevante exige aprovação e registro de mudança.
- Após reserva, mudança na BOM recalcula reserva e exige nova conferência.
- Após consumo de material, correções ocorrem por movimentos compensatórios; nunca
  pela edição ou exclusão do movimento original.

## 5. Retornos de etapa

Retornar uma etapa exige motivo selecionado e observação. O retorno não apaga
histórico. Tarefas e reservas incompatíveis devem ser canceladas por comandos
próprios dentro da mesma operação ou por processo compensatório explícito.

## 6. Pontos ainda pendentes de validação humana

- limites monetários e percentuais das alçadas;
- valor/percentual de entrada que libera engenharia e instalação;
- tipos de projeto que exigem visita presencial;
- lista exata de fotos e testes por tipo de instalação;
- prazos e escalações por etapa;
- quem pode aprovar exceções contratuais e logísticas.
