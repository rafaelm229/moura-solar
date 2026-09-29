# SPEC-004 — Clientes, unidades consumidoras, oportunidades e atividades

**Status:** Proposta para validação operacional  
**Versão:** 0.1.0  
**Dependências:** SPEC-000, SPEC-001, SPEC-002 e SPEC-003

## 1. Objetivo

Definir o núcleo comercial inicial da Moura Solar Platform, permitindo cadastrar
uma pessoa ou empresa uma única vez e acompanhar diferentes negociações, unidades
consumidoras e atividades sem duplicar dados.

## 2. Resultado esperado

Um vendedor deve conseguir:

1. localizar um cliente existente ou iniciar um cadastro;
2. visualizar possíveis duplicidades antes de confirmar;
3. registrar contatos e endereços;
4. cadastrar uma unidade consumidora;
5. criar uma oportunidade específica;
6. qualificar a oportunidade;
7. programar e concluir atividades;
8. anexar documentos relevantes;
9. acompanhar histórico e próxima ação;
10. visualizar os mesmos dados atualizados em outro aparelho.

## 3. Escopo

### Incluído

- pessoas físicas e jurídicas;
- contatos e endereços;
- unidades consumidoras;
- oportunidades comerciais;
- atividades e lembretes operacionais;
- responsáveis e equipes;
- origem do lead;
- tags controladas;
- documentos vinculados;
- histórico e auditoria;
- prevenção e tratamento de duplicidades;
- arquivamento e restauração conforme permissão.

### Fora do escopo

- dimensionamento técnico;
- proposta e PDF;
- contrato;
- financeiro;
- estoque;
- instalação;
- automação por WhatsApp;
- portal externo do cliente.

## 4. Regras de domínio

### 4.1 Cliente

- Cliente representa uma pessoa física ou jurídica, não uma venda.
- Um cliente pode ter vários contatos, endereços, unidades consumidoras e
  oportunidades.
- CPF/CNPJ é único por organização quando informado e válido.
- Cliente pode existir sem CPF/CNPJ durante prospecção, desde que possua nome e
  algum canal válido.
- Nome não é chave única.
- Alterar dados cadastrais não altera documentos históricos já emitidos.
- Exclusão física não será permitida após relacionamento com outras entidades.
- Arquivamento exige motivo e não apaga histórico.

### 4.2 Contato

- Telefone e e-mail são registros próprios, podendo haver mais de um por cliente.
- Um contato pode ser marcado como principal por tipo.
- Telefones são normalizados para comparação e armazenam país/DDD quando possível.
- E-mails são comparados sem diferenciação de maiúsculas e minúsculas.
- A plataforma registra consentimentos ou restrições de contato quando aplicável.

### 4.3 Endereço

- Endereço do cliente e local de instalação são conceitos diferentes.
- CEP pode auxiliar o preenchimento, mas não substitui confirmação humana.
- Coordenadas geográficas são opcionais nesta etapa.
- Endereços usados em documentos ou projetos não são apagados silenciosamente.

### 4.4 Unidade consumidora

- Unidade consumidora pertence a um cliente, mas pode possuir contatos e endereço
  operacional próprios.
- Código da UC é único dentro da mesma concessionária quando informado.
- Uma UC pode possuir várias oportunidades ao longo do tempo.
- Concessionária, classe, modalidade tarifária e tipo de ligação usam cadastros ou
  enums controlados.
- Histórico de consumo será especificado junto ao levantamento/dimensionamento,
  mas a UC deve estar preparada para recebê-lo.

### 4.5 Oportunidade

- Representa uma negociação concreta e possui identificador próprio.
- Deve estar ligada a um cliente e, preferencialmente, a uma unidade consumidora.
- Possui responsável, origem, necessidade, etapa, temperatura/prioridade e próxima
  atividade.
- O estado não pode ser editado livremente; muda por comandos de negócio.
- Cliente pode possuir várias oportunidades simultâneas quando o escopo for distinto.
- Oportunidade perdida exige motivo padronizado e comentário opcional.
- Reabertura exige permissão, justificativa e auditoria.

### 4.6 Atividade

- Atividade representa uma ação executável: ligação, mensagem, reunião, visita,
  envio, retorno ou tarefa interna.
- Possui responsável, prazo, status e entidade relacionada.
- Concluir atividade exige resultado; reagendar preserva o prazo anterior no histórico.
- Oportunidade qualificada deve possuir próxima atividade futura ou ser marcada
  explicitamente como sem acompanhamento, com justificativa.
- Atividade atrasada aparece em pendências e indicadores.

## 5. Fluxos principais

### 5.1 Cadastrar cliente novo

1. Usuário informa nome e ao menos telefone, e-mail ou CPF/CNPJ.
2. Sistema normaliza os dados e procura possíveis correspondências.
3. Correspondências são apresentadas com justificativa da similaridade.
4. Usuário escolhe abrir o existente ou, com permissão, confirmar novo cadastro.
5. Sistema cria cliente e registra auditoria.

### 5.2 Criar oportunidade para cliente existente

1. Usuário abre o cliente.
2. Seleciona ou cadastra a unidade consumidora.
3. Informa origem, necessidade, responsável e previsão.
4. Sistema cria oportunidade no estado `Novo`.
5. Sistema solicita a primeira atividade.

### 5.3 Qualificar oportunidade

Pré-condições mínimas:

- cliente identificado;
- canal de contato;
- responsável comercial;
- necessidade resumida;
- UC ou local preliminar;
- consumo aproximado ou pendência registrada;
- próxima atividade.

Efeito:

- transição de `Novo` para `Qualificado`;
- registro do evento;
- disponibilização do fluxo de levantamento.

