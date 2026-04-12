# Connect items across boards — where should the solution live?

Short comparison of three ways to solve “discover + match + write link column” for monday.com agents and MCP users.

---

## 1. Composite MCP tool in agent-toolkit (`LinkBoardItemsTool`)

The tool owns pagination, matching (exact today; semantic via planned LLM calls), batch writes, and guardrails (`dryRun`, ambiguity errors, page caps).

### Pros

- **Single agent step** for a long workflow — fewer LLM turns and less token shuffling of full item payloads.
- **Deterministic exact matching** — same inputs → same links; easy to unit test without a model.
- **Explicit policy** — ambiguity and scale limits are enforced in code, not left to the model’s judgment.
- **One implementation** for every consumer of `@mondaydotcomorg/agent-toolkit` (public MCP, gateway, tests).
- **Reusable schema** — `source` / `target`, filters, and link-side rules are documented once on the tool.

### Cons

- **Large surface area** — one failure mode can block the whole flow; harder to explain than “one mutation per tool.”
- **Pricing / metering** — a single `tools/call` can trigger many GraphQL operations (and later, extra LLM calls). Billing “per tool call” undervalues heavy runs; “per API call” inside the tool is harder to expose to customers unless you add explicit metrics or sub-events.
- **Debugging** — failures can be deep inside pagination, batch mutation, or (later) semantic stubs. Stack traces and logs live in the MCP host; correlating with agent transcripts takes discipline (request ids, structured logs).
- **Semantic mode + LLM** — needs an injected model, secrets, rate limits, and versioned prompts in the same process as Monday API access; couples two different failure domains.
- **Public package weight** — external MCP users get the same tool even if the workflow is mainly built for internal agents.

---

## 2. Heavy logic in **platform-mcp-gateway** (internal) instead of (or on top of) agent-toolkit

Today the gateway builds tools from `MondayAgentToolkit` in agent-toolkit (`monday-tools.service.ts`). “Move here” can mean two different things:

**2a. Custom tool implemented only in the gateway repo** (registered alongside toolkit tools, with its own `execute`).

**2b. Keep definitions in agent-toolkit but expose / filter the tool only for internal traffic** (policy in gateway, not a second implementation).

### Pros (especially 2a)

- **Separation of audiences** — internal agents can get richer or more opinionated tools without expanding the default surface of the published npm MCP package.
- **Easier internal coupling** — Monday token handling, Ignite, BigBrain, and future **gateway-side LLM** clients already live in that stack; no need to design generic injection for all external toolkit users.
- **Deploy cadence** — ship gateway changes without waiting for every external consumer to bump agent-toolkit (still true if the tool is gateway-only code).

### Cons

- **2a: Split ownership** — GraphQL and domain rules may duplicate agent-toolkit patterns, or you pull in private libs and drift from `get_board_items_page` / column-value conventions.
- **2a: Testing & reuse** — other repos that instantiate toolkit directly (Cursor, tests, alternate gateways) do not get the tool unless you duplicate or extract a shared package.
- **2b: Still one implementation** — most cons from option 1 remain; you only gain rollout gating and simpler “internal vs external” product story.

---

## 3. Agent-level only — no dedicated connect tool (prompts + existing read/write tools)

The model uses `get_board_items_page` (or similar), reasons over rows in context, then `change_item_column_values` (or batched writes if the agent orchestrates them).

### Pros

- **Simple cost model** — each action is a normal tool call; observability matches what you already have per tool.
- **Easier partial progress** — the agent can link a subset, retry one item, or stop after reads.
- **No new MCP contract** — no nested schemas, no new permission edge cases for a mega-tool.
- **Flexible reasoning** — the same model can use conversation, skills, and retrieval while deciding links.
- **No second LLM inside MCP** — all “semantic” matching is the main agent model (for better or worse).

### Cons

- **Context and scale** — large boards do not fit in one context; the agent must paginate, summarize, or chunk, which multiplies turns and errors.
- **Unstructured matching** — fuzzy links (“iPhone” → “Apple”) depend entirely on the main model unless you add embeddings or rules elsewhere.
- **Weaker guarantees** — ambiguity and duplicates are not enforced unless prompts are strict and the model complies every time.
- **More tokens and latency** — shipping many rows through the agent loop is usually more expensive than computing matches server-side.

---

## Summary

| Concern | Toolkit composite tool | Gateway-only / internal | Agent + prompts only |
|--------|-------------------------|-------------------------|----------------------|
| Scale / tokens | Strong | Strong (if same logic) | Weak |
| Metering / pricing story | Harder | Harder (if same work) | Simpler |
| Debugging | Harder (opaque box) | Depends on placement | Easier per step |
| External MCP simplicity | Heavier package | Can hide from public | No new API |
| Semantic matching | Dedicated (when built) | Same | Main agent only |

A common hybrid is **exact linking in toolkit** (deterministic, testable) plus **agent-or-gateway prompts** for small sets, and **internal-only semantic** either behind gateway or behind a feature flag until pricing and observability are defined.
