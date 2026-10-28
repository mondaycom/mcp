# get_board_items_page — dangling workspace_id → INTERNAL_SERVER_ERROR

Investigated 2026-09-14. Example trace: `0d4c6ab571de29fbeba5a52e8b8e9623`.

## The error

`INTERNAL_SERVER_ERROR` (+ often `DOWNSTREAM_SERVICE_ERROR`) on `items_page` /
`get_board_items_page`. No GraphQL resource code, no model/id in the client payload.

## Why it happens

Board has a `workspace_id` whose Workspace row is gone. Agent permission path:

`PaginatedBoardItems` → column_values → data-structure `/v1/columns/board/bulk` →
monolith `board_and_columns_permissions` → `can_access_board` (agent) →
`is_subscribed_to_workspace(workspace_id)` → `Workspace.get_entity_by_id_cached`
without `allow_nil` → `RecordNotFound` → HTTP 404
`{"error":"Not Found","details":{"model":"Workspace","id":N}}`.

`PaginatedItemsQueryService` only remapped 403. CVMS also drops the 404 body, so the
monolith only saw a bare 404 and turned it into a 500.

## The effect

Part of the unexplained ~54% of `INTERNAL_SERVER_ERROR` on `get_board_items_page`
with no filters (see [internal-server-errors-monolith-500s.md](internal-server-errors-monolith-500s.md)).
Model in the inner 404 is Workspace whenever this path fires.

## Example to look at

Trace id `0d4c6ab571de29fbeba5a52e8b8e9623` — inner service 404 Workspace not found,
surfaced as INTERNAL_SERVER_ERROR.

## Code references

- `dapulse/.../workspace_permissions_logic_service.rb` — `is_subscribed_to_workspace`
- `dapulse/.../board_permissions_core_service.rb` — `agent_can_access_public_board_in_subscribed_workspace?`
- `dapulse/.../data_structure_internal_controller.rb` — RecordNotFound → JSON 404
- `dapulse/.../paginated_items_query_service.rb` — previously only mapped 403
- `column_values/.../request_utils.ts` — `new NotFoundError()` drops body

## Fix

Implemented across the existing service chain:

1. data-structure keeps the monolith 404 body in `DependencyError.additionalInfo`.
2. column_values unwraps and returns the original
   `{"error":"Not Found","details":{"model":"Workspace","id":N}}`, including across its
   worker-thread boundary.
3. dapulse keeps the parsed response on `HttpErrorException`.
4. `PaginatedItemsQueryService` maps the structured workspace 404 to
   `ResourceNotFoundException` with `workspace_id` + `board_id`.

Out of scope: repairing dangling FKs.
