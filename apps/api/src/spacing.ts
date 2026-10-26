const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns a wrapper that starts tasks at least `minIntervalMs` apart, in call order.
 * Nominatim's usage policy allows at most one request per second per application.
 */
export function spaced(minIntervalMs: number) {
  let nextStart = 0;
  let queue: Promise<unknown> = Promise.resolve();

  return function run<T>(task: () => Promise<T>): Promise<T> {
    const slot = queue.then(async () => {
      const wait = nextStart - Date.now();
      if (wait > 0) await sleep(wait);
      nextStart = Date.now() + minIntervalMs;
    });
    queue = slot;
    return slot.then(task);
  };
}
