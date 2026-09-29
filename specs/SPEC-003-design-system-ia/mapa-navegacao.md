# Mapa de navegação

**Status:** Proposta  
**Versão:** 0.1.0

## 1. Rotas conceituais

```text
/
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

As URLs são estáveis, compartilháveis e independentes da navegação usada para
chegar até elas.

## 2. Navegação celular padrão

Os quatro destinos prioritários são derivados do perfil e podem ser configurados.
O quinto item sempre abre o menu completo.

| Perfil     | Item 1 | Item 2       | Item 3      | Item 4     | Item 5 |
| ---------- | ------ | ------------ | ----------- | ---------- | ------ |
| Gerente    | Início | Funil        | Projetos    | Pendências | Mais   |
| Vendedor   | Início | Atividades   | Clientes    | Propostas  | Mais   |
| Financeiro | Início | Receber      | Atrasos     | Fluxo      | Mais   |
| Estoquista | Início | Separações   | Estoque     | Movimentos | Mais   |
| Instalador | Hoje   | Agenda       | Instalações | Pendências | Mais   |
| Engenharia | Início | Fila técnica | Projetos    | Pendências | Mais   |

O administrador pode usar o padrão do gerente. Todos continuam acessando áreas
autorizadas pelo item `Mais`.

## 3. Contexto do projeto

Ao abrir um projeto, todas as áreas trabalham sobre o mesmo identificador:

```text
Projeto MS-2026-000123
├── Resumo
├── Comercial
├── Contrato
├── Financeiro
├── Engenharia
├── Materiais
├── Instalação
├── Documentos
└── Histórico
```

Não serão criados registros paralelos apenas para preencher cada aba. Cada aba
consulta o módulo responsável e apresenta o contexto comum do projeto.

## 4. Próxima ação

Toda página de oportunidade ou projeto mostra:

- etapa atual;
- responsável atual;
- próxima ação recomendada;
- data/prazo;
- bloqueios;
- últimas atividades.

Isso substitui a necessidade de navegar por várias abas para descobrir por que o
processo não avançou.

## 5. Regras de deep link

- Links abrem diretamente a entidade quando o usuário possui acesso.
- Sem acesso, exibem estado 403 com alternativa segura.
- Não autenticado, o usuário retorna ao destino após login válido.
- Entidade inexistente e entidade sem permissão não devem vazar informações além
  da política de segurança adotada.
- Notificações futuras devem apontar para a ação ou pendência específica.