### 5.4 Registrar perda

Usuário seleciona motivo, concorrente quando conhecido, observação e possibilidade
de contato futuro. O sistema encerra atividades abertas incompatíveis e preserva o
histórico. Reabertura não modifica o evento de perda; cria novo evento.

## 6. Detecção de duplicidade

### Correspondência forte

- mesmo CPF/CNPJ normalizado;
- mesma combinação concessionária + código da UC;
- mesmo e-mail normalizado, quando considerado pessoal/único.

### Correspondência moderada

- mesmo telefone normalizado;
- nome muito semelhante e mesmo município;
- mesmo endereço e sobrenome/razão social semelhante.

### Comportamento

- Correspondência forte bloqueia criação comum e exige resolução ou permissão de
  exceção.
- Correspondência moderada gera alerta e permite continuar com justificativa.
- O sistema não une registros automaticamente.
- Mesclagem será um comando administrativo separado, auditado e reversível por
  estratégia de dados; não faz parte da primeira fatia.

## 7. Concorrência

- Cliente, UC e oportunidade possuem campo de versão.
- Atualização envia a versão conhecida.
- Se outro usuário alterou o registro, a API retorna conflito com os campos
  relevantes, sem sobrescrever silenciosamente.
- Transições usam o estado e versão esperados.
- Criação aceita chave de idempotência para evitar duplicidade por duplo toque ou
  repetição de rede.

## 8. Privacidade e documentos

- CPF, RG, contas de energia e documentos pessoais exigem permissão contextual.
- Listagens exibem apenas dados necessários à tarefa.
- Download de documento usa autorização e URL temporária.
- Auditoria não armazena bytes nem valores secretos desnecessários.
- Política de retenção e solicitações relacionadas à LGPD serão detalhadas antes da
  produção pública.

## 9. Telas mínimas

### Clientes

- listagem com busca e filtros;
- criação rápida;
- cadastro completo;
- detalhe com resumo, contatos, endereços, UCs, oportunidades, documentos e histórico;
- arquivamento/restauração;
- alerta de possíveis duplicidades.

### Oportunidades

- funil por estado;
- lista operacional;
- detalhe com etapa, responsável, próxima ação e bloqueios;
- criação e qualificação;
- histórico de transições;
- perda, reabertura e arquivamento conforme permissão.

### Atividades

- minhas atividades de hoje;
- atrasadas;
- próximas;
- por equipe quando autorizado;
- criação, conclusão e reagendamento.

## 10. Comportamento responsivo

- No celular, listagens usam cartões com nome, contexto, estado, responsável e
  próxima ação.
- A ação principal nunca fica fixa sobre o último registro.
- Cadastro rápido usa uma coluna; cadastro completo usa seções.
- Funil no celular prioriza uma etapa por vez com contadores e troca acessível.
- Tablet pode usar lista e detalhe simultaneamente.
- Desktop pode exibir tabela configurável e painel de filtros persistente.
- Nenhuma capacidade autorizada fica indisponível por tamanho de tela.

## 11. Eventos de domínio/aplicação

- `CustomerCreated`
- `CustomerUpdated`
- `CustomerArchived`
- `UtilityUnitCreated`
- `OpportunityCreated`
- `OpportunityQualified`
- `OpportunityLost`
- `OpportunityReopened`
- `ActivityScheduled`
- `ActivityCompleted`
- `ActivityRescheduled`

Eventos só são publicados após commit por mecanismo de outbox quando houver
consumidores assíncronos.

## 12. Casos de aceitação

```gherkin
Cenário: impedir cliente duplicado por CPF
  Dado que existe um cliente ativo com determinado CPF
  Quando um vendedor tentar cadastrar outro cliente com o mesmo CPF
  Então o sistema deve bloquear a criação comum
  E apresentar o cliente correspondente conforme sua permissão
  E nenhum novo cliente deve ser persistido
```

```gherkin
Cenário: qualificação cria progressão real
  Dado que uma oportunidade nova atende aos requisitos mínimos
  Quando o vendedor executar o comando de qualificação
  Então a oportunidade deve avançar para Qualificado
  E o evento deve ser registrado no histórico e na auditoria
  E o levantamento deve ficar disponível
```

```gherkin
Cenário: conflito entre dois aparelhos
  Dado que notebook e celular abriram a mesma oportunidade na versão 4
  E o notebook atualizou o responsável, produzindo a versão 5
  Quando o celular tentar salvar dados baseados na versão 4
  Então a API deve responder conflito
  E não deve sobrescrever a versão 5
  E a interface deve permitir recarregar e reaplicar a alteração segura
```

```gherkin
Cenário: atividade concluída exige resultado
  Dado que existe uma ligação em aberto
  Quando o usuário tentar concluí-la sem informar resultado
  Então o sistema deve recusar a conclusão
  E manter a atividade em aberto
```

## 13. Indicadores derivados

- leads por origem;
- tempo até primeiro contato;
- oportunidades sem próxima atividade;
- atividades vencidas;
- conversão por origem e vendedor;
- tempo em cada etapa;
- motivos de perda;
- oportunidades abertas por responsável.

Indicadores são derivados dos registros reais e não mantidos como contadores
editáveis.

## 14. Critérios de aprovação

- [ ] Diferença entre cliente, UC e oportunidade validada.
- [ ] Campos mínimos de qualificação aprovados.
- [ ] Estratégia de duplicidade aprovada.
- [ ] Motivos de perda definidos.
- [ ] Tipos e resultados de atividade definidos.
- [ ] Escopos próprio/equipe/organização aprovados.
- [ ] Regras de documentos e privacidade aceitas.
- [ ] Fluxos responsivos validados.
