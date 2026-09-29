# Regras permanentes de desenvolvimento

## Arquitetura e domínio

- PostgreSQL é a fonte única de verdade operacional.
- Toda mutação de negócio passa pela API NestJS autenticada.
- O frontend não decide transições de negócio; a API valida comandos, estados e gates.
- O funil é derivado dos estados e gates reais, nunca de status visual independente.
- Autorização é obrigatória na API, com permissões efetivas e contexto organizacional.
- Regras críticas são transacionais, auditáveis e idempotentes. Avaliar concorrência
  otimista para evitar sobrescrita silenciosa.
- Componentes não devem concentrar regras de múltiplos domínios. Respeitar as
  fronteiras do monólito modular e seus casos de uso.
- Nenhum dado de negócio pode depender de Local Storage ou outro cache do aparelho.

## Experiência e escopo

- A web deve ser completa para celular, tablet, notebook e desktop.
- Tamanho da tela altera layout, nunca permissão ou capacidade autorizada.
- Tratar carregamento, vazio, erro recuperável, sucesso, conflito e acesso negado.
- Não implementar WhatsApp, boletos ou aplicativo React Native nesta fase.

## Especificações e qualidade

- Ler as SPECs do domínio antes de implementar. Não converter hipóteses ou decisões
  operacionais pendentes em regras definitivas; registrar e esclarecer bloqueios.
- Todas as entregas devem cumprir `docs/definition-of-done.md`.
- Manter contratos/OpenAPI e documentação coerentes com a implementação.
- Testar autorização positiva e negativa, persistência real, transações, sessões,
  concorrência e idempotência conforme o incremento.
- Validar interfaces em 360, 768, 1024 e 1440 px e os demais cenários da SPEC-003.
- Não registrar senhas, tokens, segredos ou dados pessoais em logs.

## Git e banco

- Verificar branch e alterações existentes antes de editar; nunca sobrescrever
  trabalho sem inspeção. Não desenvolver diretamente na `main`.
- Trabalhar em branches curtas e incrementos pequenos com commits descritivos.
- Executar `pnpm check` antes de cada commit relevante e corrigir falhas antes de
  considerar o incremento validado.
- Usar migrations Prisma versionadas; não usar `prisma db push`.
- Testar migrations em banco vazio e a partir da versão anterior com dados.
- Não remover volumes nem redefinir bancos existentes sem autorização explícita.
- Enviar a branch e abrir PR vinculado às SPECs quando o marco estiver validado,
  incluindo roteiro de demonstração e evidências.
