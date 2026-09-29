# Checklist e operação de campo

**Status:** Estrutura proposta para validação com instaladores

## 1. Checklist versionado

Template define:

- tipo de projeto/equipamento;
- versão e vigência;
- seções;
- itens;
- tipo de resposta;
- obrigatoriedade;
- evidência exigida;
- condição de exibição;
- bloqueio ou aviso;
- responsável pela resposta/aprovação.

Uma ordem de serviço congela a versão do checklist. Alterar o template não muda
ordens em andamento.

## 2. Tipos de resposta

```text
CHECK
YES_NO_NOT_APPLICABLE
TEXT
NUMBER_WITH_UNIT
PHOTO
MULTI_PHOTO
SERIAL
QR_BARCODE
SIGNATURE
DATE_TIME
SELECT
MEASUREMENT
```

## 3. Seções iniciais

### Preparação

- equipe confirmada;
- ordem e contato;
- materiais separados;
- ferramentas;
- EPIs;
- veículo;
- riscos/instruções.

### Chegada e segurança

- cliente/responsável presente;
- acesso autorizado;
- condições climáticas;
- análise de risco;
- isolamento/sinalização;
- condição do telhado/local;
- fotos antes.

### Equipamentos e materiais

- módulos;
- inversores;
- baterias quando aplicável;
- estruturas;
- cabos/conectores;
- proteções;
- seriais/lotes;
- divergências.

### Execução

- estrutura/fixação;
- módulos;
- cabeamento CC/CA;
- proteções;
- aterramento;
- inversor/baterias;
- identificação/organização;
- fotos durante.

### Comissionamento

- inspeções;
- medições conforme procedimento;
- strings/MPPTs;
- inicialização;
- configuração;
- monitoramento/Wi-Fi;
- alarmes;
- geração inicial quando verificável;
- fotos depois.

### Entrega

- limpeza e organização;
- orientação ao cliente;
- aplicativo/monitoramento explicado;
- responsabilidade sobre mudanças de Wi-Fi explicada;
- materiais conciliados;
- pendências registradas;
- aceite/assinatura.

## 4. Evidências fotográficas

Cada foto registra:

- item/seção;
- autor e instante;
- projeto/ordem;
- etapa;
- arquivo/hash;
- observação;
- geolocalização quando autorizada e necessária;
- status de upload.

O sistema preserva original e pode gerar miniatura. Remoção após envio exige
permissão e histórico.

## 5. Seriais

- leitura por câmera/código quando possível;
- digitação manual com dupla confirmação quando leitura falhar;
- validação contra material separado;
- bloqueio de serial já instalado;
- vínculo com posição/equipamento;
- conferência no relatório.

## 6. Rascunho e sincronização web

- respostas textuais/checks salvam em intervalos e transições de etapa;
- fila de upload não marca foto como confirmada antes da API;
- repetição de envio usa idempotência;
- fechar navegador com alterações pendentes exibe aviso;
- ao retomar, o servidor é comparado com rascunho recuperável;
- conflito mostra escolhas seguras, não sobrescreve silenciosamente.

## 7. Conclusão

Antes do comando final, mostrar resumo:

- itens obrigatórios concluídos/pendentes;
- fotos confirmadas/pendentes;
- seriais;
- materiais;
- testes;
- bloqueios;
- assinatura;
- pendências declaradas.

Somente a API decide se pode concluir.

## 8. Relatório de exceções

Item marcado como não conforme exige:

- categoria/severidade;
- descrição;
- foto quando aplicável;
- ação imediata;
- responsável;
- prazo;
- decisão de pausar ou continuar;
- aprovação quando necessária.

## 9. Testes de usabilidade

- uso com uma mão em tela de 360 px;
- câmera e retorno ao mesmo item;
- teclado aberto;
- luz externa/contraste;
- conexão lenta e queda durante upload;
- 50+ itens sem perda de contexto;
- leitura repetida de serial;
- rotação de tela;
- retomada após fechar navegador;
- tablet e desktop para conferência.
