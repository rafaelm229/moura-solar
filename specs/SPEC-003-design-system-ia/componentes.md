# Catálogo de componentes

## 1. Regra geral

Componentes são implementados na stack oficial Next.js/React. O código do Figma
pode orientar composição, mas deve ser convertido em componentes tipados,
acessíveis, testáveis e conectáveis à API.

Cada componente documenta variantes, tamanhos, estados, acessibilidade e comportamento responsivo.

## 2. Fundação

| Componente | Variantes e requisitos |
|---|---|
| `Button` | primary, secondary, ghost, danger; loading; ícone opcional |
| `IconButton` | label acessível obrigatório; tooltip quando necessário |
| `Link` | externo, interno e download; foco visível |
| `ButtonGroup` | ações relacionadas sem esconder a ação principal |
| `Badge` | neutral, info, success, warning, danger; texto obrigatório |
| `Avatar` | imagem ou iniciais; nome acessível |
| `Tooltip` | nunca contém informação indispensável |
| `Separator` | semântico ou decorativo |
| `Skeleton` | respeita movimento reduzido |

## 3. Formulários

- `FormField`: label, descrição, obrigatório, erro e contador.
- `Input`: text, email, telefone, CEP, CPF/CNPJ e monetário por adaptadores.
- `Textarea`.
- `Select` e `Combobox`.
- `Checkbox`, `RadioGroup` e `Switch`.
- `DatePicker` e `DateRangePicker`.
- `CurrencyInput`, `PercentageInput`, `EnergyInput` e `PowerInput`.
- `FileUploader`, `CameraCapture` e `SignaturePad`.
- `SerialNumberInput` com leitura manual, câmera ou QR.

Validação de interface não substitui validação da API. Erros retornados pelo servidor
devem ser associados ao campo ou apresentados em resumo acionável.

## 4. Navegação

- `AppShell`;
- `Sidebar`;
- `SidebarGroup`;
- `Topbar`;
- `MobileNavigation`;
- `MoreNavigationSheet`;
- `Breadcrumbs`;
- `ContextTabs`;
- `GlobalSearch`;
- `CommandMenu`;
- `PageHeader`;
- `Pagination`;
- `Stepper`.

Menus são derivados de um único modelo de navegação e permissões, evitando listas
duplicadas no desktop e mobile.

## 5. Superfícies e feedback

- `Card`, `Panel` e `MetricCard`;
- `Alert` e `InlineMessage`;
- `Toast` para confirmação transitória;
- `Dialog` para decisão curta;
- `Drawer` para contexto lateral;
- `BottomSheet` para tarefas mobile;
- `EmptyState`, `ErrorState`, `PermissionState`, `ConflictState`, `OfflineState`;
- `ConfirmBusinessCommand` para comandos com impacto de domínio.

## 6. Dados

- `DataTable` para comparação tabular real;
- `MobileCardList` como adaptação deliberada;
- `FilterBar`, `FilterDrawer` e `ActiveFilters`;
- `Timeline` e `AuditTrail`;
- `StatusSummary`;
- `KanbanBoard` com alternativa de lista;
- `ChartCard` com legenda, período, fonte e resumo textual;
- `DocumentList`, `DocumentViewer` e `DownloadAction`.

## 7. Domínio solar

- `EnergyMetric` para kWh;
- `PowerMetric` para kW/kWp;
- `GenerationChart`;
- `ConsumptionHistory`;
- `SystemComposition`;
- `PricingSummary`;
- `MarginGuardAlert`;
- `ProjectGateStatus`;
- `InstallationChecklist`;
- `EquipmentList`;
- `SerialNumberList`.

## 8. Estados obrigatórios

Todos os componentes interativos aplicáveis tratam:

`default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, `error`,
`success` e `readonly`.

## 9. Proibições

- criar variante local sem justificativa;
- codificar permissão dentro do componente puramente visual;
- usar cor como único indicador;
- ação apenas por ícone sem nome acessível;
- estilos inline repetidos para tokens já existentes;
- armazenar dados de negócio no componente como fonte definitiva.

