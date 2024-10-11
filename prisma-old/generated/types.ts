import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const Ability = {
  FLY: "FLY",
  WALK: "WALK",
} as const;
export type Ability = (typeof Ability)[keyof typeof Ability];
export const Color = {
  GRAY: "GRAY",
  PINK: "PINK",
} as const;
export type Color = (typeof Color)[keyof typeof Color];
export type Eagle = {
  id: number;
  name: string;
  ability: Generated<Ability>;
};
export type Elephant = {
  id: number;
  name: string;
  ability: Generated<Ability>;
  color: Color;
};
export type DB = {
  "birds.eagles": Eagle;
  "mammals.elephants": Elephant;
};
