# ADR-003 — Linguagem visual operacional escura

**Status:** Proposta para aprovação  
**Data:** 30/09/2026

## Contexto

A SPEC-003 v0.1 definiu uma base visual clara e provisória. O protótipo final do
Figma Make consolidou uma direção escura com amarelo solar, superfícies em camadas,
métricas densas e navegação adaptada para operação desktop e mobile.

A plataforma será usada em escritório e em campo, deve apresentar grande volume de
dados e precisa manter identidade visual consistente sem sacrificar acessibilidade.

## Decisão

Adotar tema operacional escuro como linguagem visual principal da aplicação web:

- fundo base `#090B0A`;
- superfícies `#111412`, `#161A17` e `#1C211D`;
- amarelo solar `#FFD400` como ação primária;
- verde `#26D866` para sucesso e geração;
- Inter na interface e JetBrains Mono em métricas;
- sidebar desktop e navegação inferior mobile;
- tokens semânticos centralizados em `packages/design-tokens`.

O Figma Make v1 é referência visual, não fonte de arquitetura ou regra de negócio.

## Consequências positivas

- identidade forte e diferenciada;
- boa leitura de indicadores e status;
- coerência entre desktop e operação móvel;
- base clara para componentes e regressão visual;
- redução de decisões visuais locais.

## Riscos

- contraste insuficiente em amarelos, verdes ou textos secundários;
- excesso de superfícies escuras sem hierarquia;
- gráficos dependentes apenas de cor;
- inconsistência se valores hexadecimais forem copiados diretamente;
- dificuldade de impressão se o tema for reutilizado em PDFs.

## Mitigações

- WCAG 2.2 AA como critério obrigatório;
- tokens semânticos e testes de contraste;
- borda, texto e ícone além da cor;
- tema de documentos/PDF separado da aplicação;
- migração incremental com screenshots revisadas.

## Alternativas rejeitadas

### Manter somente o tema claro da v0.1

Rejeitado por não representar a direção visual aprovada no protótipo final.

### Copiar integralmente o código do Figma

Rejeitado porque o protótipo usa Vite, mocks, navegação local, estilos inline e
ações demonstrativas incompatíveis com Next.js, RBAC, API e PostgreSQL.

### Criar uma nova SPEC paralela

Rejeitado porque produziria duas autoridades concorrentes sobre o mesmo domínio.
A decisão é versionar e especializar a SPEC-003.

