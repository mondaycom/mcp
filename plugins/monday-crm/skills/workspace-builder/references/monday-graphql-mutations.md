# monday GraphQL Mutations — workspace-builder reference

Use these via `mcp__monday__all_monday_api`. Pass the mutation string as the `query` parameter.

---

## Get groups on a board (run before rename/delete)

```graphql
query {
  boards(ids: [<boardId>]) {
    groups {
      id
      title
    }
  }
}
```

Returns the list of groups including the default group created by `create_board`. Cache the first group's `id` for the rename step.

---

## Rename a group

```graphql
mutation {
  update_group(board_id: <boardId>, group_id: "<groupId>", group_name: "<newName>") {
    id
  }
}
```

Use this to rename the default group (e.g., "Group Title") to the first proposed pipeline stage. Preferred over delete + recreate — preserves any items added to the default group.

---

## Delete a group

```graphql
mutation {
  delete_group(board_id: <boardId>, group_id: "<groupId>") {
    id
    deleted
  }
}
```

Use only for confirmed default-group cleanup on freshly-created boards. In Default mode, confirm with the user before calling. Never delete groups that contain user items.

---

## Get CRM product ID (run in Step 0)

```graphql
{ account { products { id kind } } }
```

Returns all account products with their **numeric IDs**. Find `kind: "crm"` and cache its `id`. This ID is account-specific — do not hardcode it. Pass it as `accountProductId` when calling `create_workspace` to tie the workspace to the monday CRM product.

**Why numeric ID and not `"crm"`:** The `create_workspace` mutation takes `account_product_id` as an `ID` scalar (numeric). The `kind` field is a display/routing key, not the API identifier. Passing `"crm"` silently creates a generic workspace with no product association.

**Note on board type:** CRM boards in monday.com are standard `public` boards at the API level (`board_kind: "public"`, `type: "board"`). There is no `custom_object` board kind in the public GraphQL API. The CRM product experience is determined by the workspace's product association, not the individual board type.

---

## Notes

- `board_id` and `group_id` are integers in the API but strings in some contexts — pass as integers in the mutation.
- `update_group` is the correct mutation name (not `rename_group` or `change_group_title`).
- Both mutations are available on all board types (public, private, shareable).
