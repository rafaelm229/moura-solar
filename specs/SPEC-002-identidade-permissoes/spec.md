# SPEC-002 — Identidade, sessões e permissões

**Status:** Aprovada para M1 interno em 29/09/2026

**Versão:** 0.1.0

## 1. Objetivo

Garantir acesso consistente na web e no futuro aplicativo, permitindo trabalho em
múltiplos aparelhos sem sessões locais inconsistentes e sem vincular permissões ao
tamanho da tela.

## 2. Escopo

- usuários e credenciais;
- papéis e permissões;
- sessões por dispositivo;
- login, renovação e logout;
- bloqueio e recuperação de acesso;
- autorização na API e menus derivados;
- auditoria de segurança;
- base para múltiplas empresas no futuro, sem obrigar multi-tenant no MVP.

## 3. Modelo conceitual

- `User`: identidade da pessoa.
- `Membership`: vínculo do usuário com a organização.
- `Role`: conjunto administrável de permissões.
- `Permission`: capacidade granular sobre recurso/ação.
- `Session`: acesso autenticado em um dispositivo.
- `AuditEvent`: registro imutável de ação relevante.

Mesmo existindo apenas a Moura Solar inicialmente, o vínculo organizacional evita
acoplar definitivamente usuário e empresa.

## 4. Papéis iniciais

- Administrador.
- Gerente.
- Vendedor.
- Financeiro.
- Estoquista.
- Instalador.
- Engenharia.

Papéis são modelos iniciais editáveis por administrador autorizado. O sistema
autoriza pela permissão efetiva, não por comparações espalhadas do nome do papel.

## 5. Formato das permissões

Convenção:

```text
recurso:ação
customers:read
customers:create
customers:update
proposals:send
proposals:approve_exception
inventory:reserve
inventory:consume
installations:complete
users:manage
audit:read
```

Quando necessário, a política também considera escopo:

- próprio;
- equipe;
- organização.

## 6. Regras de sessão

- Access token curto.
- Refresh token rotativo e armazenado de forma segura.
- Cada login cria uma sessão identificável.
- Renovar token invalida o refresh token anterior.
- Reutilização detectada revoga a família da sessão.
- Bloquear usuário revoga sessões ativas.
- Alterações críticas de permissão podem exigir reautenticação ou renovação.
- Usuário pode encerrar suas outras sessões.
- Administrador autorizado pode revogar sessão de outro usuário.

## 7. Experiência web

- Login funciona em celular, tablet e desktop.
- Rotas protegidas aguardam a verificação antes de redirecionar.
- Falha temporária da API não é tratada automaticamente como logout.
- Expiração recuperável tenta renovar a sessão uma única vez de forma coordenada.
- Várias requisições simultâneas não iniciam várias renovações concorrentes.
- Ao perder acesso a um módulo, o usuário recebe estado de permissão, não loop de login.
- Menu é derivado das permissões retornadas pela sessão.

## 8. Matriz inicial resumida

| Capacidade                | Admin |            Gerente |         Vendedor |           Financeiro |           Estoquista |         Instalador |      Engenharia |
| ------------------------- | ----: | -----------------: | ---------------: | -------------------: | -------------------: | -----------------: | --------------: |
| Gerir usuários e papéis   |   Sim |                Não |              Não |                  Não |                  Não |                Não |             Não |
| Ver clientes              |   Sim |                Sim |  Próprios/equipe | Conforme necessidade | Conforme necessidade |         Designados |      Designados |
| Criar oportunidades       |   Sim |                Sim |              Sim |                  Não |                  Não |                Não |             Não |
| Criar/enviar propostas    |   Sim |                Sim |              Sim |              Leitura |                  Não |                Não |         Leitura |
| Aprovar exceção comercial |   Sim |                Sim |              Não |                  Não |                  Não |                Não |             Não |
| Gerir recebimentos        |   Sim |     Leitura/gestão | Leitura limitada |                  Sim |                  Não |                Não |             Não |
| Reservar/separar estoque  |   Sim |                Sim |              Não |                  Não |                  Sim | Confirmar retirada | Leitura técnica |
| Baixar material consumido |   Sim |                Sim |              Não |                  Não |                  Sim |       Declarar uso |        Conferir |
| Executar instalação       |   Sim |                Sim |              Não |                  Não |                  Não |                Sim |        Conferir |
| Aprovar projeto técnico   |   Sim | Conforme delegação |              Não |                  Não |                  Não |                Não |             Sim |
| Ver auditoria             |   Sim |  Escopo autorizado |   Próprias ações |    Escopo financeiro |       Escopo estoque |     Próprias ações |  Escopo técnico |

Esta matriz é um padrão inicial; permissões finais precisam de validação operacional.

## 9. Casos de aceitação

```gherkin
Cenário: falha temporária não encerra a sessão
  Dado que o usuário possui uma sessão válida
  Quando uma chamada ao financeiro falhar por indisponibilidade da API
  Então a aplicação deve exibir um erro recuperável
  E não deve apagar a sessão
  E não deve redirecionar para login sem confirmação de invalidez da autenticação
```

```gherkin
Cenário: permissão é aplicada na API
  Dado que um vendedor não possui proposals:approve_exception
  Quando ele tentar aprovar desconto fora da alçada por chamada direta à API
  Então a API deve responder acesso negado
  E nenhuma alteração deve ser persistida
  E a tentativa deve ser auditável conforme política de segurança
```

```gherkin
Cenário: sessão compartilhada entre telas, não entre aparelhos
  Dado que o usuário está autenticado no notebook e no celular
  Quando ele encerrar somente a sessão do notebook
  Então o notebook deve exigir novo login
  E a sessão do celular deve continuar válida
```

## 10. Fora do escopo inicial

- login social;
- autenticação por biometria no aplicativo;
- SSO corporativo;
- acesso de clientes finais;
- autenticação multifator obrigatória para todos.

MFA deverá ser planejado para administradores e ações financeiras sensíveis antes
da produção pública.

## 11. Critérios de aprovação

- [x] Papéis iniciais confirmados.
- [x] Matriz de permissões validada.
- [x] Escopos próprio/equipe/organização definidos.
- [ ] Política de sessão e revogação aprovada.
- [ ] Recuperação de senha e MFA detalhados antes da implementação pública.
- [ ] Casos negativos de autorização incluídos nos testes.

## 12. Decisões de implementação aprovadas

- Matriz completa e escopos: [catálogo aprovado](matriz-proposta.md).
- Convites entregues por link pelo administrador, sem envio automático.
- Recuperação mediada por administrador com link de uso único; usuário define a senha.
- Sete papéis iniciais; suporte delegado ao gerente, conforme matriz.
- Política técnica e roteiro: [operação do M1](../../docs/m1-operacao.md).
- Aprovação não inclui alçadas numéricas ou gates pendentes de módulos futuros.
