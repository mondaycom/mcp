import { isRateLimitError } from './error.utils';

type ConcurrencyGroup = string | number;

export type ConcurrencyGroupOptions = {
  getGroup: (index: number) => ConcurrencyGroup | undefined;
  limitPerGroup: number;
};

class ConcurrencyScheduler<T> {
  private readonly output: T[];
  private readonly pending: number[];
  private readonly groups: Array<ConcurrencyGroup | undefined>;
  private readonly activeByGroup = new Map<ConcurrencyGroup, number>();
  private activeCount = 0;
  private resolve!: (output: T[]) => void;

  constructor(
    private readonly tasks: Array<() => Promise<T>>,
    private readonly limit: number,
    private readonly groupOptions?: ConcurrencyGroupOptions,
  ) {
    this.output = new Array(tasks.length);
    this.pending = tasks.map((_, index) => index);
    this.groups = tasks.map((_, index) => groupOptions?.getGroup(index));
  }

  run(): Promise<T[]> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.schedule();
    });
  }

  private schedule(): void {
    while (this.activeCount < this.limit) {
      const pendingIndex = this.pending.findIndex((index) => this.canStart(index));
      if (pendingIndex === -1) {
        break;
      }
      this.startTask(pendingIndex);
    }

    if (this.pending.length === 0 && this.activeCount === 0) {
      this.resolve(this.output);
    }
  }

  private canStart(index: number): boolean {
    const group = this.groups[index];
    return (
      group === undefined ||
      this.groupOptions === undefined ||
      (this.activeByGroup.get(group) ?? 0) < this.groupOptions.limitPerGroup
    );
  }

  private startTask(pendingIndex: number): void {
    const [taskIndex] = this.pending.splice(pendingIndex, 1);
    const group = this.groups[taskIndex];
    if (group !== undefined) {
      this.activeByGroup.set(group, (this.activeByGroup.get(group) ?? 0) + 1);
    }
    this.activeCount++;

    void Promise.resolve()
      .then(this.tasks[taskIndex])
      .then((result) => {
        this.output[taskIndex] = result;
      })
      .catch(() => undefined)
      .then(() => this.completeTask(group));
  }

  private completeTask(group?: ConcurrencyGroup): void {
    this.activeCount--;
    if (group !== undefined) {
      const remaining = (this.activeByGroup.get(group) ?? 1) - 1;
      if (remaining === 0) {
        this.activeByGroup.delete(group);
      } else {
        this.activeByGroup.set(group, remaining);
      }
    }
    this.schedule();
  }
}

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

  return new ConcurrencyScheduler(tasks, limit, groupOptions).run();
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
