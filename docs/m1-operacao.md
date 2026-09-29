# M1 — identidade, equipe, sessões e permissões

## Escopo implementado

Identidade e vínculos organizacionais persistidos no PostgreSQL; sete papéis
iniciais editáveis e catálogo da matriz aprovada; equipes explícitas; bootstrap,
login, logout, renovação, convites, recuperação mediada, bloqueio e sessões por
aparelho. A API protege todos os endpoints por padrão. Health, login, bootstrap,
refresh e consumo de link são as exceções públicas explícitas.

A matriz em `specs/SPEC-002-identidade-permissoes/matriz-proposta.md` foi aprovada
pelo usuário em 29/09/2026. Sua implementação não inclui comandos dos módulos M2–M9.
As permissões futuras são catálogo: cada módulo deverá aplicar os escopos ao
carregar registros, listar, exportar e decidir transições. `identity.policy.ts`
fornece a regra pura para contextos de recursos obtidos pelo servidor.

## Primeiro acesso

1. Copie `.env.example` para `.env`.
2. Gere valores distintos com `openssl rand -hex 32` para `BOOTSTRAP_TOKEN` e
   `IDENTITY_LINK_SECRET`. Não coloque segredos no Git.
3. Execute `docker compose up -d --build` e confira `docker compose ps`.
4. Na máquina de desenvolvimento com Node 22 e pnpm 11.25.0, execute
   `pnpm identity:bootstrap`. O prompt solicita nome, e-mail, organização e senha;
   a senha não é exibida. O script chama a API, sem escrever diretamente no banco.
5. Abra `http://localhost:3000`, entre e use **Pessoas → Gerar convite**.
6. Entregue o link diretamente à pessoa. O link não é enviado por e-mail ou WhatsApp.

O bootstrap exige segredo e banco sem organização inicializada. Ele fecha após
sucesso; uma tentativa adicional não cria outra organização. Se o banco já contém
organizações sem usuários de uma importação, será necessário um procedimento
específico de vinculação; o bootstrap não toma posse silenciosamente desses dados.

Para seed fictícia em banco novo e API local: defina `SEED_PASSWORD` no ambiente e
execute `pnpm db:seed`. O seed cria sete perfis com endereços `example.test`, usando
somente a API. A senha não possui valor padrão. O comando recusa produção e
endereços remotos e não é reaplicado sobre uma organização já inicializada.

## Política técnica de acesso

- Senhas: scrypt com salt aleatório, N=32768, r=8, p=1; 12–128 caracteres.
- Access token opaco aleatório: 15 minutos. Refresh: validade absoluta de 30 dias.
- Tokens de sessão são armazenados como SHA-256, nunca em texto no banco.
- Cookie `ms_access`: HttpOnly, SameSite=Strict, path `/api/v1`.
- Cookie `ms_refresh`: HttpOnly, SameSite=Strict, path `/api/v1/identity`.
- `COOKIE_SECURE=true` é obrigatório na configuração de ambientes HTTPS.
- Toda mutação exige Origin igual a `WEB_ORIGIN` e `X-Requested-With: MouraSolar`.
- Refresh rotativo: cada token consumido é marcado. Reuso revoga a sessão inteira.
- A web coordena refresh por Promise e Web Locks entre abas quando disponíveis.
  Navegadores sem Web Locks coordenam apenas as chamadas da própria aba.
- Login: até 10 tentativas por e-mail e 60 por endereço em 15 minutos, com contadores
  compartilhados no PostgreSQL. O endereço vem da conexão; sem confiança automática
  em cabeçalhos de proxy. Ajustar proxy confiável antes de implantação pública.
- Convite: 24 horas. Recuperação: 1 hora. Uso único, armazenado como hash.
- Links usam fragmento de URL para evitar envio no caminho/Referer do servidor.
- `IDENTITY_LINK_SECRET` permite reentrega idempotente do mesmo link sem persistir
  o token bruto. Rotacioná-lo invalida a reentrega determinística de comandos antigos;
  emita novos links após rotação.
- Recuperação invalida links restantes, altera senha e revoga todas as sessões na
  mesma transação. Administrador não escolhe a senha do usuário.
