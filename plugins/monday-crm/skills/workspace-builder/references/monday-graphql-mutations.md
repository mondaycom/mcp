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

## Notes

- `board_id` and `group_id` are integers in the API but strings in some contexts — pass as integers in the mutation.
- `update_group` is the correct mutation name (not `rename_group` or `change_group_title`).
- Both mutations are available on all board types (public, private, shareable).
