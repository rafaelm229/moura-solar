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
  fronteiras do monólito modular atual e dos serviços extraídos conforme SPEC-016.
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

## Roadmap e execução assistida por IA — decisão de 07/10/2026

- Ler primeiro `docs/roadmap-refatoracao.md`, a SPEC-000, a SPEC-003 e a SPEC-016.
  Consultar `docs/registro-features.md` e as SPECs do incremento.
- Refatorar a plataforma existente; preservar regras, dados, testes, PDFs, contratos,
  autenticação e capacidades autorizadas. M0–M10 são histórico, não prova de release.
- Manter Material Design adaptado à identidade Moura Solar e os componentes/tokens
  compatíveis já utilizados. Não introduzir Liquid Glass, redesenho Apple,
  tema escuro obrigatório ou troca de biblioteca sem decisão explícita.
- A arquitetura atual é um monólito modular. Microserviços são alvo evolutivo,
  com extração incremental e evidência; nunca declarar infraestrutura pronta
  apenas porque consta do roadmap.
- Prioridade: R0 baseline; R1 fundação de integração; R2 identidade;
  R3 cliente/CRM/projeto; R4 catálogo; R5 localização/consumo/solar/preço;
  R6 propostas; R7 contratos; R8 estoque; R9 financeiro; R10 aceite integrado.
- Engenharia, homologação, instalação, pós-venda e automações existentes continuam
  funcionando. Sua expansão/refatoração vem depois da V1; corrigir regressões
  nesses módulos continua permitido.
- Documentos acompanham a V1 quando necessários. OCR depende da PoC, das decisões
  operacionais e de consumidor ativo; não confundir intake/revisão com extração.
- Toda feature tem ID, fase, SPEC, dependências, aceite e evidência no registro.
  Um item no roadmap não autoriza implementar todo o backlog na tarefa atual.
- Executar somente o incremento solicitado ou marcado como ativo com autorização.
  Na ausência de incremento técnico autorizado, concluir documentação e indicar
  a próxima etapa. Não inventar políticas fiscais, gates, alçadas ou fornecedores.
- Antes de implementar: inventariar comportamento atual, definir diferenças,
  riscos, migração compatível, testes pertinentes e rollback do incremento.
- Após implementar: registrar arquivos, commit, ambiente, comandos/resultados e
  limitações. Atualizar tarefas/rastreabilidade e contratos afetados.
- Estados permitidos: Planejado, Em especificação, Pronto para execução,
  Em implementação, Implementado em branch, Validado, Consolidado, Liberado.
  Só promover estado com evidência correspondente.
- Não remover testes ou reduzir expectativas para tornar a refatoração verde.
  Não substituir snapshots históricos por consultas aos dados atuais.
- Operações distribuídas usam transações locais, outbox/inbox e compensação
  quando aplicável; não presumir transação ACID entre bancos de serviços.
- Não fazer push, abrir PR, merge, criar tag remota ou implantar sem autorização
  específica para a tarefa vigente. A regra anterior de envio de PR aplica-se
  somente quando esse envio estiver autorizado.
