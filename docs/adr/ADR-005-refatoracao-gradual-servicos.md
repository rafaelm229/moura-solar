# ADR-005 — Refatoração gradual para serviços

**Data:** 07/10/2026

**Status:** Direção aprovada; escolhas técnicas por incremento pendentes

**Relacionamento:** Evolui ADR-001; core não extraído permanece monólito modular

## Contexto

A plataforma existente contém domínios, dados, documentos e testes reutilizáveis.
O produto amplia catálogo, localização, integrações e dados. A decisão é evoluir
a base, preservando operação e corrigindo acoplamento por domínio.
Modularização existente ajuda, mas não comprova limites prontos para extração.

## Decisão

Aplicar SPEC-016 e roadmap R0–R13: baseline, contratos/integração, identidade,
cliente/CRM/projeto, catálogo, consumo/localização/preço, proposta, contrato,
estoque e financeiro. Serviços podem coexistir com NestJS atrás de fachada/gateway.
Cada extração exige dono de dados, transação local, contrato, migração, evidência
e rollback. Não criar um serviço por tabela ou trocar stack por preferência.

## Consequências

Aumenta complexidade operacional/distribuída; cada incremento mede ganho,
latência, falhas e custo. Broker, saga, deployment e divisão database/schema
exigem ADR concreto. Não tratar esta direção como comprovação de escalabilidade.
O roadmap preserva correções de módulos posteriores e evita reescrita integral.
