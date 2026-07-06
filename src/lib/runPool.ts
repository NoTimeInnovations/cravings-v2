/**
 * Run an async `worker` over `items` with bounded concurrency, resolving when
 * all items are processed. A worker that throws is swallowed so one failure
 * doesn't stall the pool. Used to fetch menu images N-at-a-time and apply each
 * as soon as it returns.
 */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!items.length) return;
  let cursor = 0;
  const lanes = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: lanes }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        try {
          await worker(items[i], i);
        } catch (e) {
          console.error("runPool worker failed", e);
        }
      }
    }),
  );
}
