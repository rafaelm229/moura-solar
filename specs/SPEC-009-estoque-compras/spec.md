# SPEC-009 — Estoque, depósitos, compras, fornecedores e rastreabilidade

**Status:** Proposta para validação operacional  
**Versão:** 0.1.0  
**Dependências:** SPEC-001, SPEC-002, SPEC-005, SPEC-007 e SPEC-008

## 1. Objetivo

Controlar materiais da Moura Solar desde a compra e entrada até reserva,
separação, transferência, uso, devolução, perda e garantia, mantendo saldo físico,
reservado e disponível consistente por localização.

## 2. Princípios

1. Saldo não é editado diretamente; é resultado de movimentos confirmados.
2. Reserva não reduz o físico, apenas o disponível.
3. Separação/retirada identifica custódia, mas não significa consumo definitivo.
4. Consumo e devolução são movimentos distintos.
5. Transferência possui origem, destino e confirmação.
6. Seriais e lotes seguem o item durante todo o ciclo.
7. Correções usam movimentos compensatórios.
8. Custo previsto da proposta não substitui custo real do estoque.
9. Operações concorrentes não podem reservar ou consumir o mesmo saldo duas vezes.

## 3. Escopo

### Incluído

- catálogo integrado ao módulo técnico;
- múltiplos depósitos;
- veículos e estoques de equipe;
- posições/localizações internas;
- saldo físico, reservado, disponível e em trânsito;
- entradas, saídas, transferências e devoluções;
- reservas por projeto;
- separação e retirada;
- consumo em instalação;
- lotes e números de série;
- defeitos, perdas, avarias e garantias;
- inventário físico;
- fornecedores;
- solicitações e pedidos de compra;
- recebimento de compras;
- custo médio móvel;
- estoque mínimo e alertas;
- trilha de custódia.

### Fora do escopo

- emissão/manifestação fiscal completa;
- integração automática com NF-e;
- marketplace/e-commerce;
- otimização avançada de compras;
- roteirização logística;
- importação aduaneira.

## 4. Locais de estoque

Tipos iniciais:

- `WAREHOUSE`: depósito físico;
- `VEHICLE`: veículo;
- `TEAM`: custódia temporária de equipe;
- `PROJECT_SITE`: local do projeto;
- `QUARANTINE`: inspeção/defeito;
- `SUPPLIER_RETURN`: aguardando devolução ao fornecedor;
- `IN_TRANSIT`: representação controlada de trânsito.

Cada local pode possuir posições internas. Um veículo ou equipe não recebe
automaticamente todo material da instalação; a transferência precisa ser confirmada.

## 5. Estados de quantidade

Por item e localização:

```text
physicalOnHand
reserved
available
inTransit
quarantined
```

Regra principal:

```text
available = physicalOnHand - activeReservations - blocked/quarantined quantity
```

Quantidade em trânsito não pertence simultaneamente ao saldo disponível da origem
e do destino.

## 6. Entrada

Pode originar-se de:

- compra;
- devolução de projeto/equipe;
- ajuste aprovado de inventário;
- retorno de garantia;
- saldo inicial controlado;
- transferência recebida.

Entrada exige item, localização, quantidade, data, origem, usuário e custo quando
aplicável. Itens com rastreabilidade obrigatória exigem lote ou serial.

## 7. Reserva de projeto

Pré-condições:

- projeto e lista técnica aprovados;
- gate de materiais liberado;
- item ativo;
- quantidade disponível suficiente ou reserva parcial explicitamente permitida;
- depósito definido.

Reserva é idempotente por projeto, versão da lista e item. Alterar a lista técnica
gera diferença a reservar/liberar; não cria reservas duplicadas.

Estados:

```text
PENDING
PARTIALLY_RESERVED
RESERVED
PARTIALLY_PICKED
PICKED
CONSUMED
RELEASED
CANCELED
```

## 8. Separação e retirada

- Estoquista recebe lista de separação por projeto.
- Confere quantidade, lote e serial quando aplicável.
- Divergência é registrada antes da confirmação.
- Retirada transfere custódia para veículo/equipe/local de projeto.
- Quem entrega e quem recebe são registrados.
- Checklist de equipamentos da instalação usa os itens efetivamente separados.

## 9. Consumo e devolução

Após execução, o responsável informa:

- itens utilizados;
- itens não utilizados;
- itens adicionais;
- perdas/avarias;
- seriais instalados;
- destino da devolução.

Confirmar conciliação gera movimentos de consumo e devolução. Material adicional
sem reserva exige saldo, permissão e justificativa. O custo realizado do projeto é
atualizado pelos movimentos reconhecidos.

## 10. Lotes e números de série

### Lote

Usado quando várias unidades compartilham origem/fabricação/garantia. Registra
código, fornecedor, compra, datas, custo e quantidade remanescente.

### Serial

Usado para inversores, módulos quando exigido, baterias e itens configurados.
Serial é único por organização e possui estado/custódia.

Estados sugeridos:

```text
IN_STOCK
RESERVED
IN_TRANSIT
WITH_TEAM
INSTALLED
RETURNED
QUARANTINED
DEFECTIVE
WARRANTY
DISPOSED
```

## 11. Defeitos, perdas e garantias

- Item defeituoso vai para quarentena e sai do disponível.
- Inspeção registra causa, fotos, responsável e decisão.
- Perda/avaria exige motivo e alçada quando material.
- Garantia registra fornecedor/fabricante, prazo, protocolo, envio e retorno.
- Reposição ao projeto é novo movimento, não edição do serial defeituoso.
- Descarte exige autorização e evidência conforme política.

