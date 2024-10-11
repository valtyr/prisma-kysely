import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Eagle = {
  id: number;
  name: string;
};
export type Elephant = {
  id: number;
  name: string;
};
export type DB = {
  "birds.eagles": Eagle;
  "mammals.elephants": Elephant;
};