- Bloqueio e alteração de papel revogam sessões. Alterar permissões de um papel
  revoga as sessões de seus membros. O último administrador é protegido.
- Nomes de aparelhos são descrições indicativas do navegador, não prova de identidade.

## Integridade e auditoria

Comandos administrativos usam `Idempotency-Key`, persistem resultado e fingerprint
na mesma transação que a mutação e a auditoria. Uma chave reapresentada com outro
conteúdo gera `409`. Links retornam o mesmo token para o mesmo comando autorizado.
Edição de pessoa, papel ou equipe exige `version`; concorrência gera `409`.

Transações serializáveis fazem retentativa limitada de conflito. Eventos de
auditoria não aceitam UPDATE/DELETE devido a trigger no PostgreSQL. Consultas da
web exibem os últimos 100 eventos permitidos; escopos de domínio não expõem eventos
administrativos de identidade. Logs HTTP contêm referência, método, status e
latência, sem bodies, cookies, senha, token, e-mail ou URL com dados pessoais.

Não há exclusão física de usuários nem rotina automática de expurgo. Política de
retenção de auditoria, hashes históricos e idempotência deve ser definida antes de
expurgar registros; remover hashes de refresh ativos impediria detectar reuso.

## Contrato e desenvolvimento

- OpenAPI: `http://localhost:3001/api/v1/docs`.
- Fonte gerada: `packages/api-client/openapi.json` e `src/schema.d.ts`.
- Atualização: `pnpm api:generate`. O CI rejeita divergência do contrato versionado.
- Cliente web usa openapi-fetch sobre o schema gerado; não duplica DTOs manualmente.
- Next.js encaminha `/api/v1` para a API. `API_INTERNAL_URL` integra o hash de build
  do Turborepo e no Docker aponta para `http://api:3001/api/v1`.
- Desenvolvimento local: `pnpm install --frozen-lockfile`, `pnpm db:generate`,
  `pnpm db:deploy` com `DATABASE_URL` local configurada, depois `pnpm dev`.
- O API lê `.env` local ou a raiz do repositório; scripts Prisma precisam receber
  `DATABASE_URL` no ambiente quando executados fora do Compose.

## Validação reproduzível

```bash
pnpm check
pnpm api:generate
# O diff de packages/api-client deve permanecer vazio após commit.
pnpm test:migrations
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
```

Defina `TEST_DATABASE_URL` para um PostgreSQL de testes. O padrão local usa a porta
55439 e banco `moura_m1_test`. Os testes criam schemas exclusivos com UUID, aplicam
migrations e removem somente seus próprios schemas. Nunca apontar testes para
produção. E2E usa portas 3318 (API) e 3320 (web); integração usa 3319.

Execute build/check e E2E sequencialmente: `next build` e `next dev` compartilham
`.next`. O CI executa os estágios nessa ordem. Relatórios e capturas ficam em
`playwright-report/` e `test-results/`, ignorados pelo Git e publicados como
artefatos pelo workflow.

## Roteiro de aceite

1. Administrador entra e cria convite de vendedor.
2. Outro aparelho abre o link, define senha e entra.
3. Vendedor consulta suas sessões; menus administrativos não aparecem.
4. Chamada direta do vendedor à equipe recebe `403` sem persistir alterações.
5. Administrador visualiza e revoga uma sessão do vendedor.
6. Recuperação por novo link altera senha e encerra todas as sessões anteriores.
7. Duas edições com a mesma versão geram um sucesso e um conflito.
8. Tentativa de bloquear o último administrador é rejeitada sem efeitos parciais.
9. Falha temporária da API mostra erro recuperável e preserva autenticação.
10. Validar os fluxos em 360, 390, 768, 1024, 1366 e 1440 px, incluindo teclado.

## Operação e reversão

O marco adiciona tabelas; preserva a tabela e os registros de organizações do M0.
Não usa `prisma db push`. Volumes PostgreSQL/MinIO persistem em reinícios. Não use
`docker compose down -v` para reiniciar. Para reverter código, mantenha as tabelas
aditivas e os dados; remoção de schema exige plano de backup e aprovação própria.

MFA e exposição pública continuam fora desta entrega interna; a SPEC-002 exige
planejá-los antes de produção pública. WhatsApp, boletos e React Native não foram
implementados.
