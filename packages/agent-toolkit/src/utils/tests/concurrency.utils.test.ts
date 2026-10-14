import { runWithConcurrency, runWithRateLimitCircuit } from '../concurrency.utils';

describe('runWithConcurrency', () => {
  const flushScheduler = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('returns an empty result when there are no tasks', async () => {
    await expect(runWithConcurrency([], 1)).resolves.toEqual([]);
  });

  it('rejects invalid concurrency limits', async () => {
    await expect(runWithConcurrency([], 0)).rejects.toThrow('limit must be at least 1');
    await expect(
      runWithConcurrency([], 1, {
        getGroup: () => 'group',
        limitPerGroup: 0,
      }),
    ).rejects.toThrow('limitPerGroup must be at least 1');
  });

  it('runs all tasks and preserves input order in the output array', async () => {
    const tasks = [10, 30, 20].map((delay, i) => async () => {
      await new Promise((r) => setTimeout(r, delay));
      return i;
    });

    const result = await runWithConcurrency(tasks, 5);

    expect(result).toEqual([0, 1, 2]);
  });

  it('never exceeds the concurrency limit of in-flight tasks', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });

    await runWithConcurrency(tasks, 3);

    expect(peak).toBeLessThanOrEqual(3);
  });

  it('limits each group while scheduling work from other groups', async () => {
    const groups = ['parent-a', 'parent-a', 'parent-a', 'parent-b', 'parent-b', 'parent-b'];
    const started: string[] = [];
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const tasks = groups.map((group, index) => async () => {
      started.push(group);
      await gate;
      return index;
    });

    const resultPromise = runWithConcurrency(tasks, 4, {
      getGroup: (index) => groups[index],
      limitPerGroup: 2,
    });

    await Promise.resolve();
    expect(started).toEqual(['parent-a', 'parent-a', 'parent-b', 'parent-b']);

    releaseGate();
    await expect(resultPromise).resolves.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('starts the next task in a group as soon as a group slot is released', async () => {
    const started: number[] = [];
    const releases = Array.from({ length: 3 }, () => {
      let release!: () => void;
      const promise = new Promise<void>((resolve) => {
        release = resolve;
      });
      return { promise, release };
    });
    const tasks = releases.map(({ promise }, index) => async () => {
      started.push(index);
      await promise;
      return index;
    });

    const resultPromise = runWithConcurrency(tasks, 3, {
      getGroup: () => 'parent',
      limitPerGroup: 1,
    });

    await flushScheduler();
    expect(started).toEqual([0]);

    releases[0].release();
    await flushScheduler();
    expect(started).toEqual([0, 1]);

    releases[1].release();
    await flushScheduler();
    expect(started).toEqual([0, 1, 2]);

    releases[2].release();
    await expect(resultPromise).resolves.toEqual([0, 1, 2]);
  });

  it('does not apply the per-group limit to ungrouped tasks', async () => {
    const started: number[] = [];
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const tasks = [0, 1, 2].map((index) => async () => {
      started.push(index);
      await gate;
      return index;
    });

    const resultPromise = runWithConcurrency(tasks, 3, {
      getGroup: () => undefined,
      limitPerGroup: 1,
    });

    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);

    releaseGate();
    await expect(resultPromise).resolves.toEqual([0, 1, 2]);
  });

  it('lets sibling workers finish their tasks even when a task throws, and returns partial results', async () => {
    const completed: number[] = [];
    const tasks: Array<() => Promise<number>> = [
      async () => {
        completed.push(0);
        return 0;
      },
      async () => {
        throw new Error('task 1 failed');
      },
      async () => {
        await new Promise((r) => setTimeout(r, 20));
        completed.push(2);
        return 2;
      },
      async () => {
        completed.push(3);
        return 3;
      },
    ];

    const result = await runWithConcurrency(tasks, 2);

    expect(completed).toEqual(expect.arrayContaining([0, 2, 3]));
    expect(result[0]).toBe(0);
    expect(result[1]).toBeUndefined();
    expect(result[2]).toBe(2);
    expect(result[3]).toBe(3);
  });

  it('releases a group slot when a task rejects', async () => {
    const started: number[] = [];
    const tasks = [
      async () => {
        started.push(0);
        throw new Error('failed');
      },
      async () => {
        started.push(1);
        return 1;
      },
    ];

    const result = await runWithConcurrency(tasks, 2, {
      getGroup: () => 'parent',
      limitPerGroup: 1,
    });

    expect(started).toEqual([0, 1]);
    expect(result[0]).toBeUndefined();
    expect(result[1]).toBe(1);
  });
});

describe('runWithRateLimitCircuit', () => {
  const rateLimit429 = () => {
    const err = new Error('Rate limit exceeded');
    (err as { response?: { status: number } }).response = { status: 429 };
    return err;
  };

  it('runs all tasks when no rate limit is hit', async () => {
    const result = await runWithRateLimitCircuit(
      [async () => 'a', async () => 'b'],
      {
        limit: 2,
        onSkipped: (i) => `skipped-${i}`,
        onError: () => 'error',
      },
    );

    expect(result).toEqual(['a', 'b']);
  });

  it('trips the circuit on 429 and skips remaining tasks', async () => {
    let callCount = 0;
    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      callCount++;
      if (i === 1) {
        throw rateLimit429();
      }
      return `ok-${i}`;
    });

    const result = await runWithRateLimitCircuit(tasks, {
      limit: 1,
      onSkipped: (i) => `skipped-${i}`,
      onError: (error, i) => `error-${i}:${error instanceof Error ? error.message : String(error)}`,
    });

    expect(callCount).toBe(2);
    expect(result[0]).toBe('ok-0');
    expect(result[1]).toBe('error-1:Rate limit exceeded');
    expect(result[2]).toBe('skipped-2');
    expect(result[3]).toBe('skipped-3');
    expect(result[4]).toBe('skipped-4');
  });

  it('skips queued tasks in the same group after the circuit trips', async () => {
    let callCount = 0;
    const tasks = Array.from({ length: 3 }, (_, index) => async () => {
      callCount++;
      if (index === 0) {
        throw rateLimit429();
      }
      return `ok-${index}`;
    });

    const result = await runWithRateLimitCircuit(tasks, {
      limit: 2,
      concurrencyGroups: {
        getGroup: () => 'parent',
        limitPerGroup: 1,
      },
      onSkipped: (index) => `skipped-${index}`,
      onError: (_error, index) => `error-${index}`,
    });

    expect(callCount).toBe(1);
    expect(result).toEqual(['error-0', 'skipped-1', 'skipped-2']);
  });

  it('uses a custom isRateLimitError when provided', async () => {
    const tasks = [async () => { throw new Error('quota'); }, async () => 'ok'];

    const result = await runWithRateLimitCircuit(tasks, {
      limit: 1,
      onSkipped: (i) => `skipped-${i}`,
      onError: (error, i) => `error-${i}`,
      isRateLimitError: (error) => error instanceof Error && error.message === 'quota',
    });

    expect(result).toEqual(['error-0', 'skipped-1']);
  });
});
