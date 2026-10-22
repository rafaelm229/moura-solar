# Lote 4 — Correções de persistência e dossiê

Data: 03/10/2026. Base revisada: `42455f7`, sobre a implementação `3b3848f`.
Branch: `fix/lote-4-dossie-persistencia`. Escopo: SPEC-013 e regressão dos domínios existentes.

## Resultado e contrato implementado

Novos arquivos nunca caem para disco local. PUT privado condicional impede sobrescrita; leitura posterior confere tamanho e SHA-256. A intenção, a referência física esperada e a chave de idempotência existem no PostgreSQL antes do PUT. Queda depois do objeto e antes do commit deixa uma referência recuperável. A interface permite retomar uma intenção pendente existente, inclusive após trocar de dispositivo, sem criar outro documento. O hash faz parte da chave privada final; não há URL gravável pelo navegador.

O fluxo compatível usa base64 apenas em trânsito pela API autenticada; não armazena bytes no PostgreSQL. JSON aceita até 29 MiB para comportar um original de 20 MiB. A decodificação valida tamanho e base64 canônico sem regex recursiva, com teste no limite de 20 MiB. PDF/PNG/JPEG são permitidos; DOCX/WebP genéricos foram retirados. A API confere tamanho/hash declarados, assinatura, estrutura PNG/JPEG e PDF pelo Poppler (`pdfinfo`, timeout de 5 segundos). PDFs ativos/protegidos, mais de 50 páginas e payload após EOF são rejeitados. ClamAV INSTREAM é obrigatório, com timeout; sua versão é persistida. Scanner indisponível mantém QUARANTINED, sem download comum. A validação é síncrona e serializada por intenção; não foi declarado um worker OCR ou uma fila externa pronta.

`Idempotency-Key` (8–100 caracteres alfanuméricos, hífen ou sublinhado) é obrigatório nos comandos de upload, conclusão, substituição, cancelamento, arquivamento, reconciliação e representante. Escopo: organização/ator/operação. JSON canônico fixa o fingerprint. Mesma chave/conteúdo reutiliza a intenção; conteúdo diferente retorna 409. Retentativa revalida os grants. Arquivamento/substituição usam `expectedVersion` dos metadados; conclusão/cancelamento usam o número da versão documental. Lock transacional PostgreSQL e transações serializáveis tratam disputas, com retentativas limitadas de serialização.

A listagem mantém o array existente. Todos os filtros também se aplicam à projeção M4/M5. `contentUrl` aponta para bytes da versão exata, nunca gera ou seleciona implicitamente o documento atual. Projeções exigem permissão de leitura do domínio de origem, e downloads revalidam sua permissão. Propostas/contratos permanecem nos modelos proprietários, sem duplicação de bytes ou autoridade.

A autorização usa grants efetivos. Grants organizacionais operam no tenant; `own` exige oportunidade do usuário; `assigned`/`team` permite apenas categorias fotográficas de OS atribuída ao usuário/equipe. Escopos sem relação implementada permanecem negados. Identidade, societário, representação e dados de representantes exigem `documents:identity_read`. Esta capacidade está no catálogo e no administrador de organizações novas; organizações existentes devem concedê-la explicitamente por gestão de papéis, após a revisão de acesso. Não houve ampliação automática dos seus grants.

Cliente, UC, oportunidade, projeto, contrato, representante e OS são validados no comando transacional, incluindo compatibilidade de contexto. Triggers reforçam organização/proprietário dos vínculos e impedem reassociação de pais usados por evidências. Exclusão de pais/versões vinculados é RESTRICT. Objetos verificados e versões READY possuem metadados físicos imutáveis.

Upload/intenção, verificação, falhas, substituição, cancelamento, migração e arquivamento geram auditoria. Motivo de arquivamento fica no documento; acesso registra ATTEMPT antes da leitura e SUCCESS somente após conferir bytes/hash; falhas registram ERROR e versão MISSING. Tentativas fora do contexto registram DENIED. Logs de erro não serializam exceções Prisma ou dados do comando.

## Operação e rollback

