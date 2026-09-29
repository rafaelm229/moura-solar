# Monitoramento e operação de suporte

## Fontes e qualidade

Prioridade típica: integração validada, importação do fabricante, leitura manual
validada, leitura informada e estimativa. A fonte mais alta não substitui o dado
anterior: cria nova revisão com rastreabilidade.

Cada ponto informa competência, métrica, valor, unidade, origem, instante de
captura e qualidade. Lacunas permanecem nulas; nunca são preenchidas com zero.

## Métricas mensais

- geração realizada em kWh;
- geração esperada em kWh, baseada na versão técnica aprovada;
- consumo da unidade em kWh;
- energia injetada e consumida da rede, se disponíveis;
- dias com telemetria e disponibilidade do dado;
- ocorrências e indisponibilidades confirmadas.

O índice operacional simples é:

`índice (%) = geração realizada / geração esperada × 100`

Ele é apenas um indicador de triagem, não o Performance Ratio de engenharia nem
uma promessa contratual. Clima, sombreamento, sujeira, degradação, indisponibilidade
da rede, limitação do inversor e cobertura dos dados precisam contextualizá-lo.

## Regras de alerta

- A regra possui versão, janela, tolerância e quantidade mínima de dados.
- `SEM_TELEMETRIA` cria alerta de conectividade, não de baixa geração.
- Baixo desempenho só é avaliado quando os dados são suficientes.
- Um alerta pode abrir chamado, ser reconhecido, descartado com motivo ou resolvido.
- Alertas repetidos são correlacionados para evitar chamados duplicados.

## Roteiro de conectividade

1. Verificar data da última telemetria e indicadores locais do inversor.
2. Confirmar energia e funcionamento aparente sem solicitar credenciais por chat.
3. Identificar alteração de roteador, SSID, senha, banda ou alcance.
4. Aplicar roteiro versionado por fabricante e modelo.
5. Validar retorno da telemetria e registrar evidência.
6. Se falhar, propor visita, cobertura e valor antes de agendar.

O histórico contabiliza incidentes para análise, mas não cobra automaticamente
“a partir da segunda vez”. Contrato e política podem definir orientação remota,
cortesia e visita; a aplicação mostra a regra aplicável e exige aceite.

## Segurança

- Não solicitar ou armazenar senha residencial em notas, anexos ou logs.
- Integrações futuras usam OAuth/token quando o fabricante permitir.
- Segredos ficam em cofre e a aplicação guarda apenas a referência.
- Acesso a monitoramento e documentos é auditado.
- Dados exportados respeitam escopo, retenção e revogação de acesso.

## Rotina do suporte

- Fila por prioridade e vencimento de SLA.
- Painel com primeira resposta, tempo de resolução, reincidência e satisfação.
- Linha do tempo única com contatos, diagnóstico, visitas, peças e cobrança.
- Busca por cliente, projeto, inversor, número de série, protocolo e chamado.
- Encerramento sugere base de conhecimento sem publicar dados pessoais.

## Evolução de integrações

1. Entrada manual e CSV validado.
2. Adaptadores por fabricante com contrato interno comum.
3. Webhooks ou coleta agendada com idempotência e observabilidade.
4. Portal do cliente e notificações opt-in.

Falha de uma integração nunca altera silenciosamente geração para zero e nunca
bloqueia a operação manual.
