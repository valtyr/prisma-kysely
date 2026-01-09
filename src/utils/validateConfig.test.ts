import { afterEach, expect, mock, test } from "bun:test";

import { validateConfig } from "./validateConfig.ts";

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
