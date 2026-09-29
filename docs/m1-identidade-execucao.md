# M1 — diagnóstico e execução

## Inspeção inicial (29/09/2026)

- `main` limpa, em `60eea97` (`chore: bootstrap Moura Solar platform monorepo`).
- Branch de trabalho criada: `feat/m1-identidade-permissoes`.
- Stack existente: pnpm 11.25.0/Turborepo, Next.js, NestJS, Prisma/PostgreSQL 17,
  Compose, MinIO, contratos de health/erro e pacote de tokens.
- Uma migration versionada cria organizações. Nenhum modelo de identidade existe.
- Três testes unitários de health/apresentação; pacotes restantes não têm testes.
- Não há CI, OpenAPI, cliente gerado, seed ou testes de integração/E2E.
- Não havia `.env.example`, `.gitignore`, `.dockerignore` ou configuração Prettier.
- Tokens existentes ainda não correspondem integralmente aos tokens semânticos da SPEC-003.
- Health de prontidão consulta PostgreSQL; não verifica armazenamento S3.
- Pino consta como dependência, mas o bootstrap não configura logs estruturados.
- Nenhum container deste Compose estava em execução durante a inspeção.

**Conclusão:** M0 é um bootstrap parcial; a presença dos pacotes não comprova seus
critérios de saída. Build local não substitui validação de Compose, migrations e CI.

## Correções preparatórias

- `AGENTS.md` registra regras permanentes, escopo e fluxo Git.
- Exemplo de ambiente e exclusões para segredos/dependências/artefatos adicionados.
- Prettier configurado conforme estilo existente.
- Lint passa a compilar dependências antes de consumir contratos compartilhados.
- pnpm local não estava no PATH e Corepack 0.24.0 falhou ao executar pnpm 11.
  Para esta inspeção foi usado launcher temporário em `/tmp/moura-solar-tools`,
  executando o pnpm 11.25.0 já presente no cache. Nenhum downgrade do lockfile.

## Incrementos planejados

1. Completar fundação verificável: CI, migrations em banco isolado, contratos
   OpenAPI/cliente gerado, configuração e execução reproduzível.
2. Fechar a matriz completa de permissões e escopos antes de implementá-la;
   proposta em `specs/SPEC-002-identidade-permissoes/matriz-proposta.md`.
3. Persistir organização, usuário, vínculo, equipe, papel, permissões e auditoria,
   com migration versionada e bootstrap seguro do administrador inicial.
4. Implementar login, cookies HttpOnly, proteção CSRF, access token curto, refresh
   rotativo, detecção de reutilização e revogação por aparelho.
5. Entregar convites e recuperação por links de uso único, mediados pelo
   administrador, bloqueio de usuário e administração auditada de papéis.
6. Integrar web responsiva, consultas remotas, renovação coordenada e distinção
   entre indisponibilidade, sessão inválida e falta de permissão.
7. Validar testes com PostgreSQL, isolamento organizacional, matriz positiva e
   negativa, concorrência, idempotência e E2E em viewports suportados.
8. Executar `pnpm check` antes de cada commit relevante; enviar branch e abrir PR
   apenas após validar o M1, com roteiro e evidências da Definition of Done.

## Decisões recebidas e pendência

O usuário decidiu que convites e recuperação serão mediados pelo administrador.
Também determinou definir agora a matriz completa, sem adiar escopos para M2.
A matriz completa foi aprovada na conversa de 29/09/2026 e incorporada ao catálogo
de permissões. Isso não aprova gates ou alçadas pendentes das SPECs futuras.

A implementação prosseguiu após essas decisões. Migrations e testes usam bancos
ou schemas isolados. Nenhum dado dos ambientes anteriores foi alterado.

Consulte `docs/m1-operacao.md` para configuração, demonstração e validação.

## Resultado da implementação

M1 implementado com API, persistência, web responsiva e testes. As lacunas de M0
necessárias ao marco foram tratadas: configuração, comandos Prisma, build, seed,
OpenAPI/cliente gerado, logs, integração real e workflow de CI. Compose validado em
projeto isolado; os ambientes anteriores permaneceram intactos.

Resultados detalhados em `docs/evidencias/m1/README.md`. A execução remota de CI
é verificada no PR, separadamente dos resultados locais.