1. Subir PostgreSQL, MinIO e ClamAV (`docker compose up -d clamav` para acrescentar o scanner ao ambiente local). Instalar Poppler; o Dockerfile inclui `poppler-utils`. Configurar `S3_BACKEND`, `CLAMD_HOST` e `CLAMD_PORT` conforme `.env.example`. A ausência do scanner não libera arquivos.
2. Aplicar migrations versionadas com `pnpm db:deploy`, após backup conjunto do banco e objetos. A migration de correção é aditiva e preserva IDs, hashes e arquivos. READY/CLEAN antigos, criados sem scanner, passam a QUARANTINED/UNCHECKED.
3. Reconciliar uma intenção por `POST /api/v1/document-uploads/:versionId/reconcile`, com sessão e CSRF válidos e `documents:upload` no contexto do documento, e `Idempotency-Key`. Reconciliar READY também verifica a persistência atual. O comando é repetível e usa o lock da intenção. Esta versão oferece reconciliação explícita autenticada; agendamento operacional automático não está liberado.
4. LEGACY_LOCAL só é lido quando explicitamente identificado no novo dossiê. A reconciliação confere os bytes, escaneia e copia para S3/MinIO, criando um novo StoredObject e preservando o registro original. Nunca promove legado local como persistência durável. Documentos M4/M5 anteriores continuam com leitor compatível e hash, exigindo inventário físico antes de sua migração.
5. Não há exclusão física, limpeza automática de órfãos ou expurgo nesta correção. Objetos sem referência são preservados. Uma falha depois do PUT pode ser recuperada pela chave persistida; não remover objetos ao reverter a UI ou antes de conferir referências.
6. Rollback: desabilitar novos uploads/UI pela reversão do incremento de aplicação, conservar migrations e objetos. Não reverter a correção de armazenamento para fallback silencioso nem usar downgrade destrutivo. Retomar leitura segura após corrigir o backend/scanner e reconciliar as intenções.

Backup deve abranger `pg_dump` consistente, cópia privada dos objetos, manifesto de IDs/hash/tamanho e configuração protegida. A integração restaura um dump real em schema novo e cópia de objetos em bucket novo, conserva IDs/arquivamento e confere download autenticado, negação sem sessão e hashes. É uma evidência de restauração do corpus sintético, não medição de RPO/RTO de produção. Hold/retention/tombstones não são presumidos; nenhum expurgo é habilitado antes da política aprovada.

## Demonstração

1. Entrar como administrador e abrir um cliente → Novo Documento. Enviar PDF falso: erro acessível e campos preservados.
2. Enviar PDF/PNG/JPEG sintético válido: arquivo só fica disponível após persistência/hash/parser/ClamAV. Baixar em outra sessão/dispositivo e conferir o SHA.
3. Abrir Histórico; substituir o arquivo; conferir que versões 1 e 2 continuam baixáveis e que o número de metadados mudou.
4. Arquivar com motivo: histórico permanece acessível. Repetir comando idempotente e simular versão obsoleta: uma alteração e conflito explícito.
5. Atribuir OS a instalador: categoria/contexto de upload vem da API; galeria autorizada não concede leitura de identidade. Remover a atribuição e repetir acesso: negado.
6. Indisponibilizar S3/scanner apenas no ambiente isolado: nunca obter READY falso. Reiniciar API, reconciliar e conferir a mesma intenção.
7. Executar a restauração sintética e as migrations em schemas vazios e na versão anterior populada, sem alterar os schemas operacionais.

## Evidências

- `pnpm check`: formato, lint, typecheck, testes e build aprovados. API: 1208 testes; frontend: testes aprovados.
- `pnpm test:integration`: 88/88 aprovados (55,2 segundos), incluindo 14 casos do dossiê, scanner e MinIO reais, concorrência/idempotência, falha após PUT, permissões negativas, histórico M4/M5, migração do legado e restore com manifesto/hash.
- `pnpm api:generate`: contrato e cliente regenerados conforme os DTOs atuais.
- `pnpm test:e2e`: 29/29 jornadas aprovadas em conjunto (2,2 minutos). Inclui os oito cenários do dossiê em 320, 360, 390, 768, 1024, 1366, 1440 e 1920 px, retomada após refresh, teclado, histórico, substituição e leitura em segunda sessão.
- `pnpm test:migrations`: atualização da fundação até SPEC-013 e migração aditiva do dossiê aprovadas; schemas vazios e anteriores com dados; reaplicação segura.
- `vitest run test/dossier-content.spec.ts`: 6/6, incluindo limite de 20 MiB e base64 malformado.
- Capturas finais: [360 px](evidencias/lote-4-correcoes/dossie-360.png), [768 px](evidencias/lote-4-correcoes/dossie-768.png), [1024 px](evidencias/lote-4-correcoes/dossie-1024.png) e [1440 px](evidencias/lote-4-correcoes/dossie-1440.png). Inspeção visual de celular e desktop realizada nesta revisão.

A regressão também atualiza seletores dos testes M3/M4/M5 após a troca de emojis por ícones e percorre o menu “Mais” nos testes de identidade móvel. Arquivos de outros módulos receberam apenas a formatação exigida por `pnpm check`.

Os testes usam schemas UUID exclusivos e buckets de fixtures sintéticas; não redefinem bancos/volumes existentes. As imagens de demonstração não representam dados reais nem aprovação visual humana.

## Limites de liberação

Continuam pendentes as decisões operacionais já declaradas na SPEC-013/plano: matriz final de categorias e grants, finalidade/retenção/hold/expurgo, RPO/RTO, quotas e inventário do legado M4/M5. A aprovação destes temas e da apresentação visual cabe aos responsáveis indicados no plano. Não foi liberado armazenamento produtivo de documentos reais nem iniciada a PoC paga do lote 5.
