# ADR-006 — Manter Material Design

**Data:** 07/10/2026

**Status:** Aceito por decisão explícita do usuário

**Relacionamento:** SPEC-003 v0.4.0

## Contexto

O experimento Liquid Glass foi discutido para validar aparência. O usuário decidiu
manter Material Design já em aplicação e concentrar esforço em refatoração/features.

## Decisão

Preservar linguagem Material, identidade Moura Solar, componentes/tokens
compatíveis, superfícies sólidas, elevação moderada, acessibilidade e responsividade.
A exclusão de Material Design na SPEC-003 v0.3.0 está superada.
Não introduzir Glass/Apple ou trocar biblioteca UI por esta decisão.
Inventariar a implementação antes de definir ajustes e pilotos.

## Consequências

Reduz retrabalho visual e mantém foco operacional. Catálogo e novas telas usam
os mesmos padrões. Permite melhorias incrementais de rotas, navbar, tabelas,
cards e formulários com validação, sem redesenho global.
