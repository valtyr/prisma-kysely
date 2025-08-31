import { afterEach, expect, test, vi } from "vitest";

import { validateConfig } from "./validateConfig";

afterEach(() => {
  vi.clearAllMocks();
});

test("should exit with error code when invalid config encountered", () => {
  const mockExitFunction = vi.fn<typeof process.exit>();
  const consoleErrorFunction = vi.fn<typeof console.error>();

  process.exit = mockExitFunction;
  console.error = consoleErrorFunction;

  validateConfig({
    databaseProvider: "postgers",
    testField: "wrong",
  });

  expect(mockExitFunction).toHaveBeenCalled();
  expect(consoleErrorFunction).toHaveBeenCalled();
});
