# Definition of Done

Uma entrega só está concluída quando todos os itens aplicáveis abaixo forem
atendidos.

## Produto e domínio

- critério de aceite da SPEC demonstrado;
- regra implementada na API ou pacote de negócio, não somente na interface;
- estados e transições inválidas cobertos;
- efeito na esteira e próximos gates verificados;
- textos de erro orientam a correção.

## Dados

- migração criada, revisada e testada em banco limpo e banco já populado;
- transação cobre efeitos atômicos;
- concorrência e idempotência avaliadas;
- auditoria criada para ações relevantes;
- exclusão e retenção seguem a política do domínio;
- nenhum dado depende de armazenamento local do aparelho.

## Segurança

- autenticação e autorização testadas na API;
- cenário negativo de permissão incluído;
- entrada validada e saída sem dados indevidos;
- segredo ou dado pessoal não aparece em logs;
- upload e download possuem autorização contextual.

## Qualidade

- lint, typecheck, testes e build passam;
- regras puras possuem testes unitários;
- caso de uso possui teste de integração com PostgreSQL;
- jornada crítica possui teste de ponta a ponta;
- erros externos e retentativas foram considerados;
- código respeita as fronteiras dos módulos.

## Interface

- estados de carregamento, vazio, erro, sucesso e sem permissão;
- teclado, mouse e toque funcionam quando aplicáveis;
- validado em 360, 768, 1024 e 1440 px;
- nenhuma barra ou cartão cobre conteúdo;
- formulário preserva entrada após erro recuperável;
- tabelas possuem adaptação deliberada para celular;
- contraste, foco e rótulos acessíveis verificados.

## Operação

- logs e métricas permitem identificar falha;
- documentação da API e decisão relevante atualizadas;
- variável de ambiente adicionada ao exemplo e validada;
- mudança implantável e reversível com segurança;
- roteiro de demonstração e evidências anexados ao pull request.

## Regra de bloqueio

Uma tela visualmente pronta, uma tabela criada ou um endpoint sem integração não
contam como entrega parcial aceita. Itens incompletos permanecem atrás de feature
flag ou fora da branch principal.
