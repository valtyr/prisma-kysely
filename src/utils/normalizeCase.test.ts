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

test("converts all-uppercase mapped names to camel case when config value is set", () => {
  const config = {
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
  } as const;

  expect(normalizeCase("UPDATED_AT", config)).toEqual("updatedAt");
  expect(normalizeCase("ID", config)).toEqual("id");
  expect(normalizeCase("TEST_CUSTOMERS", config)).toEqual("testCustomers");
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
