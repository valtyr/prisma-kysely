import { afterEach, expect, mock, test } from "bun:test";

import { configValidator, validateConfig } from "./validateConfig.ts";

const mockExitFunction = mock((() => {}) as typeof process.exit);
const mockConsoleErrorFunction = mock((() => {}) as typeof console.error);

afterEach(() => {
  mockExitFunction.mockClear();
  mockConsoleErrorFunction.mockClear();
});

test("should exit with error code when invalid config encountered", () => {
  process.exit = mockExitFunction;
  console.error = mockConsoleErrorFunction;

  validateConfig({
    databaseProvider: "postgers",
    testField: "wrong",
  });

  expect(mockExitFunction).toHaveBeenCalled();
  expect(mockConsoleErrorFunction).toHaveBeenCalled();
});

test("does not group schemas by default", () => {
  const result = configValidator.parse({ databaseProvider: "postgresql" });

  expect(result.schemaGrouping).toEqual("none");
});

test("groupBySchema = true groups schemas into namespaces", () => {
  const result = configValidator.parse({
    databaseProvider: "postgresql",
    groupBySchema: true,
  });

  expect(result.schemaGrouping).toEqual("namespace");
});

test('groupBySchema = "module" groups schemas into files', () => {
  const result = configValidator.parse({
    databaseProvider: "postgresql",
    groupBySchema: "module",
  });

  expect(result.schemaGrouping).toEqual("exports");
});

test("rejects unknown groupBySchema values", () => {
  for (const groupBySchema of ["modules", "namespace", "exports", "yes"]) {
    const result = configValidator.safeParse({
      databaseProvider: "postgresql",
      groupBySchema,
    });

    expect(result.success).toEqual(false);
  }
});

test("rejects schemaGrouping as a user-facing option", () => {
  const result = configValidator.safeParse({
    databaseProvider: "postgresql",
    schemaGrouping: "exports",
  });

  expect(result.success).toEqual(false);
});

test("rejects enumFileName when groupBySchema is set", () => {
  for (const groupBySchema of [true, "module"] as const) {
    expect(() =>
      configValidator.parse({
        databaseProvider: "postgresql",
        fileName: "types.ts",
        enumFileName: "enums.ts",
        groupBySchema,
      })
    ).toThrow("groupBySchema is not compatible with enumFileName");
  }
});
