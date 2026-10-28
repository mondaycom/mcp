# Benchmark: per-parent concurrency cap for creating subitems

> Context: [create-items-subitem-lock-contention.md](create-items-subitem-lock-contention.md), Step 2a.
> Index: [README.md](README.md).

Run 2026-10-14, 09:09–09:25 UTC. Question: how many `create_subitem` requests should `create_items` keep
in flight per parent item?

## Result

**Recommended cap: 5.** Every run, at every cap, finished with zero errors.

| cap | runs | median total | vs fastest | creates/s | p50 latency | p95 latency | max latency |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 36,991 ms | +257% | 0.54 | 1,809 ms | 2,621 ms | 2,800 ms |
| 3 | 3 | 14,336 ms | +38.5% | 1.40 | 1,924 ms | 3,488 ms | 4,356 ms |
| **5** | 3 | **11,175 ms** | **+7.9%** | 1.79 | 2,290 ms | 4,667 ms | 5,149 ms |
| 10 | 3 | 10,353 ms | fastest | 1.93 | 3,486 ms | 8,723 ms | 10,211 ms |
| 5 × 2 parallel pools (40 items) | 3 | 21,006 ms | n/a | 1.90 | 3,938 ms | 8,336 ms | 17,244 ms |

Columns are medians across runs, except "max latency", which is the highest single request across runs.

**Selection rule:** choose the lowest error-free cap whose median total is within 10% of the fastest
error-free cap, and prefer 3 over 5 if they perform about the same.

- The fastest error-free cap is 10, at 10,353 ms. The 10% limit is 11,388 ms.
- Cap 5 is at 11,175 ms, within the limit. Cap 3 is at 14,336 ms, well outside it, so 3 and 5 are not
  equivalent.
- The lowest qualifying cap is **5**.

## What it shows

- **Creates on one parent are serialized.** Throughput levels off at about 1.8–2.0 creates/s from cap 5
  up. Going from 5 to 10 cuts total time by only 8%, but raises per-request p50 by about 52% and p95 by
  about 87%. The extra requests just wait.
- **Two parallel calls do not add throughput.** Two pools at cap 5 on one parent (10 in flight) ran at
  the same ~1.9/s, and 40 items took twice as long as 20.
- **10 in flight per parent is about the safe edge.** No errors occurred, but one request in the
  two-pool test took 17.2s. The parent's subitems-column lock gives up after roughly 10–20s (50 retries
  × 200ms + up to 200ms jitter, `column_values_lock_service.rb` / `redlock_service.rb`). That was on an
  idle board with bare subitems.
- **No lock errors at up to 10 in flight.** This fits production, where `itemLinkMaxLocksExceeded`
  appears only on parents with 31 or more overlapping creates.

## Environment

| | |
|---|---|
| API | production `https://api.monday.com/v2` |
| how | the `execute_code` tool of the monday MCP connector (`monday-prod`). It runs code in a per-call sandbox that is already authenticated to the monday API |
| why production | no staging API token or local monolith was available. The board owner approved this test board explicitly |
| board | `18427783088`, "Test Board ZZZ", classic (not multi-level). Owner Stas Shwarzman, closed workspace "Stas" (11696990). Subitems board `18427783092` already existed |
| group | `topics` |

## Method

- **Fresh parent per run.** Each run creates a new parent item, then sends 20 minimal mutations under it.
  Each mutation is `create_subitem(parent_item_id: <parent>, item_name: "<label>")` returning `{ id }`,
  with no column values.
- **Real pool, no waves.** `ThreadPoolExecutor(max_workers=cap)` gets all 20 tasks at once, so a new
  request starts the moment one finishes.
- **Two-pool test.** Two threads, each running its own 20-item pool at cap 5, on the same fresh parent,
  started together. This models two parallel `create_items` calls.
- **Timing.** Total time runs from just after the parent is created until the last request ends. Latency
  is measured per request on the client.
- **Errors.** For any request with GraphQL `errors`, the script records the full `message`, `code`,
  `status_code` and `error_data`, plus any transport exception. It classifies them as:
  - **A:** `error_data.column_validation_error_code = itemLinkMaxLocksExceeded`, or the message contains
    `max locks exceeded`
  - **B:** the message contains `failed to acquire lock`
  - **C:** anything else
