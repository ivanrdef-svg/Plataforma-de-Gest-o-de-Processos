# Testes de domínio — Hardening 001

## Executar

Requer Bun **1.4.2** (declarado em packageManager), sem outro executor.
A instalação usa o lock existente:

```sh
bun install --frozen-lockfile
bun run test
bun run typecheck
bun run build
bun run test:watch
```

test executa bun test com --isolate, --no-install e --no-env-file.
Não usar bun test sem --isolate: o isolamento faz parte do contrato da suíte.
O build mantém exatamente o comando Vite existente. typecheck verifica primeiro
a aplicação com tsconfig.json e depois os testes com tsconfig.test.json.
Tipos Bun ficam no projeto de testes; a configuração TypeScript da aplicação não mudou.

## Escolha do executor

Bun test já faz parte do package manager usado pelo projeto, transpila TypeScript,
resolve o alias @/* e oferece assertions, relógio controlado e isolamento nativo
dos módulos por arquivo. A única nova dependência direta de desenvolvimento é
@types/bun; bun-types é sua dependência transitiva, ambas 1.4.2. Não foi adicionado
framework de DOM, browser, servidor ou outro executor.

Vitest oferece resetModules e integração Vite, mas introduziria outro executor
e suas dependências. Para estes testes de domínio, um helper pequeno com
node:worker_threads reinicia o grafo real por caso usando o próprio Bun.
Componentes React/DOM não fazem parte desta fundação. Nenhum executor prévio
foi encontrado. Reavaliar Vitest se a suíte passar a precisar dessas capacidades.

A documentação oficial descreve a recriação do global e dos registros ESM/CJS
por arquivo com --isolate: [Bun — isolamento](https://bun.com/docs/test/parallel).
Não confundir restauração de mocks com reinicialização de um store.
O isolamento adicional por caso usa a implementação de
[workers do Bun](https://bun.com/docs/runtime/workers). A versão é fixada e
o caminho de repetição foi verificado; a API subjacente de workers ainda é
descrita pelo Bun como experimental.

## Isolamento

- tests/setup.ts roda como preload e é importado pelo helper antes do domínio
  em cada worker novo.
- Casos com store usam isolatedTest(nome, import.meta.url, função). Cada chamada
  executa seu corpo em um worker novo, selecionado por arquivo/nome; imports
  transitivos e singletons são reavaliados. Nenhum reset foi exportado pelo domínio.
- O helper aguarda resultado explícito, propaga erros/assertions e sempre termina
  o worker. Um caso sem resposta falha após quatro segundos.
- Arquivos puramente funcionais podem conter vários casos, cada qual com fixture
  nova, sem escrita em store (como traceability.test.ts).
- O Storage é uma implementação em memória da interface Storage, inicialmente
  vazia. O helper exige Storage vazio antes do caso; não o limpa para esconder
  estado residual.
- O relógio é fixado em 15/01/2026. A reutilização de Template avança explicitamente
  um minuto antes de criar outro Workflow, pois o gerador existente usa milissegundos.
- fetch lança erro; nenhum teste importa/adapta clientes reais de Supabase ou IA.
  Não há browser externo, acesso a Storage real, banco, rede ou dados do usuário.
- --no-env-file desativa a carga automática de arquivos .env no executor de testes;
  --no-install impede downloads automáticos durante a execução.
- --isolate sozinho não reinicia o estado entre repetições de --rerun-each no
  Bun 1.4.2. Por isso casos com stores usam o helper mesmo com esse flag.
- Não misturar registros test comuns e isolatedTest num arquivo com stores.
  Nomes dos cenários no mesmo arquivo devem ser únicos.

Verificação de ordem/repetição:

```sh
bun run test --randomize --seed 1001 --rerun-each 2
```

Não adicionar retry para esconder interferência entre casos.

## Cobertura deliberada

| Arquivo                       | Comportamento preservado                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| workflow-publication.test.ts  | Snapshot profundamente independente, regras e participantes               |
| workflow-draft.test.ts        | V2 editável não altera V1; publicado permanece disponível                 |
| runtime-task-snapshot.test.ts | Cópia de regras, destinos e SLA; alterações do draft não alteram tasks    |
| pop-review.test.ts            | Revisão e provenance independentes da proposta original                   |
| pop-confirmation.test.ts      | POP nasce do revisado, em rascunho, sem campos exclusivos de IA           |
| bpm-ensure.test.ts            | Desenho editorial existente não é substituído                             |
| bpm-sync.test.ts              | Sync aditivo mantém nós/arestas e elementos manuais                       |
| bpm-validation.test.ts        | Validação determinística e não mutante sobre entrada congelada            |
| traceability.test.ts          | Sugerido/rejeitado não geram elos; confirmado gera; pureza                |
| template-creation.test.ts     | Cópia da versão publicada mesmo com draft mais novo                       |
| template-reuse.test.ts        | Workflow reutilizado não compartilha conteúdo mutável com Template/origem |

São **13 testes em 11 arquivos**. Helpers apenas constroem fixtures e adaptam
Storage/relógio/rede; comandos, validações e stores são os módulos reais.
Os valores esperados de regras/SLA/conteúdo são explícitos; não são obtidos
chamando a mesma função sob teste para calcular a expectativa.

## Limites e dívida mantida

Não há testes verdes consagrando R01, R06 ou R09. O teste de Runtime inicia com
conteúdo corrente e publicado iguais, antes de criar V2, e verifica somente
tasks já materializadas. Não aprova telas históricas nem entrada divergente.
BPM sync é diferente de syncWorkflowWithProcess: este último não foi alterado/testado
como correto. Confirmação cobre o caminho bem-sucedido, sem alegar atomicidade.

R01–R11, ProcessVersion/ProcessDefinition, persistência, auth, UX, Supabase e
política global de lint continuam fora desta tarefa. Nenhuma correção de domínio.
Migrações/selectors futuros podem usar a mesma infraestrutura com fixtures
isoladas; não foi inventada migração só para gerar cobertura.

CI fica para hardening separado. Um check mínimo futuro pode instalar Bun 1.4.2,
executar instalação congelada, typecheck e test; build deve rodar no ambiente
suportado. Não é necessário reformatar todo o repositório para criar esse check.
