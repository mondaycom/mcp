import { isRateLimitError } from './error.utils';

export async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < tasks.length) {
      const i = cursor++;
      out[i] = await tasks[i]();
    }
  };
  const workerCount = Math.min(limit, tasks.length);
  await Promise.allSettled(Array.from({ length: workerCount }, worker));
  return out;
}

export type RateLimitCircuitOptions<T> = {
  limit: number;
  onSkipped: (index: number) => T;
  onError: (error: unknown, index: number) => T;
  isRateLimitError?: (error: unknown) => boolean;
};

export async function runWithRateLimitCircuit<T>(
  tasks: Array<() => Promise<T>>,
  options: RateLimitCircuitOptions<T>,
): Promise<T[]> {
  const tripped = { value: false };
  const isRateLimit = options.isRateLimitError ?? isRateLimitError;

  const wrapped = tasks.map((task, index) => async (): Promise<T> => {
    if (tripped.value) {
      return options.onSkipped(index);
    }
    try {
      return await task();
    } catch (error) {
      if (isRateLimit(error)) {
        tripped.value = true;
      }
      return options.onError(error, index);
    }
  });

  return runWithConcurrency(wrapped, options.limit);
}