- **Order.** Each cap ran 3 times, alternating order: r2 = 10, 5, 3, 1 · r3 = 3, 10, 1, 5 · r4 = 1, 3, 5, 10.
  Then three two-pool runs.
- **Warm-up.** Round r1 created a warm-up parent with 3 sequential subitems, then one run per cap. Its
  output was lost (see deviations), so it counts as warm-up only.

## Deviations from the requested method

| requested | what happened |
|---|---|
| staging or a disposable internal environment | production, on a test board the owner approved explicitly |
| a temporary standalone script, removed afterwards | the script ran only inside per-call MCP sandboxes, which are destroyed after each call. No local files were created |
| all runs in one session | one cap per call. Round r1 ran all caps in one call, took ~90s, and the MCP client gave up waiting. Its subitems were created (20 per cap) but the output never came back, so r1 counts as warm-up |
| — | two cap-1 attempts in round r3 failed inside the sandbox with no API error: one after 7 of 20 subitems, the next after 3. Both are excluded as infrastructure failures. The third attempt (`r3c`) is the measured r3 cap-1 run. Round order 3, 10, 1, 5 was kept |
| p95 latency | with 20 requests, the script's percentile function returns the maximum as p95. With 40 requests it returns the 38th value |

## Script

The same code ran in every call; only `vars` changed.

```python
import os, json, time, threading, statistics, requests
from concurrent.futures import ThreadPoolExecutor

API = 'https://api.monday.com/v2'
BOARD_ID = os.environ['BOARD_ID']
GROUP_ID = os.environ['GROUP_ID']
ORDER = [int(x) for x in os.environ['ORDER'].split(',')]
ROUND = os.environ['ROUND']
N = int(os.environ['N'])
POOLS = int(os.environ['PARALLEL_POOLS'])
session = requests.Session()


def gql(query, raise_on_error=True):
    body = session.post(API, json={'query': query}, timeout=60).json()
    if raise_on_error and 'errors' in body:
        raise RuntimeError(json.dumps(body['errors']))
    return body


def classify(err):
    msg = err.get('message', '') or ''
    ext = err.get('extensions', {}) or {}
    data = ext.get('error_data', {}) or {}
    if data.get('column_validation_error_code') == 'itemLinkMaxLocksExceeded' or 'max locks exceeded' in msg:
        return 'A'
    if 'failed to acquire lock' in msg:
        return 'B'
    return 'C'


def create_parent(name):
    q = 'mutation { create_item(board_id: %s, group_id: "%s", item_name: "%s") { id } }' % (BOARD_ID, GROUP_ID, name)
    return gql(q)['data']['create_item']['id']


def create_subitem(parent_id, name, t0, pool_idx, idx):
    q = 'mutation { create_subitem(parent_item_id: %s, item_name: "%s") { id } }' % (parent_id, name)
    start = time.monotonic()
    try:
        body = gql(q, raise_on_error=False)
        transport_error = None
    except Exception as e:
        body, transport_error = {}, repr(e)
    end = time.monotonic()
    errors = body.get('errors') or []
    ok = transport_error is None and not errors and (body.get('data') or {}).get('create_subitem') is not None
    return {
        'pool': pool_idx, 'i': idx,
        'start_ms': round((start - t0) * 1000), 'end_ms': round((end - t0) * 1000),
        'latency_ms': round((end - start) * 1000), 'ok': ok,
        'class': None if ok else (classify(errors[0]) if errors else 'C'),
        'errors': [{'message': e.get('message'), 'code': (e.get('extensions') or {}).get('code'),
                    'status_code': (e.get('extensions') or {}).get('status_code'),
                    'error_data': (e.get('extensions') or {}).get('error_data')} for e in errors],
        'transport_error': transport_error,
    }


def pool_run(parent_id, cap, label, t0, pool_idx):
    with ThreadPoolExecutor(max_workers=cap) as ex:
        futures = [ex.submit(create_subitem, parent_id, '%s-p%d-%02d' % (label, pool_idx, i), t0, pool_idx, i) for i in range(N)]
        return [f.result() for f in futures]


def pct(values, p):
    s = sorted(values)
    k = max(0, min(len(s) - 1, int(round(p / 100.0 * len(s) + 0.5)) - 1))
    return s[k]


def run(cap):
    label = 'bench-%s-cap%d-x%d-%d' % (ROUND, cap, POOLS, int(time.time()))
    parent_id = create_parent(label)
    t0 = time.monotonic()
    results = []
    if POOLS == 1:
        results = pool_run(parent_id, cap, label, t0, 0)
    else:
        out = [None] * POOLS
        def worker(k):
            out[k] = pool_run(parent_id, cap, label, t0, k)
        threads = [threading.Thread(target=worker, args=(k,)) for k in range(POOLS)]
        for th in threads:
            th.start()
        for th in threads:
            th.join()
        results = [r for part in out for r in part]
    total_ms = round((time.monotonic() - t0) * 1000)
    lat = [r['latency_ms'] for r in results]
    ok_count = sum(1 for r in results if r['ok'])
    classes = {c: sum(1 for r in results if r['class'] == c) for c in ('A', 'B', 'C')}
    return {
        'round': ROUND, 'cap': cap, 'pools': POOLS, 'parent_id': parent_id,
        'total_ms': total_ms, 'requests': len(results),
        'throughput_per_s': round(len(results) / (total_ms / 1000.0), 2),
        'p50_ms': round(statistics.median(lat)), 'p95_ms': pct(lat, 95), 'max_ms': max(lat),
        'ok': ok_count, 'errors': len(results) - ok_count, 'error_classes': classes,
        'error_details': [{'pool': r['pool'], 'i': r['i'], 'start_ms': r['start_ms'], 'latency_ms': r['latency_ms'],
                           'class': r['class'], 'errors': r['errors'], 'transport_error': r['transport_error']}
                          for r in results if not r['ok']],
        'latencies_ms': [r['latency_ms'] for r in sorted(results, key=lambda r: (r['pool'], r['i']))],
        'starts_ms': [r['start_ms'] for r in sorted(results, key=lambda r: (r['pool'], r['i']))],
    }


created_parents = []
if os.environ.get('WARMUP') == '1':
    wp = create_parent('bench-%s-warmup-%d' % (ROUND, int(time.time())))
    created_parents.append(wp)
    for i in range(3):
        r = create_subitem(wp, 'warmup-%d' % i, time.monotonic(), 0, i)
        if not r['ok']:
            raise RuntimeError('warm-up failed: ' + json.dumps(r))
    print(json.dumps({'warmup_parent_id': wp, 'warmup_ok': True}))

for cap in ORDER:
    res = run(cap)
    created_parents.append(res['parent_id'])
    print(json.dumps(res))

print(json.dumps({'created_parent_ids': created_parents}))
```

