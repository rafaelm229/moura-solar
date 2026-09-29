# ADR-001 — Adotar monólito modular

**Status:** Aceito  
**Data:** 2026-09-26

## Contexto

A plataforma possui vários domínios integrados e precisa de transações fortes. A
equipe ainda está consolidando regras e fronteiras. Microsserviços adicionariam
deploys, redes, consistência distribuída e observabilidade antes de existir uma
necessidade comprovada.

## Decisão

Adotar NestJS como monólito modular, com módulos de domínio explícitos, banco
PostgreSQL e integração interna por casos de uso e eventos. Fronteiras serão
mantidas para permitir extração futura, caso métricas justifiquem.

## Consequências

- Entrega e operação iniciais mais simples.
- Transações entre módulos permanecem possíveis.
- Exige disciplina para impedir acoplamento por acesso direto a tabelas.
- Escala inicialmente por réplicas da aplicação e workers separados.
