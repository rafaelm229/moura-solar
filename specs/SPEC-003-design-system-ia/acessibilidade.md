# Acessibilidade

## 1. Meta

Atender WCAG 2.2 nível AA nas jornadas críticas e componentes compartilhados.

## 2. Teclado e foco

- toda ação acessível por teclado;
- foco visível com contraste suficiente;
- ordem de foco acompanha a ordem visual;
- skip link para conteúdo principal;
- menus suportam Escape e navegação apropriada;
- Kanban possui alternativa operável sem drag-and-drop;
- foco retorna ao acionador após fechar overlay.

## 3. Semântica

- landmarks `header`, `nav`, `main`, `aside` e `footer` quando aplicáveis;
- um `h1` descritivo por página;
- tabelas com caption/cabeçalhos adequados;
- botões para ações e links para navegação;
- ARIA somente quando HTML nativo não for suficiente.

## 4. Formulários

- label programaticamente associado;
- instrução antes do erro;
- obrigatoriedade além de cor/asterisco;
- erro associado com `aria-describedby`;
- resumo de erros em formulários longos;
- máscara não impede colar, editar ou usar tecnologia assistiva.

## 5. Cor e contraste

- contraste AA para texto e controles essenciais;
- amarelo sobre fundo claro é proibido sem contraste validado;
- texto sobre `brand.solar` usa `text.onSolar`;
- status combina cor, texto e, quando útil, ícone;
- gráficos usam padrões, rótulos ou tabela alternativa.

## 6. Toque e zoom

- alvo mínimo de 44 × 44 px;
- preferencialmente 48 px para campo;
- zoom de 200% sem perda funcional;
- orientação não é bloqueada;
- safe areas respeitadas em navegação inferior e sheets.

## 7. Movimento e tempo

- respeitar `prefers-reduced-motion`;
- não depender de animação para comunicar estado;
- timeout de sessão oferece aviso adequado quando aplicável;
- atualizações automáticas não roubam foco.

## 8. Testes

- axe ou ferramenta equivalente nos fluxos principais;
- navegação manual somente por teclado;
- leitor de tela em login, formulário, modal, tabela/cartão e upload;
- contraste automatizado e inspeção dos estados reais;
- critérios incluídos nos testes de componentes e E2E.