`vars` for every call: `BOARD_ID=18427783088`, `GROUP_ID=topics`, `N=20`. Per run, as in the table
below: `ROUND`, `ORDER` (the cap), `PARALLEL_POOLS`, and `WARMUP` (`1` only for r1).

## Raw results, every run

Start times come from the Unix timestamp in each parent's name.

| run | start (UTC) | sandbox session | parent item | cap | pools | total ms | creates/s | p50 ms | p95 ms | max ms | ok | A | B | C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| r1 (warm-up) | 09:09:17 | lost | 13285795284 (warm-up), 13285769577, 13285769647, 13285798945, 13285754264 | 1, 3, 5, 10 | 1 | lost | | | | | 20 each | | | |
| r2 | 09:11:29 | sess_873c5c31d03a2dc67b548f67 | 13285803009 | 10 | 1 | 10,353 | 1.93 | 3,486 | 8,723 | 8,723 | 20/20 | 0 | 0 | 0 |
| r2 | 09:12:07 | sess_a8ae56329981cd69669ab3e4 | 13285754037 | 5 | 1 | 11,233 | 1.78 | 2,106 | 5,149 | 5,149 | 20/20 | 0 | 0 | 0 |
| r2 | 09:12:42 | sess_02a921761c2afb183a1ab82e | 13285770595 | 3 | 1 | 14,336 | 1.40 | 1,924 | 3,488 | 3,488 | 20/20 | 0 | 0 | 0 |
| r2 | 09:13:23 | sess_842d2bd356368da33f9e4872 | 13285808049 | 1 | 1 | 36,991 | 0.54 | 1,809 | 2,800 | 2,800 | 20/20 | 0 | 0 | 0 |
| r3 | 09:14:25 | sess_e852f97c590b1345f6f7de8b | 13285799486 | 3 | 1 | 15,298 | 1.31 | 1,850 | 4,356 | 4,356 | 20/20 | 0 | 0 | 0 |
| r3 | 09:15:08 | sess_ee4d2a7965e81abcd0287b3f | 13285808526 | 10 | 1 | 10,778 | 1.86 | 3,104 | 10,211 | 10,211 | 20/20 | 0 | 0 | 0 |
| r3 (aborted) | 09:15:44 | failed | 13285775149 | 1 | 1 | sandbox failed after 7/20 | | | | | excluded | | | |
| r3b (aborted) | 09:16:32 | failed | 13285844276 | 1 | 1 | sandbox failed after 3/20 | | | | | excluded | | | |
| r3c | 09:17:16 | sess_449fc9e41694b77af0e887e6 | 13285800656 | 1 | 1 | 36,907 | 0.54 | 1,746 | 2,592 | 2,592 | 20/20 | 0 | 0 | 0 |
| r3 | 09:18:19 | sess_63b6f631640b46f3b132400b | 13285844435 | 5 | 1 | 10,561 | 1.89 | 2,290 | 4,395 | 4,395 | 20/20 | 0 | 0 | 0 |
| r4 | 09:18:55 | sess_fd3eb23973d99d3e53301c74 | 13285832283 | 1 | 1 | 39,498 | 0.51 | 1,965 | 2,621 | 2,621 | 20/20 | 0 | 0 | 0 |
| r4 | 09:20:23 | sess_bc6ce3628c6f386ad5da962f | 13285818333 | 3 | 1 | 13,853 | 1.44 | 1,967 | 2,754 | 2,754 | 20/20 | 0 | 0 | 0 |
| r4 | 09:21:04 | sess_bd2bbb4ecf05ff52a5b2b0d6 | 13285860011 | 5 | 1 | 11,175 | 1.79 | 2,362 | 4,667 | 4,667 | 20/20 | 0 | 0 | 0 |
| r4 | 09:21:52 | sess_a95d8582d6cf83ee3cf19bcb | 13285834953 | 10 | 1 | 10,014 | 2.00 | 3,602 | 7,050 | 7,050 | 20/20 | 0 | 0 | 0 |
| x2r1 | 09:23:16 | sess_d9576fbc1037e2924f31cb5b | 13285851332 | 5 | 2 | 21,035 | 1.90 | 3,938 | 8,336 | 13,728 | 40/40 | 0 | 0 | 0 |
| x2r2 | 09:24:03 | sess_2fb4ec7f06422890d23f25dd | 13285889624 | 5 | 2 | 21,006 | 1.90 | 4,094 | 9,057 | 17,244 | 40/40 | 0 | 0 | 0 |
| x2r3 | 09:24:49 | sess_4c7dfacffcd5c0abc708b20c | 13285852586 | 5 | 2 | 20,343 | 1.97 | 3,511 | 8,127 | 10,458 | 40/40 | 0 | 0 | 0 |

