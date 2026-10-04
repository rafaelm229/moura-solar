# Lote 5 — PoC de extração de contas de energia

Data de preparação: 04/10/2026. Escopo: SPEC-014/IMP-11.

## Estado

O benchmark reproduzível está preparado, mas nenhuma conta foi processada e nenhum serviço externo foi contratado. A execução permanece bloqueada até produto, engenharia e privacidade fornecerem:

- distribuidoras e formatos prioritários;
- corpus autorizado, minimizado e rotulado por duas pessoas;
- metas por campo definidas antes do teste;
- moeda e teto de gasto aprovado;
- conta/região/modelo dos candidatos e decisão sobre retenção temporária.

Esses valores não são inferidos pelo código. O comando recusa corpus sem autorização e revisão de privacidade explícitas. Dados e resultados reais ficam em `poc-data/`, ignorado pelo Git, e o relatório agregado não contém valores extraídos.

## Contrato do experimento

O pacote `@moura-solar/energy-import-poc` recebe três JSONs:

1. manifesto do corpus com IDs anônimos, autorização, formato, qualidade, distribuidora e rótulos canônicos;
2. resultados normalizados do adapter com modelo, versão, região, idioma, latência, páginas cobradas, custo e candidatos com página/origem;
3. política aprovada com orçamento, campos críticos e metas de cobertura/acerto exato.

Adapters implementam `submit`, `poll`, `cancel` e `normalize`, com identidade imutável de modelo/versão/região. Recebem os bytes selecionados pelo harness e um ID de correlação; não aceitam URL arbitrária e não possuem acesso a comandos ou dados operacionais da plataforma.

O relatório calcula cobertura, acerto exato, correções, ausências e candidatos inesperados por campo, distribuidora, formato e qualidade; p50/p95; páginas, custo total e custo por sucesso; taxa de fallback manual e erros críticos. Qualquer distribuidora com menos de 20 documentos resulta em `INCONCLUSIVE`. Metas não atingidas, erro crítico ou custo acima do teto resulta em `STOP` quando a amostra mínima foi atendida.

Valores são comparados após a normalização do adapter. O benchmark não adivinha zeros, unidade, mês, classe ou titular e não descarta conta ilegível/falha. Confiança do fornecedor é opcional e preserva a escala original; não é convertida em porcentagem universal.

## Execução autorizada

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
- Azure Document Intelligence: API [`2024-11-30`](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/analyze-document?view=rest-aiservices-v4.0+%282024-11-30%29) usa POST de análise e GET do resultado; fixar `modelId`, versão e região. [Read/Layout lista português](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support-ocr?preserve-view=true&tabs=read-hand%2Clayout-print%2Cgeneral&view=doc-intel-3.1.0) como candidato a leitura e estrutura, sem presumir especialização em conta de energia brasileira. A política publicada informa retenção temporária de 24 horas e oferece [`Delete Analyze Result`](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/delete-analyze-result?view=rest-aiservices-v4.0+%282024-11-30%29); a execução deve registrar a exclusão antecipada.

Antes da primeira chamada, revisar termos, região, exclusão/retention do resultado e cálculo atual do SKU no console contratual. A referência pública de preço não substitui orçamento aprovado. Não há credenciais ou endpoint de fornecedor neste incremento.

## Próxima evidência

Após receber as decisões, criar adapters experimentais fora do runtime operacional, executar o corpus cego, anexar somente relatório agregado e exemplos anonimizados de falha, registrar exclusão dos temporários e recomendar `CONTINUE` ou `STOP`. A importação integrada do lote 6 não começa a partir de resultado inconclusivo.

## Validação desta preparação

- `pnpm check`: formato, lint, tipos, testes e build aprovados nos nove pacotes do monorepo;
- benchmark: 5 casos aprovados para gates, custo, unidade incorreta, fallback, corpus não autorizado, amostra insuficiente e entrada incompleta;
- nenhum documento, credencial, endpoint privado ou resultado de fornecedor foi incluído;
- nenhuma chamada externa de extração ou cobrança foi realizada.
