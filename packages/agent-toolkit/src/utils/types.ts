import { ColumnType } from "src/monday-graphql";

export const NonDeprecatedColumnType = Object.fromEntries(
  Object.entries(ColumnType).filter(([key]) => key !== "Person")
) as Record<Exclude<keyof typeof ColumnType, "Person">, string>;
