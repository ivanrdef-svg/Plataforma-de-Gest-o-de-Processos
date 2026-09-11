# Build 031 — Etapa 2: rastreabilidade na interface

## Objetivo
Exibir, sem criar novos vínculos ou fontes de verdade, a cadeia derivada entre seção do POP, etapa do Processo, BPMN, Workflow e quantidade de execuções.

## Implementação
- Consumir os hooks reativos existentes de mapeamentos, BPMN, Workflows e execuções na aba **Mapeamento com Processo**.
- Calcular uma única vez, com `useMemo`, o resumo de `getPopTraceabilitySummary` para todas as seções.
- Manter o bloco atual de mapping e acrescentar abaixo dele:
  - aviso terminal quando a etapa estiver inconsistente;
  - nós BPMN reais, ou a mensagem de ausência;
  - etapas de Workflow reais e sua contagem de execuções, ou a mensagem de ausência;
  - aviso não operacional para sugestões pendentes.
- Renderizar ações somente quando o elo correspondente realmente existir.
- Navegar ao Processo abrindo a aba existente `bpmn` (**Modelagem BPM**) sem foco em nó; navegar ao Workflow pela rota existente `/workflow/$workflowId`, sem foco em etapa.
- Manter a contagem já existente em **POPs vinculados**, confirmando que conta somente mappings confirmados pertencentes ao Processo atual.

## Detalhes técnicos
- Nenhuma regra de domínio será recriada em React; a interface consumirá exclusivamente o resultado de `getPopTraceabilitySummary`.
- Para abrir a aba BPMN, será adicionada seleção inicial opcional de aba ao `WorkspaceLayout` via navegação interna da rota existente; isso não cria foco de nó, rota nova nem relação estrutural.
- O componente visual de rastreabilidade será pequeno e separado do bloco de edição do mapping.
- Inconsistência interrompe BPMN/Workflow somente na apresentação daquela seção, preservando o mapping visível.

## Validação
- Verificar por código que arrays vazios nunca geram botões, sugestões nunca geram links operacionais e inconsistências encerram a cadeia visual.
- Executar typecheck, lint e build.
- Entregar o relatório final completo nos tópicos solicitados, sem avançar para outro Build.
