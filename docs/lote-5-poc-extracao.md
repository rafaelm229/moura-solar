# Lote 5 — PoC de extração de contas de energia

Data de preparação: 04/10/2026. Escopo: SPEC-014/IMP-11.

## Estado

O benchmark reproduzível está preparado. As decisões operacionais foram registradas em [POC-01](decisao-poc-01-importacao-energia-2026-10-09.md): candidato Azure Document Intelligence Layout, região exigida, corpus de 60 contas, minimização, teto de US$ 25 e critérios de qualidade/benefício. Nenhuma conta foi processada, nenhum serviço externo foi contratado e nenhum gasto foi realizado. A execução permanece bloqueada até existirem:

- export agregado que permita selecionar a distribuidora conforme POC-01;
- corpus autorizado, minimizado e rotulado por duas pessoas, com reconciliação;
- cotação vigente do SKU/modelo em Brazil South e revisão de privacidade dos termos da conta;
- manifesto, política e plano de execução que passem no preflight offline.

As decisões do POC-01 não equivalem a autorização para contratar ou enviar documentos. O comando recusa corpus sem autorização e revisão de privacidade explícitas. Dados e resultados reais ficam em `poc-data/`, ignorado pelo Git, e o relatório agregado não contém valores extraídos.

## Contrato do experimento

O pacote `@moura-solar/energy-import-poc` recebe três JSONs:

1. manifesto do corpus com IDs anônimos, autorização, formato, qualidade, distribuidora e rótulos canônicos;
2. resultados normalizados do adapter com modelo, versão, região, idioma, latência, páginas cobradas, custo e candidatos com página/origem;
3. política aprovada com orçamento, campos críticos e metas de cobertura/acerto exato.

Adapters implementam `estimateUsage`, `submit`, `poll`, `cancel` e `normalize`, com identidade imutável de modelo/versão/região. Recebem os bytes selecionados pelo harness e um ID de correlação sem dados pessoais; não aceitam URL arbitrária e não possuem acesso a comandos ou dados operacionais da plataforma.

O executor confere o SHA-256 e o limite de 20 MiB antes de transmitir cada documento. A execução é serial e consulta a estimativa por página antes de cada envio; quando a próxima operação ultrapassaria o teto aprovado, ela e as restantes seguem para revisão manual sem chamada externa. Um envio aceito que expira, uma falha de rede durante o envio ou uma resposta cujo custo não pode ser confirmado produz `UNKNOWN`, tenta excluir o resultado remoto e interrompe novos envios. Isso evita repetir uma operação possivelmente cobrada. Erros locais anteriores ao envio permanecem `FAILED`.

O relatório calcula cobertura, acerto exato e taxa de correção por campo, distribuidora, formato e qualidade; cobertura de meses históricos por ocorrência esperada; ausências e candidatos inesperados; p50/p95; páginas, custo total e custo por sucesso; taxa de fallback manual e erros críticos. O POC-01 fixa 60 documentos de uma distribuidora, 20 por formato. A regra histórica do harness que exige ao menos 20 documentos por distribuidora continua válida, mas não substitui esse desenho. Metas não atingidas, erro crítico ou custo acima do teto resulta em `STOP` quando a amostra mínima foi atendida; campos com menos de 30 ocorrências esperadas têm resultado inconclusivo conforme POC-01.

Valores são comparados após a normalização do adapter. Uma fronteira de runtime aceita somente campos do schema, limita quantidade/tamanho, valida página, mês, chave única e rejeita propriedades adicionais. Texto extraído permanece texto opaco mesmo quando contém instruções ou comandos. O benchmark não adivinha zeros, unidade, mês, classe ou titular e não descarta conta ilegível/falha. Confiança do fornecedor é opcional e preserva valor e escala originais; quando ausente, continua ausente e não é convertida em porcentagem universal.

## Execução autorizada

Antes de habilitar credenciais, executar o preflight offline sobre os mesmos arquivos que serão enviados:

```bash
mkdir -p poc-data/results
pnpm --filter @moura-solar/energy-import-poc preflight -- \
  --manifest poc-data/corpus.json \
  --policy poc-data/policy.json \
  --plan poc-data/execution-plan.json \
  --documents poc-data/documents \
  --output poc-data/results/preflight.json
```