## 12. Inventário físico

Fluxo:

1. criar sessão por local/escopo;
2. congelar referência de saldo, sem necessariamente bloquear operação;
3. contar às cegas conforme política;
4. recontar divergências;
5. aprovar ajustes;
6. gerar movimentos de ajuste;
7. emitir relatório.

Durante inventário, movimentos posteriores ao instante de referência são
considerados na conciliação para evitar falsa divergência.

## 13. Fornecedores e compras

### Fornecedor

- razão social/nome;
- CPF/CNPJ;
- contatos e endereço;
- categorias fornecidas;
- condições e prazo;
- status;
- documentos/anotações autorizadas.

### Compra

```text
PURCHASE_REQUEST
→ QUOTATION/APPROVAL
→ PURCHASE_ORDER
→ PARTIALLY_RECEIVED
→ RECEIVED
→ CLOSED
```

Cancelamento e devolução possuem comandos próprios.

Pedidos podem surgir de:

- reposição mínima;
- falta em reserva de projeto;
- planejamento manual;
- substituição/garantia.

## 14. Recebimento de compra

- Pode ser parcial.
- Confere pedido, item, quantidade, custo, lote/serial e condição.
- Divergências são registradas.
- Confirmação gera entrada e atualiza custo conforme política.
- Documento do fornecedor pode ser anexado.
- Conta a pagar pode ser criada/integrada sem duplicar valor.

## 15. Estoque mínimo

Por item/local podem existir:

- mínimo;
- ponto de reposição;
- estoque de segurança;
- quantidade sugerida;
- lead time.

Alerta é gerado pelo disponível/projeção, não apenas pelo físico. Alertas repetidos
devem ser agrupados e encerrados quando a condição deixa de existir.

## 16. Telas

- visão de estoque por item/local;
- detalhe e trilha do item;
- reservas e separações;
- transferências;
- recebimentos;
- devoluções;
- inventários;
- lotes e seriais;
- quarentena, defeitos e garantias;
- fornecedores;
- solicitações e pedidos de compra;
- alertas e necessidades de projeto;
- custo e valorização conforme permissão.

## 17. Responsividade e campo

- Celular prioriza leitura de QR/código, quantidade e confirmação.
- Tablet suporta separação e inventário em lista mestre-detalhe.
- Desktop suporta tabelas, análise e compras.
- Operações essenciais funcionam pelo navegador móvel.
- Botões de campo têm alvo grande e feedback após leitura.
- Fluxo não perde itens já conferidos por navegação acidental.
- Lote/serial inválido mostra erro antes de confirmar movimento.

## 18. Permissões

```text
inventory:read
inventory:view_cost
inventory:receive
inventory:reserve
inventory:release_reservation
inventory:pick
inventory:transfer
inventory:confirm_transfer
inventory:consume
inventory:return
inventory:adjust
inventory:quarantine
inventory:dispose
inventory:manage_serials
inventory:count
inventory:approve_count
suppliers:manage
purchases:request
purchases:approve
purchases:order
purchases:receive
purchases:cancel
warranties:manage
```

## 19. Eventos

- `StockReceived`
- `StockReserved`
- `ReservationReleased`
- `ItemsPicked`
- `StockTransferred`
- `TransferReceived`
- `MaterialConsumed`
- `MaterialReturned`
- `StockQuarantined`
- `StockLost`
- `InventoryAdjusted`
- `PurchaseRequested`
- `PurchaseOrderApproved`
- `PurchasePartiallyReceived`
- `PurchaseReceived`
- `WarrantyOpened`
- `WarrantyResolved`
- `MinimumStockReached`

## 20. Casos de aceitação

```gherkin
Cenário: duas reservas concorrentes não excedem disponível
  Dado que existem 10 módulos disponíveis
  Quando dois projetos tentarem reservar 8 módulos simultaneamente
  Então apenas reservas cuja soma não exceda 10 devem ser confirmadas
  E nenhuma quantidade negativa deve ser produzida
```

```gherkin
Cenário: separação não é consumo
  Dado que 10 módulos foram separados e entregues à equipe
  Quando a retirada for confirmada
  Então eles devem ficar sob custódia da equipe/projeto
  E ainda não devem compor o custo realizado por consumo da instalação
```

```gherkin
Cenário: conciliar material após instalação
  Dado que a equipe retirou 10 módulos e instalou 9
  Quando informar 9 consumidos e 1 devolvido
  Então o sistema deve baixar 9 no projeto
  E devolver 1 ao local confirmado
  E atualizar o custo realizado pelos itens consumidos
```

```gherkin
Cenário: serial instalado não pode ser reutilizado
  Dado que um inversor serial X está instalado em um projeto
  Quando outro projeto tentar consumir o mesmo serial
  Então o sistema deve bloquear a operação
  E informar a custódia atual conforme permissão
```

## 21. Critérios de aprovação

- [ ] Locais e custódias validados.
- [ ] Fórmulas de saldo aprovadas.
- [ ] Fluxo reserva-separação-consumo-devolução aprovado.
- [ ] Itens que exigem lote/serial definidos.
- [ ] Inventário e alçadas de ajuste aprovados.
- [ ] Compras e fornecedores validados.
- [ ] Política de custo médio aprovada.
- [ ] Fluxos mobile/tablet validados.
