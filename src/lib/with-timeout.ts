/**
 * Reject if `promise` does not settle within `ms` milliseconds.
 * If the timeout wins, the original promise is still running; we attach a no-op catch so
 * Postgres/driver errors (e.g. statement timeout) do not become unhandledRejection in Node.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = new Error(`Timed out after ${ms}ms`);

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } catch (e) {
    if (e === timeoutError) {
      void promise.catch(() => {});
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
