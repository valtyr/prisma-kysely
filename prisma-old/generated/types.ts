import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type TestUser = {
  id: string;
  name: string;
  age: number;
  rating: number;
  updatedAt: string;
};
export type DB = {
  TestUser: TestUser;
};
