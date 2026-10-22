import { isRateLimitError } from './error.utils';

type ConcurrencyGroup = string | number;

export type ConcurrencyGroupOptions = {
  getGroup: (index: number) => ConcurrencyGroup | undefined;
  limitPerGroup: number;
};

export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
  groupOptions?: ConcurrencyGroupOptions,
): Promise<T[]> {
  if (limit < 1) {
    throw new RangeError('limit must be at least 1');
  }
  if (groupOptions && groupOptions.limitPerGroup < 1) {
    throw new RangeError('limitPerGroup must be at least 1');
  }

  const output: T[] = new Array(tasks.length);
  const pending = tasks.map((_, index) => index);
  const groups = tasks.map((_, index) => groupOptions?.getGroup(index));
  const activeByGroup = new Map<ConcurrencyGroup, number>();
  let activeCount = 0;

  await new Promise<void>((resolve) => {
    const schedule = (): void => {
      while (activeCount < limit) {
        const pendingIndex = pending.findIndex((index) => {
          const group = groups[index];
          return (
            group === undefined ||
            groupOptions === undefined ||
            (activeByGroup.get(group) ?? 0) < groupOptions.limitPerGroup
          );
        });
        if (pendingIndex === -1) {
          break;
        }

        const [taskIndex] = pending.splice(pendingIndex, 1);
        const group = groups[taskIndex];
        if (group !== undefined) {
          activeByGroup.set(group, (activeByGroup.get(group) ?? 0) + 1);
        }
        activeCount++;

        void Promise.resolve()
          .then(tasks[taskIndex])
          .then((result) => {
            output[taskIndex] = result;
          })
          .catch(() => undefined)
          .then(() => {
            activeCount--;
            if (group !== undefined) {
              const remaining = (activeByGroup.get(group) ?? 1) - 1;
              if (remaining === 0) {
                activeByGroup.delete(group);
              } else {
                activeByGroup.set(group, remaining);
              }
            }
            schedule();
          });
      }

      if (pending.length === 0 && activeCount === 0) {
        resolve();
      }
    };

    schedule();
  });

  return output;
}

export type RateLimitCircuitOptions<T> = {
  limit: number;
  onSkipped: (index: number) => T;
  onError: (error: unknown, index: number) => T;
  isRateLimitError?: (error: unknown) => boolean;
  concurrencyGroups?: ConcurrencyGroupOptions;
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

  return runWithConcurrency(wrapped, options.limit, options.concurrencyGroups);
}
