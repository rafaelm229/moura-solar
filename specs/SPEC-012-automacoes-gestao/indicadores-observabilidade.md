# Indicadores, alertas e observabilidade

## Dicionário obrigatório

Cada indicador publicado precisa declarar:

- nome e finalidade;
- fórmula e unidade;
- eventos ou tabelas de origem;
- data de competência e fuso;
- dimensões e filtros permitidos;
- política para cancelamentos, exclusão lógica e revisões;
- frequência e última atualização;
- responsável funcional.

Sem essas informações, o número é exploratório e não pode ser apresentado como
indicador oficial.

## Indicadores prioritários

### Comercial

- conversão entre etapas reais da esteira;
- tempo mediano por etapa e ciclo total;
- propostas aceitas, recusadas e vencidas;
- ticket, desconto e margem prevista;
- conversão por origem, vendedor, região e tipo de projeto;
- motivos de perda normalizados.

### Financeiro

- saldo a receber, recebido e vencido por competência;
- aging da inadimplência;
- fluxo previsto e realizado;
- margem prevista versus realizada por projeto;
- comissão provisionada, liberada e paga.

### Operação

- disponibilidade e cobertura de estoque;
- reservas sem saldo e tempo de reposição;
- compras atrasadas e variação do custo;
- instalações planejadas, concluídas e reagendadas;
- retrabalho, perdas e materiais adicionais.

### Pós-venda

- primeira resposta e resolução por prioridade;
- percentual dentro do SLA;
- reincidência por projeto/equipamento;
- visitas cobradas, garantia e cortesia;
- alertas de conectividade e desempenho;
- satisfação após encerramento.

## Semântica de funil

O funil é derivado do estado atual e do histórico de transições da oportunidade.
Alterações em proposta, contrato, financeiro, engenharia e instalação atualizam
o estágio apenas quando os gates da SPEC-001 forem satisfeitos. Uma seleção de
interface isolada nunca move a oportunidade.

Conversão usa coortes e período definidos. O sistema não mistura, sem aviso,
oportunidades criadas no período com oportunidades encerradas no período.

## Saúde técnica

### Sinais dourados

- latência por rota e percentis;
- volume de requisições e jobs;
- taxa de erros por código e módulo;
- saturação de CPU, memória, conexões de banco, disco e filas.

### Sinais de negócio

- eventos de domínio parados na outbox;
- projeções atrasadas em relação ao watermark;
- documentos que não foram gerados;
- reservas ou baixas inconsistentes;
- notificações obrigatórias sem entrega;
- automações repetindo falha.

## Correlação

Uma ação recebe `requestId`; o fluxo completo recebe `traceId`; cada evento,
job e entrega mantém esses identificadores. Assim, é possível partir de um erro
visto pelo usuário e localizar API, transação, evento, worker e integração.

## Alertas operacionais

- Severidade crítica exige indisponibilidade ampla, risco de dados, segurança ou
  bloqueio financeiro/operacional relevante.
- Severidade alta afeta uma função central sem alternativa segura.
- Média indica degradação ou atraso recuperável.
- Baixa é informativa e deve ser agrupada.

Todo alerta técnico tem dono, roteiro de resposta, janela, condição de resolução
e pós-incidente quando necessário. Alarmes sem ação definida não devem paginar a
equipe.

## Ambientes e dados

- Produção não compartilha banco, bucket, chaves ou fila com homologação.
- Dados pessoais de produção não são copiados para desenvolvimento.
- Seeds e fábricas geram dados fictícios consistentes.
- Migrações são testadas em cópia anonimizada ou estrutura equivalente.
- Deploy registra versão da aplicação e migrações aplicadas.

## Backup e recuperação

- Política define RPO e RTO aprovados pelo negócio.
- PostgreSQL e objetos precisam de backup compatível entre si.
- Restaurações são ensaiadas e registradas periodicamente.
- Exclusão acidental, corrupção e perda de região possuem roteiros distintos.

## Validação

- Testes unitários para fórmulas e regras.
- Testes de contrato para eventos e integrações.
- Testes de idempotência e concorrência.
- Testes de reconstrução das projeções.
- Testes de autorização dos dashboards e exportações.
- Testes de caos controlado para indisponibilidade de e-mail, armazenamento,
  fila e serviços externos.
