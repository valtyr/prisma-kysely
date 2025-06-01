import { expect, test } from "vitest";

import { normalizeCase } from "~/utils/normalizeCase";

test("converts names to camel case when config value is set", () => {
  const originalName = "user_id";
  const newName = normalizeCase(originalName, {
    camelCase: true,
    databaseProvider: "postgresql",
    fileName: "",
    enumFileName: "",
    readOnlyIds: false,
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
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
    groupBySchema: false,
    defaultSchema: "public",
    dbTypeName: "DB",
  });

  expect(newName).toEqual("user_id");
});
