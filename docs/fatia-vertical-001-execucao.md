# Execução da fatia vertical 001

## Resultado final

Um vendedor autenticado cadastra ou localiza um cliente, registra unidade e
consumo, cria oportunidade, dimensiona o sistema, compõe uma proposta, gera o
PDF e registra o envio. Outro aparelho consulta o mesmo estado persistido.

## Incrementos ordenados

### FV1.1 — Login e contexto

- autenticação web;
- usuário, organização e permissões carregados da API;
- sessão revogável;
- layout base responsivo;
- auditoria de login e logout.

Demonstração: administrador e vendedor entram com acessos diferentes.

### FV1.2 — Cliente e unidade consumidora

- busca antes da criação para reduzir duplicidade;
- pessoa física/jurídica e contatos;
- endereço e CEP;
- unidade consumidora e distribuidora;
- edição concorrente com `version`;
- lista em tabela no desktop e cartões no celular.

Demonstração: cliente criado no notebook aparece no celular após revalidação.

### FV1.3 — Oportunidade e atividade

- oportunidade vinculada ao cliente e unidade;
- origem, responsável e necessidade;
- estado inicial decidido pela API;
- próxima atividade obrigatória;
- histórico de transições e auditoria;
- projeção do funil derivada do estado real.

Demonstração: concluir a atividade altera a projeção; mudar somente um controle
visual não altera o estágio.

### FV1.4 — Conta e histórico de consumo

- upload confirmado em armazenamento de objetos;
- documento autorizado por contexto;
- 12 competências de consumo, com origem e unidade;
- média e validações calculadas no servidor;
- formulário mobile sem perda de dados em erro recuperável.

Demonstração: arquivo e consumos são visíveis aos usuários autorizados.

### FV1.5 — Dimensionamento preliminar

- tarifa e premissas versionadas;
- consumo médio, potência, módulos, inversor e geração estimada;
- sugestão automática explicável e campos editáveis;
- recálculo explícito e snapshot aprovado;
- testes unitários das fórmulas.

Demonstração: alteração de premissa mostra impacto e preserva a versão anterior.

### FV1.6 — Custos e proposta

- catálogo mínimo de materiais e serviços;
- composição e quantidades;
- custo bruto, margem configurada e preço final;
- snapshot de custo e regras aplicadas;
- proposta versionada e válida por 10 dias por padrão configurável;
- transição controlada de rascunho para pronta.

Demonstração: mudança posterior do catálogo não altera proposta pronta.

### FV1.7 — PDF e envio

- geração do orçamento objetivo definido na SPEC-006;
- armazenamento e download autorizado;
- hash e vínculo com a versão da proposta;
- registro de canal, destinatário, data e responsável pelo envio;
- atividade automática de acompanhamento;
- status de oportunidade derivado do envio válido.

Demonstração: PDF baixado em ambos os aparelhos é o mesmo arquivo versionado.

## Casos de teste de ponta a ponta

1. Vendedor conclui a jornada completa em 360 px.
2. Administrador consulta os mesmos dados em 1440 px.
3. Usuário não autorizado recebe `403` mesmo chamando a API diretamente.
4. Duas edições simultâneas geram conflito, não sobrescrita silenciosa.
5. Repetição de comando idempotente não duplica cliente, proposta ou envio.
6. Falha do armazenamento impede marcar documento como persistido.
7. Reinício dos containers mantém todos os registros.
8. PDF antigo permanece inalterado após novo dimensionamento.
9. Funil e atividade mudam na mesma transação do envio.
10. Auditoria permite reconstruir autor e sequência das ações.

## Dados de demonstração

O seed cria organização, usuários por perfil, distribuidora, tarifa fictícia,
catálogo pequeno e um cliente de exemplo. Nenhum dado real ou senha de produção
é incluído.

## Não incluído

- aceite, contrato e assinatura;
- contas a receber e comissão;
- reserva e baixa de estoque;
- engenharia e instalação;
- WhatsApp;
- tempo real por WebSocket;
- aplicativo React Native.

## Gate para avançar

M4 só começa quando a demonstração completa passar em celular, tablet e desktop,
CI estiver verde e não houver defeito crítico de persistência, autorização ou
integridade.
