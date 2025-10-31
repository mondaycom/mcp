import { ColumnType } from "src/monday-graphql";

export const NonDeprecatedColumnType = Object.fromEntries(
    Object.entries(ColumnType).filter(([key]) => key !== ('Person' satisfies keyof typeof ColumnType))
) as { [K in keyof typeof ColumnType as K extends 'Person' ? never : K]: typeof ColumnType[K] };

