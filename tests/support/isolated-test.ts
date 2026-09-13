import { expect, test } from "bun:test";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import "../setup";

/**
 * One fresh worker/module graph per case, including transitive singleton stores.
 * The worker imports the same test file and runs only the requested scenario.
 * No domain reset hooks, source copies or mocked domain modules.
 */
export function isolatedTest(name: string, file: string, run: () => void | Promise<void>): void {
  if (!isMainThread) {
    const selected = workerData as { file: string; name: string };
    if (selected.file === file && selected.name === name) {
      void Promise.resolve()
        .then(() => {
          expect(window.localStorage.length).toBe(0);
          return run();
        })
        .then(
          () => parentPort?.postMessage({ ok: true }),
          (error: unknown) =>
            parentPort?.postMessage({
              ok: false,
              message: error instanceof Error ? (error.stack ?? error.message) : String(error),
            }),
        )
        .finally(() => parentPort?.close());
    }
    return;
  }

  test(name, async () => {
    const worker = new Worker(new URL(file), {
      workerData: { file, name },
      execArgv: [],
    });
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        deadline = setTimeout(() => reject(new Error("Isolated scenario timed out.")), 4_000);
        worker.once("message", (result: { ok: boolean; message?: string }) => {
          if (result.ok === true) resolve();
          else reject(new Error(result.message ?? "Isolated scenario failed."));
        });
        worker.once("error", reject);
        worker.once("exit", (code) => reject(new Error("Worker exited without a result: " + code)));
      });
    } finally {
      clearTimeout(deadline);
      await worker.terminate();
    }
  });
}
