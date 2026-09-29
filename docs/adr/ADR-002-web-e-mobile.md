# ADR-002 — Web completa e aplicativo complementar

**Status:** Aceito  
**Data:** 2026-09-26

## Contexto

Administradores, vendedores, estoquistas e instaladores poderão trabalhar em
dispositivos diferentes. Restringir recursos por tamanho de tela causaria bloqueios
operacionais. Ao mesmo tempo, recursos nativos futuros podem melhorar a rotina de
campo.

## Decisão

Construir primeiro uma aplicação Next.js responsiva e funcional para todos os
perfis. Posteriormente, criar um aplicativo React Native + Expo focado em campo.
Permissões determinam acesso; dispositivo determina somente apresentação. O app
nativo não será requisito exclusivo para concluir processos.

## Consequências

- Instaladores podem trabalhar pelo navegador desde a primeira versão.
- Toda funcionalidade web deve ser validada em celular, tablet e desktop.
- O aplicativo futuro reutiliza API, contratos e regras, mas terá UI própria.
- Há duas interfaces no longo prazo, porém uma única autoridade de negócio.