O plano registra adapter/modelo/versão/região/idioma, moeda, preço estimado por página, custo fixo, SKU, data da cotação e a revisão de privacidade do fornecedor com região e procedimento de exclusão. O comando não possui integração de rede. Ele lê todos os arquivos, confere hash e tamanho, calcula custo completo e bloqueia amostra repetida, menos de 20 documentos por distribuidora ou estimativa acima do teto. O relatório contém somente contagens, custo e digests do manifesto, política e plano; a saída usa permissão privada e não sobrescreve evidência anterior. Um resultado `BLOCKED` é gravado e encerra com código 2.

Somente após um preflight `READY`, executar o adapter autorizado para produzir o arquivo de runs no schema v2. O executor recusa manifesto, política, plano ou identidade do adapter diferentes dos digests aprovados, valida novamente o preço estimado por página e reserva o custo fixo antes da primeira submissão. O benchmark soma esse custo fixo aos custos retornados por documento. O benchmark agregado continua separado:

```bash
mkdir -p poc-data/results
pnpm --filter @moura-solar/energy-import-poc benchmark -- \
  --manifest poc-data/corpus.json \
  --runs poc-data/results/azure-layout-2024-11-30.json \
  --policy poc-data/policy.json \
  --output poc-data/results/azure-layout-report.json
```

O arquivo de saída é criado com permissão privada e o comando falha se o caminho já existir, evitando sobrescrita silenciosa. Manter manifesto/rótulos separados do conjunto usado para ajuste do adapter. Registrar hashes dos arquivos fora do repositório protegido e executar cada candidato sobre exatamente o mesmo conjunto cego.

## Candidatos revalidados

- Google Document AI: [`batchProcess`](https://docs.cloud.google.com/document-ai/docs/send-request) devolve operação assíncrona e grava resultado em Cloud Storage; fixar processor version e região. A [lista de processadores](https://docs.cloud.google.com/document-ai/docs/processors-list) inclui português no OCR, mas mantém o Custom Extractor generativo com suporte oficial apenas em inglês. Não tratar OCR em português como prova de extração estruturada. A [documentação de segurança](https://docs.cloud.google.com/document-ai/docs/security) informa o tratamento temporário do batch e deve ser confrontada com os termos da conta/região escolhida.
- Azure Document Intelligence: API [`2024-11-30`](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0+%282024-11-30%29) usa POST de análise e GET do resultado; fixar `modelId`, versão e região. O adapter candidato restringe chamadas a endpoint HTTPS `*.cognitiveservices.azure.com`, envia somente `base64Source`, valida a URL de operação devolvida e executa exclusão antecipada em melhor esforço. [Read/Layout lista português](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support-ocr?preserve-view=true&tabs=read-hand%2Clayout-print%2Cgeneral&view=doc-intel-3.1.0) como candidato a leitura e estrutura, sem presumir especialização em conta de energia brasileira. A política publicada informa retenção temporária de 24 horas e oferece [`Delete Analyze Result`](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/delete-analyze-result?view=rest-aiservices-v4.0+%282024-11-30%29); a execução deve registrar a exclusão antecipada.

O custo produzido pelo adapter Azure é uma estimativa baseada no valor por página aprovado na configuração, não uma medição de faturamento do fornecedor. Antes da primeira chamada, revisar termos, região, exclusão/retenção do resultado e cálculo atual do SKU no console contratual. A referência pública de preço não substitui orçamento aprovado. Depois da execução, reconciliar páginas e custo estimado com o faturamento. Não há credenciais ou endpoint privado de fornecedor neste incremento.

## Próxima evidência

Após desbloquear os itens do POC-01, preparar o adapter experimental fora do runtime operacional, executar o corpus cego, anexar somente relatório agregado e exemplos anonimizados de falha, registrar exclusão dos temporários e recomendar `CONTINUE` ou `STOP`. A importação integrada do lote 6 não começa a partir de resultado inconclusivo.

## Validação desta preparação

- `pnpm check`: formato, lint, tipos, testes e build aprovados nos nove pacotes do monorepo;
- preflight, normalização, benchmark e executor: validação automatizada existente para gates, custo fixo e por página, vínculo dos digests, schema permitido, instrução maliciosa como texto, confidence ausente, unidade incorreta, fallback, resultado desconhecido, corpus não autorizado, amostra insuficiente, repetição do corpus, entrada incompleta, integridade dos bytes, teto preventivo e interrupção após operação ambígua; o relatório agora inclui taxa de correção e cobertura de meses históricos;
- adapter Azure: transporte exercitado somente com HTTP simulado, incluindo host fixo, corpo `base64Source`, consulta, custo estimado e rejeição de redirecionamento;
- nenhum documento, credencial, endpoint privado ou resultado de fornecedor foi incluído;
- nenhuma chamada externa de extração ou cobrança foi realizada.
