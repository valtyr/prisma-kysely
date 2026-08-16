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

test("defaults schemaGrouping to none", () => {
  const result = configValidator.parse({ databaseProvider: "postgresql" });

  expect(result.schemaGrouping).toEqual("none");
});

test("rejects invalid schemaGrouping values", () => {
  const result = configValidator.safeParse({
    databaseProvider: "postgresql",
    schemaGrouping: "files",
  });

  expect(result.success).toEqual(false);
});

test("maps legacy groupBySchema to namespace schemaGrouping", () => {
  const result = configValidator.parse({
    databaseProvider: "postgresql",
    groupBySchema: true,
  });

  expect(result.schemaGrouping).toEqual("namespace");
});

test("preserves explicit schemaGrouping over legacy groupBySchema", () => {
  const result = configValidator.parse({
    databaseProvider: "postgresql",
    groupBySchema: true,
    schemaGrouping: "exports",
  });

  expect(result.schemaGrouping).toEqual("exports");
});

test("permits enumFileName with grouped schema modes", () => {
  for (const schemaGrouping of ["namespace", "exports"] as const) {
    const result = configValidator.parse({
      databaseProvider: "postgresql",
      fileName: "types.ts",
      enumFileName: "enums.ts",
      schemaGrouping,
    });

    expect(result.enumFileName).toEqual("enums.ts");
  }
});
