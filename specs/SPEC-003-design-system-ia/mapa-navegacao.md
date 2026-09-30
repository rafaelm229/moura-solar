# Mapa de navegação — versão 0.2

## 1. Rotas normativas

```text
/
/login
/comercial/funil
/comercial/clientes
/comercial/clientes/:clienteId
/comercial/oportunidades
/comercial/oportunidades/:oportunidadeId
/comercial/atividades
/comercial/propostas
/comercial/propostas/:propostaId
/operacao/projetos
/operacao/projetos/:projetoId
/operacao/engenharia
/operacao/agenda
/operacao/instalacoes
/operacao/instalacoes/:instalacaoId
/operacao/pos-venda
/suprimentos/estoque
/suprimentos/movimentacoes
/suprimentos/compras
/suprimentos/fornecedores
/suprimentos/inventarios
/financeiro
/financeiro/receber
/financeiro/pagar
/financeiro/comissoes
/financeiro/fluxo-caixa
/administracao/equipe
/administracao/papeis
/administracao/auditoria
/administracao/cadastros
/administracao/configuracoes
/conta/perfil
/conta/sessoes
```

## 2. Regras

- URLs são estáveis, compartilháveis e independentes do componente de navegação.
- Usuário não autenticado retorna ao destino após login válido.
- Rotas sem permissão exibem estado seguro e não vazam existência de dados.
- Refresh, voltar e avançar preservam módulo, filtros essenciais e entidade.
- Painéis laterais relevantes podem ser representados por rota ou query string.
- A URL nunca é substituída por uma variável `currentPage` global.

## 3. Desktop

A sidebar agrupa Comercial, Operação, Suprimentos, Financeiro e Administração.
O estado recolhido pode ser preferência local não crítica. Itens e capacidades são
derivados das permissões efetivas obtidas da API.

## 4. Mobile

Quatro destinos prioritários são derivados do perfil; `Mais` sempre abre o menu completo.

| Perfil        | 1      | 2            | 3           | 4          | 5    |
| ------------- | ------ | ------------ | ----------- | ---------- | ---- |
| Gerente/Admin | Início | Funil        | Projetos    | Pendências | Mais |
| Vendedor      | Início | Atividades   | Clientes    | Propostas  | Mais |
| Financeiro    | Início | Receber      | Atrasos     | Fluxo      | Mais |
| Estoquista    | Início | Separações   | Estoque     | Movimentos | Mais |
| Instalador    | Hoje   | Agenda       | Instalações | Pendências | Mais |
| Engenharia    | Início | Fila técnica | Projetos    | Pendências | Mais |

O protótipo do Figma usa destinos fixos; a implementação final deve respeitar o perfil.

## 5. Contexto de projeto

```text
/operacao/projetos/:projetoId/resumo
/operacao/projetos/:projetoId/comercial
/operacao/projetos/:projetoId/proposta
/operacao/projetos/:projetoId/contrato
/operacao/projetos/:projetoId/financeiro
/operacao/projetos/:projetoId/engenharia
/operacao/projetos/:projetoId/materiais
/operacao/projetos/:projetoId/instalacao
/operacao/projetos/:projetoId/documentos
/operacao/projetos/:projetoId/historico
```

As rotas podem usar layouts aninhados do Next.js. Todas compartilham a identidade
do projeto, responsável, etapa, bloqueios e próxima ação.

## 6. Busca global

A busca encontra somente itens autorizados e informa tipo, código, estado e contexto.
Resultados suportados: clientes, oportunidades, propostas, contratos, projetos,
instalações, materiais e documentos.
