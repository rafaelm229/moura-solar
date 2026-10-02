# Ícones — SPEC-003

**Status:** Proposta para revisão

**Versão:** 0.1.0

**Data:** 02/10/2026

Escopo aprovado; contratos detalhados e aparência final sujeitos à revisão humana.

Requisito UX-02. Adotar Google Material Symbols Outlined, exportando somente SVGs usados. Proposta de componente `Icon(name, size, decorative, label)` com nomes permitidos; não aceitar SVG arbitrário ou HTML de documentos.

Padrão: variante Outlined, FILL 0, peso 400, GRAD 0, optical size 24; dimensões 20 px em linha, 24 px em ações, 32 px em estado vazio. Manter viewBox e proporção; não simular peso por CSS stroke sobre paths preenchidos. Centralizar com inline-flex, baseline consistente e espaço de 8 px para texto. Cor currentColor; hover/seleção/desabilitado seguem o controle, sem alterar significado.

Botão com apenas ícone exige nome como “Abrir configurações” ou “Baixar contrato versão 2”; tooltip é auxiliar. Ícone decorativo usa aria-hidden e não recebe foco. Ações salvar, concluir, confirmar, pagar, excluir e enviar mantêm texto. Indicador de processamento anuncia estado, sem animação obrigatória.

Catálogo inicial: home, groups, work, inventory_2, payments, support_agent, settings, person, description, upload_file, download, photo_camera, search, filter_list, warning, check_circle, error, chevron_left, more_horiz. Conferir disponibilidade no momento da extração e registrar nome, origem, versão/data e arquivo local. Remover emojis de títulos, estados, botões e notificações, inclusive os módulos legados conforme cada lote migra.

Origem e licença verificadas em 02/10/2026: o [guia oficial de Material Symbols](https://developers.google.com/fonts/docs/material_symbols) disponibiliza SVGs e informa Apache License 2.0. Preservar LICENSE e avisos aplicáveis ao incorporar os ativos, com proveniência do [repositório oficial](https://github.com/google/material-design-icons). Nenhum ativo ou dependência é instalado nesta tarefa.