**Errors:** across all 15 measured runs (340 requests) there were 0 errors of class A, 0 of class B
and 0 of class C. No GraphQL `code`, `status_code`, `error_data` or `message` was returned, and there
was no transport exception. The two aborted runs failed in the sandbox itself, with no API response.

### Per-request latency, ms, in request order

| run | cap | pools | latencies |
|---|---|---|---|
| r2 | 10 | 1 | 2891, 7352, 2007, 5966, 1617, 2333, 4166, 3181, 3707, 5581, 8723, 2980, 2237, 6158, 5395, 2655, 5335, 3264, 1848, 4343 |
| r2 | 5 | 1 | 2666, 1858, 4607, 2116, 1450, 1760, 2068, 2924, 3145, 3948, 2573, 1415, 5149, 1849, 1949, 2095, 1967, 2053, 2626, 2635 |
| r2 | 3 | 1 | 2945, 2266, 1604, 1836, 1793, 1537, 2010, 1896, 2135, 1958, 1953, 2200, 1702, 1847, 1757, 3488, 1555, 2528, 2324, 1733 |
| r2 | 1 | 1 | 1801, 1454, 1786, 1743, 1607, 2800, 1817, 1423, 2136, 1517, 2115, 1410, 1749, 1652, 1992, 2068, 1893, 2091, 1946, 1989 |
| r3 | 3 | 1 | 2349, 2941, 1776, 1662, 1795, 2037, 1896, 1687, 1803, 4356, 2117, 1559, 2601, 1661, 1446, 2448, 1739, 1769, 3007, 2010 |
| r3 | 10 | 1 | 2124, 2868, 8773, 6284, 4600, 1669, 3340, 10211, 4006, 2365, 8201, 1480, 5471, 2517, 1487, 4206, 1677, 1996, 2152, 5384 |
| r3c | 1 | 1 | 1708, 1746, 1659, 1745, 1644, 1675, 1601, 1748, 1566, 1566, 1910, 2007, 2084, 2592, 1455, 1740, 1974, 2333, 2156, 1995 |
| r3 | 5 | 1 | 1913, 3514, 2613, 1424, 2259, 1629, 2037, 2641, 1751, 2148, 2320, 3176, 2025, 2531, 4395, 2498, 2392, 3020, 1784, 2226 |
| r4 | 1 | 1 | 1696, 1610, 2265, 1786, 1699, 1800, 1692, 1646, 1983, 2047, 1555, 2621, 2312, 2048, 2165, 2351, 1910, 1947, 2232, 2128 |
| r4 | 3 | 1 | 2198, 2699, 1757, 1433, 1663, 1478, 1458, 1926, 2754, 1761, 2047, 2333, 2204, 2296, 1811, 2008, 1625, 1842, 2201, 2093 |
| r4 | 5 | 1 | 2223, 3066, 2661, 3584, 1485, 2338, 2301, 2385, 4667, 1990, 2527, 2195, 2166, 3512, 1947, 1855, 2427, 2829, 1796, 2596 |
| r4 | 10 | 1 | 6224, 3380, 7050, 1545, 1935, 5479, 4228, 2680, 2172, 3656, 3548, 2617, 6434, 5314, 6629, 5786, 1585, 2265, 4038, 2217 |
| x2r1 | 5 | 2 | pool 0: 6842, 2710, 3847, 3308, 7857, 8336, 2761, 5870, 4161, 4716, 2757, 3135, 4658, 1898, 9131, 1771, 5908, 4922, 2195, 4668 · pool 1: 4881, 1575, 1942, 5250, 2201, 6591, 2334, 3369, 2122, 2397, 13728, 3589, 2467, 6340, 8250, 5681, 2763, 4030, 3465, 6475 |
| x2r2 | 5 | 2 | pool 0: 1898, 2997, 1594, 2652, 5932, 6549, 1861, 1949, 2205, 17244, 2206, 5795, 4287, 2440, 8217, 3317, 3542, 3369, 5837, 6187 · pool 1: 2211, 9751, 4211, 3448, 6262, 5022, 2110, 3457, 4952, 2560, 4918, 9057, 4373, 1989, 4874, 3018, 4846, 4625, 4155, 4032 |
| x2r3 | 5 | 2 | pool 0: 5387, 7698, 3374, 2670, 2207, 4620, 2358, 3028, 2204, 3123, 4396, 2187, 2776, 10216, 1907, 10458, 2945, 3657, 8127, 7381 · pool 1: 3025, 1892, 4208, 3597, 6231, 2750, 5180, 7731, 1390, 7740, 6405, 2999, 6319, 6239, 1999, 4488, 2530, 3555, 3044, 3467 |

