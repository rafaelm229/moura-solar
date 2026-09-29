# SPEC-001 — Jornada do cliente e esteira operacional

**Status:** Rascunho para descoberta  
**Versão:** 0.2.0  
**Escopo:** da entrada do lead ao pós-venda

## 1. Objetivo

Definir uma única jornada operacional para que clientes, oportunidades,
propostas, contratos, recebimentos, projetos, estoque e instalações não evoluam
como cadastros desconectados.

## 2. Princípio central

O funil não possui um campo de status editado livremente. Ele representa o estado
calculado e controlado da oportunidade. Toda transição ocorre por um comando de
negócio, com pré-condições, efeitos, responsável e auditoria.

## 3. Entidades que não podem ser confundidas

- **Cliente:** pessoa física ou jurídica atendida.
- **Contato:** pessoa e canais de comunicação ligados ao cliente.
- **Lead:** interesse ainda não qualificado.
- **Oportunidade:** negociação concreta com responsável, necessidade e previsão.
- **Unidade consumidora:** local/conta de energia que receberá o projeto.
- **Levantamento:** informações técnicas e comerciais coletadas.
- **Dimensionamento:** solução técnica calculada para o cenário.
- **Proposta:** oferta comercial versionada e enviada.
- **Contrato:** instrumento vinculado à proposta aprovada.
- **Projeto:** execução operacional originada da venda.
- **Instalação:** ordem de serviço e execução em campo.

Um cliente pode ter múltiplas oportunidades e unidades consumidoras. Uma
oportunidade pode ter múltiplas versões de proposta, mas somente uma versão pode
ser aceita como base da contratação.

## 4. Macroetapas propostas

1. Entrada e qualificação.
2. Levantamento comercial/técnico.
3. Dimensionamento e composição de custos.
4. Proposta e negociação.
5. Aprovação comercial.
6. Contratação.
7. Condição financeira inicial.
8. Engenharia e homologação.
9. Reserva, compra e separação de materiais.
10. Agendamento e instalação.
11. Comissionamento e entrega.
12. Pós-venda.

As etapas 7, 8 e 9 podem possuir atividades paralelas, mas a liberação da
instalação dependerá de critérios explícitos ainda a validar.

## 5. Regras já decididas

- A proposta tem validade padrão de 10 dias, editável conforme permissão.
- A proposta apresenta consumo médio de 12 meses, geração estimada, economia,
  serviços contemplados e composição comercial.
- O custo do projeto é derivado de materiais e demais custos previstos.
- Margem/lucro é configurável conforme permissão e limites de aprovação.
- Proposta aprovada deve originar a contratação sem recadastro manual.
- Instalação utiliza a lista de equipamentos do projeto aprovado.
- Reserva e baixa de estoque são eventos diferentes.
- A baixa efetiva ocorre com movimentação auditada, não apenas com checklist visual.
- A versão web suporta todo o trabalho do instalador.
- Contrato assinado poderá ser enviado ao sistema enquanto não houver assinatura integrada.

## 6. Fluxo principal proposto

### 6.1 Entrada

O vendedor registra ou localiza o cliente e cria uma oportunidade. O sistema deve
detectar possíveis duplicidades por CPF/CNPJ, telefone, e-mail e unidade
consumidora, sem bloquear falsos positivos automaticamente.

### 6.2 Qualificação

São registrados necessidade, origem, responsável, local, consumo aproximado,
tipo de sistema desejado e próxima atividade. Uma oportunidade sem próxima ação
deve aparecer como pendência comercial.

### 6.3 Levantamento

São coletados conta de energia, histórico de consumo, tarifa, tipo de ligação,
endereço, características do telhado/local e demais evidências necessárias.

### 6.4 Dimensionamento

O usuário autorizado cria uma versão de dimensionamento com potência, geração,
módulos, inversores, baterias quando aplicável, estruturas, cabos e demais itens.
Os preços usados são congelados na versão para preservar o histórico da oferta.

### 6.5 Proposta

A proposta é gerada a partir de um dimensionamento e de uma composição de custos.
Alterações relevantes geram nova versão. O envio registra data, canal e usuário.

### 6.6 Negociação e aprovação

