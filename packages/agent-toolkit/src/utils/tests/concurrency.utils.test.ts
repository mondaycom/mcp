import { runWithConcurrency, runWithRateLimitCircuit } from '../concurrency.utils';

describe('runWithConcurrency', () => {
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