Request start offsets (`starts_ms`) for every run are kept in the session transcript. They show the
pool refilling continuously: at cap 5, requests 6–20 each start within a few ms of an earlier one
finishing.

## Caveats

- **An idle, lightly loaded board.** Bare subitems with no column values, on a classic board, with no
  automations or rollups on the parent. Real parents hold the lock longer, which lowers the throughput
  ceiling and the safe concurrency. That argues against going above 5, not for it.
- **One board, one time window, 3 runs per cap.** Spreads within a cap were small (cap 5: 10.6–11.2s,
  cap 10: 10.0–10.8s, cap 3: 13.9–15.3s, cap 1: 36.9–39.5s), but it is not a large sample.
- **Different network path.** Latency was measured from the MCP sandbox to `api.monday.com`, not through
  the MCP gateway that `create_items` uses.
- **Not tested:** two pools at cap 10 (20 in flight, the earlier proposal). It would show where errors
  start, but it deliberately drives production toward lock errors, so it was not run without approval.

## Cleanup

All 22 `bench-*` parent items were deleted with `delete_item`, which removed their 453 subitems. That
covers 15 measured runs, 4 warm-up runs from r1 plus the r1 warm-up parent, and 2 aborted runs. The
board is back to its 6 original items: Test Task A–E and AAA. No local files were created.
