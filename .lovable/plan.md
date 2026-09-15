# Cleanup 001 — Fases A, B e C

## Objetivo
Remover dados demonstrativos das áreas de Knowledge, Workspaces, Favoritos, pesquisa e Home, sem apagar conteúdo persistido nem alterar os motores de Processo, versões, Runtime, BPM ou Workflow.

## Implementação
- **Fase A:** fazer o Knowledge Store listar somente documentos persistidos; calcular apenas totais e status reais; mostrar estado vazio com a ação **Novo**.
- **Fase B:** remover o fallback de workspace desconhecido; ocultar Workspaces da navegação e da Home; listar somente Processos realmente favoritos; alimentar a pesquisa apenas com stores reais de Knowledge e Processo.
- **Fase C:** retirar da Home as seções sem fonte real de recentes/workspaces; usar Processos persistidos com versão de trabalho em “Processos em andamento”; exibir favoritos reais e zerar somente indicadores com contagem real disponível.

## Limites
- Não limpar nem migrar o armazenamento local.
- Não remover rotas ou componentes existentes de Workspace.
- Não alterar ProcessVersion, H002, H003, Runtime, BPM ou Workflow.
- Não avançar para fases posteriores sem confirmação.

## Validação
- Confirmar por busca que as telas alteradas não consomem as constantes demo abrangidas.
- Executar typecheck e build.
