import { expect, test } from "bun:test";

import { normalizeCase } from "./normalizeCase.ts";
import { GroupBySchema } from "../utils/validateConfig.ts";

test("converts names to camel case when config value is set", () => {
  const originalName = "user_id";
  const newName = normalizeCase(originalName, {
    camelCase: true,
    databaseProvider: "postgresql",
    fileName: "",
    enumFileName: "",
    readOnlyIds: false,
    groupBySchema: GroupBySchema.None,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
    exportWrappedTypes: false,
  });

  expect(newName).toEqual("userId");
});

test("doesn't convert names to camel case when config value isn't set", () => {
  const originalName = "user_id";
  const newName = normalizeCase(originalName, {
    camelCase: false,
    databaseProvider: "postgresql",
    fileName: "",
    enumFileName: "",
    readOnlyIds: false,
    groupBySchema: GroupBySchema.None,
    defaultSchema: "public",
    dbTypeName: "DB",
    importExtension: "",
    exportWrappedTypes: false,
  });

  expect(newName).toEqual("user_id");
});