Desconto ou margem fora da alçada exige aprovação. O aceite seleciona uma única
versão e bloqueia alterações silenciosas. Mudança posterior exige aditivo ou nova
versão conforme regra a definir.

### 6.7 Contratação

O contrato reutiliza dados do cliente, unidade consumidora e proposta aceita.
O documento gerado fica disponível para visualização e download. O arquivo
assinado é anexado como versão documental própria.

### 6.8 Execução

Após critérios financeiros e técnicos, o projeto operacional é liberado.
Materiais são reservados, separados e vinculados à instalação. Compras cobrem
faltas identificadas sem alterar silenciosamente o escopo vendido.

### 6.9 Instalação e entrega

O instalador executa ordem de serviço, checklists, fotos, números de série,
materiais adicionais/devolvidos, testes e assinatura. Conclusão da instalação não
é sinônimo automático de homologação concluída ou projeto encerrado.

### 6.10 Pós-venda

O sistema acompanha pendências documentais, homologação, troca de medidor,
monitoramento e chamados. Reconexão do inversor após mudança de Wi-Fi é tratada
como serviço de suporte e pode gerar cobrança conforme contrato vigente.

## 7. Automação esperada por evento

| Evento                       | Efeitos mínimos                                             |
| ---------------------------- | ----------------------------------------------------------- |
| Lead qualificado             | cria/ativa oportunidade e próxima atividade                 |
| Levantamento concluído       | libera dimensionamento                                      |
| Proposta enviada             | registra versão/canal/data e agenda acompanhamento          |
| Proposta aceita              | encerra negociação, fixa versão e inicia contratação        |
| Contrato assinado            | registra documento e reavalia liberação operacional         |
| Condição financeira atendida | reavalia liberação de engenharia/execução                   |
| Lista técnica aprovada       | permite reserva planejada de materiais                      |
| Materiais separados          | registra origem, quantidades e responsável                  |
| Instalação iniciada          | registra equipe, data e ordem de serviço                    |
| Material consumido           | baixa estoque e atualiza custo realizado                    |
| Instalação concluída         | cria conferência/entrega, sem encerrar pendências restantes |
| Entrega aceita               | inicia garantia e pós-venda                                 |

## 8. Exceções obrigatórias

- Cliente desistiu antes ou depois da proposta.
- Oportunidade perdida para concorrente.
- Proposta expirada e reaberta.
- Contrato precisa de correção.
- Pagamento atrasado bloqueia uma liberação.
- Homologação exige ajuste de projeto.
- Material reservado fica indisponível ou defeituoso.
- Instalação parcial precisa ser reagendada.
- Material extra é usado em campo.
- Material separado retorna ao depósito.
- Projeto vendido sofre alteração de escopo.
- Cliente possui mais de um projeto simultâneo.

## 9. Questões que precisam de decisão da Moura Solar

1. Quem pode qualificar, desqualificar e reabrir uma oportunidade?
2. O levantamento técnico sempre exige visita ou pode usar fotos/documentos?
3. Quem aprova o dimensionamento antes do orçamento?
4. Quais limites de desconto e margem cada perfil possui?
5. O que representa aceite válido: ação interna, mensagem, assinatura ou entrada?
6. Quais condições liberam engenharia, reserva e instalação?
7. Em que momento o estoque é reservado, separado e baixado?
8. Quem pode trocar componentes após a proposta aceita?
9. Instalação concluída exige quais fotos, testes e assinaturas?
10. Quando o projeto é considerado entregue e quando é considerado encerrado?
11. Quem é responsável por homologação e troca de medidor?
12. Quais prazos geram alertas e escalações em cada etapa?

As recomendações iniciais para essas decisões estão documentadas em
`responsabilidades-e-gates.md`. Elas permitem avançar a modelagem sem converter
hipóteses em regras definitivas.

## 10. Critérios de aceitação desta SPEC

- [ ] Cada macroetapa possui responsável definido.
- [ ] Cada transição possui comando e pré-condições.
- [ ] Retornos e cancelamentos estão definidos.
- [ ] Critérios de liberação financeira, técnica e logística estão aprovados.
- [ ] Duplicidades entre cliente, oportunidade e projeto foram eliminadas do modelo.
- [ ] Eventos atualizam módulos dependentes sem edição manual de status.
- [ ] Jornada completa funciona pela web em celular, tablet e desktop.
